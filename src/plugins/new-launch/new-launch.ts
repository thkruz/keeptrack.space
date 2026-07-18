import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { getEl } from '@app/engine/utils/get-el';
import { hideLoading, showLoadingSticky } from '@app/engine/utils/showLoading';
import { waitForCruncher } from '@app/engine/utils/waitForCruncher';
import rocketLaunchPng from '@public/img/icons/rocket-launch.png';

import { SatMath } from '@app/app/analysis/sat-math';

import { LaunchSite } from '@app/app/data/catalog-manager/LaunchFacility';
import { launchSites } from '@app/app/data/catalogs/launch-sites';
import { SoundNames } from '@app/engine/audio/sounds';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { TimeManager } from '@app/engine/core/time-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';
import { PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import { dateFormat } from '@app/engine/utils/dateFormat';
import {
  BaseObject, Degrees,
  FormatTle, GreenwichMeanSiderealTime, KilometersPerSecond,
  LaunchWindowFinder, LaunchWindowResult,
  Radians,
  Satellite, SatelliteParams,
  SatelliteRecord, Sgp4, SpaceObjectType,
  TemeVec3,
  TleLine1, TleLine2,
  calcGmst, groundTrackStateVector, rv2tle, semimajorAxisFromMeanMotion,
} from '@ootk/src/main';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { IHelpConfig, IKeyboardShortcut } from '../../engine/plugins/core/plugin-capabilities';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './new-launch.css';

type T7eKey = Parameters<typeof t7e>[0];

export interface LaunchParams {
  templateSccNum: string;
  launchSiteKey: string;
  launchDirection: 'N' | 'S';
  tle1: string;
  tle2: string;
  name: string;
}

export class NewLaunch extends KeepTrackPlugin {
  readonly id = 'NewLaunch';
  dependencies_ = [SelectSatManager.name];
  protected readonly selectSatManager_: SelectSatManager;
  lastLaunchParams: LaunchParams | null = null;

  constructor() {
    super();
    const selectSatManagerInstance = PluginRegistry.getPlugin(SelectSatManager);

    if (!selectSatManagerInstance) {
      throw new Error('SelectSatManager not found');
    }
    this.selectSatManager_ = selectSatManagerInstance;
  }

  bottomIconCallback = () => {
    if (!this.isMenuButtonActive) {
      return;
    }
    if (!this.verifySatelliteSelected()) {
      return;
    }

    const sat = ServiceLocator.getCatalogManager().getObject(this.selectSatManager_.selectedSat, GetSatType.EXTRA_ONLY) as Satellite;

    // Validate satellite before changing DOM
    if (!(sat instanceof Satellite) || !sat.sccNum || !sat.inclination || isNaN(sat.inclination)) {
      return;
    }

    this.preValidate_(sat);

    (<HTMLInputElement>getEl('nl-scc')).value = sat.sccNum;
    (<HTMLInputElement>getEl('nl-inc')).value = sat.inclination.toFixed(4).padStart(8, '0');
  };

  menuMode: MenuMode[] = [MenuMode.CREATE, MenuMode.ALL];

  bottomIconImg = rocketLaunchPng;
  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  sideMenuElementName: string = 'newLaunch-menu';

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.NewLaunch.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.NewLaunch.help.overview'),
          image: {
            src: 'img/help/new-launch/new-launch-menu.png',
            alt: t7e('plugins.NewLaunch.help.imgAlt'),
            caption: t7e('plugins.NewLaunch.help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.NewLaunch.help.howToUse'),
        },
        {
          heading: t7e('plugins.NewLaunch.help.limitsHeading'),
          content: t7e('plugins.NewLaunch.help.limits'),
        },
      ],
      tips: [
        t7e('plugins.NewLaunch.help.tip1'),
        t7e('plugins.NewLaunch.help.tip2'),
      ],
      shortcuts: [{ keys: ['Shift', 'L'], description: t7e('plugins.NewLaunch.help.shortcutOpen' as T7eKey) }],
    };
  }

  /**
   * Ctrl+Shift+L for Launch - toggles the New Launch side menu open/closed.
   * Shift+L is already taken by the orbit-line toggle (OrbitManager), so this
   * uses the Ctrl+Shift modifiers.
   */
  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'L',
        ctrl: true,
        shift: true,
        callback: () => {
          this.bottomMenuClicked();
        },
      },
    ];
  }

  /**
   * Build the grouped launch facility `<select>` options HTML.
   * Extracted as a static method so pro subclasses can reuse it.
   */
  static buildFacilityOptionsHtml(): string {
    // Group launchSites by country
    const grouped: { [country: string]: { key: string; name: string; site: string }[] } = {};

    for (const [key, site] of Object.entries(launchSites)) {
      const country = site.country || 'Other';

      if (!grouped[country]) {
        grouped[country] = [];
      }
      grouped[country].push({ key, name: site.name, site: site.site ?? 'Unknown Site' });
    }

    // Sort countries alphabetically, and sites by name
    const countryKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    for (const country of countryKeys) {
      grouped[country].sort((a, b) => {
        const siteCompare = a.site.localeCompare(b.site);

        if (siteCompare !== 0) {
          return siteCompare;
        }

        return a.name.localeCompare(b.name);
      });
    }

    return countryKeys.map((country) =>
      `<optgroup label="${country}"> ${grouped[country]
        .map((site) => `<option value="${site.key}">${site.name}<br/> - ${site.site}</option>`).join('\n')}
      </optgroup>`,
    ).join('\n');
  }

  /**
   * A full-width v13 action row (label left, chevron added via CSS). Public
   * static so pro subclasses and the Pro HTML module can build matching rows.
   * The label lives in a `.kt-action-label` span so JS can swap it without
   * clobbering the chevron.
   */
  static actionButton_(id: string, label: string, opts: { submit?: boolean; disabled?: boolean } = {}): string {
    const type = opts.submit ? 'submit' : 'button';
    const disabled = opts.disabled ? ' disabled' : '';

    return html`
      <button id="${id}" type="${type}" name="action" class="kt-action waves-effect"${disabled}>
        <span class="kt-action-label">${label}</span>
      </button>
    `;
  }

  /**
   * Set the visible label on a `.kt-action` row without deleting the CSS chevron.
   * Writes to the `.kt-action-label` span when present, falling back to the button
   * text for any non-v13 caller.
   */
  protected setActionLabel_(buttonId: string, label: string): void {
    const btn = getEl(buttonId);
    const span = btn?.querySelector('.kt-action-label');

    if (span) {
      span.textContent = label;
    } else if (btn) {
      btn.textContent = label;
    }
  }

  sideMenuElementHtml: string = this.buildSideMenuHtml_();

  /** v13+ side-menu markup. Split into a method so the structure is overridable. */
  protected buildSideMenuHtml_(): string {
    const optionsHtml = NewLaunch.buildFacilityOptionsHtml();
    const l = (key: string) => t7e(`plugins.NewLaunch.labels.${key}` as T7eKey);
    const s = (key: string) => t7e(`plugins.NewLaunch.sections.${key}` as T7eKey);

    return html`
      <div id="newLaunch-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="newLaunch-content" class="side-menu">
          <div class="row">
            <form id="${this.sideMenuElementName}-form" class="col s12">
              <div class="kt-note">${t7e('plugins.NewLaunch.leoOptimizedNote' as T7eKey)}</div>

              <section class="kt-section">
                <div class="kt-section-label">${s('template')}</div>
                <div class="kt-field-row">
                  <div class="input-field col s6">
                    <input disabled value="00005" id="nl-scc" type="text">
                    <label for="nl-scc" class="active">${l('satelliteScc')}</label>
                  </div>
                  <div class="input-field col s6">
                    <input disabled value="50.00" id="nl-inc" type="text">
                    <label for="nl-inc" class="active">${l('inclination')}</label>
                  </div>
                </div>
              </section>

              <section class="kt-section">
                <div class="kt-section-label">${s('launchSite')}</div>
                <div class="kt-field-row">
                  <div class="input-field col s12">
                    <select id="nl-updown">
                      <option value="N">${l('north')}</option>
                      <option value="S">${l('south')}</option>
                    </select>
                    <label for="nl-updown">${l('launchingNorthOrSouth')}</label>
                  </div>
                </div>
                <div class="kt-field-row">
                  <div class="input-field col s12" id="nl-launch-menu">
                    <select id="nl-facility">
                      ${optionsHtml}
                    </select>
                    <label>${l('launchFacility')}</label>
                  </div>
                </div>
              </section>

              <section class="kt-section">
                <div class="kt-section-label">${s('launchWindow')}</div>
                <p class="kt-note">${t7e('plugins.NewLaunch.launchWindowHelp' as T7eKey)}</p>
                <div class="kt-note nl-window-result" id="nl-window-result" style="display: none;"></div>
                ${NewLaunch.actionButton_('nl-match-plane', t7e('plugins.NewLaunch.buttons.matchTargetPlane' as T7eKey))}
              </section>

              ${NewLaunch.actionButton_(`${this.sideMenuElementName}-submit`, t7e('plugins.NewLaunch.buttons.createLaunchNominal' as T7eKey), { submit: true })}
            </form>
          </div>
        </div>
      </div>
    `;
  }

  dragOptions: ClickDragOptions = {
    minWidth: 400,
    maxWidth: 600,
    isDraggable: true,
  };

  protected isDoingCalculations_ = false;

  /**
   * Launch time selected by "Match target plane". When set, the created
   * nominal launches at this time instead of 0000z so its plane RAAN matches
   * the target satellite's plane. Cleared whenever the target, facility, or
   * direction changes.
   */
  protected matchedLaunchTime_: Date | null = null;

  /**
   * The satellite whose orbital plane the launch window should match. The OSS
   * form always launches into the template satellite's orbit (nl-scc); pro
   * overrides this for its mode-aware form.
   */
  protected resolveMatchTarget_(): Satellite | null {
    const sccNum = (getEl('nl-scc') as HTMLInputElement | null)?.value.trim() ?? '';
    const sat = sccNum ? ServiceLocator.getCatalogManager().sccNum2Sat(sccNum) : null;

    if (!sat) {
      ServiceLocator.getUiManager().toast(t7e('plugins.NewLaunch.errorMsgs.windowNoTarget' as T7eKey), ToastMsgType.caution);
    }

    return sat;
  }

  /** The launch site coordinates for the window search. Pro overrides for custom locations. */
  protected resolveLaunchSiteLatLon_(): { lat: Degrees; lon: Degrees } | null {
    const facility = (getEl('nl-facility') as HTMLInputElement | null)?.value ?? '';
    const site = ServiceLocator.getCatalogManager().launchSites[facility];

    if (!site) {
      return null;
    }

    const lon = site.lon > 180 ? ((site.lon - 360) as Degrees) : site.lon;

    return { lat: site.lat, lon };
  }

  /**
   * Finds the launch time in the next 24 hours whose orbital plane best
   * matches the target satellite's RAAN, iterating candidate times from the
   * current simulation time.
   */
  protected onMatchTargetPlane_(): void {
    const uiManagerInstance = ServiceLocator.getUiManager();
    const targetSat = this.resolveMatchTarget_();

    if (!targetSat) {
      return;
    }

    const site = this.resolveLaunchSiteLatLon_();

    if (!site) {
      uiManagerInstance.toast(
        t7e('plugins.NewLaunch.errorMsgs.launchSiteNotFound' as T7eKey).replace('{launchSite}', (getEl('nl-facility') as HTMLInputElement | null)?.value ?? ''),
        ToastMsgType.caution,
      );

      return;
    }

    const direction = <'N' | 'S'>((getEl('nl-updown') as HTMLInputElement | null)?.value ?? 'N');
    // Prefer the drift-aware target RAAN; fall back to the epoch value when
    // the satellite record is not (yet) available.
    const satrec = targetSat.satrec as SatelliteRecord | null;
    const finder = new LaunchWindowFinder({
      siteLat: site.lat,
      siteLon: site.lon,
      inclination: targetSat.inclination,
      direction,
      targetRaan: satrec ? (time: Date) => LaunchWindowFinder.meanRaanAt(satrec, time) : targetSat.rightAscension,
      startTime: ServiceLocator.getTimeManager().simulationTimeObj,
    });

    const window = finder.findBestLaunchTime();

    if (!window) {
      uiManagerInstance.toast(t7e('plugins.NewLaunch.errorMsgs.windowGeometryImpossible' as T7eKey), ToastMsgType.caution);
      this.clearMatchedWindow_();

      return;
    }

    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
    this.applyMatchedWindow_(window);
  }

  /**
   * Arms the matched launch window: stores the time, renders the result note
   * with a Clear affordance, and updates the submit-button label so it is clear
   * that the next "Create Launch" will use this window (nothing is launched yet).
   */
  protected applyMatchedWindow_(window: LaunchWindowResult): void {
    this.matchedLaunchTime_ = window.time;

    const note = getEl('nl-window-result', true);

    if (note) {
      const msg = t7e('plugins.NewLaunch.msgs.windowFound' as T7eKey)
        .replace('{time}', `${dateFormat(window.time, 'isoDateTime', true)}z`)
        .replace('{delta}', Math.abs(window.raanError).toFixed(2));
      const clearLabel = t7e('plugins.NewLaunch.buttons.clearWindow' as T7eKey);

      note.innerHTML = html`
        <span class="nl-window-found-text">${msg}</span>
        <button type="button" id="nl-window-clear" class="nl-window-clear"
          kt-tooltip="${clearLabel}" aria-label="${clearLabel}">&#10005;</button>
      `;
      note.style.display = 'flex';
      getEl('nl-window-clear', true)?.addEventListener('click', () => this.clearMatchedWindow_());
    }

    this.updateSubmitLabel_();
  }

  /** Clears the matched launch window (target/site/direction changed, or dismissed). */
  protected clearMatchedWindow_(): void {
    this.matchedLaunchTime_ = null;

    const note = getEl('nl-window-result', true);

    if (note) {
      note.innerHTML = '';
      note.style.display = 'none';
    }

    this.updateSubmitLabel_();
  }

  /** The submit-button label, reflecting an armed launch window when one is set. */
  protected submitButtonLabel_(): string {
    return this.matchedLaunchTime_
      ? t7e('plugins.NewLaunch.buttons.createLaunchAtWindow' as T7eKey)
      : t7e('plugins.NewLaunch.buttons.createLaunchNominal' as T7eKey);
  }

  /** Refreshes the submit-button label unless the inclination guard disabled it. */
  protected updateSubmitLabel_(): void {
    const submitButtonId = `${this.sideMenuElementName}-submit`;
    const dom = getEl(submitButtonId) as HTMLButtonElement | null;

    if (dom && !dom.disabled) {
      this.setActionLabel_(submitButtonId, this.submitButtonLabel_());
    }
  }
  submitCallback: () => void = () => {
    const sccNum = (<HTMLInputElement>getEl('nl-scc')).value.trim();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    // sccNum2Sat accepts the string form directly; parseInt would drop alpha-5/extended.
    const inputSat = catalogManagerInstance.sccNum2Sat(sccNum)!;

    this.executeLaunch_(inputSat);
  };

  /**
   * Core launch execution logic. Finds a nominal satellite slot, creates the
   * nominal satellite, rotates its orbit over the selected launch site, and
   * waits for the position cruncher to process the result.
   *
   * Extracted as a protected method so subclasses can call it with different
   * satellite sources (selected sat, SCC lookup, or custom-built sat).
   */
  protected executeLaunch_(inputSat: Satellite): void {
    if (this.isDoingCalculations_) {
      return;
    }
    this.isDoingCalculations_ = true;

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const uiManagerInstance = ServiceLocator.getUiManager();

    showLoadingSticky();

    const nominalSat = catalogManagerInstance.getNextAvailableAnalystSat();

    if (!nominalSat) {
      uiManagerInstance.toast(t7e('plugins.NewLaunch.errorMsgs.noMoreNominalSatellites' as T7eKey), ToastMsgType.critical);
      this.isDoingCalculations_ = false;
      hideLoading();

      return;
    }

    const id = nominalSat.id;
    const sat = this.createNominalSat_(inputSat, nominalSat.sccNum, id);

    if (!sat) {
      this.isDoingCalculations_ = false;
      hideLoading();

      return;
    }

    this.launchFromSite_(sat, id);
  }

  /**
   * Place the satellite's orbit over the selected launch site (see
   * {@link buildLaunchTle_}), then update the cruncher and wait for propagation
   * results.
   *
   * This is the second half of the launch flow - call it directly when the
   * nominal satellite is already created (e.g. custom orbit mode).
   */
  protected launchFromSite_(sat: Satellite, id: number): void {
    const eMsg = (key: string) => t7e(`plugins.NewLaunch.errorMsgs.${key}` as T7eKey);
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const uiManagerInstance = ServiceLocator.getUiManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    const upOrDown = <'N' | 'S'>(<HTMLInputElement>getEl('nl-updown')).value;
    const launchFac = (<HTMLInputElement>getEl('nl-facility')).value;
    let launchLat: Degrees | null = null;
    let launchLon: Degrees | null = null;

    const launchSite = catalogManagerInstance.launchSites[launchFac];

    launchLat = launchSite.lat;
    launchLon = launchSite.lon;

    if (launchLat === null || launchLon === null) {
      uiManagerInstance.toast(eMsg('launchSiteNotFound').replace('{launchSite}', launchFac), ToastMsgType.critical);

      return;
    }

    if (launchLon > 180) {
      // if West not East
      launchLon = (launchLon - 360) as Degrees; // Convert from 0-360 to -180-180
    }

    /*
     * if (sat.inclination < launchLat) {
     *   uiManagerInstance.toast(`Satellite Inclination Lower than Launch Latitude!`, ToastMsgType.critical);
     *   return;
     * }
     * Set time to 0000z for relative time.
     */
    const today = new Date(); // Need to know today for offset calculation
    const quadZTime = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0); // New Date object of the future collision

    // Date object defaults to local time.
    quadZTime.setUTCHours(0); // Move to UTC Hour

    // A matched launch window overrides the default 0000z launch time so the
    // resulting plane's RAAN lines up with the target satellite's plane.
    const launchTime = this.matchedLaunchTime_ ?? quadZTime;

    const cacheStaticOffset = timeManagerInstance.staticOffset; // Cache the current static offset

    timeManagerInstance.changeStaticOffset(launchTime.getTime() - today.getTime()); // Find the offset from today

    colorSchemeManagerInstance.calculateColorBuffers(true);

    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

    const simulationTimeObj = timeManagerInstance.simulationTimeObj;

    const TLEs = this.buildLaunchTle_(sat, launchLat, launchLon, upOrDown, simulationTimeObj);

    const tle1 = TLEs[0];
    const tle2 = TLEs[1];

    if (tle1 === 'Error' || tle1.length !== 69 || tle2.length !== 69) {
      if (tle1 === 'Error') {
        uiManagerInstance.toast(eMsg('failedToCreateTle').replace('{error}', tle2), ToastMsgType.critical);
      } else if (tle1.length !== 69) {
        uiManagerInstance.toast(eMsg('invalidTle1Length').replace('{tle}', tle1), ToastMsgType.critical);
      } else if (tle2.length !== 69) {
        uiManagerInstance.toast(eMsg('invalidTle2Length').replace('{tle}', tle2), ToastMsgType.critical);
      }

      // We have to change the time for the TLE creation, but it failed, so revert it.
      timeManagerInstance.changeStaticOffset(cacheStaticOffset);
      this.isDoingCalculations_ = false;
      hideLoading();

      return;
    }

    // Prevent caching of old TLEs
    sat.satrec = null as unknown as SatelliteRecord;

    try {
      sat.editTle(tle1, tle2 as TleLine2);
    } catch (e) {
      errorManagerInstance.error(e, 'new-launch.ts', t7e('plugins.NewLaunch.errorMsgs.errorCreatingSatRecord' as T7eKey));

      return;
    }
    if (SatMath.altitudeCheck(sat.satrec, simulationTimeObj) > 1) {
      this.lastLaunchParams = {
        templateSccNum: sat.sccNum,
        launchSiteKey: launchFac,
        launchDirection: upOrDown,
        tle1,
        tle2,
        name: sat.name,
      };

      catalogManagerInstance.satCruncherThread.sendSatEdit(id, tle1, tle2, true);

      const orbitManagerInstance = ServiceLocator.getOrbitManager();

      if (id) {
        orbitManagerInstance.changeOrbitBufferData(id, tle1, tle2);
        catalogManagerInstance.seedDotPosition(id);
      }
    } else {
      uiManagerInstance.toast(eMsg('failedAltitudeTest'), ToastMsgType.critical);
    }

    waitForCruncher({
      cruncher: catalogManagerInstance.satCruncher,
      cb: () => {
        this.isDoingCalculations_ = false;
        hideLoading();

        // Deseletect the satellite
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(sat.id);

        uiManagerInstance.toast(t7e('plugins.NewLaunch.msgs.launchNominalCreated' as T7eKey), ToastMsgType.standby);
        uiManagerInstance.searchManager.doSearch(sat.sccNum);

        uiManagerInstance.toast(t7e('plugins.NewLaunch.msgs.timeRelativeToLaunch' as T7eKey), ToastMsgType.standby);
        ServiceLocator.getSoundManager()?.play(SoundNames.LIFT_OFF);
      },
      validationFunc: (data: PositionCruncherOutgoingMsg) => typeof data.satPos !== 'undefined',
      error: () => {
        if (!this.isDoingCalculations_) {
          // If we are not doing calculations, then it must have finished already.
          return;
        }

        this.isDoingCalculations_ = false;
        hideLoading();
        uiManagerInstance.toast(eMsg('cruncherFailed'), ToastMsgType.critical);
      },
      skipNumber: 2,
      maxRetries: 50,
    });
  }

  /**
   * Builds the launch TLE by placing the template orbit's shape (inclination,
   * eccentricity, mean motion) over the launch site at the launch time, then
   * fitting SGP4 mean elements to that state with `rv2tle`.
   *
   * This replaces the old {@link OrbitFinder} ground-track search (which
   * synthesized candidate TLEs and iterated SGP4 to a ~2.8 km sub-point
   * tolerance). {@link groundTrackStateVector} constructs the exact state
   * analytically - the fitted ground track passes within ~100 m of the site.
   *
   * Returns `['Error', message]` on failure (target latitude unreachable for the
   * inclination, or the fit did not converge) to match the caller's existing
   * error/length handling.
   */
  protected buildLaunchTle_(
    sat: Satellite,
    launchLat: Degrees,
    launchLon: Degrees,
    upOrDown: 'N' | 'S',
    launchTime: Date,
  ): [TleLine1, TleLine2] | ['Error', string] {
    const eMsg = (key: string) => t7e(`plugins.NewLaunch.errorMsgs.${key}` as T7eKey);
    const deg2rad = Math.PI / 180;

    const state = groundTrackStateVector({
      semimajorAxisKm: semimajorAxisFromMeanMotion(sat.meanMotion),
      eccentricity: sat.eccentricity,
      inclinationRad: (sat.inclination * deg2rad) as Radians,
      latRad: (launchLat * deg2rad) as Radians,
      lonRad: (launchLon * deg2rad) as Radians,
      gmstRad: calcGmst(launchTime).gmst as GreenwichMeanSiderealTime,
      direction: upOrDown,
    });

    if (!state) {
      // The launch latitude exceeds what this inclination can reach.
      return ['Error', eMsg('launchLatExceedsInclination')];
    }

    const fit = rv2tle(launchTime, state.position, state.velocity, { maxIterations: 30, toleranceKm: 1e-4 });

    if (!fit) {
      return ['Error', eMsg('failedToFitOrbit')];
    }

    // rv2tle stamps a fixed 5-char satnum ("00001"); restore the nominal sat's
    // satnum (cols 3-7 of its TLE) so the created object keeps its catalog identity.
    const satNum = sat.tle1.substring(2, 7);
    const tle1 = `1 ${satNum}${fit.tle1.substring(7)}` as TleLine1;
    const tle2 = `2 ${satNum}${fit.tle2.substring(7)}` as TleLine2;

    return [tle1, tle2];
  }

  addJs(): void {
    super.addJs();
    this.registerSelectSatListener_();

    // Style the v13 menu's Materialize <select>s once the DOM is built.
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      const menuRoot = getEl(this.sideMenuElementName);

      if (menuRoot) {
        initMaterialSelects(menuRoot);
      }

      // Launch-window matching. The matched time is only valid for the
      // facility/direction/target it was computed with, so changing either
      // input invalidates it.
      getEl('nl-match-plane', true)?.addEventListener('click', () => {
        this.onMatchTargetPlane_();
      });
      getEl('nl-facility', true)?.addEventListener('change', () => {
        this.clearMatchedWindow_();
      });
      getEl('nl-updown', true)?.addEventListener('change', () => {
        this.clearMatchedWindow_();
      });
    });
  }

  /**
   * Wires the selectSatData event to the OSS form (fills `nl-scc` and toggles the
   * bottom icon). Extracted as a protected hook so pro subclasses with different
   * form HTML can override it (e.g. as a no-op) while still calling `super.addJs()`.
   */
  protected registerSelectSatListener_(): void {
    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj: BaseObject) => {
        if (obj?.isSatellite()) {
          const sat = obj as Satellite;
          const sccEl = getEl('nl-scc') as HTMLInputElement | null;

          if (sccEl && sccEl.value !== sat.sccNum) {
            sccEl.value = sat.sccNum;
            // New target satellite invalidates a previously matched window
            this.clearMatchedWindow_();
          }
          this.setBottomIconToEnabled();
        } else if (obj?.type === SpaceObjectType.LAUNCH_SITE) {
          this.selectLaunchSite(obj as LaunchSite);
        } else {
          this.setBottomIconToDisabled();
        }
      },
    );
  }

  selectLaunchSite(launchSite: LaunchSite): void {
    // Find the key for the launch site in launchSites by matching the name
    const launchSiteKey = Object.keys(launchSites).find((key) => {
      const site = launchSites[key];

      return site.name === launchSite.name && site.site === launchSite.site;
    });

    if (launchSiteKey) {
      const launchSiteSelect = <HTMLSelectElement>getEl('nl-facility');

      // Set the value of the launch site select element
      launchSiteSelect.value = launchSiteKey;
      // Trigger change event to update the UI
      launchSiteSelect.dispatchEvent(new Event('change'));

      if (launchSites[launchSiteKey].defaultDir) {
        const launchSiteDropdown = <HTMLSelectElement>getEl('nl-updown');

        launchSiteDropdown.value = launchSites[launchSiteKey].defaultDir;
        launchSiteDropdown.name = launchSites[launchSiteKey].defaultDir === 'N' ? 'North' : 'South';
        launchSiteDropdown.dispatchEvent(new Event('change'));
      }
    } else {
      errorManagerInstance.warn(t7e('plugins.NewLaunch.errorMsgs.launchSiteNotInCatalog' as T7eKey).replace('{name}', launchSite.name));
    }
  }

  protected preValidate_(sat: Satellite): void {
    // Get Current LaunchSiteOptionValue
    const launchSiteOptionValue = (<HTMLInputElement>getEl('nl-facility')).value;
    const launchSite = launchSites[launchSiteOptionValue];

    // Guard against an empty/unknown facility value (no selection yet) - reading
    // .lat off undefined would throw and abort the bottom-icon callback.
    if (!launchSite) {
      return;
    }

    const lat = launchSite.lat;
    let inc = sat.inclination;

    inc = inc > 90 ? ((180 - inc) as Degrees) : inc;

    const submitButtonId = `${this.sideMenuElementName}-submit`;
    const submitButtonDom = getEl(submitButtonId) as HTMLButtonElement | null;

    if (!submitButtonDom) {
      return;
    }

    if (inc < lat) {
      submitButtonDom.disabled = true;
      this.setActionLabel_(submitButtonId, t7e('plugins.NewLaunch.buttons.inclinationTooLow' as T7eKey));
    } else {
      submitButtonDom.disabled = false;
      this.setActionLabel_(submitButtonId, this.submitButtonLabel_());
    }
  }

  protected createNominalSat_(inputParams: Satellite, scc: string, id: number): Satellite | null {
    const eMsg = (key: string) => t7e(`plugins.NewLaunch.errorMsgs.${key}` as T7eKey);
    const country = inputParams.country;
    const type = inputParams.type;
    const intl = `${inputParams.epochYear}69B`; // International designator

    // Verify ecen, epochyr, epochday formats
    const eccFrac = inputParams.eccentricity.toString().split('.')[1] ?? '0';

    if (!(/^\d{7}$/u).test(eccFrac.padStart(7, '0'))) {
      ServiceLocator.getUiManager().toast(eMsg('invalidEccentricityFormat'), ToastMsgType.critical, true);
      errorManagerInstance.warn(eMsg('eccentricityFormatIssue'));
    }

    if (!(/^\d{2}$/u).test(inputParams.epochYear.toString()?.padStart(2, '0'))) {
      ServiceLocator.getUiManager().toast(eMsg('invalidEpochYearFormat'), ToastMsgType.critical, true);
      errorManagerInstance.warn(eMsg('epochYearFormatIssue'));
    }

    if (!(/^(?:\d{3}\.\d{8})$/u).test(inputParams.epochDay.toFixed(8).padStart(12, '0'))) {
      ServiceLocator.getUiManager().toast(eMsg('invalidEpochDayFormat'), ToastMsgType.critical, true);
      errorManagerInstance.warn(eMsg('epochDayFormatIssue'));
    }

    // Create TLE from parameters
    const { tle1: tle1_, tle2 } = FormatTle.createTle({
      sat: inputParams,
      inc: inputParams.inclination,
      meanmo: inputParams.meanMotion,
      rasc: inputParams.rightAscension,
      argPe: inputParams.argOfPerigee,
      meana: inputParams.meanAnomaly,
      ecen: inputParams.eccentricity.toString().split('.')[1].padStart(7, '0'),
      epochyr: inputParams.epochYear.toString().padStart(2, '0'),
      epochday: inputParams.epochDay.toString().padStart(3, '0'),
      intl,
      scc,
    });

    // Check if TLE generation failed
    if (tle1_ === 'Error') {
      errorManagerInstance.error(
        new Error(tle2),
        'create-sat.ts',
        t7e('plugins.CreateSat.errorMsgs.errorCreatingSat'),
      );

      return null;
    }

    const currentEpoch = TimeManager.currentEpoch(ServiceLocator.getTimeManager().simulationTimeObj);

    const tle1 = (tle1_.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + tle1_.substr(32)) as TleLine1;

    // Create satellite record from TLE
    let satrec: SatelliteRecord;

    try {
      satrec = Sgp4.createSatrec(tle1, tle2);
    } catch (e) {
      errorManagerInstance.error(e as Error, 'create-sat.ts', eMsg('errorCreatingSatRecord'));

      return null;
    }

    // Validate altitude is reasonable
    if (SatMath.altitudeCheck(satrec, ServiceLocator.getTimeManager().simulationTimeObj) <= 1) {
      ServiceLocator.getUiManager().toast(
        eMsg('failedToPropagate'),
        ToastMsgType.caution,
        true,
      );

      return null;
    }

    // Propagate satellite to get position and velocity
    const spg4vec = Sgp4.propagate(satrec, 0);
    const pos = spg4vec.position as TemeVec3;
    const vel = spg4vec.velocity as TemeVec3<KilometersPerSecond>;

    // Create new satellite object
    const info: SatelliteParams = {
      id,
      type,
      country,
      tle1,
      tle2,
      name: 'New Launch Nominal',
    };

    const newSat = new Satellite({
      ...info,
      ...{
        position: pos,
        velocity: vel,
        source: 'User Created',
      },
    });

    newSat.active = true;

    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    // Add to catalog
    catalogManagerInstance.objectCache[id] = newSat;

    // Update orbit buffer
    try {
      ServiceLocator.getOrbitManager().changeOrbitBufferData(id, tle1, tle2);
    } catch (e) {
      errorManagerInstance.error(e as Error, 'create-sat.ts', eMsg('changingOrbitBufferFailed'));

      return null;
    }

    return newSat;
  }
}
