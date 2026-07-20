/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * breakup-events.ts is the curated catalog of major historical on-orbit breakup
 * events surfaced by the Breakup Analysis plugin. It is kept as a standalone,
 * DOM-free and locale-free data module: the proper nouns (names, causes, orbit
 * types, descriptions) are English source data, while the Breakup Analysis
 * plugin localizes the field *labels* around them.
 *
 * Figures (tracked-debris estimates, altitudes) are drawn from public
 * NASA Orbital Debris Quarterly News / 18 SDS catalog reporting and are
 * approximate snapshots near each event's peak.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

export interface BreakupEvent {
  id: string;
  name: string;
  parentName: string;
  parentNoradId: number;
  /** International designator prefix shared by every fragment of the parent launch (e.g. "1999-025"). */
  intlDesPrefix: string;
  /** ISO date (YYYY-MM-DD) of the breakup. */
  breakupDate: string;
  /** ISO date (YYYY-MM-DD) of the parent's launch. */
  launchDate: string;
  country: string;
  orbitType: string;
  altitudeKm: number;
  cause: string;
  estimatedDebrisCount: number;
  description: string;
}

export const BREAKUP_EVENTS: BreakupEvent[] = [
  {
    id: 'fengyun1c',
    name: 'Fengyun-1C ASAT Test',
    parentName: 'Fengyun-1C',
    parentNoradId: 25730,
    intlDesPrefix: '1999-025',
    breakupDate: '2007-01-11',
    launchDate: '1999-05-10',
    country: 'China',
    orbitType: 'LEO Sun-Synchronous',
    altitudeKm: 865,
    cause: 'Intentional ASAT Test',
    estimatedDebrisCount: 3433,
    description: 'Chinese anti-satellite missile test that destroyed the Fengyun-1C weather satellite, creating the largest tracked debris cloud in history.',
  },
  {
    id: 'cosmos2251',
    name: 'Cosmos 2251 / Iridium 33 Collision',
    parentName: 'Cosmos 2251',
    parentNoradId: 22675,
    intlDesPrefix: '1993-036',
    breakupDate: '2009-02-10',
    launchDate: '1993-06-16',
    country: 'Russia',
    orbitType: 'LEO',
    altitudeKm: 790,
    cause: 'Accidental Collision',
    estimatedDebrisCount: 1668,
    description: 'First accidental hypervelocity collision between two intact satellites. Cosmos 2251 collided with the operational Iridium 33 communications satellite.',
  },
  {
    id: 'iridium33',
    name: 'Iridium 33 (from Collision)',
    parentName: 'Iridium 33',
    parentNoradId: 24946,
    intlDesPrefix: '1997-051',
    breakupDate: '2009-02-10',
    launchDate: '1997-09-14',
    country: 'USA',
    orbitType: 'LEO',
    altitudeKm: 790,
    cause: 'Accidental Collision',
    estimatedDebrisCount: 628,
    description: 'Debris field from the operational Iridium 33 satellite after collision with defunct Cosmos 2251.',
  },
  {
    id: 'cosmos1408',
    name: 'Cosmos 1408 ASAT Test',
    parentName: 'Cosmos 1408',
    parentNoradId: 13552,
    intlDesPrefix: '1982-092',
    breakupDate: '2021-11-15',
    launchDate: '1982-09-16',
    country: 'Russia',
    orbitType: 'LEO',
    altitudeKm: 480,
    cause: 'Intentional ASAT Test',
    estimatedDebrisCount: 1500,
    description: 'Russian direct-ascent ASAT test that destroyed the defunct Cosmos 1408 ELINT satellite, generating debris that threatened the ISS crew.',
  },
  {
    id: 'microsatr',
    name: 'Microsat-R ASAT Test (Mission Shakti)',
    parentName: 'Microsat-R',
    parentNoradId: 43947,
    intlDesPrefix: '2019-006',
    breakupDate: '2019-03-27',
    launchDate: '2019-01-24',
    country: 'India',
    orbitType: 'LEO',
    altitudeKm: 282,
    cause: 'Intentional ASAT Test',
    estimatedDebrisCount: 400,
    description:
      'Indian direct-ascent ASAT test (Mission Shakti) against the Microsat-R satellite. The low intercept altitude limited the long-lived debris population, though some fragments were lofted above the ISS.',
  },
  {
    id: 'breezem',
    name: 'Briz-M Upper Stage Explosion',
    parentName: 'Briz-M (14S44 #3)',
    parentNoradId: 28945,
    intlDesPrefix: '2006-006',
    breakupDate: '2007-02-19',
    launchDate: '2006-02-28',
    country: 'Russia',
    orbitType: 'GTO',
    altitudeKm: 500,
    cause: 'Accidental Explosion',
    estimatedDebrisCount: 1078,
    description: 'Briz-M upper stage exploded after failed Arabsat-4A mission, likely due to residual propellant. Created debris across a wide range of altitudes.',
  },
  {
    id: 'cz6a',
    name: 'CZ-6A Upper Stage Breakup',
    parentName: 'CZ-6A R/B (Yunhai-3)',
    parentNoradId: 54173,
    intlDesPrefix: '2022-151',
    breakupDate: '2022-11-12',
    launchDate: '2022-11-11',
    country: 'China',
    orbitType: 'LEO Sun-Synchronous',
    altitudeKm: 800,
    cause: 'Accidental Explosion',
    estimatedDebrisCount: 533,
    description:
      'A Chinese Long March 6A second stage fragmented shortly after deploying Yunhai-3, scattering hundreds of fragments through heavily used sun-synchronous altitudes.',
  },
  {
    id: 'noaa16',
    name: 'NOAA-16 Breakup',
    parentName: 'NOAA-16',
    parentNoradId: 26536,
    intlDesPrefix: '2000-055',
    breakupDate: '2015-11-25',
    launchDate: '2000-09-21',
    country: 'USA',
    orbitType: 'LEO Sun-Synchronous',
    altitudeKm: 860,
    cause: 'Battery / Thermal Failure',
    estimatedDebrisCount: 458,
    description:
      'The decommissioned NOAA-16 weather satellite fragmented on orbit, attributed to a battery or thermal failure, adding long-lived debris to a congested polar altitude.',
  },
  {
    id: 'dmspf13',
    name: 'DMSP-F13 Breakup',
    parentName: 'DMSP 5D-2 F13',
    parentNoradId: 23533,
    intlDesPrefix: '1995-015',
    breakupDate: '2015-02-03',
    launchDate: '1995-03-24',
    country: 'USA',
    orbitType: 'LEO Sun-Synchronous',
    altitudeKm: 840,
    cause: 'Battery Explosion',
    estimatedDebrisCount: 149,
    description:
      'A US Defense Meteorological Satellite Program spacecraft ruptured after a battery overcharge and overheating, a failure mode later traced across several DMSP and NOAA satellites of the same design.',
  },
  {
    id: 'usa193',
    name: 'USA-193 Shootdown',
    parentName: 'USA-193',
    parentNoradId: 29651,
    intlDesPrefix: '2006-057',
    breakupDate: '2008-02-21',
    launchDate: '2006-12-14',
    country: 'USA',
    orbitType: 'LEO',
    altitudeKm: 247,
    cause: 'Intentional Shootdown',
    estimatedDebrisCount: 174,
    description: 'US Navy SM-3 missile destroyed the malfunctioning NRO satellite USA-193 (NROL-21). Low-altitude breakup meant most debris reentered within weeks.',
  },
];
