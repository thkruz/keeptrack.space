import { SatMath } from '@app/app/analysis/sat-math';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { TimeManager } from '@app/engine/core/time-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  ICommandPaletteCapable,
  ICommandPaletteCommand,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { waitForCruncher } from '@app/engine/utils/waitForCruncher';
import { t7e } from '@app/locales/keys';
import { BaseObject, eci2lla, Kilometers, OrbitFinder, Satellite, SpaceObjectType, Tle, TleLine1, TleLine2 } from '@ootk/src/main';
import { PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import streamPng from '@public/img/icons/stream.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import {
  BreakupRawForm,
  buildPieceTle,
  isAnalystRangeValid,
  makeRng,
  parseBreakupParams,
  planRaanBuckets,
} from './breakup-core';
import './breakup.css';

export interface BreakupParams {
  satId: number | null;
  breakupCount: number;
  rascVariation: number;
  incVariation: number;
  meanmoVariation: number;
  /** Optional so older callers (e.g. scenario restore) can omit it; onSubmit always sets it. */
  eccVariation?: number;
  startNum: number;
}

/** Snapshot captured on a successful breakup so it can be fully undone (Clear Breakup). */
interface BreakupUndoState {
  parentId: number;
  parentTle1: TleLine1;
  parentTle2: TleLine2;
  parentEcc: number;
  pieceIds: number[];
  priorSearchLimit: number;
}

export class Breakup extends KeepTrackPlugin implements ICommandPaletteCapable {
  readonly id = 'Breakup';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;
  private readonly maxDifApogeeVsPerigee_ = 1000;
  /** Below this apogee-perigee spread the orbit is treated as round (argument of perigee ignored). */
  private readonly roundOrbitThresholdKm_ = 300;
  private static readonly DEFAULT_START_NUM = 90000;

  lastBreakupParams: BreakupParams | null = null;
  /** State needed to undo the most recent breakup; null when nothing to clear. */
  private lastBreakup_: BreakupUndoState | null = null;

  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager;
  }

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'breakup-bottom-icon',
      label: t7e('plugins.Breakup.bottomIconLabel'),
      image: streamPng,
      menuMode: [MenuMode.CREATE, MenuMode.ALL],
      isDisabledOnLoad: true,
    };
  }

  /**
   * Called when the bottom icon is clicked.
   */
  onBottomIconClick(): void {
    const obj = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);

    // Reject anything that isn't a true TLE-backed Satellite (e.g. OemSatellite returns
    // true from isSatellite() but has no tle1/tle2/apogee/perigee, which would blow up
    // downstream when OrbitFinder tries to synthesize TLEs from it).
    if (!(obj instanceof Satellite)) {
      return;
    }

    if (obj.apogee - obj.perigee > this.maxDifApogeeVsPerigee_) {
      errorManagerInstance.warn(t7e('plugins.Breakup.errorMsgs.CannotCreateBreakupForNonCircularOrbits'));
      this.closeSideMenu();
      this.setBottomIconToDisabled();

      return;
    }
    this.updateSccNumInMenu_();
  }

  // Bridge for legacy event system (per CLAUDE.md)
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    // Bare 'B' is owned by BestPassPlugin; use Shift+B (no conflict per the registry).
    return [
      {
        key: 'B',
        shift: true,
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = t7e('plugins.Breakup.title');

    return [
      {
        id: 'Breakup.create',
        label: t7e('plugins.Breakup.commands.create' as Parameters<typeof t7e>[0]),
        category,
        callback: () => this.bottomMenuClicked(),
      },
      {
        id: 'Breakup.clear',
        label: t7e('plugins.Breakup.commands.clear' as Parameters<typeof t7e>[0]),
        category,
        callback: () => this.clearBreakup_(),
        isAvailable: () => this.lastBreakup_ !== null,
      },
    ];
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'breakup-menu',
      title: t7e('plugins.Breakup.sideMenuTitle' as Parameters<typeof t7e>[0]),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
    };
  }

  private buildSideMenuHtml_(): string {
    const l = (key: string) => t7e(`plugins.Breakup.labels.${key}` as Parameters<typeof t7e>[0]);
    const degrees = l('degrees');
    const minute = l('minute');
    const minutes = l('minutes');

    return html`
      <div id="breakup-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="breakup-content" class="side-menu">
          <form id="breakup" class="col s12">
            <section class="kt-section">
              <div class="kt-section-label">${l('sourceSection')}</div>
              <div class="input-field col s12">
                <input disabled value="00005" id="hc-scc" type="text" />
                <label for="hc-scc" class="active">${l('satelliteScc')}</label>
              </div>
            </section>
            <section class="kt-section">
              <div class="kt-section-label">${l('catalogSlotsSection')}</div>
              <div class="input-field col s12">
                <input id="hc-startNum" type="text" value="90000" />
                <label for="hc-startNum" class="active">${l('initialSatelliteNumber')}</label>
              </div>
            </section>
            <section class="kt-section">
              <div class="kt-section-label">${l('spreadSection')}</div>
              <div class="kt-field-row">
                <div class="input-field col s6">
                  <select id="hc-inc">
                    <option value="0">0 ${degrees}</option>
                    <option value="0.005">0.005 ${degrees}</option>
                    <option value="0.025">0.025 ${degrees}</option>
                    <option value="0.05" selected>0.05 ${degrees}</option>
                    <option value="0.1">0.1 ${degrees}</option>
                    <option value="0.2">0.2 ${degrees}</option>
                    <option value="0.3">0.3 ${degrees}</option>
                    <option value="0.4">0.4 ${degrees}</option>
                    <option value="0.5">0.5 ${degrees}</option>
                    <option value="0.6">0.6 ${degrees}</option>
                    <option value="0.7">0.7 ${degrees}</option>
                    <option value="0.8">0.8 ${degrees}</option>
                    <option value="0.9">0.9 ${degrees}</option>
                    <option value="1">1 ${degrees}</option>
                  </select>
                  <label>${l('inclinationVariation')}</label>
                </div>
                <div class="input-field col s6">
                  <select id="hc-per">
                    <option value="0">0 ${minutes}</option>
                    <option value="0.1" selected>0.1 ${minutes}</option>
                    <option value="0.15">0.15 ${minutes}</option>
                    <option value="0.25">0.25 ${minutes}</option>
                    <option value="0.3">0.3 ${minutes}</option>
                    <option value="0.5">0.5 ${minutes}</option>
                    <option value="0.75">0.75 ${minutes}</option>
                    <option value="1">1 ${minute}</option>
                    <option value="1.5">1.5 ${minutes}</option>
                    <option value="2">2 ${minutes}</option>
                    <option value="2.5">2.5 ${minutes}</option>
                    <option value="3">3 ${minutes}</option>
                    <option value="4">4 ${minutes}</option>
                    <option value="5">5 ${minutes}</option>
                  </select>
                  <label>${l('periodVariation')}</label>
                </div>
              </div>
              <div class="kt-field-row">
                <div class="input-field col s6">
                  <select id="hc-raan">
                    <option value="0">0 ${degrees}</option>
                    <option value="0.005">0.005 ${degrees}</option>
                    <option value="0.025">0.025 ${degrees}</option>
                    <option value="0.05" selected>0.05 ${degrees}</option>
                    <option value="0.1">0.1 ${degrees}</option>
                    <option value="0.2">0.2 ${degrees}</option>
                    <option value="0.3">0.3 ${degrees}</option>
                    <option value="0.4">0.4 ${degrees}</option>
                    <option value="0.5">0.5 ${degrees}</option>
                    <option value="0.6">0.6 ${degrees}</option>
                    <option value="0.7">0.7 ${degrees}</option>
                    <option value="0.8">0.8 ${degrees}</option>
                    <option value="0.9">0.9 ${degrees}</option>
                    <option value="1">1 ${degrees}</option>
                  </select>
                  <label>${l('rightAscensionVariation')}</label>
                </div>
                <div class="input-field col s6">
                  <select id="hc-ecc">
                    <option value="0">0</option>
                    <option value="0.00005">0.00005</option>
                    <option value="0.0001">0.0001</option>
                    <option value="0.00015" selected>0.00015</option>
                    <option value="0.0003">0.0003</option>
                    <option value="0.0005">0.0005</option>
                    <option value="0.001">0.001</option>
                  </select>
                  <label>${l('eccentricityVariation')}</label>
                </div>
              </div>
            </section>
            <section class="kt-section">
              <div class="kt-section-label">${l('piecesSection')}</div>
              <div class="input-field col s12">
                <select id="hc-count">
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25" selected>25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="250">250</option>
                  <option value="500">500</option>
                  <option value="750">750</option>
                  <option value="1000">1000</option>
                </select>
                <label>${l('pieces')}</label>
              </div>
            </section>
            <button id="breakup-create-btn" class="kt-action waves-effect" type="submit" name="action">
              <span class="kt-action-label">${t7e('plugins.Breakup.buttons.createBreakup' as Parameters<typeof t7e>[0])}</span>
            </button>
            <button id="breakup-clear-btn" class="kt-action kt-action-danger waves-effect" type="button" style="display:none;">
              <span class="kt-action-label">${t7e('plugins.Breakup.buttons.clearBreakup' as Parameters<typeof t7e>[0])}</span>
            </button>
          </form>
        </div>
      </div>
    `;
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.Breakup.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.Breakup.help.overview'),
          image: {
            src: 'img/help/breakup/breakup-menu.png',
            alt: t7e('plugins.Breakup.help.imgAlt'),
            caption: t7e('plugins.Breakup.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.Breakup.help.parametersHeading'),
          content: t7e('plugins.Breakup.help.parameters'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.Breakup.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.Breakup.help.tip1'),
        t7e('plugins.Breakup.help.tip2'),
        t7e('plugins.Breakup.help.tip3'),
      ],
    };
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => this.uiManagerFinal_());

    // Custom satellite selection handling - KEEP: Custom plugin logic
    EventBus.getInstance().on(EventBusEvent.selectSatData, (sat: BaseObject) => {
      // Restrict to true TLE-backed Satellite - OemSatellite passes isSatellite() but
      // can't be propagated through the SGP4 breakup pipeline.
      if (!(sat instanceof Satellite)) {
        if (this.isMenuButtonActive) {
          this.closeSideMenu();
        }
        this.setBottomIconToUnselected();
        this.setBottomIconToDisabled();
      } else if (sat.apogee - sat.perigee > this.maxDifApogeeVsPerigee_) {
        if (this.isMenuButtonActive) {
          this.closeSideMenu();
          errorManagerInstance.warn(t7e('plugins.Breakup.errorMsgs.CannotCreateBreakupForNonCircularOrbits'));
        }
        this.setBottomIconToUnselected();
        this.setBottomIconToDisabled();
      } else {
        this.setBottomIconToEnabled();
        if (this.isMenuButtonActive) {
          this.updateSccNumInMenu_();
        }
      }
    });
  }

  private uiManagerFinal_(): void {
    getEl('breakup')?.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      showLoading(() => this.onSubmit_());
    });

    getEl('breakup-clear-btn')?.addEventListener('click', () => {
      showLoading(() => this.clearBreakup_());
    });

    this.restoreInputs_();
    initMaterialSelects(getEl('breakup-menu') ?? document.body);
    this.updateClearButton_();
  }

  // =========================================================================
  // Private methods
  // =========================================================================

  private updateSccNumInMenu_() {
    if (!this.isMenuButtonActive) {
      return;
    }
    const obj = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);

    if (!obj?.isSatellite()) {
      return;
    }
    (<HTMLInputElement>getEl('hc-scc')).value = (obj as Satellite).sccNum;
  }

  // eslint-disable-next-line max-statements, complexity
  private onSubmit_(): void {
    const timeManager = ServiceLocator.getTimeManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const { simulationTimeObj } = timeManager;

    const { satId, breakupCount, rascVariation, incVariation, meanmoVariation, eccVariation, startNum, startNumWasInvalid } =
      Breakup.getFormData_(catalogManagerInstance);

    if (startNumWasInvalid) {
      errorManagerInstance.warn(t7e('plugins.Breakup.errorMsgs.InvalidStartNum'));
    }

    this.lastBreakupParams = { satId, breakupCount, rascVariation, incVariation, meanmoVariation, eccVariation, startNum };
    this.persistInputs_();

    const mainsat = catalogManagerInstance.getSat(satId ?? -1);

    // getSat's return type is Satellite, but at runtime it only checks isSatellite() -
    // OemSatellite slips through that check and lacks tle1/tle2/apogee/perigee.
    if (!mainsat || satId === null || !(mainsat instanceof Satellite)) {
      errorManagerInstance.warn(t7e('plugins.Breakup.errorMsgs.SatelliteNotFound'));

      return;
    }

    // Guard the analyst-slot range so generated pieces never overwrite real catalog
    // satellites (below the block) or unallocated slots (above it).
    if (!isAnalystRangeValid(startNum, breakupCount, CatalogManager.ANALYST_START_ID, settingsManager.maxAnalystSats)) {
      errorManagerInstance.warn(
        t7e('plugins.Breakup.errorMsgs.InvalidSlotRange')
          .replace('{start}', CatalogManager.ANALYST_START_ID.toString())
          .replace('{end}', (CatalogManager.ANALYST_START_ID + settingsManager.maxAnalystSats - 1).toString()),
      );

      return;
    }

    if (mainsat.apogee - mainsat.perigee > this.maxDifApogeeVsPerigee_) {
      errorManagerInstance.warn(t7e('plugins.Breakup.errorMsgs.CannotCreateBreakupForNonCircularOrbits'));

      return;
    }

    // Launch Points are the Satellites Current Location
    const gmst = timeManager.gmst;
    const lla = eci2lla(mainsat.position, gmst);
    const launchLat = lla.lat;
    const launchLon = lla.lon;

    const upOrDown = SatMath.getDirection(mainsat, simulationTimeObj);

    if (upOrDown === 'Error') {
      errorManagerInstance.warn(t7e('plugins.Breakup.errorMsgs.CannotCalcDirectionOfSatellite'));
    }

    // Snapshot the parent's original orbit so Clear Breakup can fully restore it.
    const originalParentTle1 = mainsat.tle1;
    const originalParentTle2 = mainsat.tle2;
    const originalParentEcc = mainsat.eccentricity;

    const currentEpoch = TimeManager.currentEpoch(simulationTimeObj);
    const reEpochedTle1 = (mainsat.tle1.substring(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.tle1.substring(32)) as TleLine1;

    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

    // Ignore argument of perigee for round orbits (OPTIMIZE).
    const isRoundOrbit = mainsat.apogee - mainsat.perigee < this.roundOrbitThresholdKm_;
    const alt = (isRoundOrbit ? 0 : lla.alt) as Kilometers;

    // Re-epoch + rotate the parent so its ground track passes over the breakup point.
    // Work on a copy so a partial failure never mutates the live catalog object.
    const parentSat = new Satellite({ ...mainsat, tle1: reEpochedTle1 });
    const parentTles = new OrbitFinder(parentSat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj, alt).rotateOrbitToLatLon();

    if (parentTles[0] === 'Error') {
      errorManagerInstance.warn(t7e('plugins.Breakup.errorMsgs.ErrorCreatingBreakup'));

      return;
    }

    const parentTle1 = parentTles[0] as TleLine1;
    const parentTle2 = parentTles[1] as TleLine2;
    const orbitManagerInstance = ServiceLocator.getOrbitManager();
    const newParentSat = new Satellite({ ...mainsat, id: satId, tle1: parentTle1, tle2: parentTle2, active: true });

    catalogManagerInstance.objectCache[satId] = newParentSat;
    catalogManagerInstance.satCruncherThread.sendSatEdit(satId, parentTle1, parentTle2);
    orbitManagerInstance.changeOrbitBufferData(satId, parentTle1, parentTle2);

    const baseInc = parseFloat(parentTle2.substring(8, 16));
    const buckets = planRaanBuckets(breakupCount, rascVariation);
    // Seed from the parameters so a given configuration is reproducible.
    const rng = makeRng((startNum ^ breakupCount ^ Math.round(rascVariation * 1e6)) >>> 0);
    const createdIds: number[] = [];
    let pieceIndex = 0;

    for (const bucket of buckets) {
      if (bucket.count <= 0) {
        continue;
      }

      // One OrbitFinder solve per RAAN bucket (the expensive op), shared by every piece in it.
      let bucketTles = new OrbitFinder(parentSat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj, alt, bucket.offset).rotateOrbitToLatLon();

      if (bucketTles[0] === 'Error') {
        // Retry once with a 1ms time nudge (OrbitFinder occasionally fails to converge).
        bucketTles = new OrbitFinder(parentSat, launchLat, launchLon, <'N' | 'S'>upOrDown, new Date(simulationTimeObj.getTime() + 1), alt, bucket.offset).rotateOrbitToLatLon();
        if (bucketTles[0] === 'Error') {
          errorManagerInstance.warn(t7e('plugins.Breakup.errorMsgs.ErrorCreatingBreakup'));

          return;
        }
      }

      const refTle1 = bucketTles[0];
      const refTle2 = bucketTles[1];

      for (let b = 0; b < bucket.count; b++, pieceIndex++) {
        const a5Num = Tle.convert6DigitToA5((startNum + pieceIndex).toString());
        const pieceSatId = catalogManagerInstance.sccNum2Id(a5Num);

        if (!pieceSatId) {
          errorManagerInstance.warn(t7e('plugins.Breakup.errorMsgs.SatelliteNotFound'));

          return;
        }

        let pieceTle1: TleLine1;
        let pieceTle2: TleLine2;

        try {
          ({ tle1: pieceTle1, tle2: pieceTle2 } = buildPieceTle(refTle1, refTle2, {
            a5Num,
            baseInc,
            incVariation,
            meanmoVariation,
            baseEcc: originalParentEcc,
            eccVariation,
            rng,
          }));
        } catch (e) {
          errorManagerInstance.error(e, 'breakup.ts', t7e('plugins.Breakup.errorMsgs.ErrorCreatingBreakup'));

          return;
        }

        let newSat: Satellite;

        try {
          newSat = new Satellite({
            ...catalogManagerInstance.objectCache[pieceSatId],
            ...{
              id: pieceSatId,
              name: `Breakup Piece ${pieceIndex + 1}`,
              tle1: pieceTle1,
              tle2: pieceTle2,
              // The analyst-slot template is a PAYLOAD; pieces are debris and
              // need the type overridden so color schemes and search treat
              // them correctly.
              type: SpaceObjectType.DEBRIS,
              active: true,
            },
          });
        } catch (e) {
          errorManagerInstance.error(e, 'breakup.ts', t7e('plugins.Breakup.errorMsgs.ErrorCreatingBreakup'));

          return;
        }

        if (SatMath.altitudeCheck(newSat.satrec!, simulationTimeObj) > 1) {
          catalogManagerInstance.objectCache[pieceSatId] = newSat;
          catalogManagerInstance.satCruncherThread.sendSatEdit(pieceSatId, pieceTle1, pieceTle2, true);
          orbitManagerInstance.changeOrbitBufferData(pieceSatId, pieceTle1, pieceTle2);
          createdIds.push(pieceSatId);
        } else {
          errorManagerInstance.warn(t7e('plugins.Breakup.errorMsgs.BreakupGeneratorFailed'));
        }
      }
    }

    const priorSearchLimit = settingsManager.searchLimit;

    if (breakupCount > settingsManager.searchLimit) {
      settingsManager.searchLimit = breakupCount;
    }

    this.lastBreakup_ = {
      parentId: satId,
      parentTle1: originalParentTle1,
      parentTle2: originalParentTle2,
      parentEcc: originalParentEcc,
      pieceIds: createdIds,
      priorSearchLimit,
    };
    this.updateClearButton_();

    /*
     * Pieces changed type (PAYLOAD analyst slot → DEBRIS) and active flag in
     * objectCache, but in worker-mode the color worker only sees the typed-array
     * snapshot taken at init. Without this nudge they'd keep rendering as
     * orange "inactive payloads" in the Celestrak scheme.
     */
    ServiceLocator.getColorSchemeManager().notifyObjectsChanged();

    /*
     * Defer the search until the cruncher has actually propagated the new TLEs.
     * The sendSatEdit posts above are async, so position data for the pieces is
     * still all-zero for a few frames - the search filters out (0,0,0) sats as
     * "Decayed" (search-manager getSearchableObjects_), so an early search finds
     * nothing and only a manual re-search shows the cloud. A fixed frame skip is
     * not enough: with up to 1000 queued edits the pieces can still be zero after
     * a couple of frames. Instead, wait until the LAST created piece actually has
     * a non-zero position - the cruncher applies edits in id order, so the last
     * piece going live means the whole batch has propagated.
     */
    const searchStr = `${mainsat.sccNum},Breakup Piece`;
    const dotsManagerInstance = ServiceLocator.getDotsManager();
    const lastPieceId = createdIds.length > 0 ? createdIds[createdIds.length - 1] : null;

    waitForCruncher({
      cruncher: catalogManagerInstance.satCruncher,
      cb: () => ServiceLocator.getUiManager().doSearch(searchStr),
      validationFunc: (data: PositionCruncherOutgoingMsg) => {
        if (typeof data.satPos === 'undefined') {
          return false;
        }
        if (lastPieceId === null) {
          return true;
        }

        // The dots manager updates positionData from this same frame (its listener
        // runs before ours), so getCurrentPosition reflects the latest cruncher output.
        // positionData can be nulled mid catalog-swap (undefined entries), so require
        // finite coordinates before treating a non-zero position as "propagated".
        const pos = dotsManagerInstance.getCurrentPosition(lastPieceId);
        const isFinitePos = Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.z);

        return isFinitePos && (pos.x !== 0 || pos.y !== 0 || pos.z !== 0);
      },
      maxRetries: 150,
      isRunCbOnFailure: true,
    });
  }

  /**
   * Undo the most recent breakup: restore the parent satellite's original orbit,
   * return every generated piece to its reserved (inactive) analyst slot, and
   * restore the prior search limit. Removes the need to reload the page.
   */
  private clearBreakup_(): void {
    if (!this.lastBreakup_) {
      return;
    }

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const orbitManagerInstance = ServiceLocator.getOrbitManager();
    const { parentId, parentTle1, parentTle2, pieceIds, priorSearchLimit } = this.lastBreakup_;

    const parent = catalogManagerInstance.getSat(parentId);

    if (parent instanceof Satellite) {
      const restored = new Satellite({ ...parent, id: parentId, tle1: parentTle1, tle2: parentTle2 });

      catalogManagerInstance.objectCache[parentId] = restored;
      catalogManagerInstance.satCruncherThread.sendSatEdit(parentId, parentTle1, parentTle2);
      orbitManagerInstance.changeOrbitBufferData(parentId, parentTle1, parentTle2);
    }

    for (const id of pieceIds) {
      const obj = catalogManagerInstance.objectCache[id];

      if (!(obj instanceof Satellite)) {
        continue;
      }

      // Deactivate the slot and revert it to the reserved analyst PAYLOAD type.
      const reset = new Satellite({ ...obj, id, active: false, type: SpaceObjectType.PAYLOAD });

      catalogManagerInstance.objectCache[id] = reset;
      catalogManagerInstance.satCruncherThread.sendSatEdit(id, obj.tle1, obj.tle2, false);
      orbitManagerInstance.changeOrbitBufferData(id, obj.tle1, obj.tle2);
    }

    settingsManager.searchLimit = priorSearchLimit;
    this.lastBreakup_ = null;
    this.updateClearButton_();

    ServiceLocator.getColorSchemeManager().notifyObjectsChanged();
    ServiceLocator.getUiManager().doSearch('');
    ServiceLocator.getUiManager().toast(t7e('plugins.Breakup.toasts.cleared' as Parameters<typeof t7e>[0]), ToastMsgType.normal);
  }

  /** Show the Clear Breakup action only when there is a breakup to undo. */
  private updateClearButton_(): void {
    const btn = getEl('breakup-clear-btn', true);

    if (btn) {
      btn.style.display = this.lastBreakup_ ? 'flex' : 'none';
    }
  }

  /** Persist the current variation inputs so they are restored next session. */
  private persistInputs_(): void {
    const settings: Record<string, string> = {};

    for (const id of Breakup.PERSISTED_INPUT_IDS) {
      const el = getEl(id, true) as HTMLInputElement | null;

      if (el) {
        settings[id] = el.value;
      }
    }

    PersistenceManager.getInstance().saveItem(StorageKey.BREAKUP_SETTINGS, JSON.stringify(settings));
  }

  /** Restore the last-used variation inputs (call before initMaterialSelects). */
  private restoreInputs_(): void {
    const raw = PersistenceManager.getInstance().getItem(StorageKey.BREAKUP_SETTINGS);

    if (!raw) {
      return;
    }

    let settings: Record<string, string>;

    try {
      settings = JSON.parse(raw) as Record<string, string>;
    } catch {
      return;
    }

    for (const id of Breakup.PERSISTED_INPUT_IDS) {
      const value = settings[id];
      const el = getEl(id, true) as HTMLInputElement | null;

      if (el && typeof value === 'string') {
        el.value = value;
      }
    }
  }

  private static readonly PERSISTED_INPUT_IDS = ['hc-startNum', 'hc-inc', 'hc-per', 'hc-raan', 'hc-ecc', 'hc-count'];

  private static getFormData_(catalogManagerInstance: CatalogManager) {
    const satId = catalogManagerInstance.sccNum2Id((<HTMLInputElement>getEl('hc-scc')).value);
    const raw: BreakupRawForm = {
      periodVariation: (<HTMLInputElement>getEl('hc-per')).value,
      incVariation: (<HTMLInputElement>getEl('hc-inc')).value,
      rascVariation: (<HTMLInputElement>getEl('hc-raan')).value,
      eccVariation: (<HTMLInputElement>getEl('hc-ecc')).value,
      count: (<HTMLInputElement>getEl('hc-count')).value,
      startNum: (<HTMLInputElement>getEl('hc-startNum')).value,
    };

    const { params, startNumWasInvalid } = parseBreakupParams(raw, Breakup.DEFAULT_START_NUM);

    return { satId, ...params, startNumWasInvalid };
  }
}
