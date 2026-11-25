/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * visible-tonight.ts is a pass planner for new and casual users: allow your
 * location once, see the next few nights' bright passes in plain words, and add
 * one to your calendar in a single tap.
 *
 * DESIGN NOTE (#1468): this menu is meant to be accessible to new users, not
 * customizable. There are deliberately no settings, sensors or tables here;
 * the fixed defaults live in VISIBLE_TONIGHT_DEFAULTS. Users who want control
 * have Best Passes, Look Angles and the Pro tools. Please keep it that way
 * rather than growing options into it.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { SatMath } from '@app/app/analysis/sat-math';
import { estimateStdMag } from '@app/app/analysis/std-mag-estimator';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SensorMath } from '@app/app/sensors/sensor-math';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, IDragOptions, IHelpConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { getStaleGpThresholdHours, gpAgeHours, gpEpochMs, isGpStale } from '@app/engine/utils/gp-age';
import { t7e } from '@app/locales/keys';
import { calcGmst, Degrees, Kilometers, lla2eci, Satellite, Sun, solarPhaseAngle, TemeVec3 } from '@ootk/src/main';
import telescopePng from '@public/img/icons/telescope.png';
import { saveAs } from 'file-saver';
import i18next from 'i18next';
import { findPassesForSat } from '../best-pass/best-pass-calculator';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { compassPoint, findVisiblePasses, VISIBLE_TONIGHT_DEFAULTS, VisiblePass, VisibleTonightTarget } from './visible-tonight-calc';
import { buildIcs, icsFileName } from './visible-tonight-ics';
import './visible-tonight.css';

/** Always searched when loaded: the brightest, best-known objects. ISS, Tiangong (Tianhe), Hubble. */
export const VISIBLE_TONIGHT_CURATED = ['25544', '48274', '20580'] as const;

/** Besides the curated list, this many of the brightest low-orbit catalog objects are searched. */
export const VISIBLE_TONIGHT_EXTRA_TARGETS = 12;

/** Catalog objects must be at least this bright (standard magnitude) to be searched at all. */
const MAX_CANDIDATE_STD_MAG = 4;

/**
 * Only low-orbit objects are searched: above this apogee (km) an object spends its passes thousands of
 * km away and is far too faint (a bright rocket body in GTO is about magnitude 11 from 30,000 km).
 */
const MAX_CANDIDATE_APOGEE_KM = 2000;

/** Coarse pass-search step (s); best-pass-calculator bisects the edges to the second. */
const PASS_SEARCH_STEP_SEC = 30;

/** Reminder offset written into the calendar event. */
const ALARM_MINUTES_BEFORE = 10;

export type VisibleTonightStatus = 'needLocation' | 'locating' | 'denied' | 'searching' | 'ready' | 'noCatalog' | 'staleCatalog';

interface Observer {
  lat: number;
  lon: number;
  altKm: number;
}

type VisibleTonightKey = Parameters<typeof t7e>[0];
const tr = (key: string, params?: Record<string, string | number>): string => t7e(`plugins.VisibleTonight.${key}` as VisibleTonightKey, params);
/** Shared labels reuse other plugins' keys (docs/claude v13 checklist), so the wording matches in every language. */
const shared = (key: 'labels.dataActions' | 'labels.results' | 'toolbar.refresh'): string => t7e(`plugins.Reentries.${key}` as VisibleTonightKey);
const coordLabel = (key: 'latitude' | 'longitude'): string => t7e(`plugins.CustomSensorPlugin.labels.${key}` as VisibleTonightKey);

/** "40.71° N, 74.01° W" with the compass letters translated. */
export const formatCoords = (lat: number, lon: number): string =>
  `${Math.abs(lat).toFixed(2)}° ${tr(lat >= 0 ? 'compass.N' : 'compass.S')}, ${Math.abs(lon).toFixed(2)}° ${tr(lon >= 0 ? 'compass.E' : 'compass.W')}`;

/** Parses a typed coordinate ("40.7128", "-74,006"); null unless it is a finite number within ±limit. */
export const parseCoordinate = (text: string, limit: number): number | null => {
  const trimmed = text.trim().replace(',', '.');

  if (!/^[+-]?\d+(\.\d+)?$/u.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);

  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
};

/** "7:42 PM" in the viewer's language and time zone. */
const formatClock = (epochMs: number): string => new Intl.DateTimeFormat(i18next.language, { hour: 'numeric', minute: '2-digit' }).format(epochMs);

/** "Tonight", "Tomorrow" or "Wednesday", from the viewer's local calendar day. */
export const dayLabel = (epochMs: number, nowMs: number): string => {
  const startOfDay = (ms: number) => {
    const date = new Date(ms);

    date.setHours(0, 0, 0, 0);

    return date.getTime();
  };
  const days = Math.round((startOfDay(epochMs) - startOfDay(nowMs)) / 86_400_000);

  if (days === 0) {
    return new Date(epochMs).getHours() >= 17 ? tr('day.tonight') : tr('day.today');
  }
  if (days === 1) {
    return tr('day.tomorrow');
  }

  return new Intl.DateTimeFormat(i18next.language, { weekday: 'long' }).format(epochMs);
};

export class VisibleTonight extends KeepTrackPlugin {
  readonly id = 'VisibleTonight';
  dependencies_ = [];

  protected status_: VisibleTonightStatus = 'needLocation';
  protected observer_: Observer | null = null;
  protected passes_: VisiblePass[] = [];
  /** True while the Latitude/Longitude form is open. */
  protected isEditingLocation_ = false;
  private searchToken_ = 0;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  /** Bottom icon in the Events group: the menu's entry point on desktop and in the phone drawer. */
  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'visible-tonight-bottom-icon',
      label: tr('bottomIconLabel'),
      image: telescopePng,
      menuMode: [MenuMode.EVENTS, MenuMode.ALL],
    };
  }

  /** Opening the menu searches again when a location is known, so "tonight" is always relative to now. */
  onBottomIconClick(): void {
    if (!this.isMenuButtonActive) {
      return;
    }

    // Location already known: refresh straight away so "tonight" is always relative to now.
    if (this.observer_) {
      this.search_();
    } else {
      this.render_();
    }
  }

  /** Bridges the legacy bottom-icon event to onBottomIconClick (docs/claude architecture). */
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  /** Side menu: the Data Actions and Results cards, resizable like other v13 menus. */
  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'visible-tonight-menu',
      title: tr('title'),
      html: VisibleTonight.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  /** The v13 standard width range (400 to 550 px), as in Catalog Management. */
  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 400,
      maxWidth: 550,
    };
  }

  /** Help panel: what the menu does and how to use it, in plain words. */
  getHelpConfig(): IHelpConfig {
    return {
      title: tr('title'),
      sections: [
        { heading: t7e('help.overview'), content: tr('help.overview') },
        { heading: t7e('help.howToUse'), content: tr('help.howToUse') },
      ],
      tips: [tr('help.tip1'), tr('help.tip2')],
    };
  }

  // =========================================================================
  // Side menu HTML
  // =========================================================================

  /** Static menu markup. Rows are added later with DOM APIs (textContent only), never through this template. */
  private static buildSideMenuHtml_(): string {
    return html`
      <div id="visible-tonight-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="visible-tonight-content" class="side-menu">
          <section class="kt-section">
            <div class="kt-section-label">${shared('labels.dataActions')}</div>
            <p id="visible-tonight-status" class="visible-tonight-status" role="status"></p>
            <p id="visible-tonight-location" class="visible-tonight-location">
              <span id="visible-tonight-location-text"></span>
              <button id="visible-tonight-edit-btn" class="visible-tonight-link" type="button">${tr('location.enter')}</button>
            </p>
            <form id="visible-tonight-location-form" class="visible-tonight-location-form" novalidate hidden>
              <div class="kt-field-row">
                <div class="input-field col s6">
                  <input id="visible-tonight-lat" type="text" inputmode="decimal" autocomplete="off" />
                  <label for="visible-tonight-lat" class="active">${coordLabel('latitude')}</label>
                </div>
                <div class="input-field col s6">
                  <input id="visible-tonight-lon" type="text" inputmode="decimal" autocomplete="off" />
                  <label for="visible-tonight-lon" class="active">${coordLabel('longitude')}</label>
                </div>
              </div>
              <p id="visible-tonight-location-error" class="kt-note visible-tonight-error" role="alert"></p>
              <button id="visible-tonight-apply-btn" class="kt-action waves-effect" type="submit">
                <span class="kt-action-label">${tr('location.apply')}</span>
              </button>
              <button id="visible-tonight-cancel-btn" class="visible-tonight-link" type="button">${t7e('modalConfirm.cancel' as VisibleTonightKey)}</button>
            </form>
            <button id="visible-tonight-locate-btn" class="kt-action waves-effect" type="button">
              <span id="visible-tonight-locate-label" class="kt-action-label">${tr('useMyLocation')}</span>
            </button>
          </section>
          <section id="visible-tonight-results" class="kt-section" hidden>
            <div class="kt-section-label">${shared('labels.results')}</div>
            <ol id="visible-tonight-list" class="visible-tonight-list" aria-label="${tr('title')}"></ol>
          </section>
          <p class="kt-note visible-tonight-note">${tr('privacyNote')}</p>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /** Registers for uiManagerFinal, when the menu's DOM exists and its listeners can be attached. */
  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  /** Wires the location button, the location form and the pass list (one delegated click listener). */
  private uiManagerFinal_(): void {
    // One button: "Use my location" until a position is known, then "Refresh" (search again, no new prompt).
    getEl('visible-tonight-locate-btn', true)?.addEventListener('click', () => {
      if (this.hasUsableLocation_()) {
        this.search_();
      } else {
        this.locate_();
      }
    });

    getEl('visible-tonight-edit-btn', true)?.addEventListener('click', () => {
      this.openLocationForm_();
    });
    getEl('visible-tonight-cancel-btn', true)?.addEventListener('click', () => {
      this.isEditingLocation_ = false;
      this.render_();
    });
    getEl('visible-tonight-location-form', true)?.addEventListener('submit', (evt: Event) => {
      evt.preventDefault();
      this.applyTypedLocation_();
    });

    getEl('visible-tonight-list', true)?.addEventListener('click', (evt: Event) => {
      const target = evt.target as HTMLElement | null;
      const calendarBtn = target?.closest<HTMLButtonElement>('button.visible-tonight-calendar');
      const rowBtn = target?.closest<HTMLButtonElement>('button.visible-tonight-row');
      const index = Number((calendarBtn ?? rowBtn)?.dataset.index);
      const pass = Number.isInteger(index) ? this.passes_[index] : undefined;

      if (!pass) {
        return;
      }
      if (calendarBtn) {
        this.downloadIcs_(pass);
      } else {
        this.showPass_(pass);
      }
    });

    this.render_();
  }

  // =========================================================================
  // Location
  // =========================================================================

  /** Asks the browser once. The position stays in memory: it is never stored or sent anywhere. */
  protected locate_(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.setStatus_('denied');

      return;
    }

    this.setStatus_('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.observer_ = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          altKm: typeof position.coords.altitude === 'number' ? position.coords.altitude / 1000 : 0,
        };
        this.isEditingLocation_ = false;
        this.search_();
      },
      (err) => {
        // Console only: errorManagerInstance.log toasts on localhost, and the status line already explains it.
        console.warn(`VisibleTonight: location unavailable (${err.code})`);
        this.setStatus_('denied');
      },
      { maximumAge: 10 * 60_000, timeout: 20_000 }
    );
  }

  /** Opens the Latitude/Longitude form, filled with the current location when there is one (#1468). */
  protected openLocationForm_(): void {
    const latInput = getEl('visible-tonight-lat', true) as HTMLInputElement | null;
    const lonInput = getEl('visible-tonight-lon', true) as HTMLInputElement | null;

    if (latInput && lonInput) {
      latInput.value = this.observer_ ? this.observer_.lat.toFixed(4) : '';
      lonInput.value = this.observer_ ? this.observer_.lon.toFixed(4) : '';
    }
    VisibleTonight.setLocationError_('');
    this.isEditingLocation_ = true;
    this.render_();
    latInput?.focus();
  }

  /** Uses a typed location, so people can also plan for somewhere they will be later. */
  protected applyTypedLocation_(): void {
    const lat = parseCoordinate((getEl('visible-tonight-lat', true) as HTMLInputElement | null)?.value ?? '', 90);
    const lon = parseCoordinate((getEl('visible-tonight-lon', true) as HTMLInputElement | null)?.value ?? '', 180);

    if (lat === null || lon === null) {
      VisibleTonight.setLocationError_(tr('location.invalid'));

      return;
    }

    this.observer_ = { lat, lon, altKm: 0 };
    this.isEditingLocation_ = false;
    // Close the form now, not only once the search re-renders.
    this.render_();
    this.search_();
  }

  /** Shows (or clears, with '') the validation message under the location form. */
  private static setLocationError_(message: string): void {
    const errorEl = getEl('visible-tonight-location-error', true);

    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  // =========================================================================
  // Search
  // =========================================================================

  /**
   * Runs the search one object at a time, yielding between objects so the
   * globe keeps rendering. A newer search makes an older one stop quietly.
   */
  protected async search_(): Promise<void> {
    const observer = this.observer_;

    if (!observer) {
      this.setStatus_('needLocation');

      return;
    }

    const token = ++this.searchToken_;
    const fromMs = Date.now();
    const sats = VisibleTonight.candidates_();

    if (sats.length === 0) {
      this.setStatus_('noCatalog');

      return;
    }

    this.setStatus_('searching');

    const sensor = VisibleTonight.observerSensor_(observer);
    const staleHours = getStaleGpThresholdHours();
    const found: VisiblePass[] = [];
    let staleObjects = 0;

    for (const sat of sats) {
      // biome-ignore lint/performance/noAwaitInLoops: sequential await is the yield that lets the globe render between satellites
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (token !== this.searchToken_) {
        return;
      }

      try {
        found.push(
          ...findVisiblePasses(
            [
              VisibleTonight.target_(sat, sensor, staleHours, (scope) => {
                if (scope === 'object') {
                  staleObjects++;
                }
              }),
            ],
            fromMs
          )
        );
      } catch (err) {
        console.warn(`VisibleTonight: skipped ${sat.sccNum} (${(err as Error).message})`);
      }
    }

    this.passes_ = found.sort((a, b) => a.startMs - b.startMs).slice(0, VISIBLE_TONIGHT_DEFAULTS.maxRows);
    /*
     * "Data too old" only when every object was already stale at the start (the offline catalog). Late passes
     * dropped for staleness are routine with live data, so on their own they still mean "no bright passes".
     */
    this.setStatus_(this.passes_.length === 0 && staleObjects === sats.length ? 'staleCatalog' : 'ready');
  }

  /** Curated objects first, then the brightest low-orbit catalog objects. */
  private static candidates_(): Satellite[] {
    const catalogManager = ServiceLocator.getCatalogManager();
    const curated: Satellite[] = [];

    for (const norad of VISIBLE_TONIGHT_CURATED) {
      const id = catalogManager.sccNum2Id(norad, false);
      const obj = id === null ? null : catalogManager.getObject(id);

      // Without a standard magnitude there is no brightness estimate, so the object could never be listed.
      if (obj instanceof Satellite && typeof estimateStdMag(obj) === 'number') {
        curated.push(obj);
      }
    }

    const curatedNorads = new Set(curated.map((sat) => sat.sccNum));
    const bright = catalogManager
      .getSats()
      .filter((sat) => sat.active !== false && sat.apogee < MAX_CANDIDATE_APOGEE_KM && !curatedNorads.has(sat.sccNum))
      .map((sat) => ({ sat, mag: estimateStdMag(sat) }))
      .filter((entry): entry is { sat: Satellite; mag: number } => typeof entry.mag === 'number' && entry.mag <= MAX_CANDIDATE_STD_MAG)
      .sort((a, b) => a.mag - b.mag)
      .slice(0, VISIBLE_TONIGHT_EXTRA_TARGETS)
      .map((entry) => entry.sat);

    return [...curated, ...bright];
  }

  /** The user's location as an all-sky "sensor" with a 10 deg floor, so the shared pass search can run on it. */
  private static observerSensor_(observer: Observer): DetailedSensor {
    return new DetailedSensor({
      name: 'Visible Tonight',
      lat: observer.lat as Degrees,
      lon: observer.lon as Degrees,
      alt: observer.altKm as Kilometers,
      minAz: 0 as Degrees,
      maxAz: 360 as Degrees,
      minEl: VISIBLE_TONIGHT_DEFAULTS.minPeakElDeg as Degrees,
      maxEl: 90 as Degrees,
      minRng: 0 as Kilometers,
      maxRng: 100_000 as Kilometers,
    });
  }

  /**
   * Wires one satellite to the app's pass search, look angles and lighting. A pass is dropped when the
   * element set is stale at its start (gp-age, the user's staleGpThresholdHours, default 72 h), as the
   * pass tables measure it. `onStale` reports a dropped pass ('pass') or an object already stale at the
   * start of the search ('object'), so the menu can tell "data too old" from "no passes".
   */
  private static target_(sat: Satellite, sensor: DetailedSensor, staleHours: number, onStale: (scope: 'object' | 'pass') => void): VisibleTonightTarget {
    const { satrec } = sat;
    const epochMs = gpEpochMs(sat.epochYear, sat.epochDay);
    /** True when this element set is older than the stale threshold at `ms` (gp-age). */
    const isStaleAt = (ms: number): boolean => isGpStale(gpAgeHours(epochMs, ms), staleHours);
    /** ECI position (km) at `ms`, or null when SGP4 cannot propagate (SatMath.getEci returns the origin then). */
    const eciAt = (ms: number): TemeVec3<Kilometers> | null => {
      const position = SatMath.getEci(sat, new Date(ms)).position as TemeVec3<Kilometers>;

      return position.x === 0 && position.y === 0 && position.z === 0 ? null : position;
    };

    return {
      norad: sat.sccNum,
      name: sat.name,
      stdMag: estimateStdMag(sat) ?? Number.NaN,
      passes: (fromMs, toMs) => {
        // Already stale at the start (e.g. the months-old offline catalog): no pass can be trusted, skip the search.
        if (isStaleAt(fromMs)) {
          onStale('object');

          return [];
        }

        return findPassesForSat(
          sat.sccNum,
          satrec,
          sensor,
          { lengthDays: (toMs - fromMs) / 86_400_000, intervalSec: PASS_SEARCH_STEP_SEC },
          {
            baseTimeMs: fromMs,
            getRae: (date, rec, obs) => SatMath.getRae(date, rec, obs, true),
            checkIsInView: (obs, rae) => SatMath.checkIsInView(obs, rae as Parameters<typeof SatMath.checkIsInView>[1]),
            sunEciKm: (date) => Sun.eci(date) as unknown as TemeVec3<Kilometers>,
          }
        )
          .passes.map((row) => ({ riseMs: Number(row.START_DTG), setMs: Number(row.START_DTG) + (row.TIME_IN_COVERAGE_SECONDS ?? 0) * 1000 }))
          .filter((pass) => {
            if (isStaleAt(pass.riseMs)) {
              onStale('pass');

              return false;
            }

            return true;
          });
      },
      lookAngle: (ms) => {
        const rae = SatMath.getRae(new Date(ms), satrec, sensor, true);

        return rae.az === null || rae.el === null || rae.rng === null ? null : { az: rae.az, el: rae.el, rng: rae.rng };
      },
      // The app-wide optical rule (SensorMath.getLightingState): sunlit outside the umbra, site dark at or below -12 deg.
      isVisible: (ms) => {
        const { sunlit, siteDark } = SensorMath.getLightingState(eciAt(ms), sensor, new Date(ms));

        return sunlit === true && siteDark === true;
      },
      /*
       * Not SatMath.calculateVisMag: it takes the phase angle from sat.position (where the object is now),
       * so it cannot score a pass days ahead. The same Lambert formula runs in visible-tonight-calc via
       * OOTK's apparentVmagFromStdMag, with the position propagated to the pass time here.
       */
      phaseAngle: (ms) => {
        const position = eciAt(ms);

        if (position === null) {
          return null;
        }
        const date = new Date(ms);
        const observerEci = lla2eci(sensor.llaRad(), calcGmst(date).gmst);
        const phase = solarPhaseAngle(position, Sun.eci(date), observerEci);

        return Number.isFinite(phase) ? phase : null;
      },
    };
  }

  // =========================================================================
  // Actions
  // =========================================================================

  /** Selects the object and moves the clock to the pass's highest point, keeping play or pause. */
  protected showPass_(pass: VisiblePass): void {
    const catalogManager = ServiceLocator.getCatalogManager();
    const id = catalogManager.sccNum2Id(pass.norad, false);

    if (id === null) {
      return;
    }

    ServiceLocator.getTimeManager().changeSimulationTime(pass.peakMs);
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(id);
    EventBus.getInstance().emit(EventBusEvent.pluginActionUsed, this.id, { satId: id });
  }

  /** Saves the pass as a one-event .ics with a reminder; built in the browser, nothing is sent anywhere. */
  protected downloadIcs_(pass: VisiblePass): void {
    const ics = buildIcs({
      uid: `${pass.norad}-${Math.round(pass.startMs / 1000)}@visible-tonight.keeptrack.space`,
      startMs: pass.startMs,
      endMs: pass.endMs,
      summary: tr('ics.summary', { name: pass.name }),
      description: this.describePass_(pass),
      alarmMinutesBefore: ALARM_MINUTES_BEFORE,
    });

    saveAs(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), icsFileName(pass.name, pass.startMs));
    EventBus.getInstance().emit(EventBusEvent.pluginActionUsed, this.id, { eventId: 'ics' });
  }

  /** One plain-language sentence: where to look, how high and how bright. */
  protected describePass_(pass: VisiblePass): string {
    return tr('ics.description', {
      time: formatClock(pass.startMs),
      from: tr(`compass.${compassPoint(pass.startAz)}`),
      to: tr(`compass.${compassPoint(pass.endAz)}`),
      height: VisibleTonight.heightText_(pass.peakEl),
      brightness: tr(`brightness.${pass.level}`),
      minutes: Math.max(1, Math.round((pass.endMs - pass.startMs) / 60_000)),
    });
  }

  /** "high overhead" above 60 deg, otherwise "up to 35°". */
  private static heightText_(peakEl: number): string {
    return peakEl >= 60 ? tr('height.overhead') : tr('height.upTo', { deg: Math.round(peakEl) });
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  /** Records the menu state and redraws. */
  protected setStatus_(status: VisibleTonightStatus): void {
    this.status_ = status;
    this.render_();
  }

  /** A position is known and the browser has not since refused it. */
  private hasUsableLocation_(): boolean {
    return this.observer_ !== null && this.status_ !== 'denied';
  }

  /** Redraws the whole menu from the current state: status, location line or form, main button and rows. */
  protected render_(): void {
    const statusEl = getEl('visible-tonight-status', true);
    const locateBtn = getEl('visible-tonight-locate-btn', true) as HTMLButtonElement | null;
    const locateLabel = getEl('visible-tonight-locate-label', true);
    const resultsEl = getEl('visible-tonight-results', true);
    const listEl = getEl('visible-tonight-list', true);
    const isBusy = this.status_ === 'locating' || this.status_ === 'searching';
    const locationRow = getEl('visible-tonight-location', true);
    const locationText = getEl('visible-tonight-location-text', true);
    const editBtn = getEl('visible-tonight-edit-btn', true);
    const form = getEl('visible-tonight-location-form', true);

    // Location line: the detected or typed position with Change, or a way to type one when there is none.
    if (locationRow) {
      locationRow.hidden = this.isEditingLocation_;
    }
    if (locationText) {
      locationText.textContent = this.observer_ ? tr('location.current', { coords: formatCoords(this.observer_.lat, this.observer_.lon) }) : '';
    }
    if (editBtn) {
      editBtn.textContent = this.observer_ ? tr('location.change') : tr('location.enter');
      (editBtn as HTMLButtonElement).disabled = isBusy;
    }
    if (form) {
      form.hidden = !this.isEditingLocation_;
    }

    if (statusEl) {
      statusEl.dataset.status = this.status_;
      statusEl.textContent = this.statusText_();
    }

    if (locateBtn) {
      // The form has its own apply button; hiding this one avoids two similar actions side by side.
      locateBtn.hidden = this.isEditingLocation_;
      locateBtn.disabled = isBusy;
      locateBtn.setAttribute('aria-busy', String(isBusy));
    }
    if (locateLabel) {
      locateLabel.textContent = this.hasUsableLocation_() ? shared('toolbar.refresh') : tr('useMyLocation');
    }

    const rows = this.status_ === 'ready' ? this.passes_.map((pass, index) => this.buildRow_(pass, index)) : [];

    listEl?.replaceChildren(...rows);
    if (resultsEl) {
      // The Results card appears only when there is something to show; the status line covers every other state.
      resultsEl.hidden = rows.length === 0;
    }
  }

  /** The status line for the current state. */
  private statusText_(): string {
    switch (this.status_) {
      case 'needLocation':
        return tr('status.needLocation');
      case 'locating':
        return tr('status.locating');
      case 'denied':
        return tr('status.denied');
      case 'searching':
        return tr('status.searching');
      case 'noCatalog':
        return tr('status.noCatalog');
      case 'staleCatalog':
        return tr('status.staleCatalog');
      case 'ready':
      default:
        return this.passes_.length > 0 ? tr('status.ready', { nights: VISIBLE_TONIGHT_DEFAULTS.windowDays }) : tr('status.none', { nights: VISIBLE_TONIGHT_DEFAULTS.windowDays });
    }
  }

  /** Built with DOM APIs (textContent only): names come from catalog data. */
  private buildRow_(pass: VisiblePass, index: number): HTMLLIElement {
    const item = document.createElement('li');

    item.className = 'visible-tonight-item';

    const row = document.createElement('button');

    row.type = 'button';
    row.className = 'visible-tonight-row';
    row.dataset.index = String(index);

    const name = document.createElement('span');

    name.className = 'visible-tonight-name';
    name.textContent = pass.name;

    const when = document.createElement('span');

    when.className = 'visible-tonight-when';
    when.textContent = `${dayLabel(pass.startMs, Date.now())} · ${formatClock(pass.startMs)}`;

    const path = document.createElement('span');

    path.className = 'visible-tonight-path';
    path.textContent = tr('path', {
      from: tr(`compass.${compassPoint(pass.startAz)}`),
      height: VisibleTonight.heightText_(pass.peakEl),
      to: tr(`compass.${compassPoint(pass.endAz)}`),
    });

    const meta = document.createElement('span');

    meta.className = `visible-tonight-meta visible-tonight-meta--${pass.level}`;
    meta.textContent = `${tr(`brightness.${pass.level}`)} · ${tr('minutes', { minutes: Math.max(1, Math.round((pass.endMs - pass.startMs) / 60_000)) })}`;

    row.append(name, when, path, meta);
    row.setAttribute('aria-label', `${pass.name}. ${this.describePass_(pass)}`);

    const calendar = document.createElement('button');

    calendar.type = 'button';
    calendar.className = 'visible-tonight-calendar';
    calendar.dataset.index = String(index);
    calendar.textContent = tr('addToCalendar');
    calendar.setAttribute('aria-label', `${tr('addToCalendar')}: ${pass.name}, ${dayLabel(pass.startMs, Date.now())} ${formatClock(pass.startMs)}`);

    item.append(row, calendar);

    return item;
  }
}
