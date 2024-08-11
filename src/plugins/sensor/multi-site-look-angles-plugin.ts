import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { dateFormat } from '@app/lib/dateFormat';
import { getEl } from '@app/lib/get-el';
import { saveCsv } from '@app/lib/saveVariable';
import { showLoading } from '@app/lib/showLoading';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { SatMath } from '@app/static/sat-math';
import { TearrData } from '@app/static/sensor-math';
import multiSitePng from '@public/img/icons/multi-site.png';
import { BaseObject, Degrees, DetailedSatellite, DetailedSensor, Kilometers, MINUTES_PER_DAY, SatelliteRecord, Seconds, TAU } from 'ootk';
import { KeepTrackPlugin, SideMenuSettingsOptions, clickDragOptions } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/SoundNames';
import { SensorManager } from './sensorManager';
export class MultiSiteLookAnglesPlugin extends KeepTrackPlugin {
  dependencies = [SelectSatManager.name];
  private selectSatManager_: SelectSatManager;
  // combine sensorListSsn, sesnorListLeoLabs, and SensorListRus
  private sensorList_ = keepTrackApi.getSensorManager().sensorListSsn.concat(
    keepTrackApi.getSensorManager().sensorListMw,
    keepTrackApi.getSensorManager().sensorListMda,
    keepTrackApi.getSensorManager().sensorListLeoLabs,
    keepTrackApi.getSensorManager().sensorListEsoc,
    keepTrackApi.getSensorManager().sensorListRus,
    keepTrackApi.getSensorManager().sensorListPrc,
    keepTrackApi.getSensorManager().sensorListOther,
  );
  isRequireSatelliteSelected = true;
  isRequireSensorSelected = false;

  // Settings
  private lengthOfLookAngles_ = 1; // Days
  private angleCalculationInterval_ = <Seconds>30;
  private disabledSensors_: DetailedSensor[] = this.sensorList_.filter((s) =>
    !keepTrackApi.getSensorManager().sensorListMw.includes(s),
  );

  constructor() {
    super(MultiSiteLookAnglesPlugin.name);
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);

    // remove duplicates in sensorList
    this.sensorList_ = this.sensorList_.filter(
      (sensor, index, self) => index === self.findIndex((t) => t.uiName === sensor.uiName),
    );
  }


  bottomIconCallback: () => void = () => {
    const sat = this.selectSatManager_.getSelectedSat();

    if (!sat?.isSatellite()) {
      return;
    }
    this.refreshSideMenuData(sat as DetailedSatellite);
  };


  bottomIconElementName = 'multi-site-look-angles-icon';
  bottomIconLabel = 'Multi-Site Looks';
  bottomIconImg = multiSitePng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  dragOptions: clickDragOptions = {
    isDraggable: true,
    minWidth: 500,
    maxWidth: 750,
  };

  helpTitle = 'Multi-Site Look Angles Menu';
  helpBody = keepTrackApi.html`
    The Multi-Site Look Angles menu allows you to calculate the range, azimuth, and elevation angles between a satellite and multiple sensors.
    A satellite must first be selected before the menu can be used.
    <br><br>
    By default the menu will calculate the look angles for all sensors in the Space Surveillance Netowrk.
    If you would like to calculate the look angles for additional sensors, you can export a csv file at the bottom of the menu.
    The csv file will contain look angles for all sensors.
    <br><br>
    Clicking on a row in the table will select the sensor and change the simulation time to the time of the look angle.`;

  sideMenuElementName: string = 'multi-site-look-angles-menu';
  sideMenuTitle: string = 'Multi-Sensor Look Angles';
  sideMenuElementHtml: string = keepTrackApi.html`
    <div class="row"></div>
    <div class="row">
      <table id="multi-site-look-angles-table" class="center-align striped-light centered"></table>
    </div>`;
  sideMenuSettingsHtml: string = keepTrackApi.html`
    <div class="row" style="margin: 0 10px;">
      <div id="multi-site-look-angles-sensor-list">
      </div>
    </div>`;
  sideMenuSettingsWidth: number = 350;
  downloadIconCb = () => {
    keepTrackApi.getSoundManager().play(SoundNames.EXPORT);
    const exportData = keepTrackApi.getSensorManager().lastMultiSiteArray.map((look) => ({
      time: look.time,
      sensor: look.objName,
      az: look.az.toFixed(2),
      el: look.el.toFixed(2),
      rng: look.rng.toFixed(2),
    }));

    saveCsv(exportData, `multisite-${(this.selectSatManager_.getSelectedSat() as DetailedSatellite).sccNum6}-look-angles`);
  };
  sideMenuSettingsOptions: SideMenuSettingsOptions = {
    width: 300,
    leftOffset: null,
    zIndex: 3,
  };

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.PLUGIN_NAME,
      cb: (obj: BaseObject) => {
        this.checkIfCanBeEnabled_(obj);
      },
    });
  }

  private checkIfCanBeEnabled_(obj: BaseObject) {
    if (obj?.isSatellite() && keepTrackApi.getSensorManager().isSensorSelected()) {
      this.setBottomIconToEnabled();
      if (this.isMenuButtonActive && obj) {
        this.refreshSideMenuData(obj as DetailedSatellite);
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
        const sat = this.selectSatManager_.getSelectedSat();

        if (!sat?.isSatellite()) {
          return;
        }
        this.refreshSideMenuData(sat as DetailedSatellite);
      },
    });
  }

  private refreshSideMenuData(sat: DetailedSatellite) {
    if (this.isMenuButtonActive) {
      if (sat) {
        showLoading(() => {
          // TODO: This should be a class property that persists between refreshes
          const sensorListDom = getEl('multi-site-look-angles-sensor-list');

          if (!sensorListDom) {
            errorManagerInstance.warn('Could not find sensor list dom');

            return;
          }

          sensorListDom.innerHTML = '';

          const allSensors: DetailedSensor[] = [];

          for (const sensor of this.sensorList_) {
            if (!sensor.objName) {
              continue;
            }

            const sensorButton = document.createElement('button');

            sensorButton.classList.add('btn', 'btn-ui', 'waves-effect', 'waves-light');
            if (this.disabledSensors_.includes(sensor)) {
              sensorButton.classList.add('btn-red');
            }

            allSensors.push(sensor);

            sensorButton.innerText = sensor.uiName ?? sensor.shortName ?? sensor.objName;
            sensorButton.addEventListener('click', () => {
              if (sensorButton.classList.contains('btn-red')) {
                sensorButton.classList.remove('btn-red');
                this.disabledSensors_.splice(this.disabledSensors_.indexOf(sensor), 1);
                keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_ON);
              } else {
                sensorButton.classList.add('btn-red');
                this.disabledSensors_.push(sensor);
                keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_OFF);
              }

              this.getlookanglesMultiSite_(
                sat,
                allSensors.filter((s) => !this.disabledSensors_.includes(s)),
              );
            });
            sensorListDom.appendChild(sensorButton);
            sensorListDom.appendChild(document.createTextNode(' '));
          }

          this.getlookanglesMultiSite_(
            sat,
            allSensors.filter((s) => !this.disabledSensors_.includes(s)),
          );
        });
      }
    }
  }

  private getlookanglesMultiSite_(sat: DetailedSatellite, sensors?: DetailedSensor[]): void {
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
      if (sensor.maxRng < sat.perigee && (!sensor.maxRng2 || sensor.maxRng2 < sat.perigee)) {
        continue;
      }

      SensorManager.updateSensorUiStyling([sensor]);
      let offset = 0;

      for (let i = 0; i < this.lengthOfLookAngles_ * 24 * 60 * 60; i += this.angleCalculationInterval_) {
        // 5second Looks
        offset = i * 1000; // Offset in seconds (msec * 1000)
        const now = timeManagerInstance.getOffsetTimeObj(offset);
        const multiSitePass = MultiSiteLookAnglesPlugin.propagateMultiSite_(now, sat.satrec, sensor);

        if (multiSitePass.time !== '') {
          multiSiteArray.push(multiSitePass); // Update the table with looks for this 5 second chunk and then increase table counter by 1

          // Jump 3/4th to the next orbit
          i += orbitalPeriod * 60 * 0.75; // NOSONAR
        }
      }
    }

    multiSiteArray.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    sensorManagerInstance.lastMultiSiteArray = multiSiteArray;

    // eslint-disable-next-line no-unused-expressions
    isResetToDefault ? sensorManagerInstance.setCurrentSensor(null) : sensorManagerInstance.setCurrentSensor(tempSensor);

    MultiSiteLookAnglesPlugin.populateMultiSiteTable_(multiSiteArray);
  }

  private static propagateMultiSite_(now: Date, satrec: SatelliteRecord, sensor: DetailedSensor): TearrData {
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
    }

    return {
      time: '',
      el: <Degrees>0,
      az: <Degrees>0,
      rng: <Kilometers>0,
      objName: '',
    };

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

      if (!sensor) {
        continue;
      }
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
      tdS.appendChild(document.createTextNode(sensor.uiName ?? sensor.shortName ?? sensor.objName ?? ''));
      // TODO: Future feature
      tr.addEventListener('click', () => {
        timeManagerInstance.changeStaticOffset(new Date(entry.time).getTime() - new Date().getTime());
        sensorManagerInstance.setSensor(sensor, sensor.sensorId);
      });
    }
  }
}
