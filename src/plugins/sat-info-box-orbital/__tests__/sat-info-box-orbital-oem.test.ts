import { OemSatellite, ParsedOem } from '@app/app/objects/oem-satellite';
import { OrbitPhaseType, PhasedOrbitSatellite } from '@app/app/objects/phased-orbit-satellite';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SatInfoBoxOrbital } from '@app/plugins/sat-info-box-orbital/sat-info-box-orbital';
import { EL } from '@app/plugins/sat-info-box-orbital/sat-info-box-orbital-html';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { EpochUTC, J2000, Kilometers, KilometersPerSecond, Vector3D } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const START_MS = Date.UTC(2026, 9, 25, 5, 55, 47);

const makeStates = (): J2000[] =>
  Array.from(
    { length: 12 },
    (_, i) =>
      new J2000(
        EpochUTC.fromDateTime(new Date(START_MS + i * 60_000)),
        new Vector3D((6378 + i * 10) as Kilometers, 0 as Kilometers, 0 as Kilometers),
        new Vector3D(0 as KilometersPerSecond, (0.5 + i * 0.6) as KilometersPerSecond, 0 as KilometersPerSecond)
      )
  );

const makeOem = (centerName: 'EARTH' | 'SUN', refFrame: string): ParsedOem => ({
  header: { START_TIME: new Date(START_MS), STOP_TIME: new Date(START_MS + 11 * 60_000), CCSDS_OEM_VERS: '2.0', CREATION_DATE: '2026-10-25T00:00:00', ORIGINATOR: 'KeepTrack' },
  dataBlocks: [
    {
      metadata: {
        OBJECT_NAME: 'TEST',
        OBJECT_ID: 'TEST',
        CENTER_NAME: centerName,
        REF_FRAME: refFrame,
        TIME_SYSTEM: 'UTC',
        START_TIME: '2026-10-25T05:55:47',
        STOP_TIME: '2026-10-25T06:06:47',
      },
      ephemeris: makeStates(),
    },
  ],
});

/** Osculating elements of a trajectory one second after liftoff (measured in the app: apogee 0, perigee -6367 km). */
const ascentElements = {
  apogee: 0,
  perigee: -6367,
  inclinationDegrees: 29.04,
  eccentricity: 0.997,
  rightAscensionDegrees: 10,
  argPerigeeDegrees: 20,
  period: 45,
};

describe('SatInfoBoxOrbital OEM center body, frame and ascent rows', () => {
  let plugin: SatInfoBoxOrbital;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  const text = (id: string) => getEl(id)!.textContent;
  const rowDisplay = (id: string) => getEl(`${id}-row`)!.style.display;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    plugin = new SatInfoBoxOrbital();
    websiteInit(plugin);
    ServiceLocator.getTimeManager().simulationTimeObj = new Date(START_MS + 1000);
    document.body.insertAdjacentHTML('beforeend', p().createOrbitalSection());
    vi.stubGlobal('requestIdleCallback', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('builds the two OEM rows hidden', () => {
    expect(rowDisplay(EL.CENTER_BODY)).toBe('none');
    expect(rowDisplay(EL.REF_FRAME)).toBe('none');
  });

  it('shows the OEM header center body and frame for an OEM object and hides them for a TLE satellite', () => {
    const oem = new OemSatellite(makeOem('SUN', 'ICRF'));

    p().updateOrbitData_(oem);
    expect(rowDisplay(EL.CENTER_BODY)).toBe('flex');
    expect(text(EL.CENTER_BODY)).toBe('Sun');
    expect(text(EL.REF_FRAME)).toBe('ICRF');

    p().updateOrbitData_(defaultSat);
    expect(rowDisplay(EL.CENTER_BODY)).toBe('none');
    expect(rowDisplay(EL.REF_FRAME)).toBe('none');
  });

  it('shows an Earth-centered OEM (Lucy: EARTH / EME2000)', () => {
    const oem = new OemSatellite(makeOem('EARTH', 'EME2000'));

    p().updateOrbitData_(oem);
    expect(text(EL.CENTER_BODY)).toBe('Earth');
    expect(text(EL.REF_FRAME)).toBe('EME2000');
  });

  it('formatCenterName title-cases multi-word CCSDS center names', () => {
    expect(SatInfoBoxOrbital.formatCenterName('SOLAR SYSTEM BARYCENTER')).toBe('Solar System Barycenter');
    expect(SatInfoBoxOrbital.formatCenterName('MARS BARYCENTER')).toBe('Mars Barycenter');
    expect(SatInfoBoxOrbital.formatCenterName('')).toBe('');
  });

  it('shows N/A for apogee and perigee during a launch ascent, and numbers once on orbit', () => {
    const phases = [
      { name: 'Ascent', type: OrbitPhaseType.ASCENT, startIndex: 0, endIndex: 5, startTime: new Date(START_MS), endTime: new Date(START_MS + 5 * 60_000) },
      { name: 'On Orbit', type: OrbitPhaseType.ORBIT, startIndex: 6, endIndex: 11, startTime: new Date(START_MS + 6 * 60_000), endTime: new Date(START_MS + 11 * 60_000) },
    ];
    const launch = new PhasedOrbitSatellite(makeOem('EARTH', 'EME2000'), phases, makeStates(), []);

    vi.spyOn(launch, 'toClassicalElements').mockReturnValue(ascentElements as never);

    p().updateOrbitData_(launch);
    expect(text(EL.APOGEE)).toBe('N/A');
    expect(text(EL.PERIGEE)).toBe('N/A');
    expect(text(EL.INCLINATION)).toBe('29.04°');

    vi.spyOn(launch, 'toClassicalElements').mockReturnValue({ ...ascentElements, apogee: 420, perigee: 410, eccentricity: 0.001, period: 92.9 } as never);
    ServiceLocator.getTimeManager().simulationTimeObj = new Date(START_MS + 8 * 60_000);

    p().updateOrbitData_(launch);
    expect(text(EL.APOGEE)).toBe('420 km');
    expect(text(EL.PERIGEE)).toBe('410 km');
  });
});
