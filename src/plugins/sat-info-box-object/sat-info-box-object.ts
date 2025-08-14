/* eslint-disable max-lines */
import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { openColorbox } from '@app/lib/colorbox';
import { getEl, hideEl, showEl } from '@app/lib/get-el';
import { MissileObject } from '@app/singletons/catalog-manager/MissileObject';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { SatMath } from '@app/static/sat-math';
import { StringExtractor } from '@app/static/string-extractor';
import { BaseObject, DetailedSatellite, PayloadStatus, SpaceObjectType } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

const SECTIONS = {
  OBJECT: 'object-section',
  SECONDARY: 'secondary-sat-info',
};

const EL = {
  TYPE: 'sat-type',
  STATUS: 'sat-status',
  COUNTRY: 'sat-country',
  SITE_ROW: 'sat-site-row',
  LAUNCH_SITE: 'sat-launchSite',
  LAUNCH_PAD: 'sat-launchPad',
  VEHICLE: 'sat-vehicle',
  CONFIGURATION: 'sat-configuration',
  RCS: 'sat-rcs',
  STDMAG: 'sat-stdmag',

  // Secondary satellite elements
  DIST: 'sat-sec-dist',
  RAD: 'sat-sec-rad',
  INTRACK: 'sat-sec-intrack',
  CROSSTRACK: 'sat-sec-crosstrack',
};

export class SatInfoBoxObject extends KeepTrackPlugin {
  readonly id = 'SatInfoBoxObject';
  dependencies_: string[] = [SatInfoBox.name];

  private readonly isObjectDataSectionCollapsed_ = false;
  private readonly isSecondaryDataSectionCollapsed_ = false;

  addHtml(): void {
    super.addHtml();

    keepTrackApi.on(KeepTrackApiEvents.satInfoBoxInit, () => {
      keepTrackApi.getPlugin(SatInfoBox)!.addElement({ html: this.createObjectSection_(), order: 6 });
      keepTrackApi.getPlugin(SatInfoBox)!.addElement({ html: this.createSecondarySection(), order: 8 });
    });
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.on(KeepTrackApiEvents.satInfoBoxAddListeners, this.satInfoBoxAddListeners_.bind(this));
    keepTrackApi.on(KeepTrackApiEvents.selectSatData, this.updateObjectData_.bind(this));
  }

  private satInfoBoxAddListeners_() {
    const satInfoBoxPlugin = keepTrackApi.getPlugin(SatInfoBox)!;

    satInfoBoxPlugin.addListenerToCollapseElement(getEl(`${SECTIONS.OBJECT}`), { value: this.isObjectDataSectionCollapsed_ });
    satInfoBoxPlugin.addListenerToCollapseElement(getEl(`${SECTIONS.SECONDARY}`), { value: this.isSecondaryDataSectionCollapsed_ });
  }

  private createObjectSection_(): string {
    // Object section HTML
    return keepTrackApi.html`
      <div id="${SECTIONS.OBJECT}" class="sat-info-section">
        <div class="sat-info-section-header">
          Object Data
          <span id="${SECTIONS.OBJECT}-collapse" class="section-collapse material-icons">expand_less</span>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Type of Object">Type</div>
          <div class="sat-info-value" id="${EL.TYPE}">PAYLOAD</div>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Type of Object">Status</div>
          <div class="sat-info-value" id="${EL.STATUS}">STATUS</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Country That Owns the Object">Country</div>
          <div class="sat-info-value" id="${EL.COUNTRY}">COUNTRY</div>
        </div>
        <div class="sat-info-row" id="${EL.SITE_ROW}">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Location Where Object Launched From">Launch Site</div>
          <div class="sat-info-value">
            <div id="${EL.LAUNCH_SITE}">LAUNCH SITE</div>
            <div id="${EL.LAUNCH_PAD}">LAUNCH PAD</div>
          </div>
          </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Space Lift Vehicle That Launched Object">Rocket</div>
          <div class="sat-info-value pointable" id="${EL.VEHICLE}">VEHICLE</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Configuration of the Rocket">
            Configuration
          </div>
          <div class="sat-info-value" id="${EL.CONFIGURATION}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Radar Cross Section - How reflective the object is to a radar">
            RCS
          </div>
          <div class="sat-info-value" data-position="top" data-delay="50" id="${EL.RCS}">NO DATA</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Standard Magnitude - Smaller Numbers Are Brighter">
            Standard Mag
          </div>
          <div class="sat-info-value" id="${EL.STDMAG}">
            NO DATA
          </div>
        </div>
      </div>
    `;
  }

  private createSecondarySection(): string {
    // Secondary satellite section HTML
    return keepTrackApi.html`
        <div id="${SECTIONS.SECONDARY}">
          <div class="sat-info-section-header">
            Secondary Satellite
            <span id="${SECTIONS.SECONDARY}-collapse" class="section-collapse material-icons">expand_less</span>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Linear Distance from Secondary Satellite">
              Linear
            </div>
            <div class="sat-info-value" id="${EL.DIST}">xxxx km</div>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Radial Distance">
              Radial
            </div>
            <div class="sat-info-value" id="${EL.RAD}">XX deg</div>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="In-Track Distance from Secondary Satellite">
              In-Track
            </div>
            <div class="sat-info-value" id="${EL.INTRACK}">XX deg</div>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key" data-position="top" data-delay="50"
              data-tooltip="Cross-Track Distance from Secondary Satellite">
              Cross-Track
            </div>
            <div class="sat-info-value" id="${EL.CROSSTRACK}">xxxx km</div>
          </div>
        </div>
      `;
  }

  private updateObjectData_(obj?: BaseObject) {
    if (!obj || (!obj.isSatellite() && !obj.isMissile())) {
      return;
    }

    if (keepTrackApi.getPlugin(SelectSatManager)!.secondarySat !== -1 && getEl('secondary-sat-info')?.style?.display === 'none') {
      showEl('secondary-sat-info');
      showEl('sec-angle-link');
    } else if (keepTrackApi.getPlugin(SelectSatManager)!.secondarySat === -1 && getEl('secondary-sat-info')?.style?.display !== 'none') {
      hideEl('secondary-sat-info');
      hideEl('sec-angle-link');
    }

    const satMisl = obj as DetailedSatellite | MissileObject;

    this.updateCountryCorrelationTable_(satMisl);
    this.updateLaunchSiteCorrelationTable_(satMisl);

    this.updateLaunchVehicleCorrelationTable_(obj);
    this.updateSatType_(obj);
    this.updateSatStatus_(obj);

    if (satMisl.isMissile()) {
      return;
    }

    const sat = satMisl as DetailedSatellite;

    const satStandardMagnitudeElement = getEl(EL.STDMAG)!;
    const satConfigurationElement = getEl(EL.CONFIGURATION)!;

    satStandardMagnitudeElement.innerHTML = sat?.vmag && sat?.vmag?.toFixed(2) !== '' ? sat?.vmag?.toFixed(2) : 'Unknown';
    satConfigurationElement.innerHTML = sat?.configuration && sat?.configuration !== '' ? sat?.configuration : 'Unknown';

    if (!sat?.vmag && sat?.vmag !== 0) {
      sat.vmag = this.calculateStdMag_(sat);
    }
    getEl(EL.CONFIGURATION)!.innerHTML = sat.configuration !== '' ? sat.configuration : 'Unknown';
    this.updateRcsData_(sat);
  }

  private updateLaunchVehicleCorrelationTable_(obj: BaseObject) {
    let satVehicleDom = getEl(EL.VEHICLE);

    if (!satVehicleDom) {
      errorManagerInstance.debug(`${EL.VEHICLE} element not found`);

      return;
    }

    const tempEl = satVehicleDom.cloneNode(true);

    if (!satVehicleDom.parentNode) {
      errorManagerInstance.debug(`${EL.VEHICLE} parent element not found`);

      return;
    }

    // Remove any existing event listeners
    satVehicleDom.parentNode.replaceChild(tempEl, satVehicleDom);

    // Update links
    satVehicleDom = getEl(EL.VEHICLE);

    if (!satVehicleDom) {
      errorManagerInstance.debug(`${EL.VEHICLE} element not found`);

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

  private updateLaunchSiteCorrelationTable_(obj: BaseObject) {
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

    const launchSiteElement = getEl(EL.LAUNCH_SITE);
    const launchPadElement = getEl(EL.LAUNCH_PAD);

    if (!launchSiteElement || !launchPadElement) {
      errorManagerInstance.debug(`${EL.LAUNCH_SITE} or ${EL.LAUNCH_PAD} element not found`);

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

  private updateCountryCorrelationTable_(obj: DetailedSatellite | MissileObject) {
    const satCountryElement = getEl(EL.COUNTRY);

    if (!satCountryElement) {
      errorManagerInstance.debug(`${EL.COUNTRY} element not found`);

      return;
    }

    if (obj.country?.length > 4) {
      satCountryElement.innerHTML = obj.country;
    } else {
      const country = StringExtractor.extractCountry(obj.country);

      satCountryElement.innerHTML = country;
    }
  }
  private updateSatType_(obj: BaseObject) {
    const satTypeElement = getEl(EL.TYPE);

    if (!satTypeElement) {
      errorManagerInstance.debug(`${EL.TYPE} element not found`);

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

  private updateSatStatus_(obj: BaseObject) {
    const satStatusElement = getEl(EL.STATUS);
    const satStatusParentElement = satStatusElement?.parentElement;

    if (!satStatusElement) {
      errorManagerInstance.debug(`$${EL.STATUS} element not found`);

      return;
    }

    if (!satStatusParentElement) {
      errorManagerInstance.debug(`${EL.STATUS} parent element not found`);

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

  private updateRcsData_(sat: DetailedSatellite) {
    const satRcsEl = getEl(EL.RCS);

    if (!satRcsEl) {
      errorManagerInstance.debug(`${EL.RCS} element not found`);

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

  private calculateStdMag_(obj: DetailedSatellite): number | null {
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
}
