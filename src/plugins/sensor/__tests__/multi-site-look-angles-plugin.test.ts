import { vi } from 'vitest';
import { SoundNames } from '@app/engine/audio/sounds';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { MultiSiteLookAnglesPlugin } from '@app/plugins/sensor/multi-site-look-angles-plugin';
import { saveXlsx } from '@app/engine/utils/saveVariable';
import type { TearrData } from '@app/app/sensors/sensor-math';
import { Degrees, Kilometers } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';

vi.mock('@app/engine/utils/saveVariable', () => ({
  saveXlsx: vi.fn(),
  saveCsv: vi.fn(),
  saveVariable: vi.fn(),
  copyTsvToClipboard: vi.fn(),
  getCircularReplacer: vi.fn(),
}));

describe('MultiSiteLookAnglesPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.advanceTimersByTime(1000);
  });

  standardPluginSuite(MultiSiteLookAnglesPlugin);
  standardPluginMenuButtonTests(MultiSiteLookAnglesPlugin);
  standardClickTests(MultiSiteLookAnglesPlugin);
  standardChangeTests(MultiSiteLookAnglesPlugin);

  describe('downloadIconCb', () => {
    beforeEach(() => {
      vi.mocked(saveXlsx).mockClear();
    });

    it('SensorManager initializes lastMultiSiteArray as an empty array', () => {
      expect(ServiceLocator.getSensorManager().lastMultiSiteArray).toEqual([]);
    });

    it('does not export when lastMultiSiteArray is empty and plays the error sound', () => {
      const plugin = new MultiSiteLookAnglesPlugin();
      const playSpy = vi.spyOn(ServiceLocator.getSoundManager()!, 'play').mockImplementation(() => undefined);

      ServiceLocator.getSensorManager().lastMultiSiteArray = [];
      plugin.downloadIconCb();

      expect(saveXlsx).not.toHaveBeenCalled();
      expect(playSpy).toHaveBeenCalledWith(SoundNames.ERROR);
      expect(playSpy).not.toHaveBeenCalledWith(SoundNames.EXPORT);
    });

    it('exports mapped data when lastMultiSiteArray has entries', () => {
      const plugin = new MultiSiteLookAnglesPlugin();
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
