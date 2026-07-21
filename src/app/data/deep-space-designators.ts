/**
 * Registry mapping NORAD catalog numbers and international designators to
 * deep-space objects that have no TLE and therefore cannot be resolved through
 * the normal catalog (`sccNum2Id`). External sites link to KeepTrack with real
 * NORAD IDs (e.g. ?sat=10321 for Voyager 1); this registry lets the URL
 * handler route those to the deep-space catalog instead of "not found".
 *
 * Entry kinds:
 * - `probe`     - Chebyshev-ephemeris satellite resident in
 *                 `scene.deepSpaceSatellites` (seeded automatically from
 *                 DEEP_SPACE_SATELLITE_CONFIGS).
 * - `deferred`  - object loaded on demand by a plugin (e.g. pro OEM missions);
 *                 the registrant supplies a `focus()` callback.
 * - `knownObject` - recognized deep-space object with no ephemeris available
 *                 yet; resolves to a friendly toast naming the object.
 */
import { errorManagerInstance } from '@app/engine/utils/errorManager';

export interface DeepSpaceDesignatorEntry {
  kind: 'probe' | 'deferred' | 'knownObject';
  /** Human-readable name used in toasts (e.g. "Voyager 1") */
  displayName: string;
  /** NORAD catalog number, when assigned */
  sccNum?: string;
  /** International designator (COSPAR), when assigned */
  intlDes?: string;
  /** Scene key in `scene.deepSpaceSatellites` (kind 'probe' only) */
  bodyName?: string;
  /** Loads/centers the object; resolves false on failure (kind 'deferred' only) */
  focus?: () => Promise<boolean>;
}

export abstract class DeepSpaceDesignators {
  private static readonly bySccNum_ = new Map<string, DeepSpaceDesignatorEntry>();
  private static readonly byIntlDes_ = new Map<string, DeepSpaceDesignatorEntry>();
  /** Entries registered as seeds (probe configs); survive reset(). */
  private static readonly seeds_: DeepSpaceDesignatorEntry[] = [];

  /**
   * Registers a permanent entry (called by the deep-space probe catalog at
   * module load). This module deliberately does NOT import the probe catalog:
   * that chain evaluates the CelestialBody class hierarchy and pulling it in
   * from the URL manager creates a TDZ import cycle that crashes boot. The
   * catalog pushes its designators here instead.
   */
  static registerSeed(entry: DeepSpaceDesignatorEntry): void {
    this.seeds_.push(entry);
    this.register(entry);
  }

  /**
   * Registers a designator entry. Plugins (e.g. pro deep-space missions) call
   * this at init for objects they can load on demand. Duplicate designators
   * are rejected so a bad config cannot shadow an existing object - with one
   * exception: informational `knownObject` entries yield to functional
   * (`probe`/`deferred`) registrations, so an object listed as "no ephemeris
   * yet" is upgraded in place once something can actually load it.
   */
  static register(entry: DeepSpaceDesignatorEntry): void {
    const scc = entry.sccNum ? this.normalizeSccNum_(entry.sccNum) : null;
    const intlDes = entry.intlDes ? entry.intlDes.trim().toUpperCase() : null;

    if (!scc && !intlDes) {
      errorManagerInstance.log(`DeepSpaceDesignators: entry for "${entry.displayName}" has no designator, ignoring`);

      return;
    }

    const existing = (scc ? this.bySccNum_.get(scc) : null) ?? (intlDes ? this.byIntlDes_.get(intlDes) : null) ?? null;

    if (existing) {
      if (existing.kind === 'knownObject' && entry.kind !== 'knownObject') {
        this.remove_(existing);
      } else {
        errorManagerInstance.log(`DeepSpaceDesignators: duplicate designator for "${entry.displayName}", ignoring`);

        return;
      }
    }

    if (scc) {
      this.bySccNum_.set(scc, entry);
    }
    if (intlDes) {
      this.byIntlDes_.set(intlDes, entry);
    }
  }

  /** Removes an entry from both indexes (used when upgrading a knownObject). */
  private static remove_(entry: DeepSpaceDesignatorEntry): void {
    if (entry.sccNum) {
      this.bySccNum_.delete(this.normalizeSccNum_(entry.sccNum));
    }
    if (entry.intlDes) {
      this.byIntlDes_.delete(entry.intlDes.trim().toUpperCase());
    }
  }

  /** Looks up an entry by NORAD catalog number (tolerates zero-padding). */
  static lookupSccNum(val: string): DeepSpaceDesignatorEntry | null {
    return this.bySccNum_.get(this.normalizeSccNum_(val)) ?? null;
  }

  /** Looks up an entry by international designator (case-insensitive). */
  static lookupIntlDes(val: string): DeepSpaceDesignatorEntry | null {
    return this.byIntlDes_.get(val.trim().toUpperCase()) ?? null;
  }

  /**
   * Reverse lookup: the NORAD catalog number for a `scene.deepSpaceSatellites`
   * key, used to write `sat=` into share URLs when a probe is the center body.
   */
  static sccNumForBody(bodyName: string): string | null {
    for (const [scc, entry] of this.bySccNum_) {
      if (entry.bodyName === bodyName) {
        return scc;
      }
    }

    return null;
  }

  /** Test hook: clears runtime registrations and re-applies the seeds. */
  static reset(): void {
    this.bySccNum_.clear();
    this.byIntlDes_.clear();
    for (const seed of this.seeds_) {
      this.register(seed);
    }
  }

  /**
   * Numeric catalog numbers are stored without leading zeros so "010321" and
   * "10321" resolve identically; non-numeric forms are uppercased as-is.
   */
  private static normalizeSccNum_(val: string): string {
    const trimmed = val.trim();

    return /^\d+$/u.test(trimmed) ? String(parseInt(trimmed, 10)) : trimmed.toUpperCase();
  }
}

/**
 * Popular deep-space objects external sites link to that have no KeepTrack
 * ephemeris yet. A URL hit resolves to a toast naming the object instead of a
 * generic "not found". Once ephemeris exists (Chebyshev probe or a plugin
 * loader), the functional registration upgrades these in place.
 *
 * Designators verified against the CelesTrak SATCAT mirror
 * (api.keeptrack.space/v4/satcat/latest) on 2026-07-21.
 */
const KNOWN_DEEP_SPACE_OBJECTS: DeepSpaceDesignatorEntry[] = [
  { kind: 'knownObject', displayName: 'Pioneer 10', sccNum: '5860', intlDes: '1972-012A' },
  { kind: 'knownObject', displayName: 'Pioneer 11', sccNum: '6421', intlDes: '1973-019A' },
  { kind: 'knownObject', displayName: 'New Horizons', sccNum: '28928', intlDes: '2006-001A' },
  { kind: 'knownObject', displayName: 'Parker Solar Probe', sccNum: '43592', intlDes: '2018-065A' },
  { kind: 'knownObject', displayName: 'JWST', sccNum: '50463', intlDes: '2021-130A' },
];

for (const entry of KNOWN_DEEP_SPACE_OBJECTS) {
  DeepSpaceDesignators.registerSeed(entry);
}
