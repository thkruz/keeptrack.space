import { Satellite, Tle } from '@ootk/src/main';

/** Designator ootk writes into every synthesized TLE ("58001A", Explorer 1). */
const PLACEHOLDER_INTL_DES = '1958-001A';
/** First catalog number of the analyst block (CatalogManager.ANALYST_START_ID). */
const ANALYST_START_SCC = 90000;

/**
 * True when an analyst object (clone, created or fitted satellite) carries the placeholder
 * designator from a synthesized TLE. That is Explorer 1's COSPAR ID, not the object's, so
 * displays and reports should treat it as unknown.
 */
export const isPlaceholderIntlDes = (sat: Satellite): boolean => {
  if (sat.intlDes !== PLACEHOLDER_INTL_DES || !sat.sccNum) {
    return false;
  }

  return parseInt(Tle.convertA5to6Digit(sat.sccNum), 10) >= ANALYST_START_SCC;
};
