import { SolarBody } from '@app/engine/core/interfaces';

/**
 * planets-bodies.ts is the single source of truth for the solar-system body
 * taxonomy used by the Planets menu. Keeping the lists and the membership
 * helpers here (instead of inline in the plugin) means the "planned" bodies are
 * derived rather than re-listed, so the menu HTML, the click guard, and the
 * command palette can never drift out of sync.
 */

export type BodyCategory = 'planets' | 'dwarfPlanets' | 'otherCelestialBodies';

export const PLANETS: readonly SolarBody[] = [
  SolarBody.Mercury,
  SolarBody.Venus,
  SolarBody.Earth,
  SolarBody.Mars,
  SolarBody.Jupiter,
  SolarBody.Saturn,
  SolarBody.Uranus,
  SolarBody.Neptune,
];

export const DWARF_PLANETS: readonly SolarBody[] = [
  SolarBody.Pluto,
  SolarBody.Makemake,
  SolarBody.Eris,
  SolarBody.Haumea,
  SolarBody.Ceres,
  SolarBody.Sedna,
  SolarBody.Quaoar,
  SolarBody.Orcus,
  SolarBody.Gonggong,
  SolarBody.Charon,
];

export const OTHER_CELESTIAL_BODIES: readonly SolarBody[] = [
  SolarBody.Moon,
  SolarBody.Sun,
  SolarBody.Io,
  SolarBody.Europa,
  SolarBody.Ganymede,
  SolarBody.Callisto,
  SolarBody.Titan,
  SolarBody.Rhea,
  SolarBody.Iapetus,
  SolarBody.Dione,
  SolarBody.Tethys,
  SolarBody.Enceladus,
];

/**
 * Bodies that appear in the menu but are not yet loaded into the scene. They
 * render as disabled rows and are rejected by {@link changePlanet}. Derived
 * membership only - never re-list these inline.
 */
export const PLANNED_BODIES: ReadonlySet<SolarBody> = new Set([
  SolarBody.Io,
  SolarBody.Europa,
  SolarBody.Ganymede,
  SolarBody.Callisto,
  SolarBody.Titan,
  SolarBody.Rhea,
  SolarBody.Iapetus,
  SolarBody.Dione,
  SolarBody.Tethys,
  SolarBody.Enceladus,
]);

/** Every body the menu knows about, in display order. */
export const ALL_BODIES: readonly SolarBody[] = [...PLANETS, ...DWARF_PLANETS, ...OTHER_CELESTIAL_BODIES];

/** True if the body is listed in the menu but planned for a future update (not yet in the scene). */
export function isPlanned(body: SolarBody): boolean {
  return PLANNED_BODIES.has(body);
}

/** True if the body belongs to any of the menu's categories. */
export function isKnownBody(body: SolarBody): boolean {
  return PLANETS.includes(body) || DWARF_PLANETS.includes(body) || OTHER_CELESTIAL_BODIES.includes(body);
}

/** True if the body is known and currently selectable (loaded, not planned). */
export function isSelectableBody(body: SolarBody): boolean {
  return isKnownBody(body) && !isPlanned(body);
}

/** The category a body belongs to, or null if unknown. */
export function categoryOf(body: SolarBody): BodyCategory | null {
  if (PLANETS.includes(body)) {
    return 'planets';
  }
  if (DWARF_PLANETS.includes(body)) {
    return 'dwarfPlanets';
  }
  if (OTHER_CELESTIAL_BODIES.includes(body)) {
    return 'otherCelestialBodies';
  }

  return null;
}
