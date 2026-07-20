/**
 * Maps GCAT OrgCodes for satellite owners/operators to full organization names.
 * Source: Jonathan McDowell's GCAT Organizations Database
 * https://planet4589.org/space/gcat/web/orgs/index.html
 *
 * Multi-org ownership uses "/" separator in codes (e.g., "GSFC/NOAA").
 * Common composite codes are included as full keys for direct lookup.
 */
export const ownerCodeMap: Record<string, string> = {
  // US Government / Military
  NASA: 'NASA',
  GSFC: 'NASA Goddard Space Flight Center',
  JPL: 'NASA Jet Propulsion Laboratory',
  MSFC: 'NASA Marshall Space Flight Center',
  LARC: 'NASA Langley Research Center',
  ARC: 'NASA Ames Research Center',
  KSC: 'NASA Kennedy Space Center',
  NOAA: 'National Oceanic and Atmospheric Administration',
  USGS: 'US Geological Survey',
  NROC: 'National Reconnaissance Office',
  NRO: 'National Reconnaissance Office',
  NRL: 'Naval Research Laboratory',
  AFSMC: 'Air Force Space and Missile Command',
  AFSPC: 'Air Force Space Command',
  USSF: 'US Space Force',
  SDA: 'Space Development Agency',
  DARPA: 'Defense Advanced Research Projects Agency',
  MDA: 'Missile Defense Agency',
  DOE: 'Department of Energy',
  DISA: 'Defense Information Systems Agency',
  NGA: 'National Geospatial-Intelligence Agency',

  // US Joint
  'GSFC/NOAA': 'NASA GSFC / NOAA',
  'CNES/NOAA': 'CNES / NOAA',
  'USGS/GSFC': 'USGS / NASA GSFC',
  'NASA/APL': 'NASA / Johns Hopkins APL',
  'NRO/NRL': 'NRO / Naval Research Laboratory',

  // European
  ESA: 'European Space Agency',
  'COPERN/ESA': 'Copernicus / ESA',
  GSAEU: 'EU Agency for the Space Programme',
  EUMET: 'EUMETSAT',
  CNES: "Centre National d'Etudes Spatiales",
  DLR: 'German Aerospace Center',
  ASI: 'Italian Space Agency',
  UKSA: 'UK Space Agency',
  BNSC: 'British National Space Centre',
  SNSB: 'Swedish National Space Board',
  CDTI: 'Centro para el Desarrollo Tecnologico e Industrial',
  BIRA: 'Belgian Institute for Space Aeronomy',
  NSO: 'Netherlands Space Office',
  CSA: 'Canadian Space Agency',
  CONAE: 'Argentine Space Agency',

  // Russia
  ROSCOSMOS: 'Roscosmos',
  RVSN: 'Russian Strategic Rocket Forces',
  VKS: 'Russian Aerospace Forces',
  FSB: 'Federal Security Service',
  GRU: 'Main Intelligence Directorate',
  MOM: 'Ministry of General Machine Building',

  // Asia
  JAXA: 'Japan Aerospace Exploration Agency',
  ISRO: 'Indian Space Research Organisation',
  CNSA: 'China National Space Administration',
  CMSEO: 'China Manned Space Engineering Office',
  NSMC: 'National Satellite Meteorological Center',
  KARI: 'Korea Aerospace Research Institute',
  KASA: 'Korea AeroSpace Administration',

  // Commercial - US
  SPXS: 'SpaceX',
  AMZN: 'Amazon (Project Kuiper)',
  PLAN: 'Planet Labs',
  MXAR: 'Maxar Technologies',
  DGLO: 'DigitalGlobe',
  VIAS: 'Viasat',
  IRDS: 'Iridium Communications',
  ORBC: 'Orbcomm',
  GLOB: 'Globalstar',
  O3B: 'O3b Networks',
  ONWB: 'OneWeb',
  BLKB: 'BlackBridge',
  HAWKE: 'HawkEye 360',
  ICEYE: 'ICEYE',

  // Commercial - International
  SESSL: 'SES S.A.',
  SES: 'SES S.A.',
  EUTE: 'Eutelsat',
  INTEL: 'Intelsat',
  INM: 'Inmarsat',
  ARBS: 'Arabsat',
  TSAT: 'Turksat',
  NSIL: 'NewSpace India Limited',
  MHI: 'Mitsubishi Heavy Industries',
  SKY: 'Sky Perfect JSAT',

  // Academic / Research
  APL: 'Johns Hopkins Applied Physics Lab',
  MITLL: 'MIT Lincoln Laboratory',
  SRIU: 'SRI International',
  LASP: 'Laboratory for Atmospheric and Space Physics',
  SWRI: 'Southwest Research Institute',
};
