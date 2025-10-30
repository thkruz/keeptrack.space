import { t7e } from '@app/locales/keys';
import Draggabilly from 'draggabilly';
/* eslint-disable max-lines */
import { country2flagIcon } from '@app/app/data/catalogs/countries';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { DraggableBox } from '@app/engine/ui/draggable-box';
import { html } from '@app/engine/utils/development/formatter';
import { getEl, hideEl, setInnerHtml, showEl } from '@app/engine/utils/get-el';
import { KeepTrack } from '@app/keeptrack';
import { BaseObject, CatalogSource, DetailedSatellite } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/sounds';
import { CONTAINER_ID, EL, SECTIONS } from './sat-info-box-html';
import './sat-info-box.css';

/**
 * This class controls all the functionality of the satellite info box.
 * There are select events and update events that are registered to the Event Bus.
 */
export class SatInfoBox extends KeepTrackPlugin {
  readonly id = 'SatInfoBox';
  dependencies_: string[] = [SelectSatManager.name];

  private readonly isIdentifiersSectionCollapsed_ = false;

  static readonly containerId_ = 'sat-infobox';
  private readonly infoBoxElements_: {
    html: string | null;
    order: number;
  }[] = [];
  private isVisible_ = false;
  private isHtmlReady_ = false;

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(
      EventBusEvent.onWatchlistUpdated,
      (watchlistList: { id: number, inView: boolean }[]) => {
        let isOnList = false;

        watchlistList.forEach(({ id }) => {
          if (id === PluginRegistry.getPlugin(SelectSatManager)!.selectedSat) {
            isOnList = true;
          }
        });

        const addRemoveWatchlistDom = getEl('sat-add-watchlist', true);

        /*
         * TODO: There should be a placeholder on the left side to keep the
         * satellite name centered when the add/remove watchlist icon is not shown.
         */
        if (addRemoveWatchlistDom) {
          if (isOnList) {
            (<HTMLImageElement>getEl('sat-remove-watchlist')).style.display = 'block';
            (<HTMLImageElement>getEl('sat-add-watchlist')).style.display = 'none';
          } else {
            (<HTMLImageElement>getEl('sat-add-watchlist')).style.display = 'block';
            (<HTMLImageElement>getEl('sat-remove-watchlist')).style.display = 'none';
          }
        }
      },
    );

    EventBus.getInstance().on(EventBusEvent.selectSatData, this.updateHeaderData_.bind(this));

    EventBus.getInstance().on(EventBusEvent.KeyDown, this.onKeyDownLowerI_.bind(this));
    EventBus.getInstance().on(EventBusEvent.selectSatData, (obj?: BaseObject) => this.selectSat_(this, obj));
  }

  addElement(element: { html: string | null; order: number }): void {
    this.infoBoxElements_.push(element);
  }

  getElements(): { html: string | null; order: number }[] {
    return this.infoBoxElements_.sort((a, b) => a.order - b.order);
  }

  withClickSound<T extends unknown[]>(handler: (...args: T) => unknown): (...args: T) => unknown {
    return (...args: T) => {
      // This code will run before the handler
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);

      return handler.apply(this, args);
    };
  }

  initPosition(satInfoboxDom: HTMLElement | null, isShow = true) {
    if (!satInfoboxDom) {
      return;
    }

    satInfoboxDom.classList.remove('satinfo-fixed');
    satInfoboxDom.removeAttribute('style');

    if (isShow) {
      satInfoboxDom.style.display = 'block';
    }

    const searchBoxHeight = satInfoboxDom?.getBoundingClientRect().height ?? 0;
    const bottomMenuTopVar = document.documentElement.style.getPropertyValue('--bottom-menu-top').split('px')[0];

    document.documentElement.style.setProperty('--search-box-bottom', `${searchBoxHeight + bottomMenuTopVar}px`);
  }

  addListenerToCollapseElement(section: HTMLElement | null, isCollapsedRef: { value: boolean }): void {
    const collapseEl = getEl(`${section?.id}-collapse`);
    const collapseElParent = getEl(`${section?.id}-collapse`)?.parentElement;

    if (!collapseEl || !collapseElParent || !section) {
      return;
    }

    collapseElParent.addEventListener('click', () => {
      section.classList.toggle('collapsed');
      collapseEl.classList.toggle('collapse-closed');
      isCollapsedRef.value = !isCollapsedRef.value;

      if (collapseEl.classList.contains('collapse-closed')) {
        collapseEl.textContent = 'expand_more';
      } else {
        collapseEl.textContent = 'expand_less';
      }
    });
  }

  private initDraggabilly() {
    if (!settingsManager.isMobileModeEnabled) {
      const draggie = new Draggabilly(getEl(SatInfoBox.containerId_)!, {
        containment: KeepTrack.getInstance().containerRoot,
      });

      draggie.on('dragStart', () => {
        const satInfoBoxElement = getEl(SatInfoBox.containerId_)!;

        satInfoBoxElement.style.height = 'fit-content';
        satInfoBoxElement.style.maxHeight = '80%';
        document.documentElement.style.setProperty('--search-box-bottom', '0px');
        satInfoBoxElement.classList.remove('satinfo-fixed');

        getEl('search-results')!.style.maxHeight = '80%';
      });

      draggie.on('pointerDown', () => {
        getEl(SatInfoBox.containerId_)!.style.zIndex = DraggableBox.increaseMaxZIndex().toString();
      });
    }

    // If right click kill and reinit
    const satInfobox = getEl(SatInfoBox.containerId_)!;

    satInfobox.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 2) {
        this.initPosition(satInfobox);
        getEl('search-results')!.style.maxHeight = '';
        getEl(SatInfoBox.containerId_)!.style.zIndex = DraggableBox.increaseMaxZIndex().toString();
      }
    });
  }

  private uiManagerFinal_(): void {
    this.createContainer(); // This is run during the uiManagerFinal event to ensure the rest of the DOM is ready

    // Now that is is loaded, reset the sizing and location
    this.initPosition(getEl(SatInfoBox.containerId_), false);

    this.addListenerToCollapseElement(getEl(`${SECTIONS.IDENTIFIERS}`), { value: this.isIdentifiersSectionCollapsed_ });

    EventBus.getInstance().emit(EventBusEvent.satInfoBoxAddListeners);
  }

  private createContainer(): void {
    const plugin = PluginRegistry.getPlugin(SatInfoBox)!;

    plugin.addElement({ html: this.createHeader(), order: 0 });
    plugin.addElement({ html: this.createIdentifiersSection(), order: 3 });
    // Make sure we have all the dynamic html elements before getting the order
    EventBus.getInstance().emit(EventBusEvent.satInfoBoxInit);

    const elements = plugin.getElements();

    getEl('canvas-holder')?.insertAdjacentHTML(
      'beforeend',
      html`
        <div id="${CONTAINER_ID}" class="text-select satinfo-fixed start-hidden">
          ${elements
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((el) => el.html ?? '')
          .join('')}
        </div>
      `,
    );

    EventBus.getInstance().emit(EventBusEvent.satInfoBoxFinal);

    // Create a Sat Info Box Initializing Script
    this.initDraggabilly();

    this.isHtmlReady_ = true;
  }

  private createHeader(): string {
    return html`
      <div id="${EL.CONTAINER}">
        <div id="${EL.TITLE}" class="center-text">
          <span id="${EL.NAME}">This is a title</span>
          <span id="${EL.FLAG}" class="fi"></span>
        </div>
      </div>
    `;
  }

  private createIdentifiersSection(): string {
    return html`
      <div id="${SECTIONS.IDENTIFIERS}">
        <div class="sat-info-section-header">
          <span>${t7e('satInfoBox.title')}</span>
          <span id="${SECTIONS.IDENTIFIERS}-collapse" class="section-collapse material-icons">expand_less</span>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" kt-tooltip="${t7e('satInfoBox.Cospar.tooltip')}">${t7e('satInfoBox.Cospar.label')}</div>
          <div class="sat-info-value" id="${EL.INTL_DES}">xxxx-xxxA</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" kt-tooltip="${t7e('satInfoBox.Norad.tooltip')}">${t7e('satInfoBox.Norad.label')}</div>
          <div class="sat-info-value" id="${EL.OBJNUM}">99999</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" kt-tooltip="${t7e('satInfoBox.AltName.tooltip')}">${t7e('satInfoBox.AltName.label')}</div>
          <div class="sat-info-value" id="${EL.ALT_NAME}">Alt Name</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" kt-tooltip="${t7e('satInfoBox.AltId.tooltip')}">${t7e('satInfoBox.AltId.label')}</div>
          <div class="sat-info-value" id="${EL.ALT_ID}">99999</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" kt-tooltip="${t7e('satInfoBox.Source.tooltip')}">${t7e('satInfoBox.Source.label')}</div>
          <div class="sat-info-value" id="${EL.SOURCE}">USSF</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" kt-tooltip="${t7e('satInfoBox.Confidence.tooltip')}">${t7e('satInfoBox.Confidence.label')}</div>
          <div class="sat-info-value" id="${EL.CONFIDENCE}">High</div>
        </div>
      </div>
    `;
  }

  private updateHeaderData_(obj: BaseObject): void {
    if (!obj || obj.isStatic() || obj.isSensor()) {
      return;
    }

    if (!this.isHtmlReady_) {
      setTimeout(() => this.updateHeaderData_(obj), 500);

      return;
    }

    const isHasAltName: boolean = !!((obj as DetailedSatellite)?.altName && (obj as DetailedSatellite).altName !== '');
    const isHasAltId: boolean = !!((obj as DetailedSatellite)?.altId && (obj as DetailedSatellite).altId !== '');

    setInnerHtml(EL.NAME, obj.name);

    if (obj instanceof DetailedSatellite) {
      KeepTrack.getInstance().containerRoot.querySelectorAll('.sat-only-info')?.forEach((el) => {
        (<HTMLElement>el).style.display = 'flex';
      });
    }

    const flagEl = getEl(EL.FLAG, true);

    if (flagEl) {
      if (obj.isSatellite() && (obj as DetailedSatellite).sccNum5 === '25544') {
        flagEl.classList.value = 'fi fi-iss';
      } else {
        flagEl.classList.value = `fi ${country2flagIcon((obj as DetailedSatellite).country)}`;
      }
    }

    if (isHasAltName) {
      const altNameEl = getEl(EL.ALT_NAME, true);

      if (altNameEl && altNameEl.parentElement) {
        showEl(altNameEl.parentElement, 'flex');
        altNameEl.innerHTML = (obj as DetailedSatellite).altName;
      }
    } else {
      const altNameEl = getEl(EL.ALT_NAME, true);

      if (altNameEl && altNameEl.parentElement) {
        hideEl(altNameEl.parentElement);
      }
    }

    if (isHasAltId) {
      const altIdEl = getEl(EL.ALT_ID, true);

      if (altIdEl && altIdEl.parentElement) {
        showEl(altIdEl.parentElement, 'flex');
        altIdEl.innerHTML = (obj as DetailedSatellite).altId;
      }
    } else {
      const altIdEl = getEl(EL.ALT_ID, true);

      if (altIdEl && altIdEl.parentElement) {
        hideEl(altIdEl.parentElement);
      }
    }

    /*
     * TODO:
     * getEl('edit-satinfo-link').innerHTML = "<a class='iframe' href='editor.htm?scc=" + sat.sccNum + "&popup=true'>Edit Satellite Info</a>";
     */

    if (obj.isMissile() || obj instanceof OemSatellite) {
      setInnerHtml(EL.INTL_DES, 'N/A');
      setInnerHtml(EL.OBJNUM, 'N/A');
      setInnerHtml(EL.SOURCE, 'N/A');
    } else {
      const sat = obj as DetailedSatellite;

      setInnerHtml(EL.INTL_DES, sat.intlDes === 'none' ? 'N/A' : sat.intlDes);
      if (sat.source && sat.source === CatalogSource.VIMPEL) {
        setInnerHtml(EL.OBJNUM, 'N/A');
        setInnerHtml(EL.INTL_DES, 'N/A');
      } else {
        setInnerHtml(EL.OBJNUM, sat.sccNum);
        // satObjNumDom.setAttribute('data-tooltip', `${FormatTle.convert6DigitToA5(sat.sccNum)}`);
      }

      setInnerHtml(EL.SOURCE, sat.source || CatalogSource.CELESTRAK);

      this.updateConfidenceDom_(sat);
    }
  }

  private updateConfidenceDom_(sat: DetailedSatellite) {
    if (!sat || sat.isStatic() || sat.isSensor()) {
      return;
    }

    let color = '';
    let text = '';

    const confidenceDom = getEl(EL.CONFIDENCE);

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

  private selectSat_(satInfoBox: SatInfoBox, obj?: BaseObject): void {
    if (!obj) {
      return;
    }

    if (obj.isSensor()) {
      return;
    }

    satInfoBox.show();

    const satInfoBoxDom = getEl(SatInfoBox.containerId_);
    // Get the height of the DOM
    const searchBoxHeight = ServiceLocator.getUiManager().searchManager.isResultsOpen ? satInfoBoxDom?.getBoundingClientRect().height : 0;
    const bottomMenuTopVar = document.documentElement.style.getPropertyValue('--bottom-menu-top').split('px')[0];
    const curVal = document.documentElement.style.getPropertyValue('--search-box-bottom');

    if (curVal !== `${searchBoxHeight + bottomMenuTopVar}px`) {
      document.documentElement.style.setProperty('--search-box-bottom', `${searchBoxHeight + bottomMenuTopVar}px`);
    }

    if (obj.isSatellite()) {
      this.setSatInfoBoxSatellite_();
    } else {
      this.setSatInfoBoxMissile_();
    }
  }

  private setSatInfoBoxMissile_() {
    // TODO: There is an interdependency with SatCoreInfoBox and SelectSatManager.
    ['sat-apogee', 'sat-perigee', 'sat-inclination', 'sat-eccentricity', 'sat-raan', 'sat-argPe', 'sat-stdmag', 'sat-configuration', 'sat-elset-age', 'sat-period'].forEach(
      (id) => {
        const el = getEl(id, true);

        if (!el?.parentElement) {
          return;
        }
        hideEl(el.parentElement);
      },
    );

    const satMissionData = getEl('sat-mission-data', true);

    if (satMissionData) {
      satMissionData.style.display = 'none';
    }

    const satIdentifierData = getEl('sat-identifier-data', true);

    if (satIdentifierData) {
      satIdentifierData.style.display = 'none';
    }
  }

  private setSatInfoBoxSatellite_() {
    // TODO: There is an interdependency with SatCoreInfoBox and SelectSatManager.
    ['sat-apogee', 'sat-perigee', 'sat-inclination', 'sat-eccentricity', 'sat-raan', 'sat-argPe', 'sat-stdmag', 'sat-configuration', 'sat-elset-age', 'sat-period'].forEach(
      (id) => {
        const el = getEl(id, true);

        if (!el?.parentElement) {
          return;
        }
        el.parentElement.style.display = 'flex';
      },
    );

    const satIdentifierData = getEl('sat-identifier-data', true);

    if (satIdentifierData) {
      satIdentifierData.style.display = 'block';
    }
  }

  private onKeyDownLowerI_(key: string): void {
    if (key !== 'i') {
      return;
    }

    this.toggle();
  }

  hide(): void {
    hideEl(SatInfoBox.containerId_);
    this.isVisible_ = false;
  }

  show(): void {
    if (PluginRegistry.getPlugin(SelectSatManager)!.primarySatObj.id === -1) {
      return;
    }
    showEl(SatInfoBox.containerId_);
    this.isVisible_ = true;
  }

  toggle(): void {
    if (this.isVisible_) {
      this.hide();
    } else {
      this.show();
    }
  }
}
