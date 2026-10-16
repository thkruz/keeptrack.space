/* eslint-disable max-lines */

import { buildCatalogRcsStats, estimateRcsWithSource } from '@app/app/analysis/rcs-estimator';
import { SatMath } from '@app/app/analysis/sat-math';
import { estimateStdMagWithSource, StdMagWithSource } from '@app/app/analysis/std-mag-estimator';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { type FlagSource, resolveFlagKey } from '@app/app/data/catalogs/flag-resolver';
import { StringExtractor } from '@app/app/ui/string-extractor';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import type { ISettingsContribution, ISettingsContributor } from '@app/engine/plugins/core/plugin-capabilities';
import { openColorbox } from '@app/engine/utils/colorbox';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, requestIdleWrite, showEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { SettingsManager } from '@app/settings/settings';
import { BaseObject, PayloadStatus, Satellite, SpaceObjectType } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { EL, SECTIONS } from './sat-info-box-object-html';
import './sat-info-box-object.css';

export class SatInfoBoxObject extends KeepTrackPlugin implements ISettingsContributor {
  readonly id = 'SatInfoBoxObject';
  dependencies_: string[] = [SatInfoBox.name];

  private readonly isObjectDataSectionCollapsed_ = false;
  private readonly isSecondaryDataSectionCollapsed_ = false;
  /** Range of the flag size control, as a fraction of the model's bounding radius. */
  private static readonly FLAG_SCALE_MIN_ = 0.2;
  private static readonly FLAG_SCALE_MAX_ = 0.6;

  /** Graphics menu card for the flag decal on the selected satellite's model. */
  getSettingsContribution(): ISettingsContribution {
    return {
      sectionId: this.id,
      sectionLabel: t7e('SatInfoBoxObject.graphics.sectionLabel'),
      target: 'graphics',
      controls: [
        {
          type: 'toggle',
          id: 'flagDecals',
          label: t7e('SatInfoBoxObject.graphics.flagDecals.label'),
          helpText: t7e('SatInfoBoxObject.graphics.flagDecals.helpText'),
          quality: { minLevel: 'medium' },
          get: () => settingsManager.isDrawFlagDecals,
          set: (next) => {
            settingsManager.isDrawFlagDecals = next;
            SettingsManager.preserveSettings();
          },
        },
        {
          type: 'number',
          id: 'flagDecalScale',
          label: t7e('SatInfoBoxObject.graphics.flagDecalScale.label'),
          helpText: t7e('SatInfoBoxObject.graphics.flagDecalScale.helpText'),
          min: SatInfoBoxObject.FLAG_SCALE_MIN_,
          max: SatInfoBoxObject.FLAG_SCALE_MAX_,
          step: 0.05,
          get: () => settingsManager.flagDecalScale,
          set: (next) => {
            if (!Number.isFinite(next)) {
              return;
            }
            settingsManager.flagDecalScale = Math.min(Math.max(next, SatInfoBoxObject.FLAG_SCALE_MIN_), SatInfoBoxObject.FLAG_SCALE_MAX_);
            SettingsManager.preserveSettings();
          },
        },
      ],
    };
  }

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.satInfoBoxInit, () => {
      PluginRegistry.getPlugin(SatInfoBox)!.addElement({ html: this.createObjectSection_(), order: 7 });
      PluginRegistry.getPlugin(SatInfoBox)!.addElement({ html: this.createSecondarySection(), order: 9 });
    });
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.satInfoBoxAddListeners, this.satInfoBoxAddListeners_.bind(this));
    EventBus.getInstance().on(EventBusEvent.selectSatData, this.updateObjectData_.bind(this));
    EventBus.getInstance().on(EventBusEvent.setSecondarySat, this.updateSecondaryVisibility_.bind(this));
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
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.ModelFlag.tooltip')}">${t7e('SatInfoBoxObject.ModelFlag.label')}
          </div>
          <div class="sat-info-value" id="${EL.MODEL_FLAG}">FLAG</div>
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
        ${
          settingsManager.plugins.SatInfoBoxObject?.isShowLaunchVehicle !== false
            ? html`
        <div class="sat-info-row">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.LaunchVehicle.tooltip')}">${t7e('SatInfoBoxObject.LaunchVehicle.label')}
          </div>
          <div class="sat-info-value pointable" id="${EL.VEHICLE}">VEHICLE</div>
        </div>`
            : ''
        }
        ${
          settingsManager.plugins.SatInfoBoxObject?.isShowConfiguration !== false
            ? html`
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.Configuration.tooltip')}">${t7e('SatInfoBoxObject.Configuration.label')}
          </div>
          <div class="sat-info-value" id="${EL.CONFIGURATION}">NO DATA</div>
        </div>`
            : ''
        }
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.RCS.tooltip')}">${t7e('SatInfoBoxObject.RCS.label')}
          </div>
          <div class="sat-info-value" id="${EL.RCS}">NO DATA</div>
        </div>
        ${
          settingsManager.plugins.SatInfoBoxObject?.isShowStdMag !== false
            ? html`
        <div class="sat-info-row sat-only-info" id="${EL.STDMAG_ROW}">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.StdMag.tooltip')}">${t7e('SatInfoBoxObject.StdMag.label')}
          </div>
          <div class="sat-info-value" id="${EL.STDMAG}">NO DATA</div>
        </div>`
            : ''
        }
        ${
          settingsManager.plugins.SatInfoBoxObject?.isShowAppMag !== false
            ? html`
        <div class="sat-info-row sat-only-info" id="${EL.APPMAG_ROW}" style="display: none;">
          <div class="sat-info-key"
            kt-tooltip="${t7e('SatInfoBoxObject.AppMag.tooltip')}">${t7e('SatInfoBoxObject.AppMag.label')}
          </div>
          <div class="sat-info-value" id="${EL.APPMAG}">NO DATA</div>
        </div>`
            : ''
        }
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
          <div class="sat-info-row sat-sec-convention-row">
            <div class="sat-sec-convention" id="${EL.RIC_CONVENTION}">${t7e('SatInfoBoxObject.Secondary.ricConvention')}</div>
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

  private updateSecondaryVisibility_(): void {
    if (PluginRegistry.getPlugin(SelectSatManager)!.secondarySat !== -1) {
      showEl('secondary-sat-info');
      showEl('sec-angle-link');
    } else {
      hideEl('secondary-sat-info');
      hideEl('sec-angle-link');
    }
  }

  private updateObjectData_(obj?: BaseObject) {
    if (!obj || (!obj.isSatellite() && !obj.isMissile())) {
      return;
    }

    this.updateSecondaryVisibility_();

    const satMisl = obj as Satellite | MissileObject;

    this.updateCountryCorrelationTable_(satMisl);
    this.updateModelFlag_(satMisl);
    this.updateLaunchSiteCorrelationTable_(satMisl);

    if (settingsManager.plugins.SatInfoBoxObject?.isShowLaunchVehicle !== false) {
      this.updateLaunchVehicleCorrelationTable_(obj);
    }
    this.updateSatType_(obj);
    this.updateSatStatus_(obj);

    if (satMisl.isMissile()) {
      return;
    }

    const sat = satMisl as Satellite;

    if (settingsManager.plugins.SatInfoBoxObject?.isShowStdMag !== false) {
      this.updateStdMag_(sat);
    }

    if (settingsManager.plugins.SatInfoBoxObject?.isShowAppMag !== false) {
      this.updateApparentMag_(sat);
    }

    if (settingsManager.plugins.SatInfoBoxObject?.isShowConfiguration !== false) {
      const satConfigurationElement = getEl(EL.CONFIGURATION);

      if (satConfigurationElement) {
        satConfigurationElement.innerHTML = sat?.configuration && sat?.configuration !== '' ? sat?.configuration : t7e('SatInfoBoxObject.unknown');
      }
    }

    requestIdleWrite(this.updateRcsData_.bind(this, sat));
  }

  private updateStdMag_(sat: Satellite) {
    const stdMagElement = getEl(EL.STDMAG);

    if (!stdMagElement) {
      return;
    }

    const result = this.calculateStdMag_(sat);

    if (result === null) {
      stdMagElement.innerHTML = t7e('SatInfoBoxObject.unknown');

      return;
    }

    // Cache catalog/preset values onto the object so downstream consumers
    // (apparent-mag, color schemes) get a populated vmag without recomputing.
    if (result.source !== 'estimate' && sat.vmag === null) {
      sat.vmag = result.vmag;
    }

    const formatted = result.vmag.toFixed(2);

    stdMagElement.innerHTML = result.source === 'catalog' ? formatted : `${formatted} ${t7e('SatInfoBoxObject.estimatedSuffix')}`;
  }

  private updateApparentMag_(sat: Satellite) {
    const appMagRow = getEl(EL.APPMAG_ROW);
    const appMagElement = getEl(EL.APPMAG);

    if (!appMagRow || !appMagElement) {
      return;
    }

    const sensorManager = ServiceLocator.getSensorManager();

    if (!sensorManager.isSensorSelected()) {
      appMagRow.style.display = 'none';

      return;
    }

    const sensor = sensorManager.currentSensors[0];

    if (!sensor) {
      appMagRow.style.display = 'none';

      return;
    }

    // Catalog/preset values are cached onto sat.vmag in updateStdMag_; for the
    // estimate path, pass the value via the override parameter so we don't
    // erase its provenance (the `(est.)` suffix in the standard mag row).
    let intrinsicOverride: number | undefined;

    if (sat.vmag === null) {
      const fallback = estimateStdMagWithSource(sat);

      if (fallback) {
        intrinsicOverride = fallback.vmag;
      }
    }

    try {
      const timeManager = ServiceLocator.getTimeManager();
      const sun = ServiceLocator.getScene().sun;
      const appMag = SatMath.calculateVisMag(sat, sensor, timeManager.simulationTimeObj, sun, intrinsicOverride);

      appMagElement.innerHTML = appMag.toFixed(2);
      appMagRow.style.display = '';
    } catch (e) {
      errorManagerInstance.debug(`Apparent magnitude calculation failed: ${e}`);
      appMagRow.style.display = 'none';
    }
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
      const sat = obj as Satellite;

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

      siteArr = misl.desc?.split('(') ?? [];
      missileOrigin = siteArr[0]?.slice(0, -1)?.trim() || t7e('SatInfoBoxObject.unknown');

      site.site = missileOrigin;
      site.launchPad = t7e('SatInfoBoxObject.unknown');
    } else {
      const sat = obj as Satellite;

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

  private updateCountryCorrelationTable_(obj: Satellite | MissileObject) {
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
  /** The flag the 3D model shows: catalog override, then country, else unknown. */
  private updateModelFlag_(obj: Satellite | MissileObject) {
    const el = getEl(EL.MODEL_FLAG, true);

    if (!el) {
      return;
    }

    const key = resolveFlagKey(obj as unknown as FlagSource);

    // The key can come from catalog data, so only a plain flag code reaches innerHTML.
    if (key && /^[a-z0-9/-]{1,16}$/u.test(key)) {
      el.innerHTML = `<span class="fi fi-${key}"></span> ${key.toUpperCase()}`;
    } else {
      el.textContent = t7e('SatInfoBoxObject.unknown');
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

    const sat = obj as Satellite;

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

  private updateRcsData_(sat: Satellite) {
    const satRcsEl = getEl(EL.RCS);

    if (!satRcsEl) {
      errorManagerInstance.debug(`${EL.RCS} element not found`);

      return;
    }

    // Respect the "no estimation" opt-out: show only what's literally in the
    // catalog, fall back to Unknown otherwise.
    if (settingsManager.plugins.SatInfoBoxObject?.isEstimateRcs === false) {
      if (typeof sat.rcs === 'number' && !isNaN(sat.rcs)) {
        satRcsEl.innerHTML = `${sat.rcs} m<sup>2</sup>`;
        satRcsEl.setAttribute('kt-tooltip', `${SatMath.pow2db(sat.rcs).toFixed(2)} dBsm`);
      } else {
        satRcsEl.innerHTML = t7e('Common.unknown');
        satRcsEl.setAttribute('kt-tooltip', t7e('Common.unknown'));
      }

      return;
    }

    // Catalog-mining is the most expensive layer; build the stats snapshot
    // once on demand here. Slower than the color scheme's path (which caches
    // it per recolor) but the info box runs at most a few times per second.
    const stats = buildCatalogRcsStats(ServiceLocator.getCatalogManager().getSats());
    const result = estimateRcsWithSource(sat, stats);

    if (result === null) {
      satRcsEl.innerHTML = t7e('Common.unknown');
      satRcsEl.setAttribute('kt-tooltip', t7e('Common.unknown'));

      return;
    }

    const formatted = `${result.rcs.toFixed(4)} m<sup>2</sup>`;
    const dbsm = `${SatMath.pow2db(result.rcs).toFixed(2)} dBsm`;

    if (result.source === 'catalog') {
      satRcsEl.innerHTML = formatted;
      satRcsEl.setAttribute('kt-tooltip', dbsm);
    } else {
      const suffix = t7e('SatInfoBoxObject.estimatedSuffix');

      satRcsEl.innerHTML = `${formatted} ${suffix}`;
      satRcsEl.setAttribute('kt-tooltip', `${dbsm} (${result.source})`);
    }
  }

  private calculateStdMag_(obj: Satellite): StdMagWithSource | null {
    return estimateStdMagWithSource(obj);
  }
}
