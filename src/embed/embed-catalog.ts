import type { EmbedEngine } from './embed-engine';
import { EmbedError, type EmbedObject, type EmbedObjectInfo, type EmbedUpsertResult, type ObjectRef } from './embed-types';

type HostedKind = 'slot' | 'override';

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

  constructor(private readonly engine_: EmbedEngine) {}

  upsert(objects: EmbedObject[]): EmbedUpsertResult[] {
    if (!Array.isArray(objects)) {
      throw new EmbedError('INVALID_ARGUMENT', 'upsertObjects expects an array');
    }
    const results = objects.map((o) => this.upsertOne_(o));

    if (results.some((r) => r.ok)) {
      this.engine_.notifyObjectsChanged();
    }

    return results;
  }

  private upsertOne_(obj: EmbedObject): EmbedUpsertResult {
    const hostId = typeof obj?.hostId === 'string' ? obj.hostId : '';

    if (!hostId || typeof obj.name !== 'string') {
      return { hostId, ok: false, error: 'INVALID_ARGUMENT' };
    }
    if (!isValidTlePair(obj.tle1, obj.tle2)) {
      return { hostId, ok: false, error: 'INVALID_TLE' };
    }
    const norad = typeof obj.norad === 'string' && obj.norad.trim() !== '' ? obj.norad.trim() : undefined;
    const existing = this.byHostId_.get(hostId);

    if (existing && existing.norad === norad) {
      this.engine_.editObject(existing.id, { tle1: obj.tle1, tle2: obj.tle2, name: obj.name });

      return { hostId, ok: true, action: 'updated' };
    }
    if (existing) {
      // Identity changed (override <-> fictional, or another NORAD): drop the old binding first
      this.removeOne_(hostId);
    }

    if (this.engine_.catalogMode === 'full' && norad) {
      const catalogId = this.engine_.findIdByNorad(norad);

      if (catalogId !== null) {
        return this.override_(hostId, catalogId, norad, obj);
      }
    }

    return this.addToSlot_(hostId, norad, obj);
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

  private addToSlot_(hostId: string, norad: string | undefined, obj: EmbedObject): EmbedUpsertResult {
    const slot = this.engine_.allocateSlot();

    if (!slot) {
      return { hostId, ok: false, error: 'NO_FREE_SLOT' };
    }
    // Real NORAD identity gives the right mesh; fictional objects keep the slot's own analyst number
    const sccNum = norad ?? slot.sccNum;
    const ok = this.engine_.activateSlot(slot.id, { tle1: obj.tle1, tle2: obj.tle2, name: obj.name, sccNum });

    if (!ok) {
      return { hostId, ok: false, error: 'INVALID_TLE' };
    }
    this.register_({ hostId, id: slot.id, kind: 'slot', norad });

    return { hostId, ok: true, action: 'added' };
  }

  private register_(entry: HostedEntry): void {
    this.byHostId_.set(entry.hostId, entry);
    this.byEngineId_.set(entry.id, entry);
  }

  /** Returns the engine ids that were freed or reverted (so the caller can deselect them). */
  remove(hostIds: string[]): number[] {
    const ids: number[] = [];

    for (const hostId of hostIds) {
      const id = this.removeOne_(hostId);

      if (id !== null) {
        ids.push(id);
      }
    }
    if (ids.length > 0) {
      this.engine_.notifyObjectsChanged();
    }

    return ids;
  }

  private removeOne_(hostId: string): number | null {
    const entry = this.byHostId_.get(hostId);

    if (!entry) {
      return null;
    }
    if (entry.kind === 'override' && entry.original) {
      this.engine_.editObject(entry.id, entry.original);
    } else {
      this.engine_.releaseSlot(entry.id);
    }
    this.byHostId_.delete(hostId);
    this.byEngineId_.delete(entry.id);

    return entry.id;
  }

  /** Engine id for a reference, or null. */
  resolveRef(ref: ObjectRef): number | null {
    if (ref && 'hostId' in ref) {
      return this.byHostId_.get(ref.hostId)?.id ?? null;
    }
    if (ref && 'norad' in ref && typeof ref.norad === 'string') {
      for (const entry of this.byHostId_.values()) {
        if (entry.norad === ref.norad) {
          return entry.id;
        }
      }

      return this.engine_.findIdByNorad(ref.norad);
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
