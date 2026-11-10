import type { EmbedCatalog } from './embed-catalog';
import type { EmbedEngine, EngineLabel, EngineSensor } from './embed-engine';
import type { EmbedSensors } from './embed-sensors';
import {
  EMBED_DEFAULT_LABEL_BUDGET,
  type EmbedColor,
  EmbedError,
  type EmbedGroupDef,
  type EmbedGroupInfo,
  type EmbedGroupStyle,
  type EmbedLayers,
  type EmbedObject,
  type EmbedObjectStyle,
  type EmbedObjectStyleEntry,
  type EmbedSensor,
  type EmbedUpsertResult,
  type ObjectRef,
} from './embed-types';

function sameColor(a: EmbedColor | null, b: EmbedColor | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }

  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

function validateGroup(def: unknown): asserts def is EmbedGroupDef {
  const d = def as Partial<EmbedGroupDef> | null;

  if (!d || typeof d !== 'object' || typeof d.id !== 'string' || d.id === '') {
    throw new EmbedError('INVALID_ARGUMENT', 'A group needs a non-empty string id');
  }
  if (d.color !== undefined) {
    validateColor(d.color, `Group '${d.id}' color`);
  }
  if (d.visible !== undefined && typeof d.visible !== 'boolean') {
    throw new EmbedError('INVALID_ARGUMENT', 'group.visible must be a boolean');
  }
  if (d.highlight !== undefined && typeof d.highlight !== 'boolean') {
    throw new EmbedError('INVALID_ARGUMENT', 'group.highlight must be a boolean');
  }
}

const LABEL_MODES: readonly EmbedLayers['labels'][] = ['all', 'host', 'none'];

export function validateColor(color: unknown, what: string): asserts color is EmbedColor {
  if (!Array.isArray(color) || color.length !== 4 || color.some((c) => typeof c !== 'number' || !Number.isFinite(c) || c < 0 || c > 1)) {
    throw new EmbedError('INVALID_ARGUMENT', `${what} must be [r, g, b, a] with each channel 0..1`);
  }
}

function validateStyle(style: unknown): asserts style is EmbedObjectStyle {
  const s = style as EmbedObjectStyle | null;

  if (!s || typeof s !== 'object' || Array.isArray(s)) {
    throw new EmbedError('INVALID_ARGUMENT', 'setObjectStyle expects a style object or null');
  }
  if (s.color !== undefined) {
    validateColor(s.color, 'style.color');
  }
  if (s.highlight !== undefined && typeof s.highlight !== 'boolean') {
    throw new EmbedError('INVALID_ARGUMENT', 'style.highlight must be a boolean');
  }
  if (s.label !== undefined && typeof s.label !== 'boolean' && typeof s.label !== 'string') {
    throw new EmbedError('INVALID_ARGUMENT', 'style.label must be a boolean or a string');
  }
}

/**
 * Object styling (color, highlight, label), sensor marker styling and scene layers.
 *
 * Color goes through the color scheme manager's override map (applied after every scheme update), highlight
 * through the dots manager's size status, labels through a DOM tag layer, layers through engine settings read
 * every frame. All of it applies at runtime; nothing needs a reload.
 */
export class EmbedStyle {
  private readonly styles_ = new Map<number, EmbedObjectStyle>();
  private layers_: Partial<EmbedLayers> = {};
  private readonly sensorDefs_ = new Map<string, EmbedSensor>();
  private readonly groups_ = new Map<string, EmbedGroupDef>();
  private readonly groupOf_ = new Map<number, string>();
  /** What was last pushed to the engine per object. */
  private readonly applied_ = new Map<number, { color: EmbedColor | null; highlight: boolean }>();

  constructor(
    private readonly engine_: EmbedEngine,
    private readonly catalog_: EmbedCatalog,
    private readonly sensors_: EmbedSensors
  ) {}

  // ---- Object styles --------------------------------------------------------

  /** The color set through setObjectStyle or the object's group for an object, if any (ignores group visibility). */
  colorFor(id: number): EmbedColor | undefined {
    return this.styles_.get(id)?.color ?? this.groupDefFor_(id)?.color;
  }

  private groupDefFor_(id: number): EmbedGroupDef | undefined {
    const gid = this.groupOf_.get(id);

    return gid === undefined ? undefined : this.groups_.get(gid);
  }

  private effective_(id: number): { color: EmbedColor | null; highlight: boolean } {
    const own = this.styles_.get(id);
    const group = this.groupDefFor_(id);
    let color: EmbedColor | null = own?.color ?? group?.color ?? null;
    const highlight = own?.highlight ?? group?.highlight ?? false;

    if (group?.visible === false) {
      const c = color ?? [1, 1, 1, 1];

      color = [c[0], c[1], c[2], 0];
    }

    return { color, highlight };
  }

  /** Recompute these objects' effective style and push only the differences, in bulk. */
  private reapply_(ids: Iterable<number>): void {
    const colors: [number, EmbedColor | null][] = [];
    const highlights: [number, boolean][] = [];

    for (const id of ids) {
      const next = this.effective_(id);
      const prev = this.applied_.get(id) ?? { color: null, highlight: false };

      if (!sameColor(prev.color, next.color)) {
        colors.push([id, next.color]);
      }
      if (prev.highlight !== next.highlight) {
        highlights.push([id, next.highlight]);
      }
      if (next.color === null && !next.highlight) {
        this.applied_.delete(id);
      } else {
        this.applied_.set(id, next);
      }
    }
    if (colors.length > 0) {
      this.engine_.setObjectColors(colors);
    }
    if (highlights.length > 0) {
      this.engine_.setObjectHighlights(highlights);
    }
  }

  setObjectStyle(ref: ObjectRef, style: EmbedObjectStyle | null): void {
    const id = this.catalog_.resolveRef(ref);

    if (id === null) {
      throw new EmbedError('OBJECT_NOT_FOUND', `No object matches ${JSON.stringify(ref)}`);
    }
    if (style === null) {
      this.styles_.delete(id);
    } else {
      validateStyle(style);
      this.styles_.set(id, { ...style });
    }
    this.reapply_([id]);
    this.refreshLabels();
  }

  /** Apply a style to many objects in one pass. Entries with an unknown ref are skipped. All styles are validated first. */
  setObjectStyles(entries: EmbedObjectStyleEntry[]): void {
    if (!Array.isArray(entries)) {
      throw new EmbedError('INVALID_ARGUMENT', 'setObjectStyles expects an array');
    }
    for (const e of entries) {
      if (e?.style !== null) {
        validateStyle(e?.style);
      }
    }
    const touched: number[] = [];

    for (const e of entries) {
      const id = this.catalog_.resolveRef(e.ref);

      if (id === null) {
        continue;
      }
      if (e.style === null) {
        this.styles_.delete(id);
      } else {
        this.styles_.set(id, { ...e.style });
      }
      touched.push(id);
    }
    this.reapply_(touched);
    this.refreshLabels();
  }

  setStyleForObjects(refs: ObjectRef[], style: EmbedObjectStyle | null): void {
    if (!Array.isArray(refs)) {
      throw new EmbedError('INVALID_ARGUMENT', 'setStyleForObjects expects an array of refs');
    }
    this.setObjectStyles(refs.map((ref) => ({ ref, style })));
  }

  clearObjectStyles(): void {
    const ids = [...this.styles_.keys()];

    this.styles_.clear();
    this.reapply_(ids);
    this.refreshLabels();
  }

  /** Objects were removed from the catalog: forget their styles and group membership. */
  dropForObjectIds(ids: number[]): void {
    let changed = false;

    for (const id of ids) {
      if (this.styles_.delete(id)) {
        changed = true;
      }
      this.groupOf_.delete(id);
    }
    this.reapply_(ids);
    if (changed) {
      this.refreshLabels();
    }
  }

  // ---- Groups -------------------------------------------------------------------

  defineGroups(defs: EmbedGroupDef[]): void {
    if (!Array.isArray(defs)) {
      throw new EmbedError('INVALID_ARGUMENT', 'defineGroups expects an array');
    }
    for (const d of defs) {
      validateGroup(d);
    }
    const ids = new Set<string>();

    for (const d of defs) {
      this.groups_.set(d.id, { id: d.id, color: d.color, visible: d.visible, highlight: d.highlight });
      ids.add(d.id);
    }
    this.reapplyGroups_(ids);
  }

  setGroupStyle(id: string, style: EmbedGroupStyle): void {
    const def = this.groups_.get(id);

    if (!def) {
      throw new EmbedError('INVALID_ARGUMENT', `Unknown group '${String(id)}'. Call defineGroups first.`);
    }
    validateGroup({ ...style, id });
    this.groups_.set(id, { ...def, ...style, id });
    this.reapplyGroups_(new Set([id]));
  }

  /** Assign objects to a group (null: leave any group). Refs that match no object are skipped. */
  assignToGroup(groupId: string | null, refs: ObjectRef[]): void {
    if (groupId !== null && (typeof groupId !== 'string' || groupId === '')) {
      throw new EmbedError('INVALID_ARGUMENT', 'assignToGroup expects a group id string or null');
    }
    if (!Array.isArray(refs)) {
      throw new EmbedError('INVALID_ARGUMENT', 'assignToGroup expects an array of refs');
    }
    const touched: number[] = [];

    for (const ref of refs) {
      const id = this.catalog_.resolveRef(ref);

      if (id === null) {
        continue;
      }
      if (groupId === null) {
        this.groupOf_.delete(id);
      } else {
        this.groupOf_.set(id, groupId);
      }
      touched.push(id);
    }
    this.reapply_(touched);
  }

  /** After upsertObjects: objects that carry `group` join it. */
  assignFromUpsert(objects: EmbedObject[], results: EmbedUpsertResult[]): void {
    const touched: number[] = [];

    for (let i = 0; i < results.length; i++) {
      const group = objects[i]?.group;

      if (!results[i].ok || typeof group !== 'string' || group === '') {
        continue;
      }
      const id = this.catalog_.resolveRef({ hostId: results[i].hostId });

      if (id !== null) {
        this.groupOf_.set(id, group);
        touched.push(id);
      }
    }
    if (touched.length > 0) {
      this.reapply_(touched);
    }
  }

  /** Delete the definition and membership; returns the former member ids so the caller can remove the objects. */
  removeGroup(id: string): number[] {
    const members: number[] = [];

    for (const [objId, gid] of this.groupOf_) {
      if (gid === id) {
        members.push(objId);
      }
    }
    this.groups_.delete(id);
    for (const objId of members) {
      this.groupOf_.delete(objId);
    }
    this.reapply_(members);

    return members;
  }

  getGroups(): EmbedGroupInfo[] {
    const counts = new Map<string, number>();

    for (const gid of this.groupOf_.values()) {
      counts.set(gid, (counts.get(gid) ?? 0) + 1);
    }
    const ids = new Set<string>([...this.groups_.keys(), ...counts.keys()]);

    return [...ids].map((id) => {
      const d = this.groups_.get(id);

      return { id, color: d?.color, visible: d?.visible !== false, highlight: d?.highlight === true, count: counts.get(id) ?? 0 };
    });
  }

  private reapplyGroups_(groupIds: Set<string>): void {
    const members: number[] = [];

    for (const [objId, gid] of this.groupOf_) {
      if (groupIds.has(gid)) {
        members.push(objId);
      }
    }
    this.reapply_(members);
  }

  // ---- Sensors ----------------------------------------------------------------

  /** Reject bad colors before any sensor is created. */
  validateSensors(defs: EmbedSensor[]): void {
    for (const def of Array.isArray(defs) ? defs : []) {
      if (def?.color !== undefined) {
        validateColor(def.color, `Sensor '${def.hostId}' color`);
      }
    }
  }

  /** Called after upsertSensors: (re)applies marker color and label for every given sensor. */
  applySensors(defs: EmbedSensor[]): void {
    for (const def of defs) {
      this.sensorDefs_.set(def.hostId, def);
      const engineSensor = this.sensors_.getEngineSensor(def.hostId);

      if (engineSensor) {
        if (def.color !== undefined) {
          validateColor(def.color, `Sensor '${def.hostId}' color`);
        }
        this.engine_.setSensorStyle(engineSensor, { color: def.color, label: def.label ? def.name : undefined });
      }
    }
    this.refreshLabels();
  }

  /** Sensors were removed. `engineSensors` are their engine objects, looked up before removal, so the markers come down. */
  dropSensors(hostIds: string[], engineSensors: (EngineSensor | null)[] = []): void {
    for (const id of hostIds) {
      this.sensorDefs_.delete(id);
    }
    for (const sensor of engineSensors) {
      if (sensor) {
        this.engine_.setSensorStyle(sensor, {});
      }
    }
    this.refreshLabels();
  }

  // ---- Layers -----------------------------------------------------------------

  /** Validate then apply. Unknown keys are ignored. */
  setLayers(layers: Partial<EmbedLayers>): void {
    if (!layers || typeof layers !== 'object') {
      throw new EmbedError('INVALID_ARGUMENT', 'setLayers expects an object');
    }
    const clean: Partial<EmbedLayers> = {};

    if (layers.labelBudget !== undefined) {
      if (!Number.isInteger(layers.labelBudget) || layers.labelBudget < 0) {
        throw new EmbedError('INVALID_ARGUMENT', 'layers.labelBudget must be an integer >= 0');
      }
      clean.labelBudget = layers.labelBudget;
    }
    for (const key of ['dayNight', 'graticule', 'orbits'] as const) {
      if (layers[key] !== undefined) {
        if (typeof layers[key] !== 'boolean') {
          throw new EmbedError('INVALID_ARGUMENT', `layers.${key} must be a boolean`);
        }
        clean[key] = layers[key];
      }
    }
    if (layers.labels !== undefined) {
      if (!LABEL_MODES.includes(layers.labels)) {
        throw new EmbedError('INVALID_ARGUMENT', "layers.labels must be 'all', 'host' or 'none'");
      }
      clean.labels = layers.labels;
    }
    this.layers_ = { ...this.layers_, ...clean };
    this.pushLayers_(clean);
    if (clean.labels !== undefined || clean.labelBudget !== undefined) {
      this.refreshLabels();
    }
  }

  private pushLayers_(changed: Partial<EmbedLayers>): void {
    const state: Parameters<EmbedEngine['applyLayers']>[0] = {};

    if (changed.dayNight !== undefined) {
      state.dayNight = changed.dayNight;
    }
    if (changed.graticule !== undefined) {
      state.graticule = changed.graticule;
    }
    if (changed.orbits !== undefined) {
      state.orbitIds = changed.orbits ? this.hostObjectIds_() : [];
    }
    if (changed.labels !== undefined) {
      state.allLabels = changed.labels === 'all';
    }
    this.engine_.applyLayers(state);
  }

  private hostObjectIds_(): number[] {
    const ids: number[] = [];

    for (const info of this.catalog_.listHostObjects()) {
      const id = info.hostId === undefined ? null : this.catalog_.resolveRef({ hostId: info.hostId });

      if (id !== null) {
        ids.push(id);
      }
    }

    return ids;
  }

  /** Host objects were added or removed: refresh the orbit set when the orbits layer is on. */
  refreshOrbits(): void {
    if (this.layers_.orbits) {
      this.engine_.applyLayers({ orbitIds: this.hostObjectIds_() });
    }
  }

  // ---- Labels -----------------------------------------------------------------

  /** Push the label set, applying the budget: selected first, then highlighted, then style order. */
  refreshLabels(): void {
    if (this.layers_.labels === 'none') {
      this.engine_.setObjectLabels([]);

      return;
    }
    const budget = this.layers_.labelBudget ?? EMBED_DEFAULT_LABEL_BUDGET;
    const selected = this.engine_.getSelectedId();
    const first: number[] = [];
    const second: number[] = [];
    const rest: number[] = [];

    for (const [id, style] of this.styles_) {
      if (!style.label) {
        continue;
      }
      if (id === selected) {
        first.push(id);
      } else if (this.effective_(id).highlight) {
        second.push(id);
      } else {
        rest.push(id);
      }
    }
    const labels: EngineLabel[] = [];

    for (const id of [...first, ...second, ...rest].slice(0, budget)) {
      const style = this.styles_.get(id) as EmbedObjectStyle;
      const name = typeof style.label === 'string' ? style.label : (this.catalog_.infoForId(id)?.name ?? '');

      if (name) {
        labels.push({ id, text: name, bold: this.effective_(id).highlight, color: style.color ?? this.groupDefFor_(id)?.color });
      }
    }
    for (const def of this.sensorDefs_.values()) {
      const sensor = def.label ? this.sensors_.getEngineSensor(def.hostId) : null;

      if (sensor) {
        labels.push({ sensor, text: def.name, bold: false, color: def.color });
      }
    }
    this.engine_.setObjectLabels(labels);
  }
}
