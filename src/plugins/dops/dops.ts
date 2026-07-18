import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { keepTrackApi } from '@app/keepTrackApi';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import gpsPng from '@public/img/icons/gps.png';

import { CatalogManager } from '@app/app/data/catalog-manager';
import type { GroupsManager } from '@app/app/data/groups-manager';
import { GroupType } from '@app/app/data/object-group';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { DopMath, ElevationMaskFn, GNSS_CONSTELLATION_PATTERNS, GnssConstellation } from '@app/engine/math/dop-math';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IContextMenuConfig,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
  RmbMenuContext,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { Degrees, Kilometers, Satellite, TemeVec3, eci2lla } from '@ootk/src/main';
import { isValidLocation } from './dops-analysis';
import './dops.css';

type T7eKey = Parameters<typeof t7e>[0];

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.DopsPlugin.${key}` as T7eKey);

export class DopsPlugin extends KeepTrackPlugin {
  readonly id = 'DopsPlugin';
  dependencies_ = [];

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'menu-dops',
      label: t7e('plugins.DopsPlugin.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: gpsPng,
      menuMode: [MenuMode.SENSORS, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'dops-menu',
      title: t7e('plugins.DopsPlugin.title'),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  protected getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 550,
      maxWidth: 800,
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.DopsPlugin.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.DopsPlugin.help.overview'),
          image: {
            src: 'img/help/dops/dops-menu.png',
            alt: t7e('plugins.DopsPlugin.help.imgAlt'),
            caption: t7e('plugins.DopsPlugin.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.DopsPlugin.help.valuesHeading'),
          content: t7e('plugins.DopsPlugin.help.values'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.DopsPlugin.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.DopsPlugin.help.tip1'),
        t7e('plugins.DopsPlugin.help.tip2'),
        t7e('plugins.DopsPlugin.help.tip3'),
      ],
      shortcuts: [{ keys: ['D'], description: t7e('plugins.DopsPlugin.help.shortcutToggle') }],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'D',
        callback: () => {
          this.bottomMenuClicked();
        },
      },
    ];
  }

  // =========================================================================
  // Side menu HTML
  // =========================================================================

  protected buildSideMenuHtml_(): string {
    return html`
    <div id="dops-menu" class="side-menu-parent start-hidden kt-ui-v13">
      <div id="dops-content" class="side-menu">
        <form id="dops-form">
          ${this.wrapSection_(l('labels.location'), html`
            ${this.locationBody_()}
            ${DopsPlugin.actionButton_('dops-submit', l('labels.updateDopData'), { submit: true })}
          `)}
        </form>
        ${this.buildResultsHtml_()}
      </div>
    </div>`;
  }

  /** Wrap a section's controls in a titled v13 card. */
  protected wrapSection_(title: string, body: string): string {
    return html`
      <section class="kt-section">
        <div class="kt-section-label">${title}</div>
        ${body}
      </section>
    `;
  }

  /** A full-width v13 action row (label + trailing chevron via CSS). */
  protected static actionButton_(id: string, label: string, opts: { submit?: boolean; disabled?: boolean } = {}): string {
    const type = opts.submit ? 'submit' : 'button';
    const disabled = opts.disabled ? ' disabled' : '';

    return html`
      <button id="${id}" type="${type}" class="kt-action waves-effect"${disabled}>
        <span class="kt-action-label">${label}</span>
      </button>
    `;
  }

  /**
   * The observer location fields (lat/lon/alt/elevation mask). Pro extends this
   * body with the constellation selector and terrain-mask editor action.
   */
  protected locationBody_(): string {
    return html`
      <div class="kt-field-row">
        <div class="input-field col s3" data-position="bottom" data-offset="60" data-tooltip="${t7e('plugins.DopsPlugin.tooltips.latitude')}">
          <input value="41" id="dops-lat" type="text">
          <label for="dops-lat" class="active">${t7e('plugins.DopsPlugin.labels.latitude')}</label>
        </div>
        <div class="input-field col s3" data-position="bottom" data-offset="60" data-tooltip="${t7e('plugins.DopsPlugin.tooltips.longitude')}">
          <input value="-71" id="dops-lon" type="text">
          <label for="dops-lon" class="active">${t7e('plugins.DopsPlugin.labels.longitude')}</label>
        </div>
        <div class="input-field col s3" data-position="bottom" data-offset="60" data-tooltip="${t7e('plugins.DopsPlugin.tooltips.altitude')}">
          <input value="0" id="dops-alt" type="text">
          <label for="dops-alt" class="active">${t7e('plugins.DopsPlugin.labels.altitude')}</label>
        </div>
        <div class="input-field col s3" data-position="bottom" data-offset="60" data-tooltip="${t7e('plugins.DopsPlugin.tooltips.mask')}">
          <input value="15" id="dops-el" type="text">
          <label for="dops-el" class="active">${t7e('plugins.DopsPlugin.labels.mask')}</label>
        </div>
      </div>
    `;
  }

  /**
   * The results region below the form. OSS renders a single DOP table; Pro
   * overrides this with the Sky View / 24hr Analysis tabbed layout.
   */
  protected buildResultsHtml_(): string {
    return this.wrapSection_(l('labels.results'), html`
      <table id="dops" class="center-align striped-light centered"></table>
    `);
  }

  // =========================================================================
  // Legacy bridges
  // =========================================================================

  bottomIconCallback = (): void => {
    if (this.isMenuButtonActive) {
      showLoading(() => this.updateSideMenu());
    }
  };

  // =========================================================================
  // Context menu
  // =========================================================================

  getContextMenuConfig(): IContextMenuConfig {
    return {
      level1ElementName: 'dops-rmb',
      level1Html: html`
        <li class="rmb-menu-item" id="dops-rmb"><a href="#">${t7e('plugins.DopsPlugin.rmb.dops')} &#x27A4;</a></li>`,
      level2ElementName: 'dops-rmb-menu',
      level2Html: html`
        <ul class='dropdown-contents'>
          <li id="dops-curdops-rmb"><a href="#">${t7e('plugins.DopsPlugin.rmb.currentGpsDops')}</a></li>
          <li id="dops-24dops-rmb"><a href="#">${t7e('plugins.DopsPlugin.rmb.twentyFourHourGpsDops')}</a></li>
        </ul>`,
      order: 100,
      // DOP values are computed for the ground location under the cursor
      isVisible: (ctx: RmbMenuContext) => ctx.surface === 'earth',
    };
  }

  onContextMenuAction(targetId: string): void {
    switch (targetId) {
      case 'dops-curdops-rmb': {
        {
          const inputManager = ServiceLocator.getInputManager();
          let latLon = inputManager.mouse.latLon;
          const dragPosition = inputManager.mouse.dragPosition;

          if (typeof latLon === 'undefined' || isNaN(latLon.lat) || isNaN(latLon.lon)) {
            errorManagerInstance.debug('latLon undefined!');
            const gmst = ServiceLocator.getTimeManager().gmst;

            latLon = eci2lla(
              {
                x: dragPosition[0],
                y: dragPosition[1],
                z: dragPosition[2],
              } as TemeVec3,
              gmst,
            );
          }
          const gpsSatObjects = DopsPlugin.getGpsSats(ServiceLocator.getCatalogManager(), ServiceLocator.getGroupsManager());
          const gpsDOP = DopMath.getDops(ServiceLocator.getTimeManager().simulationTimeObj, gpsSatObjects, latLon.lat, latLon.lon, <Kilometers>0, this.getElevationMask_());

          keepTrackApi
            .getUiManager()
            .toast(
              t7e('plugins.DopsPlugin.toast.dopValues')
                .replace('{hdop}', gpsDOP.hdop)
                .replace('{vdop}', gpsDOP.vdop)
                .replace('{pdop}', gpsDOP.pdop)
                .replace('{gdop}', gpsDOP.gdop)
                .replace('{tdop}', gpsDOP.tdop),
              ToastMsgType.normal,
              true,
            );
        }
        break;
      }
      case 'dops-24dops-rmb': {
        const latLon = ServiceLocator.getInputManager().mouse.latLon;

        if (typeof latLon === 'undefined' || isNaN(latLon.lat) || isNaN(latLon.lon)) {
          errorManagerInstance.warn(t7e('plugins.DopsPlugin.errorMsgs.invalidLocation'));

          return;
        }

        if (!this.isMenuButtonActive) {
          (<HTMLInputElement>getEl('dops-lat')).value = latLon.lat.toFixed(3);
          (<HTMLInputElement>getEl('dops-lon')).value = latLon.lon.toFixed(3);
          (<HTMLInputElement>getEl('dops-alt')).value = '0';
          (<HTMLInputElement>getEl('dops-el')).value = settingsManager.gpsElevationMask.toString();
          this.bottomMenuClicked();
        } else {
          showLoading(() => this.updateSideMenu());
          this.setBottomIconToEnabled();
          break;
        }
      }
        break;
      default:
        break;
    }
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('dops-form')!.addEventListener('submit', (e: Event) => {
          e.preventDefault();
          this.updateSideMenu();
        });
      },
    );
  }

  /**
   * Returns the elevation mask to use for DOP calculations.
   * Override in pro plugin to return a terrain-aware function.
   */
  protected getElevationMask_(): Degrees | ElevationMaskFn {
    return <Degrees>parseFloat((<HTMLInputElement>getEl('dops-el')).value);
  }

  protected updateSideMenu(): void {
    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const timeManagerInstance = ServiceLocator.getTimeManager();

    const lat = <Degrees>parseFloat((<HTMLInputElement>getEl('dops-lat')).value);
    const lon = <Degrees>parseFloat((<HTMLInputElement>getEl('dops-lon')).value);
    const alt = <Kilometers>parseFloat((<HTMLInputElement>getEl('dops-alt')).value);

    if (!isValidLocation(lat, lon, alt)) {
      ServiceLocator.getUiManager().toast(t7e('plugins.DopsPlugin.errorMsgs.invalidLocation'), ToastMsgType.caution);

      return;
    }

    const el = this.getElevationMask_();

    if (typeof el === 'number') {
      settingsManager.gpsElevationMask = el;
    }
    const gpsSats = DopsPlugin.getGpsSats(catalogManagerInstance, groupManagerInstance);
    const getOffsetTimeObj = (now: number) => timeManagerInstance.getOffsetTimeObj(now);
    const dopsList = DopMath.getDopsList(getOffsetTimeObj, gpsSats, lat, lon, alt, el);

    DopMath.updateDopsTable(dopsList);
  }

  static getGpsSats(catalogManagerInstance: CatalogManager, groupManagerInstance: GroupsManager): Satellite[] {
    return DopsPlugin.getGnssSats(catalogManagerInstance, groupManagerInstance, 'gps');
  }

  /**
   * Returns the satellites of the requested GNSS constellation (GPS, Galileo,
   * GLONASS, BeiDou, or all of them) by matching catalog names.
   */
  static getGnssSats(
    catalogManagerInstance: CatalogManager,
    groupManagerInstance: GroupsManager,
    constellation: GnssConstellation = 'gps',
  ): Satellite[] {
    // Keep the historical group name for GPS so existing groups are reused
    const groupName = constellation === 'gps' ? 'GPSGroup' : `GnssGroup_${constellation}`;

    if (!groupManagerInstance.groupList[groupName]) {
      groupManagerInstance.groupList[groupName] = groupManagerInstance.createGroup(
        GroupType.NAME_REGEX,
        GNSS_CONSTELLATION_PATTERNS[constellation],
        groupName,
      );
    }
    const gnssSats = groupManagerInstance.groupList[groupName];
    const gnssSatObjects = [] as Satellite[];

    gnssSats.ids.forEach((id: number) => {
      const sat = catalogManagerInstance.getSat(id);

      if (sat) {
        gnssSatObjects.push(sat);
      }
    });

    return gnssSatObjects;
  }
}
