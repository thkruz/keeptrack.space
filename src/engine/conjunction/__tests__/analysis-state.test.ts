import {
  CONJUNCTION_ANALYSIS_SCHEMA_VERSION,
  ConjunctionAnalysisState,
  isConjunctionAnalysisState,
  RIC_CONVENTION,
  validateConjunctionAnalysisState,
} from '@app/engine/conjunction/analysis-state';

const minimalState = (): ConjunctionAnalysisState => ({
  schemaVersion: CONJUNCTION_ANALYSIS_SCHEMA_VERSION,
  kind: 'conjunction',
  generatedAtIso: '2026-10-17T02:08:07.000Z',
  generatedWallClockIso: '2026-10-16T04:27:47.000Z',
  appVersion: '13.0.0',
  analysisEpochIso: '2026-10-17T02:08:07.000Z',
  ricConvention: RIC_CONVENTION,
  objects: [
    {
      role: 'primary',
      name: 'LANDSAT 8',
      noradId: '39084',
      cosparId: '2013-008A',
      tleEpochIso: '2026-10-16T12:00:00.000Z',
      gpAgeHours: 14.1,
      ricSigmasKm: { radial: 0.1, intrack: 0.5, crosstrack: 0.1 },
      meanElements: null,
      isAnalystObject: false,
      derivedFromNoradId: null,
    },
  ],
  encounter: {
    primaryNoradId: '39084',
    secondaryNoradId: '38479',
    tcaIso: '2026-10-16T05:38:39.000Z',
    tcaMs: Date.parse('2026-10-16T05:38:39.000Z'),
    missDistanceKm: 7.593,
    ricKm: { radial: 6.267, intrack: 4.129, crosstrack: -1.151 },
    ricVelocityKmS: null,
    relativeSpeedKmS: 4.27,
    pc: 3.92e-7,
    riskLevel: 'medium',
    pcInputs: {
      method: 'test',
      primaryHardBodyRadiusKm: 0.01,
      secondaryHardBodyRadiusKm: 0.005,
      combinedHardBodyRadiusKm: 0.015,
      covarianceSource: 'test',
      covarianceConfidenceLevel: 1,
      sigmaCapsKm: [35, 71, 32],
    },
    searchWindow: { startIso: '2026-10-15T17:38:39.000Z', endIso: '2026-10-16T17:38:39.000Z', halfWidthHours: 12 },
    ricConvention: RIC_CONVENTION,
  },
  relativeGeometry: [{ offsetSec: 0, timeIso: '2026-10-16T05:38:39.000Z', rangeKm: 7.593, ricKm: { radial: 6.267, intrack: 4.129, crosstrack: -1.151 }, relativeSpeedKmS: 4.27 }],
  maneuverOptions: [],
  screeningDiff: null,
  missionImpact: { sensorName: null, passWindows: null, notes: [] },
  notes: [],
});

describe('ConjunctionAnalysisState', () => {
  it('accepts a complete state and survives a JSON round trip', () => {
    const roundTrip = JSON.parse(JSON.stringify(minimalState()));

    expect(validateConjunctionAnalysisState(roundTrip)).toEqual([]);
    expect(isConjunctionAnalysisState(roundTrip)).toBe(true);
  });

  it('states the RIC sign convention explicitly', () => {
    expect(RIC_CONVENTION).toContain('Secondary minus primary');
    expect(RIC_CONVENTION).toContain('primary RIC frame');
  });

  it('rejects a state from a different schema version', () => {
    const state = { ...minimalState(), schemaVersion: 99 };

    expect(validateConjunctionAnalysisState(state)).toContain('$.schemaVersion: expected one of 1, 2');
  });

  it('names the path of a malformed nested value', () => {
    const state = minimalState() as unknown as { encounter: { ricKm: { radial: unknown }; pcInputs: { sigmaCapsKm: unknown } } };

    state.encounter.ricKm.radial = '6.2';
    state.encounter.pcInputs.sigmaCapsKm = [35, 71];

    const errors = validateConjunctionAnalysisState(state);

    expect(errors).toContain('$.encounter.ricKm.radial: expected number');
    expect(errors).toContain('$.encounter.pcInputs.sigmaCapsKm: expected [number, number, number]');
  });

  it('rejects a diff entry with neither side', () => {
    const state = minimalState();

    state.screeningDiff = {
      source: 'provided',
      preRun: { primaryId: '39084', startIso: null, endIso: null, eventCount: 0 },
      postRun: { primaryId: '90000', startIso: null, endIso: null, eventCount: 0 },
      concernThreshold: 'medium',
      tcaMatchToleranceMs: 900_000,
      excludedSecondaryIds: [],
      isWindowMismatch: false,
      counts: { introduced: 0, removed: 0, unchanged: 1, appeared: 0, dropped: 0 },
      entries: [{ status: 'unchanged', secondaryId: '1', secondaryName: '', pre: null, post: null, missDeltaKm: null, riskChange: null }],
    };

    expect(validateConjunctionAnalysisState(state)).toContain('$.screeningDiff.entries[0]: entry has neither a pre nor a post event');
  });
});

describe('ConjunctionAnalysisState schema 2', () => {
  const v2State = (): ConjunctionAnalysisState => ({
    ...minimalState(),
    objects: [{ ...minimalState().objects[0], objectType: 'Payload', owner: 'USGS', country: 'US', dataSource: 'CelesTrak', confidenceScore: 9 }],
    externalMessage: {
      source: 'cdm-file',
      originator: 'OOTK',
      messageId: 'CDM-1',
      creationDateIso: '2026-10-16T04:00:00.000Z',
      primaryDesignator: '39084',
      secondaryDesignator: '33928',
      pcMethod: 'CHAN-2D',
      message: {
        tcaIso: '2026-10-17T00:40:00.000Z',
        tcaMs: Date.parse('2026-10-17T00:40:00.000Z'),
        missDistanceKm: 0.41,
        ricKm: null,
        relativeSpeedKmS: 14.1,
        pc: 2.1e-4,
        primarySigmasKm: { radial: 0.1, intrack: 1, crosstrack: 0.1 },
        secondarySigmasKm: null,
      },
      keepTrack: { rangeKm: 446.8, ricKm: { radial: 33.4, intrack: -435.8, crosstrack: 92.7 }, relativeSpeedKmS: 14.89, pc: null, riskLevel: 'unknown' },
    },
    recommendation: 'GO with Maneuver B.',
    recommendedOptionId: null,
    analyst: { name: 'Analyst', organization: null },
    closeApproachProfile: [{ offsetSec: -0.25, timeIso: '2026-10-16T05:38:38.750Z', rangeKm: 7.9, ricKm: { radial: 6.3, intrack: 4.1, crosstrack: -1.2 }, relativeSpeedKmS: 4.27 }],
    missionImpact: {
      sensorName: 'Denver',
      passWindows: [],
      notes: [],
      events: [
        {
          label: 'Pass',
          sensorName: 'Denver',
          latDeg: 39.74,
          lonDeg: -104.99,
          minElevationDeg: 10,
          baseline: { noradId: '39084', aosIso: '2026-10-16T17:32:45.000Z', losIso: '2026-10-16T17:42:15.000Z', maxElevationDeg: 85.7 },
          options: [{ optionId: '90000', pass: null, shiftSec: null, verdict: 'lost' }],
        },
      ],
    },
  });

  it('is the current version, and the validator still accepts version 1', () => {
    expect(CONJUNCTION_ANALYSIS_SCHEMA_VERSION).toBe(2);
    expect(validateConjunctionAnalysisState({ ...minimalState(), schemaVersion: 1 })).toEqual([]);
  });

  it('accepts every composed-report block after a JSON round trip', () => {
    expect(validateConjunctionAnalysisState(JSON.parse(JSON.stringify(v2State())))).toEqual([]);
  });

  it('accepts a version-1 shaped state without the optional blocks', () => {
    expect(validateConjunctionAnalysisState(minimalState())).toEqual([]);
  });

  it('names malformed composed-report blocks by path', () => {
    const state = v2State() as unknown as Record<string, unknown>;
    const ext = state.externalMessage as Record<string, unknown>;

    ext.source = 'fax';
    (ext.message as Record<string, unknown>).missDistanceKm = 'far';
    ((state.missionImpact as Record<string, unknown>).events as Record<string, unknown>[])[0].options = [{ optionId: '1', pass: null, shiftSec: null, verdict: 'maybe' }];
    state.closeApproachProfile = [{ offsetSec: 0 }];
    state.analyst = 'me';
    state.recommendation = 7;
    const errors = validateConjunctionAnalysisState(state);

    expect(errors).toContain('$.externalMessage.source: expected one of manual, cdm-file');
    expect(errors).toContain('$.externalMessage.message.missDistanceKm: expected number');
    expect(errors).toContain('$.missionImpact.events[0].options[0].verdict: expected one of unchanged, shifted, lost, gained');
    expect(errors).toContain('$.closeApproachProfile[0].rangeKm: expected number');
    expect(errors).toContain('$.analyst: expected object or null');
    expect(errors).toContain('$.recommendation: expected string or null');
  });

  it('rejects malformed object details', () => {
    const state = v2State();

    (state.objects[0] as unknown as Record<string, unknown>).confidenceScore = 'high';

    expect(validateConjunctionAnalysisState(state)).toContain('$.objects[0].confidenceScore: expected number or null');
  });
});
