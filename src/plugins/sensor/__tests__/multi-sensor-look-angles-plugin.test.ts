import type { TearrData } from '@app/app/sensors/sensor-math';
import { SoundNames } from '@app/engine/audio/sounds';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { saveXlsx } from '@app/engine/utils/saveVariable';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { MultiSensorLookAnglesPlugin } from '@app/plugins/sensor/multi-sensor-look-angles-plugin';
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

describe('MultiSensorLookAnglesPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.advanceTimersByTime(1000);
  });

  standardPluginSuite(MultiSensorLookAnglesPlugin);
  standardPluginMenuButtonTests(MultiSensorLookAnglesPlugin);
  standardClickTests(MultiSensorLookAnglesPlugin);
  standardChangeTests(MultiSensorLookAnglesPlugin);

  describe('downloadIconCb', () => {
    beforeEach(() => {
      vi.mocked(saveXlsx).mockClear();
    });

    it('SensorManager initializes lastMultiSiteArray as an empty array', () => {
      expect(ServiceLocator.getSensorManager().lastMultiSiteArray).toEqual([]);
    });

    it('does not export when lastMultiSiteArray is empty and plays the error sound', () => {
      const plugin = new MultiSensorLookAnglesPlugin();
      const playSpy = vi.spyOn(ServiceLocator.getSoundManager()!, 'play').mockImplementation(() => undefined);

      ServiceLocator.getSensorManager().lastMultiSiteArray = [];
      plugin.downloadIconCb();

      expect(saveXlsx).not.toHaveBeenCalled();
      expect(playSpy).toHaveBeenCalledWith(SoundNames.ERROR);
      expect(playSpy).not.toHaveBeenCalledWith(SoundNames.EXPORT);
    });

    it('exports mapped data when lastMultiSiteArray has entries', () => {
      const plugin = new MultiSensorLookAnglesPlugin();
      const playSpy = vi.spyOn(ServiceLocator.getSoundManager()!, 'play').mockImplementation(() => undefined);

      const sample: TearrData = {
        time: '2026-05-07T00:00:00.000Z',
        objName: 'TEST-SENSOR',
        az: 12.345 as Degrees,
        el: 67.89 as Degrees,
        rng: 1234.5678 as Kilometers,
        visible: true,
      };

      ServiceLocator.getSensorManager().lastMultiSiteArray = [sample];
      plugin.downloadIconCb();

      expect(playSpy).toHaveBeenCalledWith(SoundNames.EXPORT);
      expect(saveXlsx).toHaveBeenCalledTimes(1);
      const [exportData, filename] = vi.mocked(saveXlsx).mock.calls[0];

      expect(exportData).toEqual([
        {
          time: sample.time,
          sensor: sample.objName,
          az: '12.35',
          el: '67.89',
          rng: '1234.57',
          visible: true,
        },
      ]);
      expect(filename).toMatch(/^multisite-.*-look-angles$/u);
    });
  });
});

describe('MultiSensorLookAnglesPlugin look-angle computation', () => {
  let plugin: MultiSensorLookAnglesPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new MultiSensorLookAnglesPlugin();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('propagateMultiSite_ returns a TearrData for an in-view pass', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (MultiSensorLookAnglesPlugin as any).propagateMultiSite_(new Date('2022-01-01T00:00:00Z'), defaultSat.satrec, defaultSensor);

    expect(result).toHaveProperty('time');
    expect(result).toHaveProperty('az');
  });

  it('getlookanglesMultiSite_ runs the propagation loop and populates the table', () => {
    p().angleCalculationInterval_ = 1800;
    p().lengthOfLookAngles_ = 1;

    expect(() => p().getlookanglesMultiSite_(defaultSat, [defaultSensor])).not.toThrow();
    expect(getEl('multi-sensor-look-angles-table')!.innerHTML.length).toBeGreaterThan(0);
    expect(ServiceLocator.getSensorManager().lastMultiSiteArray).toBeDefined();
  });

  it('refreshSideMenuData builds a sensor toggle button per named sensor', () => {
    if (!getEl('multi-sensor-look-angles-sensor-list', true)) {
      document.body.insertAdjacentHTML('beforeend', '<div id="multi-sensor-look-angles-sensor-list"></div>');
    }
    const named = defaultSensor.clone();

    named.objName = 'COD';
    p().sensorList_ = [named];

    p().refreshSideMenuData(defaultSat);
    vi.advanceTimersByTime(2000); // showLoading defers the build via setTimeout

    expect(getEl('multi-sensor-look-angles-sensor-list')!.querySelectorAll('button').length).toBeGreaterThan(0);
  });

  it('populateMultiSiteTable_ renders rows for the look-angle entries', () => {
    const entry: TearrData = { time: '2022-01-01T00:00:00.000Z', az: 100 as Degrees, el: 10 as Degrees, rng: 500 as Kilometers, objName: 'COD' };

    p().populateMultiSiteTable_([entry], [defaultSensor]);

    expect(getEl('multi-sensor-look-angles-table')!.querySelectorAll('tr').length).toBeGreaterThan(0);
  });
});
