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

    expect(validateConjunctionAnalysisState(state)).toContain('$.schemaVersion: expected 1');
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
