import { country2flagIcon } from '@app/catalogs/countries';
import { keepTrackApi } from '@app/keepTrackApi';
import { openColorbox } from '@app/lib/colorbox';
import { getEl, hideEl, showEl } from '@app/lib/get-el';
import { MissileObject } from '@app/singletons/catalog-manager/MissileObject';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { SatMath, SunStatus } from '@app/static/sat-math';
import { StringExtractor } from '@app/static/string-extractor';
import { BaseObject, CatalogSource, DetailedSatellite, MINUTES_PER_DAY, PayloadStatus, SpaceObjectType, Sun, SunTime } from 'ootk';
import { WatchlistPlugin } from '../watchlist/watchlist';
import { SAT_INFO_BOX_CONSTANTS as SIB } from './sat-info-box-constants';

export class SatInfoBoxUpdaters {
  static updateOrbitData_(sat: DetailedSatellite): void {
    if (sat === null || typeof sat === 'undefined') {
      return;
    }

    if (sat.isSatellite()) {
      getEl(SIB.EL.ORBITAL.APOGEE)!.innerHTML = `${sat.apogee.toFixed(0)} km`;
      getEl(SIB.EL.ORBITAL.PERIGEE)!.innerHTML = `${sat.perigee.toFixed(0)} km`;
      getEl(SIB.EL.ORBITAL.INCLINATION)!.innerHTML = `${sat.inclination.toFixed(2)}°`;
      getEl(SIB.EL.ORBITAL.ECCENTRICITY)!.innerHTML = sat.eccentricity.toFixed(3);
      getEl(SIB.EL.ORBITAL.RAAN)!.innerHTML = `${sat.rightAscension.toFixed(2)}°`;
      getEl(SIB.EL.ORBITAL.ARG_PE)!.innerHTML = `${sat.argOfPerigee.toFixed(2)}°`;

      const periodDom = getEl(SIB.EL.ORBITAL.PERIOD)!;

      periodDom.innerHTML = `${sat.period.toFixed(2)} min`;
      periodDom.dataset.position = 'top';
      periodDom.dataset.delay = '50';
      periodDom.dataset.tooltip = `Mean Motion: ${(MINUTES_PER_DAY / sat.period).toFixed(2)}`;

      const now: Date | number | string = new Date();
      const daysold = sat.ageOfElset(now);
      const age = daysold >= 1 ? daysold : daysold * 24;
      const units = daysold >= 1 ? 'Days' : 'Hours';
      const elsetAgeDom = getEl(SIB.EL.ORBITAL.ELSET_AGE)!;

      elsetAgeDom.innerHTML = `${age.toFixed(2)} ${units}`;

      this.updateConfidenceDom_(sat);

      elsetAgeDom.dataset.position = 'top';
      elsetAgeDom.dataset.delay = '50';
      elsetAgeDom.dataset.tooltip = `Epoch Year: ${sat.tle1.substr(18, 2).toString()} Day: ${sat.tle1.substr(20, 8).toString()}`;
    }
  }

  static updateConfidenceDom_(sat: DetailedSatellite) {
    let color = '';
    let text = '';

    const confidenceDom = getEl(SIB.EL.IDENTIFIERS.CONFIDENCE);

    if (confidenceDom) {
      // We encode confidence score in the 65th character in the TLE line 1
      const confidenceScore = parseInt(sat.tle1.substring(64, 65)) || 0;

      if (settingsManager.dataSources.externalTLEsOnly) {
        text = 'External';
        color = 'gray';
      } else if (confidenceScore >= 7) {
        text = `High (${confidenceScore})`;
        color = 'green';
      } else if (confidenceScore >= 4) {
        text = `Medium (${confidenceScore})`;
        color = 'orange';
      } else {
        text = `Low (${confidenceScore})`;
        color = 'red';
      }

      confidenceDom.innerHTML = text;
      confidenceDom.style.color = color;
    }
  }

  static updateObjectData_(obj: BaseObject): void {
    if (!obj || obj.isStatic() || obj.isSensor()) {
      return;
    }

    const isHasAltName: boolean = !!((obj as DetailedSatellite)?.altName && (obj as DetailedSatellite).altName !== '');
    const isHasAltId: boolean = !!((obj as DetailedSatellite)?.altId && (obj as DetailedSatellite).altId !== '');

    getEl(SIB.EL.HEADER.NAME)!.innerHTML = obj.name;

    if (obj.isSatellite() && (obj as DetailedSatellite).sccNum5 === '25544') {
      getEl(SIB.EL.HEADER.FLAG)!.classList.value = 'fi fi-iss';
    } else {
      getEl(SIB.EL.HEADER.FLAG)!.classList.value = `fi ${country2flagIcon((obj as DetailedSatellite).country)}`;
    }

    if (isHasAltName) {
      showEl(getEl(SIB.EL.IDENTIFIERS.ALT_NAME)!.parentElement!, 'flex');
      getEl(SIB.EL.IDENTIFIERS.ALT_NAME)!.innerHTML = (obj as DetailedSatellite).altName;
    } else {
      hideEl(getEl(SIB.EL.IDENTIFIERS.ALT_NAME)!.parentElement!);
    }

    if (isHasAltId) {
      showEl(getEl(SIB.EL.IDENTIFIERS.ALT_ID)!.parentElement!, 'flex');
      getEl(SIB.EL.IDENTIFIERS.ALT_ID)!.innerHTML = (obj as DetailedSatellite).altId;
    } else {
      hideEl(getEl(SIB.EL.IDENTIFIERS.ALT_ID)!.parentElement!);
    }

    const watchlistPlugin = keepTrackApi.getPlugin(WatchlistPlugin);

    if (watchlistPlugin) {
      if (watchlistPlugin.isOnWatchlist(obj.id)) {
        getEl(SIB.EL.HEADER.REMOVE_WATCHLIST)!.style.display = 'block';
        getEl(SIB.EL.HEADER.ADD_WATCHLIST)!.style.display = 'none';
      } else {
        getEl(SIB.EL.HEADER.ADD_WATCHLIST)!.style.display = 'block';
        getEl(SIB.EL.HEADER.REMOVE_WATCHLIST)!.style.display = 'none';
      }
    } else {
      getEl(SIB.EL.HEADER.ADD_WATCHLIST)!.style.display = 'none';
      getEl(SIB.EL.HEADER.REMOVE_WATCHLIST)!.style.display = 'none';
    }

    this.updateSatType_(obj);
    this.updateSatStatus_(obj);

    /*
     * TODO:
     * getEl('edit-satinfo-link').innerHTML = "<a class='iframe' href='editor.htm?scc=" + sat.sccNum + "&popup=true'>Edit Satellite Info</a>";
     */

    if (obj.isMissile()) {
      getEl(SIB.EL.IDENTIFIERS.INTL_DES)!.innerHTML = 'N/A';
      getEl(SIB.EL.IDENTIFIERS.OBJNUM)!.innerHTML = 'N/A';
      getEl(SIB.EL.IDENTIFIERS.SOURCE)!.innerHTML = 'N/A';
    } else {
      const sat = obj as DetailedSatellite;

      getEl(SIB.EL.IDENTIFIERS.INTL_DES)!.innerHTML = sat.intlDes === 'none' ? 'N/A' : sat.intlDes;
      if (sat.source && sat.source === CatalogSource.VIMPEL) {
        getEl(SIB.EL.IDENTIFIERS.OBJNUM)!.innerHTML = 'N/A';
        getEl(SIB.EL.IDENTIFIERS.INTL_DES)!.innerHTML = 'N/A';
      } else {
        getEl(SIB.EL.IDENTIFIERS.OBJNUM)!.innerHTML = sat.sccNum;
        // satObjNumDom.setAttribute('data-tooltip', `${FormatTle.convert6DigitToA5(sat.sccNum)}`);
      }

      getEl(SIB.EL.IDENTIFIERS.SOURCE)!.innerHTML = sat.source || CatalogSource.CELESTRAK;
      this.updateRcsData_(sat);
    }
  }

  static updateLaunchData_(obj?: BaseObject) {
    if (!obj || (!obj.isSatellite() && !obj.isMissile())) {
      return;
    }
    const satMisl = obj as DetailedSatellite | MissileObject;

    this.updateCountryCorrelationTable_(satMisl);
    this.updateLaunchSiteCorrelationTable_(satMisl);

    this.updateLaunchVehicleCorrelationTable_(obj);

    if (satMisl.isMissile()) {
      return;
    }

    const sat = satMisl as DetailedSatellite;

    getEl(SIB.EL.OBJECT.CONFIGURATION)!.innerHTML = sat.configuration !== '' ? sat.configuration : 'Unknown';
  }

  static updateLaunchVehicleCorrelationTable_(obj: BaseObject) {
    let satVehicleDom = getEl(SIB.EL.OBJECT.VEHICLE);

    if (!satVehicleDom) {
      errorManagerInstance.debug(`${SIB.EL.OBJECT.VEHICLE} element not found`);

      return;
    }

    const tempEl = satVehicleDom.cloneNode(true);

    if (!satVehicleDom.parentNode) {
      errorManagerInstance.debug(`${SIB.EL.OBJECT.VEHICLE} parent element not found`);

      return;
    }

    // Remove any existing event listeners
    satVehicleDom.parentNode.replaceChild(tempEl, satVehicleDom);

    // Update links
    satVehicleDom = getEl(SIB.EL.OBJECT.VEHICLE);

    if (!satVehicleDom) {
      errorManagerInstance.debug(`${SIB.EL.OBJECT.VEHICLE} element not found`);

      return;
    }

    if (obj.isMissile()) {
      const missile = obj as MissileObject;

      missile.launchVehicle = missile.desc.split('(')[1].split(')')[0]; // Remove the () from the booster type
      satVehicleDom.innerHTML = missile.launchVehicle;
    } else {
      const sat = obj as DetailedSatellite;

      satVehicleDom.innerHTML = sat.launchVehicle; // Set to JSON record
      if (sat.launchVehicle === 'U') {
        satVehicleDom.innerHTML = 'Unknown';
      } // Replace with Unknown if necessary
      const satLvString = StringExtractor.extractLiftVehicle(sat.launchVehicle); // Replace with link if available

      satVehicleDom.innerHTML = satLvString;

      if (satLvString.includes('http')) {
        satVehicleDom.classList.add('pointable');
        satVehicleDom.addEventListener('click', (e) => {
          e.preventDefault();
          openColorbox((<HTMLAnchorElement>satVehicleDom.firstChild).href);
        });
      } else {
        satVehicleDom.classList.remove('pointable');
      }
    }
  }

  static updateLaunchSiteCorrelationTable_(obj: BaseObject) {
    let siteArr: string[] = [];
    const site = {
      site: 'Unknown',
      launchPad: 'Unknown',
      wikiUrl: null as string | null,
    };
    let missileOrigin: string;

    if (obj.isMissile()) {
      const misl = obj as MissileObject;

      siteArr = misl.desc.split('(');
      missileOrigin = siteArr[0].slice(0, siteArr[0].length - 1);

      site.site = missileOrigin;
      site.launchPad = 'Unknown';
    } else {
      const sat = obj as DetailedSatellite;

      // Enhanced Catalog uses full names
      if (sat.launchSite?.length > 6) {
        site.site = sat.launchSite;
      } else {
        const launchData = StringExtractor.extractLaunchSite(sat.launchSite);

        site.site = launchData.site;
        site.wikiUrl = launchData.wikiUrl;
      }

      site.launchPad = sat.launchPad;
    }

    const launchSiteElement = getEl(SIB.EL.OBJECT.LAUNCH_SITE);
    const launchPadElement = getEl(SIB.EL.OBJECT.LAUNCH_PAD);

    if (!launchSiteElement || !launchPadElement) {
      errorManagerInstance.debug(`${SIB.EL.OBJECT.LAUNCH_SITE} or ${SIB.EL.OBJECT.LAUNCH_PAD} element not found`);

      return;
    }

    launchPadElement.innerHTML = site.launchPad;

    if (site.wikiUrl) {
      launchSiteElement.innerHTML = `<a class="iframe" href="${site.wikiUrl}">${site.site}</a>`;
      launchSiteElement.classList.add('pointable');
      launchSiteElement.addEventListener('click', (e) => {
        e.preventDefault();
        openColorbox((<HTMLAnchorElement>launchSiteElement.firstChild).href);
      });
    } else {
      launchSiteElement.innerHTML = site.site;
      launchSiteElement.classList.remove('pointable');
    }

  }

  static updateCountryCorrelationTable_(obj: DetailedSatellite | MissileObject) {
    const satCountryElement = getEl(SIB.EL.OBJECT.COUNTRY);

    if (!satCountryElement) {
      errorManagerInstance.debug(`${SIB.EL.OBJECT.COUNTRY} element not found`);

      return;
    }

    if (obj.country?.length > 4) {
      satCountryElement.innerHTML = obj.country;
    } else {
      const country = StringExtractor.extractCountry(obj.country);

      satCountryElement.innerHTML = country;
    }
  }
  static updateSatType_(obj: BaseObject) {
    const satTypeElement = getEl(SIB.EL.OBJECT.TYPE);

    if (!satTypeElement) {
      errorManagerInstance.debug(`${SIB.EL.OBJECT.TYPE} element not found`);

      return;
    }

    switch (obj.type) {
      case SpaceObjectType.UNKNOWN:
        satTypeElement.innerHTML = 'TBA';
        break;
      case SpaceObjectType.PAYLOAD:
        satTypeElement.innerHTML = 'Payload';
        break;
      case SpaceObjectType.ROCKET_BODY:
        satTypeElement.innerHTML = 'Rocket Body';
        break;
      case SpaceObjectType.DEBRIS:
        satTypeElement.innerHTML = 'Debris';
        break;
      case SpaceObjectType.SPECIAL:
        satTypeElement.innerHTML = 'Special';
        break;
      default:
        if (obj.isMissile()) {
          satTypeElement.innerHTML = 'Ballistic Missile';
        }
    }
  }

  static updateSatStatus_(obj: BaseObject) {
    const satStatusElement = getEl(SIB.EL.OBJECT.STATUS);
    const satStatusParentElement = satStatusElement?.parentElement;

    if (!satStatusElement) {
      errorManagerInstance.debug(`$${SIB.EL.OBJECT.STATUS} element not found`);

      return;
    }

    if (!satStatusParentElement) {
      errorManagerInstance.debug(`${SIB.EL.OBJECT.STATUS} parent element not found`);

      return;
    }

    if (obj.type !== SpaceObjectType.PAYLOAD) {
      satStatusParentElement.style.display = 'none';

      return;
    }
    satStatusParentElement.style.display = 'flex';

    const sat = obj as DetailedSatellite;

    switch (sat.status) {
      case PayloadStatus.OPERATIONAL:
        satStatusElement.innerHTML = 'Operational';
        break;
      case PayloadStatus.NONOPERATIONAL:
        satStatusElement.innerHTML = 'Non-Operational';
        break;
      case PayloadStatus.PARTIALLY_OPERATIONAL:
        satStatusElement.innerHTML = 'Partially Operational';
        break;
      case PayloadStatus.EXTENDED_MISSION:
        satStatusElement.innerHTML = 'Extended Mission';
        break;
      case PayloadStatus.BACKUP_STANDBY:
        satStatusElement.innerHTML = 'Backup Standby';
        break;
      case PayloadStatus.SPARE:
        satStatusElement.innerHTML = 'Spare';
        break;
      case PayloadStatus.UNKNOWN:
      default:
        satStatusElement.innerHTML = 'Unknown';
    }
  }

  static updateRcsData_(sat: DetailedSatellite) {
    const satRcsEl = getEl(SIB.EL.OBJECT.RCS);

    if (!satRcsEl) {
      errorManagerInstance.debug(`${SIB.EL.OBJECT.RCS} element not found`);

      return;
    }

    if ((sat.rcs === null || typeof sat.rcs === 'undefined')) {
      const estRcs = SatMath.estimateRcsUsingHistoricalData(sat);

      if (estRcs !== null) {
        satRcsEl.innerHTML = `H-Est ${estRcs.toFixed(4)} m<sup>2</sup>`;
        satRcsEl.setAttribute('data-tooltip', `${SatMath.mag2db(estRcs).toFixed(2)} dBsm (Historical Estimate)`);
      } else if (sat.length && sat.diameter && sat.span && sat.shape) {
        const rcs = SatMath.estimateRcs(parseFloat(sat.length), parseFloat(sat.diameter), parseFloat(sat.span), sat.shape);

        satRcsEl.innerHTML = `Est ${rcs.toFixed(4)} m<sup>2</sup>`;
        satRcsEl.setAttribute('data-tooltip', `Est ${SatMath.mag2db(rcs).toFixed(2)} dBsm`);
      } else {
        satRcsEl.innerHTML = 'Unknown';
        satRcsEl.setAttribute('data-tooltip', 'Unknown');
      }
    } else if (!isNaN(sat.rcs)) {
      satRcsEl.innerHTML = `${sat.rcs} m<sup>2</sup>`;
    } else {
      satRcsEl.innerHTML = 'Unknown';
      satRcsEl.setAttribute('data-tooltip', 'Unknown');
      // satRcsEl.setAttribute('data-tooltip', `${SatMath.mag2db(sat.rcs).toFixed(2)} dBsm`);
    }
  }

  // eslint-disable-next-line complexity
  static updateSatMissionData_(obj?: BaseObject) {
    if (obj === null || typeof obj === 'undefined') {
      return;
    }

    if (obj.isSatellite()) {
      const sat = obj as DetailedSatellite;

      keepTrackApi.containerRoot.querySelectorAll('.sat-only-info')?.forEach((el) => {
        (<HTMLElement>el).style.display = 'flex';
      });
      let satUserDom = getEl(SIB.EL.MISSION.USER)!;
      const satUserString = StringExtractor.extractUserUrl(sat?.owner); // Replace with link if available

      satUserDom.innerHTML = satUserString;
      const tempEl = satUserDom.cloneNode(true);

      satUserDom.parentNode!.replaceChild(tempEl, satUserDom);
      satUserDom = tempEl as HTMLElement;

      if (satUserString.includes('http')) {
        satUserDom.classList.add('pointable');
        satUserDom.addEventListener('click', (e) => {
          e.preventDefault();
          const href = (<HTMLAnchorElement>satUserDom.firstChild).href;

          if (href.includes('http')) {
            openColorbox(href);
          }
        });
      } else {
        satUserDom.classList.remove('pointable');
      }


      const satMissionElement = getEl(SIB.EL.MISSION.MISSION);
      const satPurposeElement = getEl(SIB.EL.MISSION.PURPOSE);
      const satContractorElement = getEl(SIB.EL.MISSION.CONTRACTOR);
      const satLaunchMassElement = getEl(SIB.EL.MISSION.LAUNCH_MASS);
      const satDryMassElement = getEl(SIB.EL.MISSION.DRY_MASS);
      const satLifetimeElement = getEl(SIB.EL.MISSION.LIFETIME);
      const satPowerElement = getEl(SIB.EL.MISSION.POWER);
      const satStandardMagnitudeElement = getEl(SIB.EL.OBJECT.STDMAG);
      const satBusElement = getEl(SIB.EL.MISSION.BUS);
      const satConfigurationElement = getEl(SIB.EL.OBJECT.CONFIGURATION);
      const satPayloadElement = getEl(SIB.EL.MISSION.PAYLOAD);
      const satEquipmentElement = getEl(SIB.EL.MISSION.EQUIPMENT);
      const satMotorElement = getEl(SIB.EL.MISSION.MOTOR);
      const satLengthElement = getEl(SIB.EL.MISSION.LENGTH);
      const satDiameterElement = getEl(SIB.EL.MISSION.DIAMETER);
      const satSpanElement = getEl(SIB.EL.MISSION.SPAN);
      const satShapeElement = getEl(SIB.EL.MISSION.SHAPE);

      if (!satMissionElement || !satPurposeElement || !satContractorElement || !satLaunchMassElement || !satDryMassElement || !satLifetimeElement || !satPowerElement ||
        !satStandardMagnitudeElement || !satBusElement || !satConfigurationElement || !satPayloadElement || !satEquipmentElement || !satMotorElement || !satLengthElement ||
        !satDiameterElement || !satSpanElement || !satShapeElement) {
        errorManagerInstance.warn('One or more updateSatMissionData_ elements not found');

        return;
      }

      satMissionElement.innerHTML = sat?.mission && sat?.mission !== '' ? sat?.mission : 'Unknown';
      satPurposeElement.innerHTML = sat?.purpose && sat?.purpose !== '' ? sat?.purpose : 'Unknown';
      satContractorElement.innerHTML = sat?.manufacturer && sat?.manufacturer !== '' ? sat?.manufacturer : 'Unknown';
      // Update with other mass options
      satLaunchMassElement.innerHTML = sat?.launchMass && sat?.launchMass !== '' ? `${sat?.launchMass} kg` : 'Unknown';
      satDryMassElement.innerHTML = sat?.dryMass && sat?.dryMass !== '' ? `${sat?.dryMass} kg` : 'Unknown';
      satLifetimeElement.innerHTML = sat?.lifetime && sat?.lifetime !== '' ? `${sat?.lifetime} yrs` : 'Unknown';
      satPowerElement.innerHTML = sat?.power && sat?.power !== '' ? `${sat?.power} w` : 'Unknown';
      if (!sat?.vmag && sat?.vmag !== 0) {
        sat.vmag = this.calculateStdMag_(sat);
      }
      satStandardMagnitudeElement.innerHTML = sat?.vmag && sat?.vmag?.toFixed(2) !== '' ? sat?.vmag?.toFixed(2) : 'Unknown';
      satBusElement.innerHTML = sat?.bus && sat?.bus !== '' ? sat?.bus : 'Unknown';
      satConfigurationElement.innerHTML = sat?.configuration && sat?.configuration !== '' ? sat?.configuration : 'Unknown';
      satPayloadElement.innerHTML = sat?.payload && sat?.payload !== '' ? sat?.payload : 'Unknown';
      satEquipmentElement.innerHTML = sat?.equipment && sat?.equipment !== '' ? sat?.equipment : 'Unknown';
      satMotorElement.innerHTML = sat?.motor && sat?.motor !== '' ? sat?.motor : 'Unknown';
      satLengthElement.innerHTML = sat?.length && sat?.length !== '' ? `${sat?.length} m` : 'Unknown';
      satDiameterElement.innerHTML = sat?.diameter && sat?.diameter !== '' ? `${sat?.diameter} m` : 'Unknown';
      satSpanElement.innerHTML = sat?.span && sat?.span !== '' ? `${sat?.span} m` : 'Unknown';
      satShapeElement.innerHTML = sat?.shape && sat?.shape !== '' ? sat?.shape : 'Unknown';
    } else {
      const satInfoElement = (<HTMLElement>keepTrackApi.containerRoot).querySelector('.sat-only-info');

      if (satInfoElement) {
        (<HTMLElement>satInfoElement).style.display = 'none';
      } else {
        errorManagerInstance.debug('sat-only-info element not found');
      }
    }
  }

  static calculateStdMag_(obj: DetailedSatellite): number | null {
    if (obj.vmag) {
      return obj.vmag;
    }

    const similarVmag: number[] = [];
    const catalogManager = keepTrackApi.getCatalogManager();
    const curSatType = obj.type;
    const curSatId = obj.id;
    const curSatCountry = obj.country;
    const curSatName = obj.name.toLowerCase();

    catalogManager.getSats().forEach((posSat) => {
      if (!posSat.vmag) {
        return;
      }
      if (curSatCountry !== posSat.country) {
        // Only look at same country
        return;
      }
      if (curSatType !== posSat.type) {
        // Only look at same type of curSat
        return;
      }
      if (curSatId === posSat.id) {
        // Don't look at the same curSat
        return;
      }

      similarVmag.push(posSat.vmag);

      // Only use the first word of the name
      const posName = posSat.name.toLowerCase();

      if (curSatName.length < 4 || posName.length < 4) {
        return;
      }

      // Determine how many characters match
      const matchingChars = curSatName.split('').filter((char, index) => char === posName[index]);

      if (matchingChars.length / curSatName.length > 0.85) {
        similarVmag.push(posSat.vmag);
        similarVmag.push(posSat.vmag);
        similarVmag.push(posSat.vmag);
      }
    });

    if (similarVmag.length > 0) {
      const avgVmag = similarVmag.reduce((a, b) => a + b, 0) / similarVmag.length;


      return avgVmag;
    }

    return null;
  }

  static updateSensorInfo_(obj: BaseObject) {
    if (obj === null || typeof obj === 'undefined' || settingsManager.isDisableSensors) {
      return;
    }
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    /*
     * If we are using the sensor manager plugin then we should hide the sensor to satellite
     * info when there is no sensor selected
     */
    if (!settingsManager.isDisableSensors) {
      if (sensorManagerInstance.isSensorSelected()) {
        showEl(SIB.SECTIONS.SENSOR);
      } else {
        hideEl(SIB.SECTIONS.SENSOR);
      }
    }

    if (!sensorManagerInstance.isSensorSelected()) {
      const satSunDom = getEl(SIB.EL.SENSOR.SUN);

      if (satSunDom?.parentElement) {
        satSunDom.parentElement.style.display = 'none';
      }
    } else {
      this.calculateSunStatus_(obj);
    }
  }

  static calculateSunStatus_(obj: BaseObject) {
    let satInSun: SunStatus;
    let sunTime: SunTime;
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    let now = new Date(timeManagerInstance.simulationTimeObj.getTime());

    try {
      sunTime = Sun.getTimes(now, sensorManagerInstance.currentSensors[0].lat, sensorManagerInstance.currentSensors[0].lon);
      satInSun = SatMath.calculateIsInSun(obj, keepTrackApi.getScene().sun.eci);
    } catch {
      sunTime = {
        sunriseStart: new Date(2050),
        sunsetEnd: new Date(1970),
      } as SunTime;
      satInSun = SunStatus.UNKNOWN;
    }

    // Reset the time to the current simulation time
    now = new Date(timeManagerInstance.simulationTimeObj.getTime());

    // If No Sensor, then Ignore Sun Exclusion
    const satSunDom = getEl(SIB.EL.SENSOR.SUN);

    if (satSunDom?.parentElement) {
      // If No Sensor, then Ignore Sun Exclusion
      if (!sensorManagerInstance.isSensorSelected()) {
        satSunDom.parentElement.style.display = 'none';

        return;
      }
      satSunDom.parentElement.style.display = 'flex';

      // If Radar Selected, then Say the Sun Doesn't Matter
      if (sensorManagerInstance.currentSensors[0].type !== SpaceObjectType.OPTICAL && sensorManagerInstance.currentSensors[0].type !== SpaceObjectType.OBSERVER) {
        satSunDom.innerHTML = 'No Effect';
        satSunDom.style.color = 'green';

        return;
      }

      // If we are in the sun exclusion zone, then say so
      if (sunTime?.sunriseStart.getTime() - now.getTime() < 0 && (sunTime?.sunsetEnd.getTime() - now.getTime() > 0)) {
        // Unless you are in sun exclusion
        satSunDom.innerHTML = 'Sun Exclusion';
        satSunDom.style.color = 'red';

        return;
      }

      // If it is night then tell the user if the satellite is illuminated
      switch (satInSun) {
        case SunStatus.UMBRAL:
          satSunDom.innerHTML = 'No Sunlight';
          satSunDom.style.color = 'red';
          break;
        case SunStatus.PENUMBRAL:
          satSunDom.innerHTML = 'Limited Sunlight';
          satSunDom.style.color = 'orange';
          break;
        case SunStatus.SUN:
          satSunDom.innerHTML = 'Direct Sunlight';
          satSunDom.style.color = 'green';
          break;
        case SunStatus.UNKNOWN:
        default:
          satSunDom.innerHTML = 'Unable to Calculate';
          satSunDom.style.color = 'red';
          break;
      }
    }
  }
}
