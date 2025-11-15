/* eslint-disable max-lines */
import { SatMath } from '@app/app/analysis/sat-math';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { StringExtractor } from '@app/app/ui/string-extractor';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { openColorbox } from '@app/engine/utils/colorbox';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { BaseObject, DetailedSatellite, PayloadStatus, SpaceObjectType } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { EL, SECTIONS } from './sat-info-box-object-html';
import { PluginRegistry } from '@app/engine/core/plugin-registry';

export class SatInfoBoxObject extends KeepTrackPlugin {
  readonly id = 'SatInfoBoxObject';
  dependencies_: string[] = [SatInfoBox.name];

  private readonly isObjectDataSectionCollapsed_ = false;
  private readonly isSecondaryDataSectionCollapsed_ = false;

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.satInfoBoxInit, () => {
      PluginRegistry.getPlugin(SatInfoBox)!.addElement({ html: this.createObjectSection_(), order: 6 });
      PluginRegistry.getPlugin(SatInfoBox)!.addElement({ html: this.createSecondarySection(), order: 8 });
    });
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.satInfoBoxAddListeners, this.satInfoBoxAddListeners_.bind(this));
    EventBus.getInstance().on(EventBusEvent.selectSatData, this.updateObjectData_.bind(this));
  }

  private satInfoBoxAddListeners_() {
    const satInfoBoxPlugin = PluginRegistry.getPlugin(SatInfoBox)!;

    satInfoBoxPlugin.addListenerToCollapseElement(getEl(`${SECTIONS.OBJECT}`), { value: this.isObjectDataSectionCollapsed_ });
    satInfoBoxPlugin.addListenerToCollapseElement(getEl(`${SECTIONS.SECONDARY}`), { value: this.isSecondaryDataSectionCollapsed_ });
  }

  private createObjectSection_(): string {
    // Object section HTML
    return html`
      <div id="${SECTIONS.OBJECT}" class="sat-info-section">
        <div class="sat-info-section-header">
          <span>${t7e('SatInfoBoxObject.title')}</span>
          <span id="${SECTIONS.OBJECT}-collapse" class="section-collapse material-icons">expand_less</span>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.Type.tooltip')}">${t7e('SatInfoBoxObject.Type.label')}
          </div>
          <div class="sat-info-value" id="${EL.TYPE}">PAYLOAD</div>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.Status.tooltip')}">${t7e('SatInfoBoxObject.Status.label')}
          </div>
          <div class="sat-info-value" id="${EL.STATUS}">STATUS</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.Country.tooltip')}">${t7e('SatInfoBoxObject.Country.label')}
          </div>
          <div class="sat-info-value" id="${EL.COUNTRY}">COUNTRY</div>
        </div>
        <div class="sat-info-row" id="${EL.SITE_ROW}">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.LaunchSite.tooltip')}">${t7e('SatInfoBoxObject.LaunchSite.label')}
          </div>
          <div class="sat-info-value">
            <div id="${EL.LAUNCH_SITE}">LAUNCH SITE</div>
            <div id="${EL.LAUNCH_PAD}">LAUNCH PAD</div>
          </div>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.LaunchVehicle.tooltip')}">${t7e('SatInfoBoxObject.LaunchVehicle.label')}
          </div>
          <div class="sat-info-value pointable" id="${EL.VEHICLE}">VEHICLE</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.Configuration.tooltip')}">${t7e('SatInfoBoxObject.Configuration.label')}
          </div>
          <div class="sat-info-value" id="${EL.CONFIGURATION}">NO DATA</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.RCS.tooltip')}">${t7e('SatInfoBoxObject.RCS.label')}
          </div>
          <div class="sat-info-value" id="${EL.RCS}">NO DATA</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.StdMag.tooltip')}">${t7e('SatInfoBoxObject.StdMag.label')}
          </div>
          <div class="sat-info-value" id="${EL.STDMAG}">NO DATA</div>
        </div>
      </div>
    `;
  }

  private createSecondarySection(): string {
    // Secondary satellite section HTML
    return html`
        <div id="${SECTIONS.SECONDARY}">
          <div class="sat-info-section-header">
            Secondary Satellite
            <span id="${SECTIONS.SECONDARY}-collapse" class="section-collapse material-icons">expand_less</span>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key"
              kt-tooltip="Linear Distance from Secondary Satellite">
              Linear
            </div>
            <div class="sat-info-value" id="${EL.DIST}">xxxx km</div>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key"
              kt-tooltip="Radial Distance">
              Radial
            </div>
            <div class="sat-info-value" id="${EL.RAD}">XX deg</div>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key"
              kt-tooltip="In-Track Distance from Secondary Satellite">
              In-Track
            </div>
            <div class="sat-info-value" id="${EL.INTRACK}">XX deg</div>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key"
              kt-tooltip="Cross-Track Distance from Secondary Satellite">
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

    if (PluginRegistry.getPlugin(SelectSatManager)!.secondarySat !== -1 && getEl('secondary-sat-info')?.style?.display === 'none') {
      showEl('secondary-sat-info');
      showEl('sec-angle-link');
    } else if (PluginRegistry.getPlugin(SelectSatManager)!.secondarySat === -1 && getEl('secondary-sat-info')?.style?.display !== 'none') {
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

    satStandardMagnitudeElement.innerHTML = sat?.vmag && sat?.vmag?.toFixed(2) !== '' ? sat?.vmag?.toFixed(2) : t7e('SatInfoBoxObject.unknown');
    satConfigurationElement.innerHTML = sat?.configuration && sat?.configuration !== '' ? sat?.configuration : t7e('SatInfoBoxObject.unknown');

    if (!sat?.vmag && sat?.vmag !== 0) {
      sat.vmag = this.calculateStdMag_(sat);
    }
    getEl(EL.CONFIGURATION)!.innerHTML = sat.configuration !== '' ? sat.configuration : t7e('SatInfoBoxObject.unknown');
    requestIdleCallback(this.updateRcsData_.bind(this, sat));
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
        satVehicleDom.innerHTML = t7e('SatInfoBoxObject.unknown');
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
      site: t7e('SatInfoBoxObject.unknown'),
      launchPad: t7e('SatInfoBoxObject.unknown'),
      wikiUrl: null as string | null,
    };
    let missileOrigin: string;

    if (obj.isMissile()) {
      const misl = obj as MissileObject;

      siteArr = misl.desc.split('(');
      missileOrigin = siteArr[0].slice(0, siteArr[0].length - 1);

      site.site = missileOrigin;
      site.launchPad = t7e('SatInfoBoxObject.unknown');
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
        satTypeElement.innerHTML = t7e('SatInfoBoxObject.Type.unknown');
        break;
      case SpaceObjectType.PAYLOAD:
        satTypeElement.innerHTML = t7e('SatInfoBoxObject.Type.payload');
        break;
      case SpaceObjectType.ROCKET_BODY:
        satTypeElement.innerHTML = t7e('SatInfoBoxObject.Type.rocketBody');
        break;
      case SpaceObjectType.DEBRIS:
        satTypeElement.innerHTML = t7e('SatInfoBoxObject.Type.debris');
        break;
      case SpaceObjectType.SPECIAL:
        satTypeElement.innerHTML = t7e('SatInfoBoxObject.Type.special');
        break;
      default:
        if (obj.isMissile()) {
          satTypeElement.innerHTML = t7e('SatInfoBoxObject.Type.missile');
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
        satStatusElement.innerHTML = t7e('SatInfoBoxObject.Status.operational');
        break;
      case PayloadStatus.NONOPERATIONAL:
        satStatusElement.innerHTML = t7e('SatInfoBoxObject.Status.nonOperational');
        break;
      case PayloadStatus.PARTIALLY_OPERATIONAL:
        satStatusElement.innerHTML = t7e('SatInfoBoxObject.Status.partiallyOperational');
        break;
      case PayloadStatus.EXTENDED_MISSION:
        satStatusElement.innerHTML = t7e('SatInfoBoxObject.Status.extendedMission');
        break;
      case PayloadStatus.BACKUP_STANDBY:
        satStatusElement.innerHTML = t7e('SatInfoBoxObject.Status.backupStandby');
        break;
      case PayloadStatus.SPARE:
        satStatusElement.innerHTML = t7e('SatInfoBoxObject.Status.spare');
        break;
      case PayloadStatus.UNKNOWN:
      default:
        satStatusElement.innerHTML = t7e('SatInfoBoxObject.Status.unknown');
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
        satRcsEl.setAttribute('kt-tooltip', `${SatMath.mag2db(estRcs).toFixed(2)} dBsm (Historical Estimate)`);
      } else if (sat.length && sat.diameter && sat.span && sat.shape) {
        const rcs = SatMath.estimateRcs(parseFloat(sat.length), parseFloat(sat.diameter), parseFloat(sat.span), sat.shape);

        satRcsEl.innerHTML = `Est ${rcs.toFixed(4)} m<sup>2</sup>`;
        satRcsEl.setAttribute('kt-tooltip', `Est ${SatMath.mag2db(rcs).toFixed(2)} dBsm`);
      } else {
        satRcsEl.innerHTML = t7e('Common.unknown');
        satRcsEl.setAttribute('kt-tooltip', t7e('Common.unknown'));
      }
    } else if (!isNaN(sat.rcs)) {
      satRcsEl.innerHTML = `${sat.rcs} m<sup>2</sup>`;
    } else {
      satRcsEl.innerHTML = t7e('Common.unknown');
      satRcsEl.setAttribute('kt-tooltip', t7e('Common.unknown'));
      // satRcsEl.setAttribute('kt-tooltip', `${SatMath.mag2db(sat.rcs).toFixed(2)} dBsm`);
    }
  }

  private calculateStdMag_(obj: DetailedSatellite): number | null {
    if (obj.vmag) {
      return obj.vmag;
    }

    const similarVmag: number[] = [];
    const catalogManager = ServiceLocator.getCatalogManager();
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
