import { SensorManager } from '@app/app/sensors/sensorManager';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorFov } from '@app/plugins/sensor-fov/sensor-fov';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { SensorSurvFence } from '@app/plugins/sensor-surv/sensor-surv-fence';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SensorManager.updateSensorUiStyling keeps the FOV / Fence layers', () => {
  let fov: SensorFov;
  let fence: SensorSurvFence;

  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorListPlugin]);
    fov = new SensorFov();
    fence = new SensorSurvFence();
    websiteInit(fov);
    websiteInit(fence);
  });

  afterEach(() => vi.restoreAllMocks());

  it('leaves Sensor FOV on when another valid sensor is chosen', () => {
    fov.setBottomIconToEnabled();
    fov.setBottomIconToSelected();

    SensorManager.updateSensorUiStyling([defaultSensor]);

    expect(fov.isMenuButtonActive).toBe(true);
  });

  it('leaves Sensor Fence on when another valid sensor is chosen', () => {
    fence.setBottomIconToEnabled();
    fence.setBottomIconToSelected();

    SensorManager.updateSensorUiStyling([defaultSensor]);

    expect(fence.isMenuButtonActive).toBe(true);
  });

  it('Reset Sensor still switches both layers off', () => {
    const mgr = new SensorManager();

    fov.setBottomIconToEnabled();
    fov.setBottomIconToSelected();
    fence.setBottomIconToEnabled();

    mgr.resetSensorSelected();

    expect(fov.isMenuButtonActive).toBe(false);
    expect(fence.isMenuButtonActive).toBe(false);
    expect(fov.isIconDisabled).toBe(true);
    expect(fence.isIconDisabled).toBe(true);
  });
});
