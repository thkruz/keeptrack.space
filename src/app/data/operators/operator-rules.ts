/**
 * Operator rule table: maps a catalog object to the organisation that operates it.
 *
 * Data only. Nothing renders from this table yet (Ted, 2026-10-12: flags only, no
 * operator logos ship). It exists so a later logo pack or the info box can use it.
 * Rules were re-authored from the idea in SODA's `operators.ts` (MIT), not copied.
 *
 * Each rule names `country`, the flag-icons key of the operator's home country (the
 * same key the flag atlas is indexed by), so a consumer can always fall back to a flag.
 *
 * ORDER MATTERS: the first matching rule wins. GNSS rules sit before `cosmos` and the
 * Indian `GSAT-` rule so `COSMOS 2432 [GLONASS-M]` and `GSAT0101 (GALILEO-PFM)` resolve
 * to their constellation, not to the generic name match.
 */
export interface OperatorRule {
  /** Stable lower-case identifier, unique across the table. */
  slug: string;
  /** flag-icons key of the operator's country, e.g. `us`, `cn`, `esa`. */
  country: string;
  /** Upper-case name prefixes matched with `startsWith`. */
  prefix?: string[];
  /** Upper-case substrings matched with `includes`. */
  contains?: string[];
  /** Catalog numbers pinned to this operator; checked before any name rule. */
  sccNums?: number[];
}

export const OPERATOR_RULES: readonly OperatorRule[] = [
  { slug: 'nasa', country: 'us', sccNums: [25544, 20580, 50463] },
  { slug: 'tiangong', country: 'cn', sccNums: [48274] },
  // GNSS before COSMOS / GSAT-.
  { slug: 'galileo', country: 'esa', contains: ['GALILEO'] },
  { slug: 'glonass', country: 'ru', contains: ['GLONASS'] },
  { slug: 'navstar', country: 'us', prefix: ['NAVSTAR'] },
  { slug: 'beidou', country: 'cn', prefix: ['BEIDOU'] },
  // Broadband megaconstellations.
  { slug: 'starlink', country: 'us', prefix: ['STARLINK'] },
  { slug: 'oneweb', country: 'gb', prefix: ['ONEWEB'] },
  { slug: 'kuiper', country: 'us', prefix: ['KUIPER'] },
  { slug: 'qianfan', country: 'cn', prefix: ['QIANFAN'] },
  { slug: 'guowang', country: 'cn', prefix: ['HULIANWANG', 'GUOWANG'] },
  // Earth observation.
  { slug: 'yaogan', country: 'cn', prefix: ['YAOGAN'] },
  { slug: 'planet', country: 'us', prefix: ['FLOCK', 'SKYSAT', 'PELICAN', 'TANAGER'] },
  { slug: 'spire', country: 'us', prefix: ['LEMUR'] },
  { slug: 'geespace', country: 'cn', prefix: ['GEESAT'] },
  { slug: 'iceye', country: 'fi', prefix: ['ICEYE'] },
  { slug: 'cgstl', country: 'cn', prefix: ['JILIN'] },
  { slug: 'kompsat', country: 'kr', prefix: ['KOMPSAT', 'ARIRANG', 'GEO-KOMPSAT', 'CAS500'] },
  // Communications.
  { slug: 'iridium', country: 'us', prefix: ['IRIDIUM'] },
  { slug: 'ses', country: 'lu', prefix: ['O3B', 'SES'] },
  { slug: 'globalstar', country: 'us', prefix: ['GLOBALSTAR'] },
  { slug: 'eutelsat', country: 'eute', prefix: ['EUTELSAT'] },
  { slug: 'intelsat', country: 'itso', prefix: ['INTELSAT'] },
  { slug: 'gonets', country: 'ru', prefix: ['GONETS'] },
  { slug: 'orbcomm', country: 'us', prefix: ['ORBCOMM'] },
  // Generic national names last.
  { slug: 'cosmos', country: 'ru', prefix: ['COSMOS', 'KOSMOS'] },
  { slug: 'isro', country: 'in', prefix: ['GSAT-', 'IRNSS', 'CARTOSAT', 'RISAT', 'RESOURCESAT', 'OCEANSAT'] },
];
