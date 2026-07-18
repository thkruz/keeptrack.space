/* eslint-disable max-lines */
import { country2flagIcon } from '@app/app/data/catalogs/countries';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { SoundNames } from '@app/engine/audio/sounds';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';
import { DraggableBox } from '@app/engine/ui/draggable-box';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, setInnerHtml, showEl } from '@app/engine/utils/get-el';
import { KeepTrack } from '@app/keeptrack';
import { t7e } from '@app/locales/keys';
import { BaseObject, CatalogSource, Satellite } from '@ootk/src/main';
import bookmarkAddPng from '@public/img/icons/bookmark-add.png';
import bookmarkRemovePng from '@public/img/icons/bookmark-remove.png';
import Draggabilly from 'draggabilly';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { CONTAINER_ID, EL, SECTIONS } from './sat-info-box-html';
import './sat-info-box.css';

/**
 * This class controls all the functionality of the satellite info box.
 * There are select events and update events that are registered to the Event Bus.
 */
export class SatInfoBox extends KeepTrackPlugin {
  readonly id = 'SatInfoBox';
  dependencies_: string[] = [SelectSatManager.name];

  /** Maximum number of 500 ms retries while waiting for the info box HTML to be ready. */
  private static readonly MAX_HTML_READY_RETRIES_ = 20;

  static readonly containerId_ = 'sat-infobox';
  private readonly infoBoxElements_: {
    html: string | null;
    order: number;
  }[] = [];
  private isVisible_ = false;
  private isHtmlReady_ = false;

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'i',
        callback: () => this.toggle(),
      },
    ];
  }

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(EventBusEvent.onWatchlistUpdated, (watchlistList: { id: number; inView: boolean }[]) => {
      const isOnList = watchlistList.some(({ id }) => id === PluginRegistry.getPlugin(SelectSatManager)!.selectedSat);
      const toggleEl = getEl('sat-watchlist-toggle', true) as HTMLImageElement | null;

      if (toggleEl) {
        if (isOnList) {
          toggleEl.src = bookmarkRemovePng;
          toggleEl.classList.replace('off-watchlist', 'on-watchlist');
        } else {
          toggleEl.src = bookmarkAddPng;
          toggleEl.classList.replace('on-watchlist', 'off-watchlist');
        }
      }
    });

    EventBus.getInstance().on(EventBusEvent.selectSatData, this.updateHeaderData_.bind(this));

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
    const bottomMenuTop = parseFloat(document.documentElement.style.getPropertyValue('--bottom-menu-top')) || 0;

    document.documentElement.style.setProperty('--search-box-bottom', `${searchBoxHeight + bottomMenuTop}px`);
  }

  addListenerToCollapseElement(section: HTMLElement | null, isCollapsedRef?: { value: boolean }): void {
    const collapseEl = getEl(`${section?.id}-collapse`);
    const collapseElParent = getEl(`${section?.id}-collapse`)?.parentElement;

    if (!collapseEl || !collapseElParent || !section) {
      return;
    }

    collapseElParent.addEventListener('click', () => {
      section.classList.toggle('collapsed');
      collapseEl.classList.toggle('collapse-closed');

      // Optional legacy ref support for callers that still track collapse state externally
      if (isCollapsedRef) {
        isCollapsedRef.value = !isCollapsedRef.value;
      }

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

        getEl('search-results')!.style.maxHeight = '85%';
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

    this.addListenerToCollapseElement(getEl(`${SECTIONS.IDENTIFIERS}`));
    this.addCopyListeners_();

    EventBus.getInstance().emit(EventBusEvent.satInfoBoxAddListeners);
  }

  /** Wires the click-to-copy behavior on the NORAD and COSPAR identifier values. */
  private addCopyListeners_(): void {
    [EL.OBJNUM, EL.INTL_DES].forEach((elementId) => {
      getEl(elementId, true)?.addEventListener(
        'click',
        this.withClickSound(() => this.copyIdentifier_(elementId))
      );
    });
  }

  /**
   * Copies the displayed identifier value to the clipboard and confirms with a toast.
   * Skips empty or "not available" values and degrades gracefully when the
   * Clipboard API is unavailable (e.g. insecure contexts or older browsers).
   */
  private copyIdentifier_(elementId: string): void {
    const value = getEl(elementId, true)?.textContent?.trim() ?? '';
    const notAvailable = t7e('satInfoBox.notAvailable' as Parameters<typeof t7e>[0]);

    if (!value || value === notAvailable) {
      return;
    }

    // Feature-detect: jsdom and insecure contexts do not provide navigator.clipboard
    if (!navigator.clipboard?.writeText) {
      return;
    }

    navigator.clipboard
      .writeText(value)
      .then(() => {
        const message = t7e('satInfoBox.copy.copied' as Parameters<typeof t7e>[0]);

        ServiceLocator.getUiManager().toast(message, ToastMsgType.normal);
      })
      .catch(() => {
        // Clipboard write was rejected (e.g. permissions); nothing to clean up
      });
  }

  private createContainer(): void {
    const plugin = PluginRegistry.getPlugin(SatInfoBox)!;

    plugin.addElement({ html: this.createHeader(), order: 0 });
    plugin.addElement({ html: this.createIdentifiersSection(), order: 2 });
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
      `
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
          <div class="sat-info-value sat-info-copyable" id="${EL.INTL_DES}"
            kt-tooltip="${t7e('satInfoBox.copy.tooltip' as Parameters<typeof t7e>[0])}">xxxx-xxxA</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" kt-tooltip="${t7e('satInfoBox.Norad.tooltip')}">${t7e('satInfoBox.Norad.label')}</div>
          <div class="sat-info-value sat-info-copyable" id="${EL.OBJNUM}"
            kt-tooltip="${t7e('satInfoBox.copy.tooltip' as Parameters<typeof t7e>[0])}">99999</div>
        </div>
        ${
          settingsManager.plugins.SatInfoBoxObject?.isShowAltName !== false
            ? html`
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" kt-tooltip="${t7e('satInfoBox.AltName.tooltip')}">${t7e('satInfoBox.AltName.label')}</div>
          <div class="sat-info-value" id="${EL.ALT_NAME}">Alt Name</div>
        </div>`
            : ''
        }
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

  /**
   * Show or hide an optional alternate-identity field (alt name / alt id) and,
   * when shown, set its value. No-op if the element or its parent is missing.
   */
  private static updateAltField_(elId: string, isVisible: boolean, value: string): void {
    const el = getEl(elId, true);

    if (!el?.parentElement) {
      return;
    }

    if (isVisible) {
      showEl(el.parentElement, 'flex');
      el.innerHTML = value;
    } else {
      hideEl(el.parentElement);
    }
  }

  private updateHeaderData_(obj: BaseObject, retries = 0): void {
    if (!obj || obj.isStatic() || obj.isSensor()) {
      return;
    }

    if (!this.isHtmlReady_) {
      if (retries >= SatInfoBox.MAX_HTML_READY_RETRIES_) {
        errorManagerInstance.warn('SatInfoBox HTML never became ready; giving up on header update');

        return;
      }
      setTimeout(() => this.updateHeaderData_(obj, retries + 1), 500);

      return;
    }

    const isShowAltName = settingsManager.plugins.SatInfoBoxObject?.isShowAltName !== false;
    const isHasAltName: boolean = isShowAltName && !!((obj as Satellite)?.altName && (obj as Satellite).altName !== '');
    const isHasAltId: boolean = !!((obj as Satellite)?.altId && (obj as Satellite).altId !== '');

    setInnerHtml(EL.NAME, obj.name);

    if (obj instanceof Satellite || obj instanceof OemSatellite) {
      KeepTrack.getInstance()
        .containerRoot.querySelectorAll('.sat-only-info')
        ?.forEach((el) => {
          (<HTMLElement>el).style.display = 'flex';
        });
    }

    const flagEl = getEl(EL.FLAG, true);

    if (flagEl) {
      const countryCode = obj instanceof OemSatellite ? obj.country : (obj as Satellite).country;
      const sccNum5 = obj instanceof OemSatellite ? obj.sccNum5 : (obj as Satellite).sccNum5;

      if (obj.isSatellite() && sccNum5 === '25544') {
        flagEl.classList.value = 'fi fi-iss';
      } else {
        flagEl.classList.value = `fi ${country2flagIcon(countryCode)}`;
      }
    }

    SatInfoBox.updateAltField_(EL.ALT_NAME, isHasAltName, (obj as Satellite).altName);
    SatInfoBox.updateAltField_(EL.ALT_ID, isHasAltId, (obj as Satellite).altId);

    /*
     * TODO:
     * getEl('edit-satinfo-link').innerHTML = "<a class='iframe' href='editor.htm?scc=" + sat.sccNum + "&popup=true'>Edit Satellite Info</a>";
     */

    const notAvailable = t7e('satInfoBox.notAvailable' as Parameters<typeof t7e>[0]);

    if (obj.isMissile()) {
      setInnerHtml(EL.INTL_DES, notAvailable);
      setInnerHtml(EL.OBJNUM, notAvailable);
      setInnerHtml(EL.SOURCE, notAvailable);
    } else if (obj instanceof OemSatellite) {
      const oemSat = obj as OemSatellite;

      setInnerHtml(EL.INTL_DES, oemSat.intlDes || notAvailable);
      setInnerHtml(EL.OBJNUM, oemSat.sccNum || notAvailable);
      setInnerHtml(EL.SOURCE, oemSat.source || t7e('satInfoBox.oemFile' as Parameters<typeof t7e>[0]));
    } else {
      const sat = obj as Satellite;

      setInnerHtml(EL.INTL_DES, sat.intlDes === 'none' ? notAvailable : sat.intlDes);
      if (sat.source && sat.source === CatalogSource.VIMPEL) {
        setInnerHtml(EL.OBJNUM, notAvailable);
        setInnerHtml(EL.INTL_DES, notAvailable);
      } else {
        setInnerHtml(EL.OBJNUM, sat.sccNum);
        // satObjNumDom.setAttribute('data-tooltip', `${FormatTle.convert6DigitToA5(sat.sccNum)}`);
      }

      setInnerHtml(EL.SOURCE, SatInfoBox.formatSourceName_(sat.source ?? CatalogSource.CELESTRAK));

      this.updateConfidenceDom_(sat);
    }
  }

  private static readonly SOURCE_DISPLAY_NAMES_: Record<string, string> = {
    [CatalogSource.USSF]: 'USSF',
    [CatalogSource.CELESTRAK]: 'CelesTrak',
    [CatalogSource.CELESTRAK_SUP]: 'CelesTrak Supplemental',
    [CatalogSource.UNIV_OF_MICH]: 'University of Michigan',
    [CatalogSource.CALPOLY]: 'Cal Poly',
    [CatalogSource.NUSPACE]: 'NuSpace',
    [CatalogSource.VIMPEL]: 'Vimpel',
    [CatalogSource.SATNOGS]: 'SatNOGS',
    [CatalogSource.TLE_TXT]: 'TLE.txt',
    [CatalogSource.EXTRA_JSON]: 'extra.json',
  };

  private static formatSourceName_(source: string): string {
    return SatInfoBox.SOURCE_DISPLAY_NAMES_[source] ?? source;
  }

  private updateConfidenceDom_(sat: Satellite) {
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
        text = t7e('satInfoBox.Confidence.external' as Parameters<typeof t7e>[0]);
        color = 'gray';
      } else if (confidenceScore >= 7) {
        text = `${t7e('satInfoBox.Confidence.high' as Parameters<typeof t7e>[0])} (${confidenceScore})`;
        color = 'green';
      } else if (confidenceScore >= 4) {
        text = `${t7e('satInfoBox.Confidence.medium' as Parameters<typeof t7e>[0])} (${confidenceScore})`;
        color = 'orange';
      } else {
        text = `${t7e('satInfoBox.Confidence.low' as Parameters<typeof t7e>[0])} (${confidenceScore})`;
        color = 'red';
      }

      confidenceDom.innerHTML = text;
      confidenceDom.style.color = color;
    }
  }

  private selectSat_(satInfoBox: SatInfoBox, obj?: BaseObject, retries = 0): void {
    if (!obj) {
      return;
    }

    if (obj.isSensor()) {
      return;
    }

    if (!this.isHtmlReady_) {
      if (retries >= SatInfoBox.MAX_HTML_READY_RETRIES_) {
        errorManagerInstance.warn('SatInfoBox HTML never became ready; giving up on select update');

        return;
      }
      setTimeout(() => this.selectSat_(satInfoBox, obj, retries + 1), 500);

      return;
    }

    satInfoBox.show();

    const satInfoBoxDom = getEl(SatInfoBox.containerId_);
    // Get the height of the DOM
    const searchBoxHeight = (ServiceLocator.getUiManager().searchManager.isResultsOpen ? satInfoBoxDom?.getBoundingClientRect().height : 0) ?? 0;
    const bottomMenuTop = parseFloat(document.documentElement.style.getPropertyValue('--bottom-menu-top')) || 0;
    const curVal = document.documentElement.style.getPropertyValue('--search-box-bottom');

    if (curVal !== `${searchBoxHeight + bottomMenuTop}px`) {
      document.documentElement.style.setProperty('--search-box-bottom', `${searchBoxHeight + bottomMenuTop}px`);
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
      }
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
      }
    );

    const satIdentifierData = getEl('sat-identifier-data', true);

    if (satIdentifierData) {
      satIdentifierData.style.display = 'block';
    }
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
    EventBus.getInstance().emit(EventBusEvent.satInfoBoxShown);
  }

  toggle(): void {
    if (this.isVisible_) {
      this.hide();
    } else {
      this.show();
    }
  }
}
