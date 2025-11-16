import { GeolocationPosition, SensorGeolocation } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { Degrees, DetailedSensor, Kilometers, ZoomValue } from '@ootk/src/main';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { getEl } from '../../engine/utils/get-el';
import { lat2pitch, lon2yaw } from '../../engine/utils/transforms';
import { SensorManager } from '../sensors/sensorManager';

export class UiGeolocation {
  static updateSensorPosition(position: GeolocationPosition): void {
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const sensorManagerInstance = ServiceLocator.getSensorManager();
    const { lon, lat, alt, minaz, maxaz, minel, maxel, minrange, maxrange } = UiGeolocation.updateSettingsManager(position);

    sensorManagerInstance.whichRadar = 'CUSTOM';
    UiGeolocation.updateCustomSensorUi_();

    const sensorInfo = {
      lat,
      lon,
      alt,
      minAz: minaz,
      maxAz: maxaz,
      minEl: minel,
      maxEl: maxel,
      minRng: minrange,
      maxRng: maxrange,
    } as DetailedSensor;

    catalogManagerInstance.satCruncher.postMessage({
      typ: CruncerMessageTypes.SENSOR,
      sensor: sensorInfo,
    });

    SensorManager.updateSensorUiStyling([sensorInfo]);

    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);
    const mainCameraInstance = ServiceLocator.getMainCamera();

    // Default to GEO view if maxrange > 6000 km, otherwise LEO view
    if ((maxrange ?? Infinity) > 6000) {
      mainCameraInstance.changeZoom(ZoomValue.GEO);
    } else {
      mainCameraInstance.changeZoom(ZoomValue.LEO);
    }

    mainCameraInstance.camSnap(lat2pitch(lat), lon2yaw(lon, timeManagerInstance.simulationTimeObj));
  }

  static updateSettingsManager(position: GeolocationPosition): SensorGeolocation {
    settingsManager.geolocation.lat = <Degrees>position.coords.latitude;
    settingsManager.geolocation.lon = <Degrees>position.coords.longitude;
    settingsManager.geolocation.alt = <Kilometers>(position.coords.altitude / 1000);
    settingsManager.geolocation.minaz = <Degrees>0;
    settingsManager.geolocation.maxaz = <Degrees>360;
    settingsManager.geolocation.minel = <Degrees>30;
    settingsManager.geolocation.maxel = <Degrees>90;
    settingsManager.geolocation.minrange = <Kilometers>0;
    settingsManager.geolocation.maxrange = <Kilometers>100000;

    return settingsManager.geolocation;
  }

  static useCurrentGeolocationAsSensor() {
    if (location.protocol === 'https:' && !settingsManager.geolocationUsed && settingsManager.isMobileModeEnabled) {
      /*
       * Access to the users geolocation is explicitly for allowing them to use the
       * lat lon information when creating a custom sensor.
       */
      navigator.geolocation.getCurrentPosition(UiGeolocation.updateSensorPosition);
    }
  }

  private static updateCustomSensorUi_(): void {
    if (!settingsManager.geolocation) {
      throw new Error('geolocation is not defined');
    }
    if (typeof settingsManager.geolocation.lat !== 'number') {
      throw new Error('geolocation.lat is not valid');
    }
    if (typeof settingsManager.geolocation.lon !== 'number') {
      throw new Error('geolocation.lon is not valid');
    }
    if (typeof settingsManager.geolocation.alt !== 'number') {
      throw new Error('geolocation.alt is not valid');
    }

    try {
      const csLat = <HTMLInputElement>getEl('cs-lat');
      const csLon = <HTMLInputElement>getEl('cs-lon');
      const csHei = <HTMLInputElement>getEl('cs-hei');

      csLat.value = settingsManager.geolocation.lat.toString();
      csLat.dispatchEvent(new Event('change'));
      csLon.value = settingsManager.geolocation.lon.toString();
      csLon.dispatchEvent(new Event('change'));
      csHei.value = settingsManager.geolocation.alt.toString();
      csHei.dispatchEvent(new Event('change'));

      (<HTMLInputElement>getEl('cs-telescope')).checked = true;
      (<HTMLInputElement>getEl('cs-minaz')).disabled = true;
      (<HTMLInputElement>getEl('cs-maxaz')).disabled = true;
      (<HTMLInputElement>getEl('cs-minel')).disabled = true;
      (<HTMLInputElement>getEl('cs-maxel')).disabled = true;
      (<HTMLInputElement>getEl('cs-minrange')).disabled = true;
      (<HTMLInputElement>getEl('cs-maxrange')).disabled = true;

      getEl('cs-minaz-div').style.display = 'none';
      getEl('cs-maxaz-div').style.display = 'none';
      getEl('cs-minel-div').style.display = 'none';
      getEl('cs-maxel-div').style.display = 'none';
      getEl('cs-minrange-div').style.display = 'none';
      getEl('cs-maxrange-div').style.display = 'none';
      (<HTMLInputElement>getEl('cs-minaz')).value = '0';
      (<HTMLInputElement>getEl('cs-maxaz')).value = '360';
      (<HTMLInputElement>getEl('cs-minel')).value = '10';
      (<HTMLInputElement>getEl('cs-maxel')).value = '90';
      (<HTMLInputElement>getEl('cs-minrange')).value = '100';
      (<HTMLInputElement>getEl('cs-maxrange')).value = '50000';

      getEl('sensor-type').innerHTML = 'Telescope';
      getEl('sensor-info-title').innerHTML = 'Custom Sensor';
      getEl('sensor-country').innerHTML = 'Custom Sensor';
    } catch {
      // Optional UI elements - don't throw an error if they don't exist
      errorManagerInstance.debug('Error updating custom sensor UI. Is the plugin loaded?');
    }
  }
}
