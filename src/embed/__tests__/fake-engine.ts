import type {
  EmbedEngine,
  EngineGuards,
  EngineLine,
  EngineLineSpec,
  EngineObjectData,
  EngineRuntimeUi,
  EngineSensor,
  EngineSlot,
  EngineSurfaceSpec,
  EngineTle,
} from '../embed-engine';
import type { EmbedAccessWindow, EmbedCatalogMode, EmbedLookAngles, EmbedPosition, EmbedSensor } from '../embed-types';

const TLE1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9006';
const TLE2 = '2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.50000000    19';

function withChecksum(line: string): string {
  let sum = 0;

  for (const ch of line.slice(0, 68)) {
    if (ch >= '0' && ch <= '9') {
      sum += Number(ch);
    } else if (ch === '-') {
      sum += 1;
    }
  }

  return line.slice(0, 68) + String(sum % 10);
}

export const GOOD_TLE1 = withChecksum(TLE1.padEnd(69, ' '));
export const GOOD_TLE2 = withChecksum(TLE2.padEnd(69, ' '));

/** In-memory engine: records calls, lets tests script selection success and catalog contents. */
export class FakeEngine implements EmbedEngine {
  ready = true;
  selectedId = -1;
  /** The next N select attempts of a real object fail (cruncher not seeded yet). */
  selectFailuresLeft = 0;
  selectCalls: number[] = [];
  objects = new Map<number, EngineObjectData>();
  slotsFree = 100;
  nextSlot = 100;
  editCalls: { id: number; tle: EngineTle }[] = [];
  releaseCalls: number[] = [];
  activateCalls: { id: number; tle: EngineTle }[] = [];
  rejectActivate = false;
  timeMs = 1_700_000_000_000;
  rate = 1;
  cameraCalls: unknown[][] = [];
  guards: EngineGuards = {};
  selectionCb: (id: number) => void = () => undefined;
  timeCb: () => void = () => undefined;
  hoverCb: (id: number) => void = () => undefined;
  createdSensors: { sensor: EmbedSensor; objName: string }[] = [];
  activeSensors: EngineSensor[] = [];
  lines: { spec: EngineLineSpec; handle: EngineLine }[] = [];
  /** Handles the fake engine "garbage collected" (isLineAlive false) or removed. */
  deadLines = new Set<EngineLine>();
  /** When true addLine returns null (object not drawable). */
  rejectLines = false;
  runtimeUi: EngineRuntimeUi[] = [];
  accessCalls: { id: number; startMs: number; endMs: number }[] = [];
  screenshotBlob = new Blob(['png'], { type: 'image/png' });

  constructor(readonly catalogMode: EmbedCatalogMode = 'scenario') {}

  isEngineReady(): boolean {
    return this.ready;
  }

  getSelectedId(): number {
    return this.selectedId;
  }

  selectById(id: number): boolean {
    this.selectCalls.push(id);
    if (id !== -1 && this.selectFailuresLeft > 0) {
      this.selectFailuresLeft--;

      return false;
    }
    this.selectedId = id;
    this.selectionCb(id);

    return true;
  }

  getObjectData(id: number): EngineObjectData | null {
    return this.objects.get(id) ?? null;
  }

  findIdByNorad(norad: string): number | null {
    for (const o of this.objects.values()) {
      if (o.norad === norad) {
        return o.id;
      }
    }

    return null;
  }

  allocateSlot(): EngineSlot | null {
    if (this.slotsFree <= 0) {
      return null;
    }
    this.slotsFree--;
    const id = this.nextSlot++;

    return { id, sccNum: `A${id}` };
  }

  activateSlot(id: number, tle: EngineTle): boolean {
    this.activateCalls.push({ id, tle });
    if (this.rejectActivate) {
      return false;
    }
    this.objects.set(id, { id, name: tle.name, norad: tle.sccNum ?? '', tle1: tle.tle1, tle2: tle.tle2 });

    return true;
  }

  editObject(id: number, tle: EngineTle): void {
    this.editCalls.push({ id, tle });
    const cur = this.objects.get(id);

    this.objects.set(id, { id, name: tle.name, norad: cur?.norad ?? '', tle1: tle.tle1, tle2: tle.tle2 });
  }

  releaseSlot(id: number): void {
    this.releaseCalls.push(id);
    this.objects.delete(id);
  }

  // ---- Bulk (1.4) ----
  bulkCalls: { fn: string; n: number }[] = [];
  slotCapacity = 100000;

  allocateSlots(count: number): EngineSlot[] {
    const out: EngineSlot[] = [];

    for (let i = 0; i < count; i++) {
      const slot = this.allocateSlot();

      if (!slot) {
        break;
      }
      out.push(slot);
    }
    this.bulkCalls.push({ fn: 'allocateSlots', n: count });

    return out;
  }

  activateSlots(items: { id: number; tle: EngineTle }[]): boolean[] {
    this.bulkCalls.push({ fn: 'activateSlots', n: items.length });

    return items.map((it) => this.activateSlot(it.id, it.tle));
  }

  editObjects(items: { id: number; tle: EngineTle }[]): void {
    this.bulkCalls.push({ fn: 'editObjects', n: items.length });
    for (const it of items) {
      this.editObject(it.id, it.tle);
    }
  }

  releaseSlots(ids: number[]): void {
    this.bulkCalls.push({ fn: 'releaseSlots', n: ids.length });
    for (const id of ids) {
      this.releaseSlot(id);
    }
  }

  getSlotCapacity(): number {
    return this.slotCapacity;
  }

  setObjectColors(entries: [number, unknown][]): void {
    this.bulkCalls.push({ fn: 'setObjectColors', n: entries.length });
    for (const [id, c] of entries) {
      this.setObjectColor(id, c);
    }
  }

  setObjectHighlights(entries: [number, boolean][]): void {
    this.bulkCalls.push({ fn: 'setObjectHighlights', n: entries.length });
    for (const [id, on] of entries) {
      this.setObjectHighlight(id, on);
    }
  }

  notifyObjectsChanged(): void {
    // no-op
  }

  setCamera(...args: unknown[]): void {
    this.cameraCalls.push(args);
  }

  // ---- Styling, layers, camera view (1.2) ----
  objectColors = new Map<number, unknown>();
  highlighted = new Set<number>();
  labelSets: unknown[][] = [];
  layerCalls: unknown[] = [];
  sensorStyles: { sensor: EngineSensor; style: unknown }[] = [];

  setObjectColor(id: number, color: unknown): void {
    if (color === null) {
      this.objectColors.delete(id);
    } else {
      this.objectColors.set(id, color);
    }
  }

  setObjectHighlight(id: number, on: boolean): void {
    if (on) {
      this.highlighted.add(id);
    } else {
      this.highlighted.delete(id);
    }
  }

  setObjectLabels(labels: unknown[]): void {
    this.labelSets.push(labels);
  }

  markerLabelSets: unknown[][] = [];

  setMarkerLabels(labels: unknown[]): void {
    this.markerLabelSets.push(labels);
  }

  applyLayers(layers: unknown): void {
    this.layerCalls.push(layers);
  }

  setSensorStyle(sensor: EngineSensor, style: unknown): void {
    this.sensorStyles.push({ sensor, style });
  }

  renderSuspended = false;

  setRenderSuspended(suspended: boolean): void {
    this.renderSuspended = suspended;
  }

  getTimeMs(): number {
    return this.timeMs;
  }

  getRate(): number {
    return this.rate;
  }

  setTimeMs(timeMs: number): void {
    this.timeMs = timeMs;
    this.timeCb();
  }

  setRate(rate: number): void {
    this.rate = rate;
    this.timeCb();
  }

  onSelectionChanged(cb: (id: number) => void): void {
    this.selectionCb = cb;
  }

  onTimeChanged(cb: () => void): void {
    this.timeCb = cb;
  }

  onHoverChanged(cb: (id: number) => void): void {
    this.hoverCb = cb;
  }

  installGuards(guards: EngineGuards): void {
    this.guards = guards;
  }

  createSensor(sensor: EmbedSensor, objName: string): EngineSensor {
    this.createdSensors.push({ sensor, objName });

    return { objName };
  }

  setActiveSensorSet(sensors: EngineSensor[]): void {
    this.activeSensors = [...sensors];
  }

  isSensorActive(sensor: EngineSensor): boolean {
    return this.activeSensors.includes(sensor);
  }

  addLine(spec: EngineLineSpec): EngineLine | null {
    if (this.rejectLines) {
      return null;
    }
    const handle: EngineLine = {};

    this.lines.push({ spec, handle });

    return handle;
  }

  /** Surface lines by handle, with the latest spec (updates replace it). */
  surfaceLines = new Map<EngineLine, EngineSurfaceSpec>();
  surfaceAdds = 0;
  surfaceUpdates = 0;
  /** Scripted positions; default is a fixed point. */
  positionFn: ((id: number, timeMs: number) => EmbedPosition | null) | null = null;

  addSurfaceLine(spec: EngineSurfaceSpec): EngineLine | null {
    if (this.rejectLines) {
      return null;
    }
    const handle: EngineLine = {};

    this.surfaceAdds++;
    this.surfaceLines.set(handle, spec);
    this.lines.push({ spec: spec as unknown as EngineLineSpec, handle });

    return handle;
  }

  updateSurfaceLine(line: EngineLine, spec: EngineSurfaceSpec): void {
    this.surfaceUpdates++;
    this.surfaceLines.set(line, spec);
  }

  removeLine(line: EngineLine): void {
    this.surfaceLines.delete(line);
    this.deadLines.add(line);
    this.lines = this.lines.filter((l) => l.handle !== line);
  }

  isLineAlive(line: EngineLine): boolean {
    return !this.deadLines.has(line) && this.lines.some((l) => l.handle === line);
  }

  /** Simulate the engine dropping a line on its own. */
  gcLine(line: EngineLine): void {
    this.deadLines.add(line);
    this.lines = this.lines.filter((l) => l.handle !== line);
  }

  applyRuntimeUi(flags: EngineRuntimeUi): void {
    this.runtimeUi.push(flags);
  }

  getPosition(id: number, timeMs: number): EmbedPosition | null {
    if (this.positionFn) {
      return this.positionFn(id, timeMs);
    }
    return this.objects.has(id) ? { timeMs, eci: { x: 7000, y: 0, z: 0 }, lla: { lat: 0, lon: 0, altKm: 620 } } : null;
  }

  getLookAngles(_sensor: EngineSensor, id: number, timeMs: number): EmbedLookAngles | null {
    return this.objects.has(id) ? { timeMs, azDeg: 10, elDeg: 20, rngKm: 1000, inFov: true } : null;
  }

  findAccessWindows(_sensor: EngineSensor, id: number, startMs: number, endMs: number): EmbedAccessWindow[] {
    this.accessCalls.push({ id, startMs, endMs });

    return [{ startMs: startMs + 1000, endMs: startMs + 61_000, maxElDeg: 45 }];
  }

  captureFrame(): Promise<Blob> {
    return Promise.resolve(this.screenshotBlob);
  }
}
