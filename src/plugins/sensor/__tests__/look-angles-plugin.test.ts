import { vi } from 'vitest';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { saveXlsx } from '@app/engine/utils/saveVariable';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { LookAnglesPlugin } from '@app/plugins/sensor/look-angles-plugin';
import { TearrType, type TearrData } from '@app/app/sensors/sensor-math';
import { Degrees, Kilometers } from '@ootk/src/main';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

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
    // Keep the loop bounded — a tiny window over a 1s rise/set interval.
    p().lengthOfLookAngles_ = 0.002;

    const result = p().getlookangles_(defaultSat);

    expect(Array.isArray(result)).toBe(true);
    expect(getEl('looks')!.querySelectorAll('tr').length).toBeGreaterThan(0);
  });

  it('getlookangles_ returns an empty array when no sensor is selected', () => {
    ServiceLocator.getSensorManager().currentSensors = [];

    expect(p().getlookangles_(defaultSat)).toStrictEqual([]);
  });

  it('populateSideMenuTable_ renders a header plus rows for entries', () => {
    const entry = {
      time: '2022-01-01T00:00:00.000Z', az: 100 as Degrees, el: 10 as Degrees,
      rng: 500 as Kilometers, objName: 'COD', type: TearrType.RISE, canStationObserve: true,
    };

    p().populateSideMenuTable_([entry], ServiceLocator.getTimeManager());

    expect(getEl('looks')!.querySelectorAll('tr').length).toBeGreaterThan(1);
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
    const looks: (TearrData & { type: TearrType })[] = [{ time: '2022-01-01T00:00:00.000Z', az: 100 as Degrees, el: 10 as Degrees, rng: 500 as Kilometers, objName: 'COD', type: TearrType.RISE }];

    p().lastlooksArray_ = looks;
    const getSelSpy = vi.spyOn(p().selectSatManager_, 'getSelectedSat').mockReturnValue(defaultSat);

    ServiceLocator.getSensorManager().currentSensors = [defaultSensor];

    // Runs the full mapping path (sensor display name, csv build) through to export.
    expect(() => plugin.downloadIconCb()).not.toThrow();
    expect(getSelSpy).toHaveBeenCalled();
  });
});
