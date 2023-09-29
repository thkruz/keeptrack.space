import { keepTrackApi, KeepTrackApiMethods } from '../keepTrackApi';
import { getEl } from '../lib/get-el';
import { clickDragOptions, KeepTrackPlugin } from './KeepTrackPlugin';

export class SensorInfoPlugin extends KeepTrackPlugin {
  isRequireSensorSelected: boolean = true;

  bottomIconCallback: () => void = () => {
    super.bottomIconCallback();
  };

  bottomIconElementName = 'sensor-info-icon';
  bottomIconLabel = 'Sensor Info';
  bottomIconImg: import('module');
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  sideMenuElementName: string = 'sensor-info-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
    <div id='sensor-info-menu' class='side-menu-parent start-hidden text-select'>
    </div>`;

  dragOptions: clickDragOptions = {
    isDraggable: true,
  };

  static PLUGIN_NAME = 'Sensor Info';
  constructor() {
    super(SensorInfoPlugin.PLUGIN_NAME);
  }

  helpTitle = `Sensor Info`;
  helpBody = keepTrackApi.html`
    Sensor Info provides information about the currently selected sensor.`;

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      method: KeepTrackApiMethods.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        SensorInfoPlugin.addSensorToMoonBtnListener();
      },
    });
  }

  private static addSensorToMoonBtnListener() {
    getEl('sensor-moon-btn').addEventListener('click', () => {});
  }
}

export const sensorInfoPlugin = new SensorInfoPlugin();
