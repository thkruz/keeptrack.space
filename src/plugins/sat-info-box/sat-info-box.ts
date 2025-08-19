import Draggabilly from 'draggabilly';
/* eslint-disable max-lines */
import { country2flagIcon } from '@app/catalogs/countries';
import { KeepTrackApiEvents } from '@app/interfaces';
import { InputEventType, keepTrackApi } from '@app/keepTrackApi';
import { getEl, hideEl, showEl } from '@app/lib/get-el';
import { BaseObject, CatalogSource, DetailedSatellite } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/sounds';
import './sat-info-box.css';

const CONTAINER_ID = 'sat-infobox';

// Section IDs
const SECTIONS = {
  IDENTIFIERS: 'sat-identifier-data',
};

export const EL = { // DOM element IDs organized by section
  // Header elements
  CONTAINER: 'sat-info-header',
  TITLE: 'sat-info-title',
  NAME: 'sat-info-title-name',
  FLAG: 'sat-infobox-fi',

  // Identifier elements
  INTL_DES: 'sat-intl-des',
  OBJNUM: 'sat-objnum',
  ALT_NAME: 'sat-alt-name',
  ALT_ID: 'sat-alt-id',
  SOURCE: 'sat-source',
  CONFIDENCE: 'sat-confidence',
};

/**
 * This class controls all the functionality of the satellite info box.
 * There are select events and update events that are registered to the keepTrackApi.
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

  addHtml(): void {
    super.addHtml();

    keepTrackApi.on(KeepTrackApiEvents.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.on(
      KeepTrackApiEvents.onWatchlistUpdated,
      (watchlistList: { id: number, inView: boolean }[]) => {
        let isOnList = false;

        watchlistList.forEach(({ id }) => {
          if (id === keepTrackApi.getPlugin(SelectSatManager)!.selectedSat) {
            isOnList = true;
          }
        });

        const addRemoveWatchlistDom = getEl('sat-add-watchlist');

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

    keepTrackApi.on(KeepTrackApiEvents.selectSatData, this.updateHeaderData_.bind(this));

    keepTrackApi.on(InputEventType.KeyDown, this.onKeyDownLowerI_.bind(this));
    keepTrackApi.on(KeepTrackApiEvents.selectSatData, (obj?: BaseObject) => this.selectSat_(this, obj));
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
      keepTrackApi.getSoundManager()?.play(SoundNames.CLICK);

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
        containment: keepTrackApi.containerRoot,
      });

      draggie.on('dragStart', () => {
        const satInfoBoxElement = getEl(SatInfoBox.containerId_)!;

        satInfoBoxElement.style.height = 'fit-content';
        satInfoBoxElement.style.maxHeight = '80%';
        document.documentElement.style.setProperty('--search-box-bottom', '0px');
        satInfoBoxElement.classList.remove('satinfo-fixed');

        getEl('search-results')!.style.maxHeight = '80%';
      });
    }

    // If right click kill and reinit
    const satInfobox = getEl(SatInfoBox.containerId_)!;

    satInfobox.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 2) {
        this.initPosition(satInfobox);
        getEl('search-results')!.style.maxHeight = '';
      }
    });
  }

  private uiManagerFinal_(): void {
    this.createContainer(); // This is run during the uiManagerFinal event to ensure the rest of the DOM is ready

    // Now that is is loaded, reset the sizing and location
    this.initPosition(getEl(SatInfoBox.containerId_), false);

    this.addListenerToCollapseElement(getEl(`${SECTIONS.IDENTIFIERS}`), { value: this.isIdentifiersSectionCollapsed_ });

    keepTrackApi.emit(KeepTrackApiEvents.satInfoBoxAddListeners);
  }

  private createContainer(): void {
    const plugin = keepTrackApi.getPlugin(SatInfoBox)!;

    plugin.addElement({ html: this.createHeader(), order: 0 });
    plugin.addElement({ html: this.createIdentifiersSection(), order: 3 });
    // Make sure we have all the dynamic html elements before getting the order
    keepTrackApi.emit(KeepTrackApiEvents.satInfoBoxInit);

    const elements = plugin.getElements();

    getEl('ui-wrapper')?.insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
        <div id="${CONTAINER_ID}" class="text-select satinfo-fixed start-hidden">
          ${elements
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((el) => el.html ?? '')
          .join('')}
        </div>
      `,
    );

    keepTrackApi.emit(KeepTrackApiEvents.satInfoBoxFinal);

    // Create a Sat Info Box Initializing Script
    this.initDraggabilly();
  }

  private createHeader(): string {
    return keepTrackApi.html`
      <div id="${EL.CONTAINER}">
        <div id="${EL.TITLE}" class="center-text">
          <span id="${EL.NAME}">This is a title</span>
          <span id="${EL.FLAG}" class="fi"></span>
        </div>
      </div>
    `;
  }

  private createIdentifiersSection(): string {
    return keepTrackApi.html`
      <div id="${SECTIONS.IDENTIFIERS}">
        <div class="sat-info-section-header">
          Identifiers
          <span id="${SECTIONS.IDENTIFIERS}-collapse" class="section-collapse material-icons">expand_less</span>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key">COSPAR</div>
          <div class="sat-info-value" id="${EL.INTL_DES}">xxxx-xxxA</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key">NORAD</div>
          <div class="sat-info-value" id="${EL.OBJNUM}">99999</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key">Alt Name</div>
          <div class="sat-info-value" id="${EL.ALT_NAME}">Alt Name</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key">Alt ID</div>
          <div class="sat-info-value" id="${EL.ALT_ID}">99999</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key">Source</div>
          <div class="sat-info-value" id="${EL.SOURCE}">USSF</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key">Confidence</div>
          <div class="sat-info-value" id="${EL.CONFIDENCE}">High</div>
        </div>
      </div>
    `;
  }

  private updateHeaderData_(obj: BaseObject): void {
    if (!obj || obj.isStatic() || obj.isSensor()) {
      return;
    }

    const isHasAltName: boolean = !!((obj as DetailedSatellite)?.altName && (obj as DetailedSatellite).altName !== '');
    const isHasAltId: boolean = !!((obj as DetailedSatellite)?.altId && (obj as DetailedSatellite).altId !== '');

    getEl(EL.NAME)!.innerHTML = obj.name;

    if (obj instanceof DetailedSatellite) {
      keepTrackApi.containerRoot.querySelectorAll('.sat-only-info')?.forEach((el) => {
        (<HTMLElement>el).style.display = 'flex';
      });
    }

    if (obj.isSatellite() && (obj as DetailedSatellite).sccNum5 === '25544') {
      getEl(EL.FLAG)!.classList.value = 'fi fi-iss';
    } else {
      getEl(EL.FLAG)!.classList.value = `fi ${country2flagIcon((obj as DetailedSatellite).country)}`;
    }

    if (isHasAltName) {
      showEl(getEl(EL.ALT_NAME)!.parentElement!, 'flex');
      getEl(EL.ALT_NAME)!.innerHTML = (obj as DetailedSatellite).altName;
    } else {
      hideEl(getEl(EL.ALT_NAME)!.parentElement!);
    }

    if (isHasAltId) {
      showEl(getEl(EL.ALT_ID)!.parentElement!, 'flex');
      getEl(EL.ALT_ID)!.innerHTML = (obj as DetailedSatellite).altId;
    } else {
      hideEl(getEl(EL.ALT_ID)!.parentElement!);
    }

    /*
     * TODO:
     * getEl('edit-satinfo-link').innerHTML = "<a class='iframe' href='editor.htm?scc=" + sat.sccNum + "&popup=true'>Edit Satellite Info</a>";
     */

    if (obj.isMissile()) {
      getEl(EL.INTL_DES)!.innerHTML = 'N/A';
      getEl(EL.OBJNUM)!.innerHTML = 'N/A';
      getEl(EL.SOURCE)!.innerHTML = 'N/A';
    } else {
      const sat = obj as DetailedSatellite;

      getEl(EL.INTL_DES)!.innerHTML = sat.intlDes === 'none' ? 'N/A' : sat.intlDes;
      if (sat.source && sat.source === CatalogSource.VIMPEL) {
        getEl(EL.OBJNUM)!.innerHTML = 'N/A';
        getEl(EL.INTL_DES)!.innerHTML = 'N/A';
      } else {
        getEl(EL.OBJNUM)!.innerHTML = sat.sccNum;
        // satObjNumDom.setAttribute('data-tooltip', `${FormatTle.convert6DigitToA5(sat.sccNum)}`);
      }

      getEl(EL.SOURCE)!.innerHTML = sat.source || CatalogSource.CELESTRAK;

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
    const searchBoxHeight = keepTrackApi.getUiManager().searchManager.isResultsOpen ? satInfoBoxDom?.getBoundingClientRect().height : 0;
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

  private onKeyDownLowerI_(satInfoBox: SatInfoBox, key: string): void {
    if (key !== 'i') {
      return;
    }

    satInfoBox.toggle();
  }

  hide(): void {
    hideEl(SatInfoBox.containerId_);
    this.isVisible_ = false;
  }

  show(): void {
    if (keepTrackApi.getPlugin(SelectSatManager)!.primarySatObj.id === -1) {
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
