export interface CatalogEntry {
  /** Unique ID for the catalog entry - never derived from translated name */
  id: string;
  /** CelesTrack GP API query parameter (e.g., 'GROUP=starlink' or 'FILE=starlink') */
  queryParam: string;
  /** Locale key suffix for the display name */
  nameKey: string;
}

export interface CatalogCategory {
  /** Unique ID for the category */
  id: string;
  /** Locale key suffix for the category heading */
  nameKey: string;
  /** Catalog entries in this category */
  entries: CatalogEntry[];
}

/**
 * Static catalog definitions for CelesTrack GP / SupGP APIs.
 * Uses a getter to avoid parse-time t7e() initialization issues.
 *
 * GP  entries use  GROUP= or SPECIAL=  → resolved against gp.php
 * SupGP entries use  FILE=             → resolved against sup-gp.php
 *
 * When a GP and SupGP source exist for the same constellation the SupGP
 * entry is placed immediately after its GP counterpart.
 */
export class CatalogBrowserData {
  static get categories(): CatalogCategory[] {
    return [
      // ── Special Interest ──────────────────────────────────────────
      {
        id: 'special',
        nameKey: 'special',
        entries: [
          { id: 'last30days', queryParam: 'GROUP=last-30-days', nameKey: 'last30days' },
          { id: 'stations', queryParam: 'GROUP=stations', nameKey: 'stations' },
          { id: 'iss-supgp', queryParam: 'FILE=iss', nameKey: 'iss' },
          { id: 'css-supgp', queryParam: 'FILE=css', nameKey: 'css' },
          { id: 'visual', queryParam: 'GROUP=visual', nameKey: 'visual' },
          { id: 'active', queryParam: 'GROUP=active', nameKey: 'active' },
          { id: 'analyst', queryParam: 'GROUP=analyst', nameKey: 'analyst' },
        ],
      },

      // ── Debris ────────────────────────────────────────────────────
      {
        id: 'debris',
        nameKey: 'debris',
        entries: [
          { id: 'cosmos-1408-debris', queryParam: 'GROUP=cosmos-1408-debris', nameKey: 'cosmos1408Debris' },
          { id: 'fengyun-1c-debris', queryParam: 'GROUP=fengyun-1c-debris', nameKey: 'fengyun1cDebris' },
          { id: 'iridium-33-debris', queryParam: 'GROUP=iridium-33-debris', nameKey: 'iridium33Debris' },
          { id: 'cosmos-2251-debris', queryParam: 'GROUP=cosmos-2251-debris', nameKey: 'cosmos2251Debris' },
        ],
      },

      // ── Weather & Earth Resources ─────────────────────────────────
      {
        id: 'weather',
        nameKey: 'weather',
        entries: [
          { id: 'weather', queryParam: 'GROUP=weather', nameKey: 'weather' },
          { id: 'noaa', queryParam: 'GROUP=noaa', nameKey: 'noaa' },
          { id: 'goes', queryParam: 'GROUP=goes', nameKey: 'goes' },
          { id: 'resource', queryParam: 'GROUP=resource', nameKey: 'resource' },
          { id: 'sarsat', queryParam: 'GROUP=sarsat', nameKey: 'sarsat' },
          { id: 'dmc', queryParam: 'GROUP=dmc', nameKey: 'dmc' },
          { id: 'tdrss', queryParam: 'GROUP=tdrss', nameKey: 'tdrss' },
          { id: 'argos', queryParam: 'GROUP=argos', nameKey: 'argos' },
          { id: 'planet', queryParam: 'GROUP=planet', nameKey: 'planet' },
          { id: 'planet-supgp', queryParam: 'FILE=planet', nameKey: 'planet' },
          { id: 'spire', queryParam: 'GROUP=spire', nameKey: 'spire' },
        ],
      },

      // ── Communications ────────────────────────────────────────────
      {
        id: 'comms',
        nameKey: 'comms',
        entries: [
          { id: 'geo', queryParam: 'GROUP=geo', nameKey: 'geo' },
          { id: 'gpz', queryParam: 'SPECIAL=gpz', nameKey: 'gpz' },
          { id: 'gpz-plus', queryParam: 'SPECIAL=gpz-plus', nameKey: 'gpzPlus' },
          { id: 'intelsat', queryParam: 'GROUP=intelsat', nameKey: 'intelsat' },
          { id: 'intelsat-supgp', queryParam: 'FILE=intelsat', nameKey: 'intelsat' },
          { id: 'ses', queryParam: 'GROUP=ses', nameKey: 'ses' },
          { id: 'ses-supgp', queryParam: 'FILE=ses', nameKey: 'ses' },
          { id: 'eutelsat', queryParam: 'GROUP=eutelsat', nameKey: 'eutelsat' },
          { id: 'telesat', queryParam: 'GROUP=telesat', nameKey: 'telesat' },
          { id: 'telesat-supgp', queryParam: 'FILE=telesat', nameKey: 'telesat' },
          { id: 'starlink', queryParam: 'GROUP=starlink', nameKey: 'starlink' },
          { id: 'starlink-supgp', queryParam: 'FILE=starlink', nameKey: 'starlink' },
          { id: 'oneweb', queryParam: 'GROUP=oneweb', nameKey: 'oneweb' },
          { id: 'oneweb-supgp', queryParam: 'FILE=oneweb', nameKey: 'oneweb' },
          { id: 'qianfan', queryParam: 'GROUP=qianfan', nameKey: 'qianfan' },
          { id: 'hulianwang', queryParam: 'GROUP=hulianwang', nameKey: 'hulianwang' },
          { id: 'kuiper', queryParam: 'GROUP=kuiper', nameKey: 'kuiper' },
          { id: 'kuiper-supgp', queryParam: 'FILE=kuiper', nameKey: 'kuiper' },
          { id: 'iridium-next', queryParam: 'GROUP=iridium-NEXT', nameKey: 'iridiumNext' },
          { id: 'iridium-supgp', queryParam: 'FILE=iridium', nameKey: 'iridiumSupgp' },
          { id: 'orbcomm', queryParam: 'GROUP=orbcomm', nameKey: 'orbcomm' },
          { id: 'orbcomm-supgp', queryParam: 'FILE=orbcomm', nameKey: 'orbcomm' },
          { id: 'globalstar', queryParam: 'GROUP=globalstar', nameKey: 'globalstar' },
          { id: 'ast-supgp', queryParam: 'FILE=ast', nameKey: 'astSpaceMobile' },
          { id: 'amateur', queryParam: 'GROUP=amateur', nameKey: 'amateur' },
          { id: 'satnogs', queryParam: 'GROUP=satnogs', nameKey: 'satnogs' },
          { id: 'x-comm', queryParam: 'GROUP=x-comm', nameKey: 'xComm' },
          { id: 'other-comm', queryParam: 'GROUP=other-comm', nameKey: 'otherComm' },
        ],
      },

      // ── Navigation (GNSS) ─────────────────────────────────────────
      {
        id: 'nav',
        nameKey: 'nav',
        entries: [
          { id: 'gnss', queryParam: 'GROUP=gnss', nameKey: 'gnss' },
          { id: 'gps-ops', queryParam: 'GROUP=gps-ops', nameKey: 'gpsOps' },
          { id: 'gps-supgp', queryParam: 'FILE=gps', nameKey: 'gpsOps' },
          { id: 'glo-ops', queryParam: 'GROUP=glo-ops', nameKey: 'gloOps' },
          { id: 'glonass-supgp', queryParam: 'FILE=glonass', nameKey: 'gloOps' },
          { id: 'galileo', queryParam: 'GROUP=galileo', nameKey: 'galileo' },
          { id: 'beidou', queryParam: 'GROUP=beidou', nameKey: 'beidou' },
          { id: 'sbas', queryParam: 'GROUP=sbas', nameKey: 'sbas' },
          { id: 'nnss', queryParam: 'GROUP=nnss', nameKey: 'nnss' },
          { id: 'musson', queryParam: 'GROUP=musson', nameKey: 'musson' },
        ],
      },

      // ── Scientific ────────────────────────────────────────────────
      {
        id: 'science',
        nameKey: 'science',
        entries: [
          { id: 'science', queryParam: 'GROUP=science', nameKey: 'science' },
          { id: 'geodetic', queryParam: 'GROUP=geodetic', nameKey: 'geodetic' },
          { id: 'engineering', queryParam: 'GROUP=engineering', nameKey: 'engineering' },
          { id: 'education', queryParam: 'GROUP=education', nameKey: 'education' },
          { id: 'cpf-supgp', queryParam: 'FILE=cpf', nameKey: 'cpf' },
        ],
      },

      // ── Military & Other ──────────────────────────────────────────
      {
        id: 'military',
        nameKey: 'military',
        entries: [
          { id: 'military', queryParam: 'GROUP=military', nameKey: 'military' },
          { id: 'radar', queryParam: 'GROUP=radar', nameKey: 'radar' },
          { id: 'cubesat', queryParam: 'GROUP=cubesat', nameKey: 'cubesat' },
          { id: 'other', queryParam: 'GROUP=other', nameKey: 'other' },
        ],
      },
    ];
  }
}
