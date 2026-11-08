import type { EmbedCatalog } from './embed-catalog';
import type { EmbedEngine, EngineLabel, EngineSensor } from './embed-engine';
import type { EmbedSensors } from './embed-sensors';
import { type EmbedColor, EmbedError, type EmbedLayers, type EmbedObjectStyle, type EmbedSensor, type ObjectRef } from './embed-types';

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

  constructor(
    private readonly engine_: EmbedEngine,
    private readonly catalog_: EmbedCatalog,
    private readonly sensors_: EmbedSensors
  ) {}

  // ---- Object styles --------------------------------------------------------

  /** The color set through setObjectStyle for an object, if any. */
  colorFor(id: number): EmbedColor | undefined {
    return this.styles_.get(id)?.color;
  }

  setObjectStyle(ref: ObjectRef, style: EmbedObjectStyle | null): void {
    const id = this.catalog_.resolveRef(ref);

    if (id === null) {
      throw new EmbedError('OBJECT_NOT_FOUND', `No object matches ${JSON.stringify(ref)}`);
    }
    if (style === null) {
      this.clearId_(id);
      this.pushLabels_();

      return;
    }
    validateStyle(style);
    const prev = this.styles_.get(id);
    const next: EmbedObjectStyle = { ...style };

    this.styles_.set(id, next);
    if (next.color) {
      this.engine_.setObjectColor(id, next.color);
    } else if (prev?.color) {
      this.engine_.setObjectColor(id, null);
    }
    this.engine_.setObjectHighlight(id, next.highlight === true);
    this.pushLabels_();
  }

  private clearId_(id: number): void {
    if (this.styles_.delete(id)) {
      this.engine_.setObjectColor(id, null);
      this.engine_.setObjectHighlight(id, false);
    }
  }

  /** Objects were removed from the catalog: forget their styles. */
  dropForObjectIds(ids: number[]): void {
    let changed = false;

    for (const id of ids) {
      if (this.styles_.has(id)) {
        this.clearId_(id);
        changed = true;
      }
    }
    if (changed) {
      this.pushLabels_();
    }
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
    this.pushLabels_();
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
    this.pushLabels_();
  }

  // ---- Layers -----------------------------------------------------------------

  /** Validate then apply. Unknown keys are ignored. */
  setLayers(layers: Partial<EmbedLayers>): void {
    if (!layers || typeof layers !== 'object') {
      throw new EmbedError('INVALID_ARGUMENT', 'setLayers expects an object');
    }
    const clean: Partial<EmbedLayers> = {};

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
    if (clean.labels !== undefined) {
      this.pushLabels_();
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

  private pushLabels_(): void {
    if (this.layers_.labels === 'none') {
      this.engine_.setObjectLabels([]);

      return;
    }
    const labels: EngineLabel[] = [];

    for (const [id, style] of this.styles_) {
      if (!style.label) {
        continue;
      }
      const name = typeof style.label === 'string' ? style.label : (this.catalog_.infoForId(id)?.name ?? '');

      if (name) {
        labels.push({ id, text: name, bold: style.highlight === true, color: style.color });
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
