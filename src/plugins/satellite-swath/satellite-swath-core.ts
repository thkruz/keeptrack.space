/**
 * Pure helpers for the SatelliteSwath plugin: presets, per-satellite settings storage and the
 * conversion to the mesh factory's parameters. No DOM or ServiceLocator imports.
 */
import type { SwathParams } from '@app/engine/rendering/draw-manager/swath-mesh-factory';
import { fovFromSwathWidth, RAD2DEG, swathWidthFromFov } from '@ootk/src/main';

export type SwathPresetId = 'hr-eo' | 'mr-eo' | 'wide' | 'custom';
/** Whether the nadir footprint is entered as a ground width (km) or a sensor FOV (deg). */
export type SwathInputMode = 'width' | 'fov';

/** Everything the swath menu stores per satellite. */
export interface SatelliteSwathSettings {
  presetId: SwathPresetId;
  mode: SwathInputMode;
  swathKm: number;
  fovDeg: number;
  maxOffNadirDeg: number;
  minSunElevDeg: number;
  isShowFieldOfRegard: boolean;
  isDaylightOnly: boolean;
}

/** Illustrative presets (SODA's table); the UI must say they are not published specifications. */
export const SWATH_PRESETS: Readonly<Record<Exclude<SwathPresetId, 'custom'>, Pick<SatelliteSwathSettings, 'mode' | 'swathKm' | 'fovDeg' | 'maxOffNadirDeg' | 'minSunElevDeg'>>> = {
  'hr-eo': { mode: 'width', swathKm: 12, fovDeg: 1.4, maxOffNadirDeg: 30, minSunElevDeg: 10 },
  'mr-eo': { mode: 'width', swathKm: 120, fovDeg: 14, maxOffNadirDeg: 20, minSunElevDeg: 10 },
  wide: { mode: 'width', swathKm: 1500, fovDeg: 110, maxOffNadirDeg: 0, minSunElevDeg: 5 },
};

export const SWATH_PRESET_IDS: readonly SwathPresetId[] = ['hr-eo', 'mr-eo', 'wide', 'custom'];

/** Bounds enforced on user input. */
export const SWATH_LIMITS = {
  swathKm: { min: 0.1, max: 5000 },
  fovDeg: { min: 0.01, max: 170 },
  maxOffNadirDeg: { min: 0, max: 80 },
  minSunElevDeg: { min: -90, max: 90 },
} as const;

/** Most satellites remembered in the per-satellite store; the oldest is dropped beyond it. */
export const SWATH_STORE_CAP = 200;

export const defaultSwathSettings = (): SatelliteSwathSettings =>
  applyPreset({ presetId: 'mr-eo', mode: 'width', swathKm: 120, fovDeg: 14, maxOffNadirDeg: 20, minSunElevDeg: 10, isShowFieldOfRegard: true, isDaylightOnly: false }, 'mr-eo');

/** Copy of `settings` with a preset's geometry applied (custom leaves the numbers alone). */
export function applyPreset(settings: SatelliteSwathSettings, presetId: SwathPresetId): SatelliteSwathSettings {
  if (presetId === 'custom') {
    return { ...settings, presetId };
  }

  return { ...settings, ...SWATH_PRESETS[presetId], presetId };
}

/** Full nadir FOV (deg) for the settings at a mean altitude (km). */
export function resolveFovDeg(settings: SatelliteSwathSettings, meanAltKm: number): number {
  if (settings.mode === 'fov' || !(meanAltKm > 0)) {
    return settings.fovDeg;
  }

  return fovFromSwathWidth(settings.swathKm, meanAltKm) * RAD2DEG;
}

/** Nadir ground width (km) for the settings at a mean altitude, NaN when it cannot be computed. */
export function nadirWidthKm(settings: SatelliteSwathSettings, meanAltKm: number): number {
  if (settings.mode === 'width') {
    return settings.swathKm;
  }
  if (!(meanAltKm > 0)) {
    return Number.NaN;
  }

  return swathWidthFromFov(settings.fovDeg / RAD2DEG, meanAltKm);
}

/** Mesh factory parameters for the settings at a mean altitude. */
export function toSwathParams(settings: SatelliteSwathSettings, meanAltKm: number): SwathParams {
  return {
    fovDeg: resolveFovDeg(settings, meanAltKm),
    maxOffNadirDeg: settings.maxOffNadirDeg,
    minSunElevDeg: settings.minSunElevDeg,
    isShowFieldOfRegard: settings.isShowFieldOfRegard,
    isDaylightOnly: settings.isDaylightOnly,
  };
}

const isNum_ = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/** Validates one stored entry; null when any field is missing or out of range. */
export function sanitizeSwathSettings(raw: unknown): SatelliteSwathSettings | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const r = raw as Record<string, unknown>;

  if (
    !SWATH_PRESET_IDS.includes(r.presetId as SwathPresetId) ||
    (r.mode !== 'width' && r.mode !== 'fov') ||
    !isNum_(r.swathKm, SWATH_LIMITS.swathKm.min, SWATH_LIMITS.swathKm.max) ||
    !isNum_(r.fovDeg, SWATH_LIMITS.fovDeg.min, SWATH_LIMITS.fovDeg.max) ||
    !isNum_(r.maxOffNadirDeg, SWATH_LIMITS.maxOffNadirDeg.min, SWATH_LIMITS.maxOffNadirDeg.max) ||
    !isNum_(r.minSunElevDeg, SWATH_LIMITS.minSunElevDeg.min, SWATH_LIMITS.minSunElevDeg.max) ||
    typeof r.isShowFieldOfRegard !== 'boolean' ||
    typeof r.isDaylightOnly !== 'boolean'
  ) {
    return null;
  }

  return {
    presetId: r.presetId as SwathPresetId,
    mode: r.mode,
    swathKm: r.swathKm,
    fovDeg: r.fovDeg,
    maxOffNadirDeg: r.maxOffNadirDeg,
    minSunElevDeg: r.minSunElevDeg,
    isShowFieldOfRegard: r.isShowFieldOfRegard,
    isDaylightOnly: r.isDaylightOnly,
  };
}

/**
 * Per-satellite swath overrides keyed by sccNum, least recently saved first. Serialised as a
 * JSON array of [sccNum, settings] pairs so the order survives the round trip.
 */
export class SwathSettingsStore {
  private readonly entries_ = new Map<string, SatelliteSwathSettings>();

  constructor(private readonly cap_ = SWATH_STORE_CAP) {}

  static parse(raw: string | null, cap = SWATH_STORE_CAP): SwathSettingsStore {
    const store = new SwathSettingsStore(cap);

    if (!raw) {
      return store;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;

      if (Array.isArray(parsed)) {
        for (const pair of parsed) {
          if (Array.isArray(pair) && typeof pair[0] === 'string') {
            const settings = sanitizeSwathSettings(pair[1]);

            if (settings) {
              store.set(pair[0], settings);
            }
          }
        }
      }
    } catch {
      // A corrupt entry must never break the menu; start empty.
    }

    return store;
  }

  get size(): number {
    return this.entries_.size;
  }

  get(sccNum: string): SatelliteSwathSettings | null {
    const found = this.entries_.get(sccNum);

    return found ? { ...found } : null;
  }

  /** Stores (or refreshes) one satellite, dropping the oldest entries beyond the cap. */
  set(sccNum: string, settings: SatelliteSwathSettings): void {
    this.entries_.delete(sccNum);
    this.entries_.set(sccNum, { ...settings });
    while (this.entries_.size > this.cap_) {
      const oldest = this.entries_.keys().next().value as string;

      this.entries_.delete(oldest);
    }
  }

  keys(): string[] {
    return [...this.entries_.keys()];
  }

  serialize(): string {
    return JSON.stringify([...this.entries_.entries()]);
  }
}
