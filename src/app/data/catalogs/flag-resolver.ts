import flagAtlas from '../../../../public/img/flag-atlas/atlas.json';
import { country2flagIcon } from './countries';

/** The catalog fields the flag decal reads. */
export interface FlagSource {
  country?: string;
  /**
   * Optional per-object override from the catalog: a flag key as used by the atlas
   * (`us`, `iss`, `esa`, ...). Named for the plan's operator-logo override; with flags
   * only (Ted, 2026-10-12) it selects a flag.
   */
  operatorLogo?: string;
}

/** [u0, v0, u1, v1] in atlas UV space. */
export type FlagAtlasRect = readonly [number, number, number, number];

const CELLS_ = flagAtlas.cells as unknown as Record<string, FlagAtlasRect>;

/** Public URL of the atlas image, relative to the install directory. */
export const FLAG_ATLAS_PATH = 'img/flag-atlas/atlas.png';

/**
 * Resolve the flag key for an object: explicit `operatorLogo` override, then the
 * `country` field through {@link country2flagIcon}, then null (no flag).
 */
export const resolveFlagKey = (obj: FlagSource | null | undefined): string | null => {
  const override = obj?.operatorLogo?.trim().toLowerCase();

  if (override) {
    return override;
  }
  if (!obj?.country) {
    return null;
  }

  const cls = country2flagIcon(obj.country);

  return cls === 'fi-unknown' ? null : cls.slice(3);
};

/** Atlas rect for a flag key; unknown keys get the neutral grey fallback cell, null stays null. */
export const flagAtlasRect = (key: string | null): FlagAtlasRect | null => {
  if (key === null) {
    return null;
  }

  return CELLS_[key] ?? CELLS_[flagAtlas.fallback];
};
