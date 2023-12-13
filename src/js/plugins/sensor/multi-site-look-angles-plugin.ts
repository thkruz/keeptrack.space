import multiSitePng from '@app/img/icons/multi-site.png';
import { SatObject, SensorObject } from '@app/js/interfaces';
import { KeepTrackApiEvents, keepTrackApi } from '@app/js/keepTrackApi';
import { MINUTES_PER_DAY, TAU } from '@app/js/lib/constants';
import { dateFormat } from '@app/js/lib/dateFormat';
import { getEl } from '@app/js/lib/get-el';
import { saveCsv } from '@app/js/lib/saveVariable';
import { showLoading } from '@app/js/lib/showLoading';
import { SatMath } from '@app/js/static/sat-math';
import { TearrData } from '@app/js/static/sensor-math';
import { Degrees, Kilometers, SatelliteRecord, Seconds } from 'ootk';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { StandardSensorManager } from './sensorManager';
export class MultiSiteLookAnglesPlugin extends KeepTrackPlugin {
  isRequireSatelliteSelected: boolean = true;
  isRequireSensorSelected: boolean = false;

  bottomIconCallback: () => void = () => {
    const sat = keepTrackApi.getCatalogManager().getSelectedSat();
    this.refreshSideMenuData(sat);
  };

  lookanglesLength = 1; // Days
  lookanglesInterval = <Seconds>30;
  disabledSensors: SensorObject[] = [];

  bottomIconElementName = 'multi-site-look-angles-icon';
  bottomIconLabel = 'Multi-Site Looks';
  bottomIconImg = multiSitePng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  dragOptions: clickDragOptions = {
    isDraggable: true,
    minWidth: 350,
    maxWidth: 500,
  };

  helpTitle = `Multi-Site Look Angles Menu`;
  helpBody = keepTrackApi.html`
    The Multi-Site Look Angles menu allows you to calculate the range, azimuth, and elevation angles between a satellite and multiple sensors.
    A satellite must first be selected before the menu can be used.
    <br><br>
    By default the menu will calculate the look angles for all sensors in the Space Surveillance Netowrk.
    If you would like to calculate the look angles for additional sensors, you can export a csv file at the bottom of the menu.
    The csv file will contain look angles for all sensors.
    <br><br>
    Clicking on a row in the table will select the sensor and change the simulation time to the time of the look angle.`;

  static PLUGIN_NAME = 'Multi Site Look Angles';
  constructor() {
    super(MultiSiteLookAnglesPlugin.PLUGIN_NAME);
  }

  sideMenuElementName: string = 'multi-site-look-angles-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
    <div id="${this.sideMenuElementName}" class="side-menu-parent start-hidden text-select">
        <div id="multi-site-look-angles-content" class="side-menu">
        <div class="row">
            <h5 class="center-align">Multi-Sensor Look Angles</h5>
            <div id="multi-site-look-angles-sensor-list">
            </div>
            <table id="multi-site-look-angles-table" class="center-align striped-light centered"></table>
            <br />
            <center>
            <button id="multi-site-look-angles-export" class="btn btn-ui waves-effect waves-light">Export &#9658;</button>
            </center>
        </div>
        </div>
    </div>`;

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('multi-site-look-angles-export')?.addEventListener('click', () => {
          const exportData = keepTrackApi.getSensorManager().lastMultiSiteArray.map((look) => ({
            time: look.time,
            sensor: look.objName,
            az: look.az.toFixed(2),
            el: look.el.toFixed(2),
            rng: look.rng.toFixed(2),
          }));
          saveCsv(exportData, 'multiSiteLooks');
        });
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.PLUGIN_NAME,
      cb: (sat: SatObject) => {
        this.checkIfCanBeEnabled_(sat);
      },
    });
  }

  private checkIfCanBeEnabled_(sat: SatObject) {
    if (sat?.TLE1 && keepTrackApi.getSensorManager().isSensorSelected()) {
      this.setBottomIconToEnabled();
      if (this.isMenuButtonActive && sat) {
        this.refreshSideMenuData(sat);
      }
    } else {
      if (this.isMenuButtonActive) {
        this.closeSideMenu();
      }
      this.setBottomIconToDisabled();
    }
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.staticOffsetChange,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        const sat = keepTrackApi.getCatalogManager().getSelectedSat();
        this.refreshSideMenuData(sat);
      },
    });
  }

  private refreshSideMenuData(sat: SatObject) {
    if (this.isMenuButtonActive) {
      if (sat) {
        showLoading(() => {
          const sensorListDom = getEl('multi-site-look-angles-sensor-list');
          sensorListDom.innerHTML = ''; // TODO: This should be a class property that persists between refreshes

          const allSensors = [];
          for (const sensor of keepTrackApi.getSensorManager().sensorListUS) {
            const sensorButton = document.createElement('button');
            sensorButton.classList.add('btn', 'btn-ui', 'waves-effect', 'waves-light');
            if (this.disabledSensors.includes(sensor)) sensorButton.classList.add('btn-red');

            allSensors.push(sensor);

            sensorButton.innerText = sensor.shortName;
            sensorButton.addEventListener('click', () => {
              if (sensorButton.classList.contains('btn-red')) {
                sensorButton.classList.remove('btn-red');
                this.disabledSensors.splice(this.disabledSensors.indexOf(sensor), 1);
              } else {
                sensorButton.classList.add('btn-red');
                this.disabledSensors.push(sensor);
              }

              this.getlookanglesMultiSite_(
                sat,
                allSensors.filter((s) => !this.disabledSensors.includes(s))
              );
            });
            sensorListDom.appendChild(sensorButton);
            sensorListDom.appendChild(document.createTextNode(' '));
          }

          this.getlookanglesMultiSite_(
            sat,
            allSensors.filter((s) => !this.disabledSensors.includes(s))
          );
        });
      }
    }
  }

  private getlookanglesMultiSite_(sat: SatObject, sensors?: SensorObject[]): void {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    const staticSet = keepTrackApi.getCatalogManager().staticSet;

    if (!sensors) {
      sensors = [];
      for (const sensorName in staticSet) {
        const sensor = staticSet[sensorName];
        sensors.push(sensor);
      }
    }

    const isResetToDefault = !sensorManagerInstance.isSensorSelected();

    // Save Current Sensor as a new array
    const tempSensor = [...sensorManagerInstance.currentSensors];

    const orbitalPeriod = MINUTES_PER_DAY / ((sat.satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

    const multiSiteArray = <TearrData[]>[];
    for (const sensor of sensors) {
      // Skip if satellite is above the max range of the sensor
      if (sensor.obsmaxrange < sat.perigee && (!sensor.obsmaxrange2 || sensor.obsmaxrange2 < sat.perigee)) continue;

      StandardSensorManager.updateSensorUiStyling([sensor]);
      let offset = 0;
      for (let i = 0; i < this.lookanglesLength * 24 * 60 * 60; i += this.lookanglesInterval) {
        // 5second Looks
        offset = i * 1000; // Offset in seconds (msec * 1000)
        let now = timeManagerInstance.getOffsetTimeObj(offset);
        let multiSitePass = MultiSiteLookAnglesPlugin.propagateMultiSite_(now, sat.satrec, sensor);
        if (multiSitePass.time !== '') {
          multiSiteArray.push(multiSitePass); // Update the table with looks for this 5 second chunk and then increase table counter by 1

          // Jump 3/4th to the next orbit
          i = i + orbitalPeriod * 60 * 0.75; // NOSONAR
        }
      }
    }

    multiSiteArray.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    sensorManagerInstance.lastMultiSiteArray = multiSiteArray;

    isResetToDefault ? sensorManagerInstance.setCurrentSensor(sensorManagerInstance.defaultSensor) : sensorManagerInstance.setCurrentSensor(tempSensor);

    MultiSiteLookAnglesPlugin.populateMultiSiteTable_(multiSiteArray);
  }

  private static propagateMultiSite_(now: Date, satrec: SatelliteRecord, sensor: SensorObject): TearrData {
    // Setup Realtime and Offset Time
    const aer = SatMath.getRae(now, satrec, sensor);

    if (SatMath.checkIsInView(sensor, aer)) {
      return {
        time: now.toISOString(),
        el: aer.el,
        az: aer.az,
        rng: aer.rng,
        objName: sensor.objName,
      };
    } else {
      return {
        time: '',
        el: <Degrees>0,
        az: <Degrees>0,
        rng: <Kilometers>0,
        objName: '',
      };
    }
  }

  private static populateMultiSiteTable_(multiSiteArray: TearrData[]) {
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    const staticSet = keepTrackApi.getCatalogManager().staticSet;

    const tbl = <HTMLTableElement>getEl('multi-site-look-angles-table'); // Identify the table to update
    tbl.innerHTML = ''; // Clear the table from old object data
    let tr = tbl.insertRow();
    let tdT = tr.insertCell();
    tdT.appendChild(document.createTextNode('Time'));
    tdT.setAttribute('style', 'text-decoration: underline');
    let tdE = tr.insertCell();
    tdE.appendChild(document.createTextNode('El'));
    tdE.setAttribute('style', 'text-decoration: underline');
    let tdA = tr.insertCell();
    tdA.appendChild(document.createTextNode('Az'));
    tdA.setAttribute('style', 'text-decoration: underline');
    let tdR = tr.insertCell();
    tdR.appendChild(document.createTextNode('Rng'));
    tdR.setAttribute('style', 'text-decoration: underline');
    let tdS = tr.insertCell();
    tdS.appendChild(document.createTextNode('Sensor'));
    tdS.setAttribute('style', 'text-decoration: underline');

    const timeManagerInstance = keepTrackApi.getTimeManager();
    for (const entry of multiSiteArray) {
      const sensor = staticSet.find((s) => s.objName === entry.objName);
      if (!sensor) continue;
      tr = tbl.insertRow();
      tr.setAttribute('class', 'link');
      tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(dateFormat(entry.time, 'isoDateTime', true)));
      tdE = tr.insertCell();
      tdE.appendChild(document.createTextNode(entry.el.toFixed(1)));
      tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode(entry.az.toFixed(0)));
      tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode(entry.rng.toFixed(0)));
      tdS = tr.insertCell();
      tdS.appendChild(document.createTextNode(sensor.shortName));
      // TODO: Future feature
      tr.addEventListener('click', () => {
        timeManagerInstance.changeStaticOffset(new Date(entry.time).getTime() - new Date().getTime());
        sensorManagerInstance.setSensor(sensor, sensor.staticNum);
      });
    }
  }
}

export const multiSiteLookAnglesPlugin = new MultiSiteLookAnglesPlugin();
