import { ServiceLocator } from '@app/engine/core/service-locator';
import { SensorFovMesh } from '@app/engine/rendering/draw-manager/sensor-fov-mesh';
import { SensorFovMeshFactory } from '@app/engine/rendering/draw-manager/sensor-fov-mesh-factory';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorFov } from '@app/plugins/sensor-fov/sensor-fov';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { SensorSurvFence } from '@app/plugins/sensor-surv/sensor-surv-fence';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { SpaceObjectType } from '@ootk/src/main';
import { defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { mat4 } from 'gl-matrix';
import { vi } from 'vitest';

describe('SensorFovMeshFactory.drawAll with nothing drawable', () => {
  let factory: SensorFovMeshFactory;
  let fov: SensorFov;
  let fence: SensorSurvFence;
  let toastSpy: ReturnType<typeof vi.spyOn>;

  const draw = () => factory.drawAll(mat4.create(), mat4.create());

  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorListPlugin]);
    fov = new SensorFov();
    fence = new SensorSurvFence();
    websiteInit(fov);
    websiteInit(fence);
    factory = new SensorFovMeshFactory();
    toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast');
    toastSpy.mockClear();
    // A sensor is selected but no mesh exists for it, so nothing can be drawn.
    ServiceLocator.getSensorManager().currentSensors = [defaultSensor];
  });

  afterEach(() => vi.restoreAllMocks());

  it('toasts and switches Sensor FOV off', () => {
    fov.setBottomIconToEnabled();
    fov.setBottomIconToSelected();
    expect(fov.isMenuButtonActive).toBe(true);

    draw();

    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy.mock.calls[0][0]).toContain('No valid FOV');
    expect(fov.isMenuButtonActive).toBe(false);
  });

  it('toasts and switches Sensor Fence off, like FOV', () => {
    fence.setBottomIconToEnabled();
    fence.setBottomIconToSelected();
    expect(fence.isMenuButtonActive).toBe(true);

    draw();

    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy.mock.calls[0][0]).toContain('No valid FOV');
    expect(fence.isMenuButtonActive).toBe(false);
  });

  it('stays silent when neither layer is on', () => {
    draw();

    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('does not toast when a Short Term Fence is drawn with the Fence layer on', () => {
    const stf = defaultSensor.clone();

    stf.type = SpaceObjectType.SHORT_TERM_FENCE;
    stf.objName = 'STF-test';
    ServiceLocator.getSensorManager().currentSensors = [];
    ServiceLocator.getSensorManager().stfSensors = [stf];
    const stfMesh = Object.create(SensorFovMesh.prototype) as SensorFovMesh;

    stfMesh.sensor = stf;
    const drawSpy = vi.spyOn(stfMesh, 'draw').mockImplementation(() => undefined);

    factory.meshes = [stfMesh];
    fence.setBottomIconToEnabled();
    fence.setBottomIconToSelected();

    draw();

    expect(drawSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy).not.toHaveBeenCalled();
    expect(fence.isMenuButtonActive).toBe(true);
  });
});
