import { SatMath, SunStatus } from '@app/app/analysis/sat-math';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SatInfoBoxSensor } from '@app/plugins/sat-info-box-sensor/sat-info-box-sensor';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SpaceObjectType, Sun } from '@ootk/src/main';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SatInfoBoxSensor sun status', () => {
  let plugin: SatInfoBoxSensor;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  const sunEl = () => getEl('sat-sun', true) as HTMLElement | null;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    plugin = new SatInfoBoxSensor();
    websiteInit(plugin);
    // sat-sun lives inside a row with a parent that gets shown/hidden.
    if (!getEl('sat-sun', true)) {
      document.body.insertAdjacentHTML('beforeend', '<div><div id="sat-sun"></div></div>');
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hides the sun row when no sensor is selected', () => {
    ServiceLocator.getSensorManager().currentSensors = [];
    vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(false);

    p().calculateSunStatus_(defaultSat);

    expect(sunEl()!.parentElement!.style.display).toBe('none');
  });

  it('reports "No Effect" for a non-optical (radar) sensor', () => {
    ServiceLocator.getSensorManager().currentSensors = [defaultSensor];
    vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(true);

    p().calculateSunStatus_(defaultSat);

    expect(sunEl()!.innerHTML).toBe('No Effect');
  });

  it('reports direct sunlight for an optical sensor at night and a sunlit satellite', () => {
    const optical = defaultSensor.clone();

    optical.type = SpaceObjectType.OPTICAL;
    ServiceLocator.getSensorManager().currentSensors = [optical];
    vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(true);

    // Keep "now" outside the sun-exclusion window (sunrise in the future, sunset in the past).
    vi.spyOn(Sun, 'getTimes').mockReturnValue({
      sunriseStart: new Date(Date.now() + 3600_000),
      sunsetEnd: new Date(Date.now() - 3600_000),
    } as never);
    vi.spyOn(SatMath, 'calculateIsInSun').mockReturnValue(SunStatus.SUN);

    p().calculateSunStatus_(defaultSat);

    expect(sunEl()!.innerHTML).toBe('Direct Sunlight');
  });

  it('reports the sun-exclusion warning when the sun is up over an optical sensor', () => {
    const optical = defaultSensor.clone();

    optical.type = SpaceObjectType.OPTICAL;
    ServiceLocator.getSensorManager().currentSensors = [optical];
    vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(true);

    // sunrise already happened, sunset still ahead → daylight → sun exclusion.
    vi.spyOn(Sun, 'getTimes').mockReturnValue({
      sunriseStart: new Date(Date.now() - 3600_000),
      sunsetEnd: new Date(Date.now() + 3600_000),
    } as never);
    vi.spyOn(SatMath, 'calculateIsInSun').mockReturnValue(SunStatus.SUN);

    p().calculateSunStatus_(defaultSat);

    expect(sunEl()!.innerHTML).toBe('Sun Exclusion');
  });

  it('updateSensorInfo_ is a no-op for a null object', () => {
    expect(() => p().updateSensorInfo_(null)).not.toThrow();
  });

  it('updateSensorVisibility_ hides the sensor section without a selection', () => {
    const ssm = PluginRegistry.getPlugin(SelectSatManager);

    if (ssm) {
      (ssm as unknown as { selectedSat: number }).selectedSat = -1;
    }

    expect(() => p().updateSensorVisibility_()).not.toThrow();
    expect(getEl('sensor-sat-info', true)?.style.display).toBe('none');
  });
});
