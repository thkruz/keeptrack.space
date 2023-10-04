import { keepTrackContainer } from '@app/js/container';
import { MissileObject, SatObject, SensorObject, Singletons, UiManager } from '@app/js/interfaces';
import { KeepTrackApiMethods, isMissileObject, isSatObject, isSensorObject, keepTrackApi } from '@app/js/keepTrackApi';
import { DEG2RAD, cKmPerMs } from '@app/js/lib/constants';
import { getEl } from '@app/js/lib/get-el';
import { getDayOfYear } from '@app/js/lib/transforms';
import { DrawManager } from '@app/js/singletons/draw-manager';
import { errorManagerInstance } from '@app/js/singletons/errorManager';
import { CoordinateTransforms } from '@app/js/static/coordinate-transforms';
import { SatMath } from '@app/js/static/sat-math';
import { SensorMath, TearrData } from '@app/js/static/sensor-math';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { DateTimeManager } from '../date-time-manager/date-time-manager';
import { missileManager } from '../missile/missileManager';
import { SatInfoBoxCore } from '../select-sat-manager/satInfoboxCore';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { StereoMapPlugin } from '../stereo-map/stereo-map';
import { TopMenu } from '../top-menu/top-menu';

/**
 * This is the class that manages the updating of selected objects.
 * It should update the UI regularly for selected satellite/missile.
 */
export class UpdateSatManager extends KeepTrackPlugin {
  dependencies: string[] = [TopMenu.PLUGIN_NAME, SelectSatManager.PLUGIN_NAME, SatInfoBoxCore.PLUGIN_NAME, DateTimeManager.PLUGIN_NAME];
  static PLUGIN_NAME = 'Update Sat Manager';

  constructor() {
    super(UpdateSatManager.PLUGIN_NAME);
  }

  currentTEARR = <TearrData>{
    az: 0,
    el: 0,
    rng: 0,
    name: '',
    lat: 0,
    lon: 0,
    alt: 0,
    inView: false,
  };

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      method: KeepTrackApiMethods.updateSelectBox,
      cbName: this.PLUGIN_NAME,
      cb: (sat: SatObject | SensorObject | MissileObject) => {
        if (!keepTrackApi.isInitialized) return;

        // Ignore if it's not a satellite or a missile
        if (isSensorObject(sat)) return;
        sat = <SatObject | MissileObject>sat;

        try {
          const catalogManagerInstance = keepTrackApi.getCatalogManager();
          const timeManagerInstance = keepTrackApi.getTimeManager();
          const sensorManagerInstance = keepTrackApi.getSensorManager();

          if (typeof sat === 'undefined' || sat == null) throw new Error('updateSelectBoxCoreCallback: sat is undefined');

          if (isSatObject(sat)) {
            sat = <SatObject>sat;
            if (!sat.position?.x || !sat.position?.y || !sat.position?.z || isNaN(sat.position?.x) || isNaN(sat.position?.y) || isNaN(sat.position?.z)) {
              const newPosition = SatMath.getEci(sat, timeManagerInstance.simulationTimeObj).position as { x: number; y: number; z: number };

              if (!newPosition || (newPosition?.x == 0 && newPosition?.y == 0 && newPosition?.z == 0)) {
                keepTrackApi
                  .getUiManager()
                  .toast(
                    `Satellite ${sat.sccNum} is not in orbit!<br>Sim time is ${timeManagerInstance.simulationTimeObj.toUTCString()}.<br>Be sure to check you have the right TLE.`,
                    'error',
                    true
                  );
                keepTrackApi.getSelectSatManager().selectSat(-1);
                return;
              }
            }
            if (catalogManagerInstance.isSensorManagerLoaded) {
              SensorMath.getTearr(sat, sensorManagerInstance.currentSensors, timeManagerInstance.simulationTimeObj);
              const currentTearr = SensorMath.getTearData(timeManagerInstance.simulationTimeObj, sat.satrec, sensorManagerInstance.currentSensors, false);
              this.currentTEARR = currentTearr; // TODO: Make SatMath 100% static
            }
          } else {
            // Is Missile
            this.currentTEARR = missileManager.getMissileTEARR(<MissileObject>sat);
          }

          const lla = CoordinateTransforms.eci2lla(sat.position, timeManagerInstance.simulationTimeObj);
          if (lla.lon >= 0) {
            getEl('sat-longitude').innerHTML = lla.lon.toFixed(3) + '°E';
          } else {
            getEl('sat-longitude').innerHTML = (lla.lon * -1).toFixed(3) + '°W';
          }
          if (lla.lat >= 0) {
            getEl('sat-latitude').innerHTML = lla.lat.toFixed(3) + '°N';
          } else {
            getEl('sat-latitude').innerHTML = (lla.lat * -1).toFixed(3) + '°S';
          }
          const jday = getDayOfYear(timeManagerInstance.simulationTimeObj);
          getEl('jday').innerHTML = jday.toString();

          if (
            settingsManager.plugins?.stereoMap &&
            keepTrackApi.getPlugin(StereoMapPlugin)?.isMenuButtonEnabled &&
            timeManagerInstance.realTime > settingsManager.lastMapUpdateTime + 30000
          ) {
            (<StereoMapPlugin>keepTrackApi.getPlugin(StereoMapPlugin)).updateMap();
            settingsManager.lastMapUpdateTime = timeManagerInstance.realTime;
          }

          if (isSatObject(sat)) {
            const { gmst } = SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj);
            getEl('sat-altitude').innerHTML = SatMath.getAlt(sat.position, gmst).toFixed(2) + ' km';
            getEl('sat-velocity').innerHTML = sat.velocity.total.toFixed(2) + ' km/s';
          } else {
            sat = <MissileObject>sat;
            getEl('sat-altitude').innerHTML = this.currentTEARR.alt.toFixed(2) + ' km';
            if (sat.velocity.total) {
              getEl('sat-velocity').innerHTML = sat.velocity.total.toFixed(2) + ' km/s';
            } else {
              getEl('sat-velocity').innerHTML = 'Unknown';
            }
          }

          if (catalogManagerInstance.isSensorManagerLoaded) {
            if (this.currentTEARR.inView) {
              if (getEl('sat-azimuth')) getEl('sat-azimuth').innerHTML = this.currentTEARR.az.toFixed(0) + '°'; // Convert to Degrees
              if (getEl('sat-elevation')) getEl('sat-elevation').innerHTML = this.currentTEARR.el.toFixed(1) + '°';
              if (getEl('sat-range')) getEl('sat-range').innerHTML = this.currentTEARR.rng.toFixed(2) + ' km';
              const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
              const sun = drawManagerInstance.sceneManager.sun;
              if (getEl('sat-vmag'))
                if (isMissileObject(sat)) {
                  getEl('sat-vmag').innerHTML = 'N/A';
                } else {
                  sat = <SatObject>sat;
                  getEl('sat-vmag').innerHTML = SatMath.calculateVisMag(sat, sensorManagerInstance.currentSensors[0], timeManagerInstance.simulationTimeObj, sun).toFixed(2);
                }
              const beamwidthString = sensorManagerInstance.currentSensors[0].beamwidth
                ? (this.currentTEARR.rng * Math.sin(DEG2RAD * sensorManagerInstance.currentSensors[0].beamwidth)).toFixed(2) + ' km'
                : 'Unknown';
              if (getEl('sat-beamwidth')) getEl('sat-beamwidth').innerHTML = beamwidthString;
              if (getEl('sat-maxTmx')) getEl('sat-maxTmx').innerHTML = ((this.currentTEARR.rng / cKmPerMs) * 2).toFixed(2) + ' ms'; // Time for RF to hit target and bounce back
            } else {
              if (getEl('sat-vmag')) getEl('sat-vmag').innerHTML = 'Out of FOV';
              if (getEl('sat-azimuth')) getEl('sat-azimuth').innerHTML = 'Out of FOV';
              if (getEl('sat-azimuth')) getEl('sat-azimuth').title = 'Azimuth: ' + this.currentTEARR.az.toFixed(0) + '°';

              const elevationDom = getEl('sat-elevation');
              if (elevationDom) elevationDom.innerHTML = 'Out of FOV';
              if (elevationDom) elevationDom.title = 'Elevation: ' + this.currentTEARR.el.toFixed(1) + '°';

              const rangeDom = getEl('sat-range');
              if (rangeDom) rangeDom.innerHTML = 'Out of FOV';
              if (rangeDom) rangeDom.title = 'Range: ' + this.currentTEARR.rng.toFixed(2) + ' km';
              const beamwidthString = sensorManagerInstance.currentSensors[0].beamwidth ? sensorManagerInstance.currentSensors[0].beamwidth + '°' : 'Unknown';
              if (getEl('sat-beamwidth')) getEl('sat-beamwidth').innerHTML = 'Out of FOV';
              if (getEl('sat-beamwidth')) getEl('sat-beamwidth').title = beamwidthString;
              if (getEl('sat-maxTmx')) getEl('sat-maxTmx').innerHTML = 'Out of FOV';
            }
          } else {
            if (getEl('sat-azimuth')) getEl('sat-azimuth').parentElement.style.display = 'none';
            if (getEl('sat-elevation')) getEl('sat-elevation').parentElement.style.display = 'none';
            if (getEl('sat-range')) getEl('sat-range').parentElement.style.display = 'none';
            if (getEl('sat-beamwidth')) getEl('sat-beamwidth').parentElement.style.display = 'none';
            if (getEl('sat-maxTmx')) getEl('sat-maxTmx').parentElement.style.display = 'none';
          }

          if (catalogManagerInstance.secondarySat !== -1 && getEl('secondary-sat-info')?.style?.display === 'none') {
            getEl('secondary-sat-info').style.display = 'block';
          } else if (catalogManagerInstance.secondarySat === -1 && getEl('secondary-sat-info')?.style?.display !== 'none') {
            getEl('secondary-sat-info').style.display = 'none';
          }

          if (catalogManagerInstance.secondarySat !== -1 && isSatObject(sat)) {
            sat = <SatObject>sat;
            const ric = CoordinateTransforms.sat2ric(catalogManagerInstance.secondarySatObj, sat);
            const dist = SensorMath.distanceString(sat, catalogManagerInstance.secondarySatObj).split(' ')[2];
            getEl('sat-sec-dist').innerHTML = `${dist} km`;
            getEl('sat-sec-rad').innerHTML = `${ric.position[0].toFixed(2)}km`;
            getEl('sat-sec-intrack').innerHTML = `${ric.position[1].toFixed(2)}km`;
            getEl('sat-sec-crosstrack').innerHTML = `${ric.position[2].toFixed(2)}km`;
          }

          if (catalogManagerInstance.isSensorManagerLoaded) {
            if (sensorManagerInstance.isSensorSelected()) {
              const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);

              // If we didn't just calculate next pass time for this satellite and sensor combination do it
              // TODO: Make new logic for this to allow it to be updated while selected
              if (
                (catalogManagerInstance.selectedSat !== uiManagerInstance.lastNextPassCalcSatId ||
                  sensorManagerInstance.currentSensors[0].shortName !== uiManagerInstance.lastNextPassCalcSensorShortName) &&
                !isMissileObject(sat)
              ) {
                sat = <SatObject>sat;
                if (sat.perigee > sensorManagerInstance.currentSensors[0].obsmaxrange) {
                  if (getEl('sat-nextpass')) getEl('sat-nextpass').innerHTML = 'Beyond Max Range';
                } else if (getEl('sat-nextpass')) {
                  getEl('sat-nextpass').innerHTML = SensorMath.nextpass(sat, sensorManagerInstance.currentSensors, 2, 5);
                }

                // IDEA: Code isInSun()
                //sun.getXYZ();
                //lineManager.create('ref',[sun.sunvar.position.x,sun.sunvar.position.y,sun.sunvar.position.z]);
              }
              uiManagerInstance.lastNextPassCalcSatId = catalogManagerInstance.selectedSat;
              uiManagerInstance.lastNextPassCalcSensorShortName = sensorManagerInstance.currentSensors[0].shortName;
            } else if (getEl('sat-nextpass')) {
              getEl('sat-nextpass').innerHTML = 'Unavailable';
            }
          } else if (getEl('sat-nextpass')) {
            getEl('sat-nextpass').parentElement.style.display = 'none';
          }
        } catch (e) {
          errorManagerInstance.debug('Error updating satellite info!');
        }
      },
    });
  }
}

export const updateSatManagerPlugin = new UpdateSatManager();
