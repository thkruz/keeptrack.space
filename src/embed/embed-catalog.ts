import type { EmbedEngine, EngineTle } from './embed-engine';
import { EmbedError, type EmbedObject, type EmbedObjectInfo, type EmbedUpsertResult, type ObjectRef } from './embed-types';

type HostedKind = 'slot' | 'override';

interface PendingAdd {
  index: number;
  hostId: string;
  norad: string | undefined;
  obj: EmbedObject;
}

interface HostedEntry {
  hostId: string;
  id: number;
  kind: HostedKind;
  norad?: string;
  /** Catalog elements to restore when an override is removed. */
  original?: { tle1: string; tle2: string; name: string };
}

/** Mod-10 checksum of the first 68 characters (digits count, '-' counts 1, the rest 0). */
function tleChecksum(line: string): number {
  let sum = 0;

  for (let i = 0; i < 68; i++) {
    const ch = line[i];

    if (ch >= '0' && ch <= '9') {
      sum += Number(ch);
    } else if (ch === '-') {
      sum += 1;
    }
  }

  return sum % 10;
}

/** Structural TLE validation: length, line numbers, checksums. Orbit sanity is checked by the engine. */
export function isValidTlePair(tle1: unknown, tle2: unknown): boolean {
  if (typeof tle1 !== 'string' || typeof tle2 !== 'string') {
    return false;
  }
  if (tle1.length !== 69 || tle2.length !== 69 || !tle1.startsWith('1 ') || !tle2.startsWith('2 ')) {
    return false;
  }

  return tleChecksum(tle1) === Number(tle1[68]) && tleChecksum(tle2) === Number(tle2[68]);
}

/** Host objects: hostId -> engine id mapping, analyst slot allocation, catalog overrides and reverts. */
export class EmbedCatalog {
  private readonly byHostId_ = new Map<string, HostedEntry>();
  private readonly byEngineId_ = new Map<number, HostedEntry>();
  /** NORAD -> host entries carrying it, in insertion order (resolveRef by norad is then O(1)). */
  private readonly byNorad_ = new Map<string, HostedEntry[]>();

  constructor(private readonly engine_: EmbedEngine) {}

  /**
   * One pass for the whole array: objects are validated first, then new ones take slots together (one scan,
   * one cruncher message, one recolor) and updates go to the engine as one batch. Results keep input order.
   * A hostId repeated inside the call behaves as before: the first is 'added', later ones 'updated' (last wins).
   */
  upsert(objects: EmbedObject[]): EmbedUpsertResult[] {
    if (!Array.isArray(objects)) {
      throw new EmbedError('INVALID_ARGUMENT', 'upsertObjects expects an array');
    }
    const results: EmbedUpsertResult[] = new Array(objects.length);
    const adds: PendingAdd[] = [];
    const pendingAdd = new Map<string, number>();
    const edits = new Map<number, { id: number; tle: EngineTle }>();
    let needsNotify = false;

    for (let index = 0; index < objects.length; index++) {
      const obj = objects[index];
      const hostId = typeof obj?.hostId === 'string' ? obj.hostId : '';

      if (!hostId || typeof obj.name !== 'string') {
        results[index] = { hostId, ok: false, error: 'INVALID_ARGUMENT' };
        continue;
      }
      if (!isValidTlePair(obj.tle1, obj.tle2)) {
        results[index] = { hostId, ok: false, error: 'INVALID_TLE' };
        continue;
      }
      const norad = typeof obj.norad === 'string' && obj.norad.trim() !== '' ? obj.norad.trim() : undefined;
      const queued = pendingAdd.get(hostId);

      if (queued !== undefined) {
        // Same hostId earlier in this call: the later elements win
        adds[queued].obj = obj;
        results[index] = { hostId, ok: true, action: 'updated' };
        continue;
      }
      const existing = this.byHostId_.get(hostId);

      if (existing && existing.norad === norad) {
        edits.set(existing.id, { id: existing.id, tle: { tle1: obj.tle1, tle2: obj.tle2, name: obj.name } });
        results[index] = { hostId, ok: true, action: 'updated' };
        continue;
      }
      if (existing) {
        // Identity changed (override <-> fictional, or another NORAD): drop the old binding first
        this.removeOne_(hostId);
        needsNotify = true;
      }
      if (this.engine_.catalogMode === 'full' && norad) {
        const catalogId = this.engine_.findIdByNorad(norad);

        if (catalogId !== null) {
          results[index] = this.override_(hostId, catalogId, norad, obj);
          needsNotify = needsNotify || results[index].ok;
          continue;
        }
      }
      pendingAdd.set(hostId, adds.length);
      adds.push({ index, hostId, norad, obj });
    }

    if (edits.size > 0) {
      this.engine_.editObjects([...edits.values()]);
    }
    if (adds.length > 0) {
      this.addToSlots_(adds, results);
    }
    if (needsNotify) {
      this.engine_.notifyObjectsChanged();
    }

    return results;
  }

  private override_(hostId: string, catalogId: number, norad: string, obj: EmbedObject): EmbedUpsertResult {
    if (this.byEngineId_.has(catalogId)) {
      // Two host objects cannot claim the same catalog object
      return { hostId, ok: false, error: 'INVALID_ARGUMENT' };
    }
    const data = this.engine_.getObjectData(catalogId);

    if (!data?.tle1 || !data.tle2) {
      return { hostId, ok: false, error: 'INVALID_ARGUMENT' };
    }
    const entry: HostedEntry = {
      hostId,
      id: catalogId,
      kind: 'override',
      norad,
      original: { tle1: data.tle1, tle2: data.tle2, name: data.name },
    };

    this.engine_.editObject(catalogId, { tle1: obj.tle1, tle2: obj.tle2, name: obj.name });
    this.register_(entry);

    return { hostId, ok: true, action: 'overrode-catalog' };
  }

  /** Claim slots for all new objects at once. Objects beyond the free slots get NO_FREE_SLOT. */
  private addToSlots_(adds: PendingAdd[], results: EmbedUpsertResult[]): void {
    const slots = this.engine_.allocateSlots(adds.length);
    const items = slots.map((slot, k) => {
      const { norad, obj } = adds[k];

      // Real NORAD identity gives the right mesh; fictional objects keep the slot's own analyst number
      return { id: slot.id, tle: { tle1: obj.tle1, tle2: obj.tle2, name: obj.name, sccNum: norad ?? slot.sccNum } };
    });
    const activated = items.length > 0 ? this.engine_.activateSlots(items) : [];

    adds.forEach((add, k) => {
      if (k >= slots.length) {
        results[add.index] = { hostId: add.hostId, ok: false, error: 'NO_FREE_SLOT' };
      } else if (!activated[k]) {
        results[add.index] = { hostId: add.hostId, ok: false, error: 'INVALID_TLE' };
      } else {
        this.register_({ hostId: add.hostId, id: slots[k].id, kind: 'slot', norad: add.norad });
        results[add.index] = { hostId: add.hostId, ok: true, action: 'added' };
      }
    });
  }

  private register_(entry: HostedEntry): void {
    this.byHostId_.set(entry.hostId, entry);
    this.byEngineId_.set(entry.id, entry);
    if (entry.norad) {
      const list = this.byNorad_.get(entry.norad);

      if (list) {
        list.push(entry);
      } else {
        this.byNorad_.set(entry.norad, [entry]);
      }
    }
  }

  /** Returns the engine ids that were freed or reverted (so the caller can deselect them). */
  remove(hostIds: string[]): number[] {
    const ids: number[] = [];
    const slotIds: number[] = [];
    let reverted = false;

    for (const hostId of hostIds) {
      const entry = this.byHostId_.get(hostId);

      if (!entry) {
        continue;
      }
      if (entry.kind === 'override' && entry.original) {
        this.engine_.editObject(entry.id, entry.original);
        reverted = true;
      } else {
        slotIds.push(entry.id);
      }
      this.unregister_(entry);
      ids.push(entry.id);
    }
    // One cruncher message and one recolor for every freed slot
    this.engine_.releaseSlots(slotIds);
    if (reverted) {
      this.engine_.notifyObjectsChanged();
    }

    return ids;
  }

  private unregister_(entry: HostedEntry): void {
    this.byHostId_.delete(entry.hostId);
    this.byEngineId_.delete(entry.id);
    if (entry.norad) {
      const list = this.byNorad_.get(entry.norad)?.filter((e) => e !== entry);

      if (list && list.length > 0) {
        this.byNorad_.set(entry.norad, list);
      } else {
        this.byNorad_.delete(entry.norad);
      }
    }
  }

  /** Single-object removal used when an upsert changes an object's identity. */
  private removeOne_(hostId: string): number | null {
    const entry = this.byHostId_.get(hostId);

    if (!entry) {
      return null;
    }
    if (entry.kind === 'override' && entry.original) {
      this.engine_.editObject(entry.id, entry.original);
    } else {
      this.engine_.releaseSlots([entry.id]);
    }
    this.unregister_(entry);

    return entry.id;
  }

  /** Engine id for a reference, or null. */
  resolveRef(ref: ObjectRef): number | null {
    if (ref && 'hostId' in ref) {
      return this.byHostId_.get(ref.hostId)?.id ?? null;
    }
    if (ref && 'norad' in ref && typeof ref.norad === 'string') {
      return this.byNorad_.get(ref.norad)?.[0]?.id ?? this.engine_.findIdByNorad(ref.norad);
    }

    return null;
  }

  infoForId(id: number): EmbedObjectInfo | null {
    const data = this.engine_.getObjectData(id);

    if (!data) {
      return null;
    }
    const info: EmbedObjectInfo = { norad: data.norad, name: data.name, tle1: data.tle1, tle2: data.tle2 };
    const hosted = this.byEngineId_.get(id);

    if (hosted) {
      info.hostId = hosted.hostId;
    }

    return info;
  }

  getObject(ref: ObjectRef): EmbedObjectInfo | null {
    const id = this.resolveRef(ref);

    return id === null ? null : this.infoForId(id);
  }

  listHostObjects(): EmbedObjectInfo[] {
    const list: EmbedObjectInfo[] = [];

    for (const entry of this.byHostId_.values()) {
      const info = this.infoForId(entry.id);

      if (info) {
        list.push(info);
      }
    }

    return list;
  }
}
