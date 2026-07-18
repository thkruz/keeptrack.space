import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { IContextMenuConfig, IHelpConfig, RmbMenuContext } from '@app/engine/plugins/core/plugin-capabilities';
import { UiGeolocation } from '@app/app/ui/ui-manager-geolocation';
import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, setInnerHtml } from '@app/engine/utils/get-el';
import { slideInRight } from '@app/engine/utils/slide';
import { triggerSubmit } from '@app/engine/utils/trigger-submit';
import { waitForCruncher } from '@app/engine/utils/waitForCruncher';
import { t7e } from '@app/locales/keys';
import { PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import bookmarkRemovePng from '@public/img/icons/bookmark-remove.png';
import sensorAddPng from '@public/img/icons/sensor-add.png';
import viewListPng from '@public/img/icons/view-list.png';
import { ClickDragOptions, KeepTrackPlugin, SideMenuSettingsOptions } from '../../engine/plugins/base-plugin';
import { buildCustomSensorParams, CustomSensorFormValues, validateCustomSensor } from './custom-sensor-core';
import { renderCustomSensorList } from './custom-sensor-list-renderer';
import './custom-sensor.css';

export class CustomSensorPlugin extends KeepTrackPlugin {
  readonly id = 'CustomSensorPlugin';
  dependencies_ = [];

  private static t_(key: string): string {
    return t7e(`plugins.CustomSensorPlugin.${key}` as Parameters<typeof t7e>[0]);
  }

  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonActive) {
      const sensorManagerInstance = ServiceLocator.getSensorManager();

      if (sensorManagerInstance.isSensorSelected()) {
        (<HTMLInputElement>getEl('cs-replace')).style.display = '';
        CustomSensorPlugin.setFields_({
          'cs-lat': sensorManagerInstance.currentSensors[0].lat.toString(),
          'cs-lon': sensorManagerInstance.currentSensors[0].lon.toString(),
          'cs-hei': sensorManagerInstance.currentSensors[0].alt.toString(),
        });
      } else {
        (<HTMLInputElement>getEl('cs-replace')).style.display = 'none';
      }
    }
  };

  menuMode: MenuMode[] = [MenuMode.CREATE, MenuMode.ALL];

  bottomIconImg = sensorAddPng;

  sideMenuElementName: string = 'custom-sensor-menu';
  sideMenuElementHtml: string = CustomSensorPlugin.buildSideMenuHtml_();
  // A list of active sensors, not a settings panel, so use a list icon over the default gear.
  secondaryMenuIcon = viewListPng;
  sideMenuSecondaryHtml: string = html`
    <div class="cs-secondary-body">
      <section class="kt-section">
        <div class="kt-section-label">${CustomSensorPlugin.t_('sensorList.activeSensors')}</div>
        <div id="custom-sensors-sensor-list"></div>
      </section>
    </div>`;
  sideMenuSecondaryOptions: SideMenuSettingsOptions = {
    width: 400,
    leftOffset: null,
    zIndex: 3,
  };

  getContextMenuConfig(): IContextMenuConfig {
    return {
      level1ElementName: 'create-rmb',
      level1Html: CustomSensorPlugin.buildRmbL1Html_(),
      level2ElementName: 'create-rmb-menu',
      level2Html: CustomSensorPlugin.buildRmbL2Html_(),
      order: 10,
      // Creating a sensor requires a ground location under the cursor
      isVisible: (ctx: RmbMenuContext) => ctx.surface === 'earth',
    };
  }

  private static buildSideMenuHtml_(): string {
    const l = (key: string) => CustomSensorPlugin.t_(`labels.${key}`);
    const s = (key: string) => CustomSensorPlugin.t_(`sections.${key}`);

    return html`
    <form id="custom-sensor-menu-form" class="kt-menu-body">
      <section class="kt-section">
        <div class="kt-section-label">${s('identity')}</div>
        <div class="kt-field-row">
          <div class="input-field col s12" data-position="top" data-delay="50" data-tooltip="${l('tooltipSensorName')}">
            <input id="cs-uiName" type="text" value="${l('defaultSensorName')}" />
            <label for="cs-uiName" class="active">${l('sensorName')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <select id="cs-type">
              <option value="Observer">${l('typeObserver')}</option>
              <option value="Optical">${l('typeOptical')}</option>
              <option value="Phased Array Radar">${l('typePhasedArray')}</option>
              <option value="Mechanical">${l('typeMechanical')}</option>
            </select>
            <label>${l('sensorType')}</label>
          </div>
        </div>
      </section>

      <section class="kt-section">
        <div class="kt-section-label">${s('location')}</div>
        <div class="kt-field-row">
          <div class="input-field col s6" data-position="top" data-delay="50" data-tooltip="${l('tooltipLatitude')}">
            <input id="cs-lat" type="text" value="0" />
            <label for="cs-lat" class="active">${l('latitude')}</label>
          </div>
          <div class="input-field col s6" data-position="top" data-delay="50" data-tooltip="${l('tooltipLongitude')}">
            <input id="cs-lon" type="text" value="0" />
            <label for="cs-lon" class="active">${l('longitude')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s12" data-position="top" data-delay="50" data-tooltip="${l('tooltipElevation')}">
            <input id="cs-hei" type="text" value="0" />
            <label for="cs-hei" class="active">${l('elevation')}</label>
          </div>
        </div>
      </section>

      <section class="kt-section">
        <div class="kt-section-label">${s('fieldOfView')}</div>
        <div class="switch row" data-position="top" data-delay="50" data-tooltip="${l('tooltipTelescope')}">
          <label>
            <input id="cs-telescope" type="checkbox" checked />
            <span class="lever"></span>
            ${l('telescope')}
          </label>
        </div>
        <div class="kt-field-row">
          <div id="cs-minaz-div" class="start-hidden input-field col s6" data-position="top" data-delay="50" data-tooltip="${l('tooltipMinAz')}">
            <input id="cs-minaz" type="text" value="0" />
            <label for="cs-minaz" class="active">${l('minAzimuth')}</label>
          </div>
          <div id="cs-maxaz-div" class="start-hidden input-field col s6" data-position="top" data-delay="50" data-tooltip="${l('tooltipMaxAz')}">
            <input id="cs-maxaz" type="text" value="360" />
            <label for="cs-maxaz" class="active">${l('maxAzimuth')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div id="cs-minel-div" class="start-hidden input-field col s6" data-position="top" data-delay="50" data-tooltip="${l('tooltipMinEl')}">
            <input id="cs-minel" type="text" value="10" />
            <label for="cs-minel" class="active">${l('minElevation')}</label>
          </div>
          <div id="cs-maxel-div" class="start-hidden input-field col s6" data-position="top" data-delay="50" data-tooltip="${l('tooltipMaxEl')}">
            <input id="cs-maxel" type="text" value="90" />
            <label for="cs-maxel" class="active">${l('maxElevation')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div id="cs-minrange-div" class="start-hidden input-field col s6" data-position="top" data-delay="50" data-tooltip="${l('tooltipMinRange')}">
            <input id="cs-minrange" type="text" value="100" />
            <label for="cs-minrange" class="active">${l('minRange')}</label>
          </div>
          <div id="cs-maxrange-div" class="start-hidden input-field col s6" data-position="top" data-delay="50" data-tooltip="${l('tooltipMaxRange')}">
            <input id="cs-maxrange" type="text" value="50000" />
            <label for="cs-maxrange" class="active">${l('maxRange')}</label>
          </div>
        </div>
      </section>

      <button id="cs-submit" type="submit" name="action" class="kt-action waves-effect">
        <span class="kt-action-label">${l('addCustomSensor')}</span>
      </button>
      <button id="cs-replace" type="button" name="action" class="kt-action waves-effect">
        <span class="kt-action-label">${l('replaceSensor')}</span>
      </button>
      <button id="cs-clear" type="button" name="action" class="kt-action waves-effect">
        <span class="kt-action-label">${l('clearCustomSensors')}</span>
      </button>
      <button id="cs-geolocation" type="button" name="search" class="kt-action waves-effect">
        <span class="kt-action-label">${l('useGeolocation')}</span>
      </button>
    </form>
    `;
  }

  private static buildRmbL1Html_(): string {
    return html`
    <li class="rmb-menu-item" id="create-rmb"><a href="#">${CustomSensorPlugin.t_('rmbMenu.title')} &#x27A4;</a></li>`;
  }

  private static buildRmbL2Html_(): string {
    const m = (key: string) => CustomSensorPlugin.t_(`rmbMenu.${key}`);

    return html`
    <ul class='dropdown-contents'>
      <li id="create-observer-rmb"><a href="#">${m('createObserver')}</a></li>
      <li id="create-sensor-rmb"><a href="#">${m('createSensor')}</a></li>
    </ul>`;
  }

  onContextMenuAction(targetId: string): void {
    const sensorManagerInstance = ServiceLocator.getSensorManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const mouseInputInstance = ServiceLocator.getInputManager().mouse;

    switch (targetId) {
      case 'create-observer-rmb':
        slideInRight(getEl('custom-sensor-menu'), 300);
        this.setBottomIconToSelected();
        sensorManagerInstance.isCustomSensorMenuOpen = true;
        if (!(<HTMLInputElement>getEl('cs-telescope')).checked) {
          getEl('cs-telescope')?.click();
        }
        CustomSensorPlugin.setFields_({
          'cs-uiName': 'Observer',
          'cs-lat': mouseInputInstance.latLon.lat.toString(),
          'cs-lon': mouseInputInstance.latLon.lon.toString(),
          'cs-hei': '0',
          'cs-type': 'Observer',
        });
        triggerSubmit(<HTMLFormElement>getEl('custom-sensor-menu-form'));
        catalogManagerInstance.satCruncherThread.sendSunlightViewToggle(true);
        waitForCruncher({
          cruncher: catalogManagerInstance.satCruncher,
          cb: () => {
            colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.colorSchemeInstances.SunlightColorScheme, true);
          },
          validationFunc: (data: PositionCruncherOutgoingMsg) => data.satInSun,
        });
        break;
      case 'create-sensor-rmb':
        {
          slideInRight(getEl('custom-sensor-menu'), 300);
          this.setBottomIconToSelected();
          sensorManagerInstance.isCustomSensorMenuOpen = true;
          if ((<HTMLInputElement>getEl('cs-telescope')).checked) {
            getEl('cs-telescope')!.click();
          }
          CustomSensorPlugin.setFields_({
            'cs-uiName': 'Custom Sensor',
            'cs-lat': mouseInputInstance.latLon.lat.toString(),
            'cs-lon': mouseInputInstance.latLon.lon.toString(),
            'cs-hei': '0',
            'cs-type': 'Phased Array Radar',
            'cs-minaz': '0',
            'cs-maxaz': '360',
            'cs-minel': '10',
            'cs-maxel': '90',
            'cs-minrange': '0',
            'cs-maxrange': '5556',
          });
          triggerSubmit(<HTMLFormElement>getEl('custom-sensor-menu-form'));
          const defaultColorScheme = colorSchemeManagerInstance.colorSchemeInstances[settingsManager.defaultColorScheme] ??
            Object.values(colorSchemeManagerInstance.colorSchemeInstances)[0];

          colorSchemeManagerInstance.setColorScheme(defaultColorScheme, true);
          catalogManagerInstance.satCruncherThread.sendSunlightViewToggle(false);
        }
        break;
      default:
        break;
    }
  }

  dragOptions: ClickDragOptions = {
    minWidth: 350,
    isDraggable: true,
  };


  getHelpConfig(): IHelpConfig {
    const t = (key: string): string => CustomSensorPlugin.t_(key);

    return {
      title: CustomSensorPlugin.t_('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t('help.overview'),
          image: {
            src: 'img/help/custom-sensor/custom-sensor-menu.png',
            alt: t('help.imgAlt'),
            caption: t('help.imgCaption'),
          },
        },
        {
          heading: t('help.fieldsHeading'),
          content: t('help.fields'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t('help.howToUse'),
        },
      ],
      tips: [t('help.tip1'), t('help.tip2')],
    };
  }

  /**
   * The submit path for the form. Wired by the base plugin (it sets
   * `submitCallback = () => onFormSubmit()` and registers it against
   * `custom-sensor-menu-form`), so both the Add button (type=submit) and the
   * Enter key reach this single handler.
   */
  onFormSubmit(): void {
    CustomSensorPlugin.processCustomSensorSubmit_();
    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
  }

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        CustomSensorPlugin.uiManagerFinal_();
      },
    );
  }

  private static uiManagerFinal_(): void {
    const menuRoot = getEl('custom-sensor-menu');

    menuRoot?.classList.add('kt-ui-v13');
    getEl('custom-sensor-menu-secondary', true)?.classList.add('kt-ui-v13');
    initMaterialSelects(menuRoot ?? document.body);

    CustomSensorPlugin.httpsCheck_();
    CustomSensorPlugin.addTelescopeClickListener_();
    CustomSensorPlugin.addReplaceCustomSensorListener_();
    CustomSensorPlugin.addClearCustomSensorListener_();
    CustomSensorPlugin.addSensorListRemoveListener_();
    // Render the (likely empty-state) list once so the panel is never blank.
    CustomSensorPlugin.updateCustomSensorListDom();
  }

  private static httpsCheck_() {
    if (location.protocol !== 'https:') {
      hideEl('cs-geolocation');
    } else {
      CustomSensorPlugin.addUseGeolocationListener_();
    }
  }

  private static addUseGeolocationListener_() {
    getEl('cs-geolocation')!.addEventListener('click', () => {
      UiGeolocation.useCurrentGeolocationAsSensor();
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
    });
  }

  private static addClearCustomSensorListener_() {
    getEl('cs-clear')!.addEventListener('click', () => {
      ServiceLocator.getSensorManager().clearSecondarySensors();
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
      CustomSensorPlugin.updateCustomSensorListDom();
    });
  }

  private static addReplaceCustomSensorListener_() {
    getEl('cs-replace')!.addEventListener('click', () => {
      CustomSensorPlugin.processCustomSensorSubmit_(true);
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
    });
  }

  /** Reads every form field into the DOM-free shape consumed by the core. */
  private static readForm_(): CustomSensorFormValues {
    const value = (id: string) => (<HTMLInputElement>getEl(id)).value;

    return {
      uiName: value('cs-uiName'),
      type: value('cs-type'),
      lat: parseFloat(value('cs-lat')),
      lon: parseFloat(value('cs-lon')),
      alt: parseFloat(value('cs-hei')),
      minAz: parseFloat(value('cs-minaz')),
      maxAz: parseFloat(value('cs-maxaz')),
      minEl: parseFloat(value('cs-minel')),
      maxEl: parseFloat(value('cs-maxel')),
      minRng: parseFloat(value('cs-minrange')),
      maxRng: parseFloat(value('cs-maxrange')),
    };
  }

  /** Sets the value of any form fields named in the map (missing ones are skipped). */
  private static setFields_(fields: Record<string, string>) {
    for (const [id, value] of Object.entries(fields)) {
      const el = getEl(id, true) as HTMLInputElement | null;

      if (el) {
        el.value = value;
      }
    }
  }

  private static processCustomSensorSubmit_(isReplaceSensor = false) {
    const sensorManagerInstance = ServiceLocator.getSensorManager();
    const values = CustomSensorPlugin.readForm_();
    const errorKey = validateCustomSensor(values);

    if (errorKey) {
      errorManagerInstance.warn(CustomSensorPlugin.t_(`errorMsgs.${errorKey}`));

      return;
    }

    const randomUUID = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Only update the (SensorInfo) primary-sensor info DOM if this will become the
    // primary sensor. addSecondarySensor -> setSensor handles it for real primaries.
    if (!sensorManagerInstance.isSensorSelected() || isReplaceSensor) {
      CustomSensorPlugin.updatePrimarySensorInfoDom_(values.uiName);
    }

    sensorManagerInstance.addSecondarySensor(new DetailedSensor(buildCustomSensorParams(values, randomUUID)), isReplaceSensor);

    CustomSensorPlugin.updateCustomSensorListDom();
  }

  /**
   * Reflects the new custom sensor into the SensorInfo menu's read-only fields.
   * Those IDs belong to SensorInfoPlugin, which may not be loaded, so every write
   * is guarded (`getEl(id, true)`) instead of assuming the element exists.
   */
  private static updatePrimarySensorInfoDom_(uiName: string) {
    const sensorTypeDom = getEl('sensor-type', true) as HTMLInputElement | null;

    if (sensorTypeDom) {
      sensorTypeDom.value = (<HTMLInputElement>getEl('cs-type')).value.replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
    }

    const sensorInfoTitleDom = getEl('sensor-info-title', true);

    if (sensorInfoTitleDom) {
      sensorInfoTitleDom.textContent = uiName;
    }

    const sensorCountryDom = getEl('sensor-country', true);

    if (sensorCountryDom) {
      sensorCountryDom.textContent = 'Custom Sensor';
    }
  }

  private static updateCustomSensorListDom() {
    const l = (key: string) => CustomSensorPlugin.t_(`sensorList.${key}`);
    const sensorManagerInstance = ServiceLocator.getSensorManager();
    const primarySensor = sensorManagerInstance.currentSensors[0]?.objName?.startsWith('Custom Sensor')
      ? [sensorManagerInstance.currentSensors[0]]
      : [] as DetailedSensor[];
    const sensors = primarySensor.concat(sensorManagerInstance.secondarySensors);

    setInnerHtml('custom-sensors-sensor-list', renderCustomSensorList(sensors, l, bookmarkRemovePng));
  }

  /**
   * One delegated listener for the secondary list's remove icons, wired once.
   * The list HTML is rebuilt on every change, so per-row listeners would either
   * leak or need re-binding; delegation against the stable container avoids both.
   */
  private static addSensorListRemoveListener_() {
    getEl('custom-sensors-sensor-list', true)?.addEventListener('click', (e) => {
      const removeBtn = (e.target as HTMLElement).closest('.remove-sensor') as HTMLElement | null;

      if (!removeBtn) {
        return;
      }
      e.preventDefault();
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
      const sensorManagerInstance = ServiceLocator.getSensorManager();
      const sensor = sensorManagerInstance.getSensorByObjName(removeBtn.dataset.id);

      sensorManagerInstance.removeSensor(sensor);
      CustomSensorPlugin.updateCustomSensorListDom();
    });
  }

  private static addTelescopeClickListener_() {
    getEl('cs-telescope')!.addEventListener('click', () => {
      // If it is checked
      if ((<HTMLInputElement>getEl('cs-telescope')).checked) {
        getEl('cs-minaz-div')!.style.display = 'none';
        getEl('cs-maxaz-div')!.style.display = 'none';
        getEl('cs-minel-div')!.style.display = 'none';
        getEl('cs-maxel-div')!.style.display = 'none';
        getEl('cs-minrange-div')!.style.display = 'none';
        getEl('cs-maxrange-div')!.style.display = 'none';
        CustomSensorPlugin.setFields_({
          'cs-minaz': '0',
          'cs-maxaz': '360',
          'cs-minel': '10',
          'cs-maxel': '90',
          'cs-minrange': '100',
          'cs-maxrange': '1000000',
        });
      } else {
        getEl('cs-minaz-div')!.style.display = 'block';
        getEl('cs-maxaz-div')!.style.display = 'block';
        getEl('cs-minel-div')!.style.display = 'block';
        getEl('cs-maxel-div')!.style.display = 'block';
        getEl('cs-minrange-div')!.style.display = 'block';
        getEl('cs-maxrange-div')!.style.display = 'block';

        const sensorManagerInstance = ServiceLocator.getSensorManager();

        if (sensorManagerInstance.isSensorSelected()) {
          CustomSensorPlugin.setFields_({
            'cs-minaz': sensorManagerInstance.currentSensors[0].minAz.toString(),
            'cs-maxaz': sensorManagerInstance.currentSensors[0].maxAz.toString(),
            'cs-minel': sensorManagerInstance.currentSensors[0].minEl.toString(),
            'cs-maxel': sensorManagerInstance.currentSensors[0].maxEl.toString(),
            'cs-minrange': sensorManagerInstance.currentSensors[0].minRng.toString(),
            'cs-maxrange': sensorManagerInstance.currentSensors[0].maxRng.toString(),
          });
        }
      }
    });
  }
}
