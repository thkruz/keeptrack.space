/* eslint-disable dot-notation */
import { sensors } from '@app/app/data/catalogs/sensors';
import { CameraType } from '@app/engine/camera/camera-type';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('SensorListPlugin commands, shortcuts and content clicks', () => {
  let plugin: SensorListPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sm: any;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (DateTimeManager.prototype as any).uiManagerFinal_ = vi.fn();
    setupStandardEnvironment([TopMenu, DateTimeManager]);
    plugin = new SensorListPlugin();

    sm = ServiceLocator.getSensorManager();
    sm.clearSecondarySensors = vi.fn();
    sm.setSensor = vi.fn();
    sm.resetSensorSelected = vi.fn();
    sm.currentSensors = [{ lat: 1, lon: 2, zoom: undefined }];
  });

  afterEach(() => vi.restoreAllMocks());

  describe('getCommandPaletteCommands', () => {
    it('returns one command per sensor group plus one per catalog sensor', () => {
      const commands = plugin.getCommandPaletteCommands();
      const groupCount = p().sensorGroups_.length;
      const sensorCount = Object.keys(sensors).length;

      expect(commands).toHaveLength(groupCount + sensorCount);
      expect(commands.every((c) => c.category === 'Sensors')).toBe(true);
    });

    it('a sensor command sets the sensor and snaps the camera', () => {
      const camera = ServiceLocator.getMainCamera();

      camera.lookAtLatLon = vi.fn();
      const commands = plugin.getCommandPaletteCommands();
      const sensorCmd = commands.find((c) => c.id.startsWith('SensorListPlugin.setSensor.'))!;

      sensorCmd.callback();

      expect(sm.clearSecondarySensors).toHaveBeenCalled();
      expect(sm.setSensor).toHaveBeenCalled();
      expect(camera.lookAtLatLon).toHaveBeenCalled();
    });

    it('a group command sets the sensor group by name', () => {
      const commands = plugin.getCommandPaletteCommands();
      const groupCmd = commands.find((c) => c.id.startsWith('SensorListPlugin.setSensorGroup.'))!;
      const groupName = groupCmd.id.replace('SensorListPlugin.setSensorGroup.', '');

      groupCmd.callback();

      expect(sm.setSensor).toHaveBeenCalledWith(groupName);
    });
  });

  describe('getKeyboardShortcuts', () => {
    const run = (key: string, ctrl = false) => {
      const sc = plugin.getKeyboardShortcuts().find((s) => s.key === key && Boolean(s.ctrl) === ctrl)!;

      sc.callback();
    };

    // Camera-mode suppression is handled centrally by KeyboardComponent; the
    // plugin callback simply toggles the menu.
    it('S toggles the menu', () => {
      ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_EARTH;
      const spy = vi.spyOn(plugin, 'bottomMenuClicked').mockImplementation(() => undefined);

      run('S');

      expect(spy).toHaveBeenCalled();
    });

    it('Ctrl+Home snaps the camera to the current sensor when earth-fixed', () => {
      ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_EARTH;
      const camera = ServiceLocator.getMainCamera();

      camera.lookAtLatLon = vi.fn();

      run('Home', true);

      expect(camera.lookAtLatLon).toHaveBeenCalled();
    });

    it('Ctrl+Home does nothing without a current sensor', () => {
      sm.currentSensors = [];
      ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_EARTH;
      const camera = ServiceLocator.getMainCamera();

      camera.lookAtLatLon = vi.fn();

      run('Home', true);

      expect(camera.lookAtLatLon).not.toHaveBeenCalled();
    });
  });

  describe('sensorListContentClick', () => {
    beforeEach(() => {
      p().isMenuButtonActive = true;
      ServiceLocator.getMainCamera().lookAtLatLon = vi.fn();
    });

    it('returns early when the menu is not active', () => {
      p().isMenuButtonActive = false;

      plugin.sensorListContentClick('SSN');

      expect(sm.setSensor).not.toHaveBeenCalled();
    });

    it('ignores an empty selection', () => {
      plugin.sensorListContentClick('');

      expect(sm.setSensor).not.toHaveBeenCalled();
    });

    it('loads an entire group by name', () => {
      const groupName = p().sensorGroups_[0].name;

      plugin.sensorListContentClick(groupName);

      expect(sm.clearSecondarySensors).toHaveBeenCalled();
      expect(sm.setSensor).toHaveBeenCalledWith(groupName);
    });

    it('loads a single sensor by catalog key', () => {
      const sensorKey = Object.keys(sensors)[0];

      plugin.sensorListContentClick(sensorKey);

      expect(sm.setSensor).toHaveBeenCalledWith(sensors[sensorKey]);
    });
  });

  describe('bottomIconCallback', () => {
    it('restores the sensor top-link grid layout when the menu is active', () => {
      const el = document.createElement('div');

      el.className = 'sensor-top-link';
      el.style.display = 'none';
      document.body.appendChild(el);
      p().isMenuButtonActive = true;

      plugin.bottomIconCallback();

      expect(el.style.display).toBe('');
      expect(el.style.gridTemplateColumns).toBe('repeat(2,1fr)');
    });
  });
});
