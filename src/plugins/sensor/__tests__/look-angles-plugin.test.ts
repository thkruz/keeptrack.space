import { SatMath } from '@app/app/analysis/sat-math';
import { sensors } from '@app/app/data/catalogs/sensors';
import { SensorMath, type TearrData, TearrType } from '@app/app/sensors/sensor-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { saveXlsx } from '@app/engine/utils/saveVariable';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { compactUtcStamp, fileSafeName, LookAnglesPlugin, roundOrNull } from '@app/plugins/sensor/look-angles-plugin';
import { Degrees, Kilometers } from '@ootk/src/main';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

vi.mock('@app/engine/utils/saveVariable', () => ({
  saveXlsx: vi.fn(),
  saveCsv: vi.fn(),
  saveVariable: vi.fn(),
  copyTsvToClipboard: vi.fn(),
  getCircularReplacer: vi.fn(),
}));

describe('LookAnglesPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.advanceTimersByTime(1000);
  });

  standardPluginSuite(LookAnglesPlugin);
  standardPluginMenuButtonTests(LookAnglesPlugin);
  standardClickTests(LookAnglesPlugin);
  standardChangeTests(LookAnglesPlugin);
});

describe('LookAnglesPlugin look-angle computation', () => {
  let plugin: LookAnglesPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new LookAnglesPlugin();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
    ServiceLocator.getSensorManager().currentSensors = [defaultSensor];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getlookangles_ runs the propagation loop and populates the looks table', () => {
    // Keep the loop bounded - a tiny window over a 1s rise/set interval.
    p().lengthOfLookAngles_ = 0.002;

    const result = p().getlookangles_(defaultSat);

    expect(Array.isArray(result)).toBe(true);
    expect(getEl('looks')!.querySelectorAll('tr').length).toBeGreaterThan(0);
  });

  it('names the object and the sensor above the table and labels the time column UTC', () => {
    // Locale lookups return the key in this environment, so assert the title was replaced and the header names UTC.
    p().lengthOfLookAngles_ = 0.002;
    p().getlookangles_(defaultSat);

    const title = getEl('looks-title')!.textContent ?? '';

    expect(title).not.toBe('');
    expect(title).not.toContain('sections.results');
    expect(getEl('looks')!.querySelector('tr td')!.textContent).toMatch(/UTC/iu);
  });

  it('rise/set mode adds an "In view now" row when the pass is already under way at the start time', () => {
    p().lengthOfLookAngles_ = 0.002;
    p().isRiseSetOnly_ = true;
    const setRow = { time: '2026-01-01 00:00:30', rng: 900, az: 10, el: 5, type: TearrType.SET, inView: true } as TearrData;

    vi.spyOn(SensorMath, 'getTearData').mockImplementation(
      (_now, _satrec, _sensors, isRiseSet) => (isRiseSet ? setRow : { time: '2026-01-01 00:00:00', rng: 800, az: 5, el: 20, inView: true }) as TearrData
    );
    const rows = p().getlookangles_(defaultSat) as Array<{ inProgress?: boolean; type?: TearrType }>;

    expect(rows[0].inProgress).toBe(true);
    expect(rows[0].type).toBeUndefined();
    expect(rows.slice(1).every((r) => r.type === TearrType.SET)).toBe(true);
    expect(getEl('looks')!.textContent).toContain('In view now');
  });

  it('rise/set mode adds no "In view now" row when the first row is a Rise', () => {
    p().lengthOfLookAngles_ = 0.002;
    p().isRiseSetOnly_ = true;
    const riseRow = { time: '2026-01-01 00:00:05', rng: 900, az: 10, el: 5, type: TearrType.RISE, inView: true } as TearrData;

    vi.spyOn(SensorMath, 'getTearData').mockImplementation(
      (_now, _satrec, _sensors, isRiseSet) => (isRiseSet ? riseRow : { time: '2026-01-01 00:00:00', rng: 800, az: 5, el: 20, inView: true }) as TearrData
    );
    const rows = p().getlookangles_(defaultSat) as Array<{ inProgress?: boolean }>;

    expect(rows.some((r) => r.inProgress)).toBe(false);
  });

  it('getlookangles_ returns an empty array when no sensor is selected', () => {
    ServiceLocator.getSensorManager().currentSensors = [];

    expect(p().getlookangles_(defaultSat)).toStrictEqual([]);
  });

  it('populateSideMenuTable_ renders a header plus rows for entries', () => {
    const entry = {
      time: '2022-01-01T00:00:00.000Z',
      az: 100 as Degrees,
      el: 10 as Degrees,
      rng: 500 as Kilometers,
      objName: 'COD',
      type: TearrType.RISE,
    };

    p().populateSideMenuTable_([entry], ServiceLocator.getTimeManager());

    expect(getEl('looks')!.querySelectorAll('tr').length).toBeGreaterThan(1);
  });

  it('populateSideMenuTable_ tags a mask-limited rise row with the mask marker', () => {
    const base = { time: '2022-01-01T00:00:00.000Z', az: 100 as Degrees, el: 10 as Degrees, rng: 500 as Kilometers, objName: 'COD' };

    p().populateSideMenuTable_(
      [
        { ...base, type: TearrType.RISE, maskLimited: true },
        { ...base, type: TearrType.SET, maskLimited: false },
      ],
      ServiceLocator.getTimeManager()
    );

    const markers = getEl('looks')!.querySelectorAll('.la-mask-limited');

    expect(markers).toHaveLength(1);
    expect(markers[0].textContent).toBe('mask');
  });

  it('populateSideMenuTable_ shows a not-visible message for an empty set', () => {
    p().lengthOfLookAngles_ = 1;
    p().populateSideMenuTable_([], ServiceLocator.getTimeManager());

    expect(getEl('looks')!.textContent).toMatch(/not visible/iu);
  });

  it('tearrTypeToString_ maps every TearrType to a label', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toStr = (LookAnglesPlugin as any).tearrTypeToString_;

    expect(toStr(TearrType.RISE)).toBe('Rise');
    expect(toStr(TearrType.SET)).toBe('Set');
    expect(toStr(TearrType.MAX_EL)).toBe('Max El');
    expect(toStr(TearrType.UNKNOWN)).toBe('Unknown');
    // Full-table rows (rise/set off) carry no type: every emitted sample is in view
    expect(toStr(undefined)).toBe('In View');
  });

  it('populateSideMenuTable_ labels untyped rows "In View" (rise/set off), never "Unknown"', () => {
    const base = { time: '2026-10-16 06:00:00', az: 120 as Degrees, el: 25 as Degrees, rng: 39524 as Kilometers, objName: 'COD' };

    p().populateSideMenuTable_([base, { ...base, time: '2026-10-16 06:10:00' }], ServiceLocator.getTimeManager());

    const rows = getEl('looks')!.querySelectorAll('tr');

    expect(rows[0].textContent).toContain('Type');
    expect(rows[1].textContent).toContain('In View');
    expect(rows[2].textContent).toContain('In View');
    expect(getEl('looks')!.textContent).not.toContain('Unknown');
  });

  it('compactUtcStamp, fileSafeName and roundOrNull build export-friendly values', () => {
    expect(compactUtcStamp('2026-10-16 06:03:07')).toBe('20261016T060307Z');
    expect(compactUtcStamp('2026-10-16T06:03:07.000Z')).toBe('20261016T060307Z');
    expect(compactUtcStamp('')).toBe('');
    expect(compactUtcStamp(undefined)).toBe('');
    expect(fileSafeName('Custom Sensor (Flagstaff 0.5m)')).toBe('Custom_Sensor_Flagstaff_0.5m');
    expect(roundOrNull(12.345678, 1)).toBe(12.3);
    expect(roundOrNull(null, 1)).toBeNull();
    expect(roundOrNull(Number.NaN, 1)).toBeNull();
  });

  it('settingsRisesetChange_ toggles isRiseSetOnly_ and throws on a missing event', () => {
    p().settingsRisesetChange_({} as Event, false);
    expect(p().isRiseSetOnly_).toBe(false);

    p().settingsRisesetChange_({} as Event, true);
    expect(p().isRiseSetOnly_).toBe(true);

    expect(() => p().settingsRisesetChange_(null)).toThrow();
  });

  it('downloadIconCb warns when no look angles are available', () => {
    p().lastlooksArray_ = undefined;
    vi.spyOn(plugin as unknown as { refreshSideMenuData_: () => void }, 'refreshSideMenuData_').mockImplementation(() => undefined);

    plugin.downloadIconCb();

    expect(saveXlsx).not.toHaveBeenCalled();
  });

  it('downloadIconCb builds and exports the cached look angles', () => {
    const looks: (TearrData & { type: TearrType })[] = [
      { time: '2022-01-01T00:00:00.000Z', az: 100 as Degrees, el: 10 as Degrees, rng: 500 as Kilometers, objName: 'COD', type: TearrType.RISE },
    ];

    p().lastlooksArray_ = looks;
    const getSelSpy = vi.spyOn(p().selectSatManager_, 'getSelectedSat').mockReturnValue(defaultSat);

    ServiceLocator.getSensorManager().currentSensors = [defaultSensor];

    // Runs the full mapping path (sensor display name, csv build) through to export.
    expect(() => plugin.downloadIconCb()).not.toThrow();
    expect(getSelSpy).toHaveBeenCalled();
  });

  it('export rows are numeric and the file name carries sensor + UTC pass start', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cls = LookAnglesPlugin as any;
    const looks = [
      { time: '2026-10-16 06:03:07', az: 120.04 as Degrees, el: 10.06 as Degrees, rng: 1500.26 as Kilometers, objName: 'COD', type: TearrType.RISE },
      { time: '2026-10-16 06:03:08', az: 120.5 as Degrees, el: 10.2 as Degrees, rng: 1499.8 as Kilometers, objName: 'COD' },
    ];
    const rows = cls.buildExportRows_(looks, 'Custom Sensor (Flagstaff 0.5m)') as Record<string, unknown>[];

    expect(rows[0].Azimuth).toBe(120);
    expect(rows[0].Elevation).toBe(10.1);
    expect(rows[0].Range).toBe(1500.3);
    expect(rows[0].Type).toBe('Rise');
    expect(rows[1].Type).toBe('In View');
    expect(typeof rows[1].Azimuth).toBe('number');

    expect(cls.buildExportFileName_('Custom Sensor (Flagstaff 0.5m)', '063218', looks[0].time)).toBe('Custom_Sensor_Flagstaff_0.5m-063218-20261016T060307Z-look-angles');
    // Two passes for the same object no longer share a name
    expect(cls.buildExportFileName_('S', '063218', '2026-10-20 17:22:00')).not.toBe(cls.buildExportFileName_('S', '063218', '2026-10-16 06:03:07'));
    expect(cls.buildExportFileName_('S', '063218', undefined)).toBe('S-063218-look-angles');
  });
});

describe('LookAnglesPlugin time in view', () => {
  it('gives the Set row the seconds since its Rise row and exports it', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cls = LookAnglesPlugin as any;
    const b = { az: 180 as Degrees, el: 45 as Degrees, rng: 900 as Kilometers, objName: 'X' };
    const looks = [
      { ...b, time: '2026-11-04 05:33:30', type: TearrType.RISE },
      { ...b, time: '2026-11-04 05:33:45', type: TearrType.MAX_EL },
      { ...b, time: '2026-11-04 05:33:57', type: TearrType.SET },
      { ...b, time: '2026-11-04 07:00:00', type: TearrType.SET },
    ];

    expect(cls.passDurations_(looks)).toEqual([null, null, 27, null]);
    expect(cls.buildExportRows_(looks, 'S').map((r: Record<string, unknown>) => r['Time in view (s)'])).toEqual([null, null, 27, null]);
  });
});

describe('LookAnglesPlugin export lighting columns', () => {
  it('exports Sunlit and Optically visible with the empty-string convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cls = LookAnglesPlugin as any;
    const b = { time: '2026-10-16 06:00:00', az: 120 as Degrees, el: 25 as Degrees, rng: 900 as Kilometers, objName: 'X' };
    const rows = cls.buildExportRows_([{ ...b, sunlit: true, opticalVisible: false }, { ...b, sunlit: null }, { ...b }], 'S') as Record<string, unknown>[];

    expect(rows[0].sunlit).toBe(true);
    expect(rows[0].opticalVisible).toBe(false);
    expect(rows[1].sunlit).toBe('');
    expect(rows[1].opticalVisible).toBe('');
    expect(rows[2].sunlit).toBe('');
  });
});

describe('LookAnglesPlugin three-state lighting columns', () => {
  let plugin: LookAnglesPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  const base = { time: '2026-10-16 06:00:00', az: 120 as Degrees, el: 25 as Degrees, rng: 900 as Kilometers, objName: 'X' };
  const cells = (rowIdx: number) => Array.from(getEl('looks')!.querySelectorAll('tr')[rowIdx].querySelectorAll('td')).map((c) => c.textContent);

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new LookAnglesPlugin();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renames the geometric column "Above horizon" and adds a Sunlit column', () => {
    ServiceLocator.getSensorManager().currentSensors = [sensors.GEODDSSOC];
    p().populateSideMenuTable_([{ ...base, sunlit: true, opticalVisible: true }], ServiceLocator.getTimeManager());

    const header = cells(0);

    expect(header).toContain('Above horizon');
    expect(header).not.toContain('Visible');
    expect(header).toContain('Sunlit');
  });

  it('eclipsed pass: Sunlit says Eclipsed and the optical verdict is No', () => {
    ServiceLocator.getSensorManager().currentSensors = [sensors.GEODDSSOC];
    p().populateSideMenuTable_([{ ...base, sunlit: false, opticalVisible: false }], ServiceLocator.getTimeManager());

    const row = cells(1);

    expect(row).toContain('Eclipsed');
    expect(row[row.length - 1]).toBe('No');
  });

  it('sunlit pass in daylight: above horizon Yes, optical No, limit stated', () => {
    ServiceLocator.getSensorManager().currentSensors = [sensors.GEODDSSOC];
    p().populateSideMenuTable_([{ ...base, sunlit: true, opticalVisible: false }], ServiceLocator.getTimeManager());

    const header = cells(0);
    const row = cells(1);

    expect(row[header.indexOf('Above horizon')]).toBe('Yes');
    expect(row[header.indexOf('Sunlit')]).toBe('Yes');
    expect(row[header.indexOf('Optically visible')]).toBe('No');
    expect(getEl('looks')!.parentElement!.textContent).toContain('-12');
  });

  it('negative-minEl row (el below 0 but in view) still says Above horizon Yes', () => {
    ServiceLocator.getSensorManager().currentSensors = [sensors.GEODDSSOC];
    p().populateSideMenuTable_([{ ...base, el: -2 as Degrees, sunlit: true, opticalVisible: true }], ServiceLocator.getTimeManager());

    const header = cells(0);

    expect(cells(1)[header.indexOf('Above horizon')]).toBe('Yes');
  });

  it('radar sensor shows no optical verdict column', () => {
    ServiceLocator.getSensorManager().currentSensors = [sensors.CODSFS];
    p().populateSideMenuTable_([{ ...base, sunlit: true, opticalVisible: undefined }], ServiceLocator.getTimeManager());

    expect(cells(0)).not.toContain('Optically visible');
    expect(cells(0)).toContain('Above horizon');
    expect(getEl('looks')!.parentElement!.textContent).not.toContain('-12');
  });
});

describe('LookAnglesPlugin row-loop lighting (F7)', () => {
  let plugin: LookAnglesPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  const tearr = { time: '2026-10-16 06:00:00', az: 120 as Degrees, el: 25 as Degrees, rng: 900 as Kilometers, objName: 'X' };

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new LookAnglesPlugin();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
    p().lengthOfLookAngles_ = 0.0005;
    p().angleCalculationInterval_ = 10;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('feeds the propagated position of each row into getLightingState and stores sunlit/opticalVisible', () => {
    const propagated = { x: 7000, y: 0, z: 0 };

    ServiceLocator.getSensorManager().currentSensors = [sensors.GEODDSSOC];
    vi.spyOn(SensorMath, 'getTearData').mockReturnValue(tearr as TearrData);
    vi.spyOn(SatMath, 'getEci').mockReturnValue({ position: propagated, velocity: { x: 0, y: 0, z: 0 } } as never);
    const lighting = vi.spyOn(SensorMath, 'getLightingState').mockReturnValue({ sunlit: false, siteDark: true, sunElDeg: -30 });

    const rows = p().getlookangles_(defaultSat) as Array<TearrData & { sunlit?: boolean | null; opticalVisible?: boolean }>;

    expect(rows.length).toBeGreaterThan(0);
    expect(lighting.mock.calls[0][0]).toBe(propagated);
    expect(lighting.mock.calls[0][1]).toBe(sensors.GEODDSSOC);
    expect(rows.every((r) => r.sunlit === false && r.opticalVisible === false)).toBe(true);
  });

  it('radar sensor rows get sunlit but no opticalVisible', () => {
    ServiceLocator.getSensorManager().currentSensors = [sensors.CODSFS];
    vi.spyOn(SensorMath, 'getTearData').mockReturnValue(tearr as TearrData);
    vi.spyOn(SatMath, 'getEci').mockReturnValue({ position: { x: 7000, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } } as never);
    vi.spyOn(SensorMath, 'getLightingState').mockReturnValue({ sunlit: true, siteDark: true, sunElDeg: -30 });

    const rows = p().getlookangles_(defaultSat) as Array<{ sunlit?: boolean | null; opticalVisible?: boolean }>;

    expect(rows[0].sunlit).toBe(true);
    expect(rows[0].opticalVisible).toBeUndefined();
  });

  it('negative-minEl optical row: in-view rows get the optical verdict even with el below 0', () => {
    ServiceLocator.getSensorManager().currentSensors = [sensors.GEODDSSOC];
    vi.spyOn(SensorMath, 'getTearData').mockReturnValue({ ...tearr, el: -2 as Degrees } as TearrData);
    vi.spyOn(SatMath, 'getEci').mockReturnValue({ position: { x: 7000, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } } as never);
    vi.spyOn(SensorMath, 'getLightingState').mockReturnValue({ sunlit: true, siteDark: true, sunElDeg: -30 });

    const rows = p().getlookangles_(defaultSat) as Array<{ opticalVisible?: boolean }>;

    expect(rows[0].opticalVisible).toBe(true);
  });
});
