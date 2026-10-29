/**
 * Shared registry of analyst slot NORAD ids (90000-99999) that something other than the slot's own
 * catalog object is using.
 *
 * A Pro New Launch trajectory may take the NORAD id of an untouched analyst slot (an inactive
 * "Analyst Sat N" placeholder). The trajectory is a separate object, so the slot still looks free to
 * the code that fills analyst slots. Filling it would put two objects on one NORAD id (search hides
 * one, lookups by NORAD are ambiguous). The holder reserves the id here while it exists and releases
 * it when it goes away, and every analyst-slot allocator skips reserved ids:
 *   - CatalogManager.getNextAvailableAnalystSat (orbit previews, IOD, OSS New Launch nominal)
 *   - getFreeAnalystScc (Create Satellite, clone, orbit presets)
 *   - the Pro om-manager slot finder (Maneuver clones, initial orbit)
 *   - Create Satellite validation, so a typed id cannot fill a reserved slot either.
 *
 * Kept free of ServiceLocator/DOM coupling so it can be imported from anywhere, including tests.
 */
export class AnalystSlotReservations {
  /** Normalized NORAD id -> owner tag. */
  private static readonly holders_ = new Map<string, string>();

  /** "090000" and " 90000" are the same id. Non-numeric ids (alpha-5) are kept verbatim. */
  static normalize(sccNum: string | number): string {
    const value = String(sccNum).trim();

    return /^\d+$/u.test(value) ? Number.parseInt(value, 10).toString() : value.toUpperCase();
  }

  /** Reserve an id for `owner` (a short tag such as `new-launch`). Re-reserving replaces the owner. */
  static reserve(sccNum: string | number, owner: string): void {
    AnalystSlotReservations.holders_.set(AnalystSlotReservations.normalize(sccNum), owner);
  }

  /** Release an id. With `owner`, only releases it when that owner holds it. */
  static release(sccNum: string | number, owner?: string): void {
    const key = AnalystSlotReservations.normalize(sccNum);

    if (owner === undefined || AnalystSlotReservations.holders_.get(key) === owner) {
      AnalystSlotReservations.holders_.delete(key);
    }
  }

  /** Release every id `owner` holds. */
  static releaseAll(owner: string): void {
    for (const [key, holder] of AnalystSlotReservations.holders_) {
      if (holder === owner) {
        AnalystSlotReservations.holders_.delete(key);
      }
    }
  }

  static isReserved(sccNum: string | number | null | undefined): boolean {
    if (sccNum === null || sccNum === undefined || sccNum === '') {
      return false;
    }

    return AnalystSlotReservations.holders_.has(AnalystSlotReservations.normalize(sccNum));
  }

  /**
   * Whether a bulk writer (Breakup, Orbit References) may write into this analyst slot without
   * confirmation: the id is not reserved, and the slot holds an inactive placeholder or an object
   * the writer itself created earlier (`ownIds`). An active object made by another tool (Create
   * Satellite, a Maneuver clone, another breakup) is never overwritten.
   */
  static canWrite(sccNum: string | number, obj: { id: number; active?: boolean } | null | undefined, ownIds?: ReadonlySet<number>): boolean {
    if (!obj || AnalystSlotReservations.isReserved(sccNum)) {
      return false;
    }

    return !obj.active || (ownIds?.has(obj.id) ?? false);
  }

  /** The owner holding an id, or null. */
  static holderOf(sccNum: string | number): string | null {
    return AnalystSlotReservations.holders_.get(AnalystSlotReservations.normalize(sccNum)) ?? null;
  }

  /** Every reserved id, normalized. */
  static reserved(): string[] {
    return [...AnalystSlotReservations.holders_.keys()];
  }

  /** Drop every reservation (tests, full app reset). */
  static clear(): void {
    AnalystSlotReservations.holders_.clear();
  }
}
