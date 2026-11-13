/* eslint-disable max-statements */
/* eslint-disable max-lines */
import { findGeoRegion, getGeoRegionName } from '@app/app/analysis/geo-region-lookup';
import { SatMath } from '@app/app/analysis/sat-math';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { PhasedOrbitSatellite } from '@app/app/objects/phased-orbit-satellite';
import { SolarBody } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { CelestialBody } from '@app/engine/rendering/draw-manager/celestial-bodies/celestial-body';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { getStaleGpThresholdHours, isGpStale } from '@app/engine/utils/gp-age';
import { t7e } from '@app/locales/keys';
import { BaseObject, eci2lla, Kilometers, MINUTES_PER_DAY, Satellite, Tle, TleLine1 } from '@ootk/src/main';
import i18next from 'i18next';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { setValueWithInfo } from '../sat-info-box/info-value';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { classifyOrbitRegime } from './orbit-regime';
import { getMarineIndex, getRegionIndex, loadMarineIndex, loadRegionIndex } from './region-data';
import { EL, SECTIONS } from './sat-info-box-orbital-html';
import { screeningSigmasKm } from './screening-sigmas';
import { findWaterBody } from './water-bodies';

/** Localized placeholder for values that cannot be shown. */
const notAvailableText = (): string => t7e('SatInfoBoxOrbital.notAvailable' as Parameters<typeof t7e>[0]);

// Keep all fields in the current selection's synchronous render transaction.
const setInnerHtml = (id: string, value: string): void => {
  const element = getEl(id, true);

  // Skip unchanged rows: the info box refreshes about twice a second and a rewrite detaches focused children.
  if (element && element.innerHTML !== value) {
    element.innerHTML = value;
  }
};

export class SatInfoBoxOrbital extends KeepTrackPlugin {
  readonly id = 'SatInfoBoxOrbital';
  dependencies_: string[] = [SatInfoBox.name];

  // Starting values of the collapsable sections
  private readonly isOrbitalSectionCollapsed_ = true;

  init(): void {
    super.init();
  }

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.satInfoBoxInit, () => {
      PluginRegistry.getPlugin(SatInfoBox)!.addElement({ html: this.createOrbitalSection(), order: 5 });
    });
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.satInfoBoxAddListeners, this.satInfoBoxAddListeners_.bind(this));
    const updateCurrentSelection = (obj?: BaseObject): void => {
      const selection = PluginRegistry.getPlugin(SelectSatManager);

      if (obj && selection?.selectedSat === obj.id && selection.primarySatObj === obj) {
        this.updateOrbitData_(obj);
      }
    };

    EventBus.getInstance().on(EventBusEvent.updateSelectBox, updateCurrentSelection);
    EventBus.getInstance().on(EventBusEvent.selectSatData, updateCurrentSelection);
    // A clock jump (paused or running) refreshes the panel at once; the state is propagated for the new time here,
    // not read from the worker buffer, so a late or reordered worker update cannot show an earlier time's values.
    EventBus.getInstance().on(EventBusEvent.staticOffsetChange, () => {
      updateCurrentSelection(PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj ?? undefined);
    });
  }

  private satInfoBoxAddListeners_() {
    const satInfoBoxPlugin = PluginRegistry.getPlugin(SatInfoBox)!;

    satInfoBoxPlugin.addListenerToCollapseElement(getEl(`${SECTIONS.ORBITAL}`), { value: this.isOrbitalSectionCollapsed_ });
    this.addHelpListeners_(getEl(SECTIONS.ORBITAL, true));
  }

  private addHelpListeners_(section: HTMLElement | null): void {
    if (!section || section.dataset.helpBound === 'true') {
      return;
    }
    section.dataset.helpBound = 'true';

    const keyOf = (target: EventTarget | null): HTMLElement | null => ((target as HTMLElement | null)?.closest?.('[data-help-toggle]') as HTMLElement | null) ?? null;

    section.addEventListener('click', (e) => {
      const key = keyOf(e.target);

      if (key) {
        SatInfoBoxOrbital.toggleHelp_(key);
      }
    });
    section.addEventListener('keydown', (e) => {
      const key = keyOf(e.target);

      if (key && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        SatInfoBoxOrbital.toggleHelp_(key);
      }
    });
  }

  private createOrbitalSection(): string {
    return html`
        <div id="${SECTIONS.ORBITAL}">
          <div class="sat-info-section-header">
            <span>${t7e('SatInfoBoxOrbital.title')}</span>
            <span id="${SECTIONS.ORBITAL}-collapse" class="section-collapse material-icons">expand_less</span>
          </div>
          <!-- Orbital data rows -->
          ${this.createOrbitalDataRows()}
        </div>
      `;
  }

  private createOrbitalDataRows(): string {
    // Create all orbital data rows
    const rows: { key: string; id: string; tooltip: string; help?: string; value: string }[] = [
      { key: t7e('SatInfoBoxOrbital.Regime.label'), id: EL.REGIME, tooltip: t7e('SatInfoBoxOrbital.Regime.tooltip'), help: t7e('SatInfoBoxOrbital.Regime.help'), value: 'xxx' },
      { key: t7e('SatInfoBoxOrbital.Apogee.label'), id: EL.APOGEE, tooltip: t7e('SatInfoBoxOrbital.Apogee.tooltip'), help: t7e('SatInfoBoxOrbital.Apogee.help'), value: 'xxx km' },
      {
        key: t7e('SatInfoBoxOrbital.Perigee.label'),
        id: EL.PERIGEE,
        tooltip: t7e('SatInfoBoxOrbital.Perigee.tooltip'),
        help: t7e('SatInfoBoxOrbital.Perigee.help'),
        value: 'xxx km',
      },
      {
        key: t7e('SatInfoBoxOrbital.Inclination.label'),
        id: EL.INCLINATION,
        tooltip: t7e('SatInfoBoxOrbital.Inclination.tooltip'),
        help: t7e('SatInfoBoxOrbital.Inclination.help'),
        value: 'xxx.xx',
      },
      {
        key: t7e('SatInfoBoxOrbital.Eccentricity.label'),
        id: EL.ECCENTRICITY,
        tooltip: t7e('SatInfoBoxOrbital.Eccentricity.tooltip'),
        help: t7e('SatInfoBoxOrbital.Eccentricity.help'),
        value: 'x.xx',
      },
      {
        key: t7e('SatInfoBoxOrbital.RightAsc.label'),
        id: EL.RAAN,
        tooltip: t7e('SatInfoBoxOrbital.RightAsc.tooltip'),
        help: t7e('SatInfoBoxOrbital.RightAsc.help'),
        value: 'x.xx',
      },
      {
        key: t7e('SatInfoBoxOrbital.ArgOfPerigee.label'),
        id: EL.ARG_PE,
        tooltip: t7e('SatInfoBoxOrbital.ArgOfPerigee.tooltip'),
        help: t7e('SatInfoBoxOrbital.ArgOfPerigee.help'),
        value: 'x.xx',
      },
      { key: t7e('SatInfoBoxOrbital.Latitude.label'), id: EL.LATITUDE, tooltip: t7e('SatInfoBoxOrbital.Latitude.tooltip'), value: 'x.xx' },
      { key: t7e('SatInfoBoxOrbital.Longitude.label'), id: EL.LONGITUDE, tooltip: t7e('SatInfoBoxOrbital.Longitude.tooltip'), value: 'x.xx' },
      {
        key: t7e('SatInfoBoxOrbital.LatitudeBand.label' as Parameters<typeof t7e>[0]),
        id: EL.LAT_BAND,
        tooltip: t7e('SatInfoBoxOrbital.LatitudeBand.tooltip' as Parameters<typeof t7e>[0]),
        value: 'x.xx',
      },
      { key: t7e('SatInfoBoxOrbital.Region.label'), id: EL.REGION, tooltip: t7e('SatInfoBoxOrbital.Region.tooltip'), value: 'xxx' },
      { key: t7e('SatInfoBoxOrbital.Altitude.label'), id: EL.ALTITUDE, tooltip: t7e('SatInfoBoxOrbital.Altitude.tooltip'), value: 'xxx km' },
      { key: t7e('SatInfoBoxOrbital.Period.label'), id: EL.PERIOD, tooltip: t7e('SatInfoBoxOrbital.Period.tooltip'), help: t7e('SatInfoBoxOrbital.Period.help'), value: 'xxx min' },
      { key: t7e('SatInfoBoxOrbital.Velocity.label'), id: EL.VELOCITY, tooltip: t7e('SatInfoBoxOrbital.Velocity.tooltip'), value: 'xxx km/s' },
      { key: t7e('SatInfoBoxOrbital.GPEpoch.label'), id: EL.GP_EPOCH, tooltip: t7e('SatInfoBoxOrbital.GPEpoch.tooltip'), value: 'xxxx-xx-xx xx:xx:xx UTC' },
      { key: t7e('SatInfoBoxOrbital.AgeOfGP.label'), id: EL.ELSET_AGE, tooltip: t7e('SatInfoBoxOrbital.AgeOfGP.tooltip'), value: 'xxx.xxxx' },
      { key: t7e('SatInfoBoxOrbital.RadialSigma.label'), id: EL.UNCERTAINTY_RADIAL, tooltip: t7e('SatInfoBoxOrbital.RadialSigma.tooltip'), value: 'xxx.xxxx' },
      { key: t7e('SatInfoBoxOrbital.InTrackSigma.label'), id: EL.UNCERTAINTY_INTRACK, tooltip: t7e('SatInfoBoxOrbital.InTrackSigma.tooltip'), value: 'xxx.xxxx' },
      { key: t7e('SatInfoBoxOrbital.CrossTrackSigma.label'), id: EL.UNCERTAINTY_CROSSTRACK, tooltip: t7e('SatInfoBoxOrbital.CrossTrackSigma.tooltip'), value: 'xxx.xxxx' },
    ];

    const covarianceIds: string[] = [EL.UNCERTAINTY_RADIAL, EL.UNCERTAINTY_INTRACK, EL.UNCERTAINTY_CROSSTRACK];
    // Drop the covariance rows (Radial, In Track, Cross Track Sigma) when the setting is disabled
    const visibleRows = settingsManager.plugins.SatInfoBoxOrbital!.isShowCovariance ? rows : rows.filter((row) => !covarianceIds.includes(row.id));

    return this.createOemFrameRows_() + visibleRows.map((row) => SatInfoBoxOrbital.createDataRow_(row)).join('');
  }

  /**
   * One data row. A row with a plain-language definition gets a focusable key: hover shows the short tooltip,
   * while click, tap, Enter or Space opens the definition inline, which works on touch and with a keyboard.
   */
  private static createDataRow_(row: { key: string; id: string; tooltip: string; help?: string; value: string }): string {
    if (!row.help) {
      return html`
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" kt-tooltip="${row.tooltip}">${row.key}</div>
          <div class="sat-info-value" id="${row.id}">${row.value}</div>
        </div>
      `;
    }

    return html`
        <div class="sat-info-row sat-only-info sat-info-row--help">
          <div class="sat-info-key sat-info-key--help" kt-tooltip="${row.tooltip}" tabindex="0" role="button" aria-expanded="false" aria-controls="${row.id}-help" data-help-toggle="${row.id}-help">${row.key}</div>
          <div class="sat-info-value" id="${row.id}">${row.value}</div>
          <div class="sat-info-help" id="${row.id}-help" hidden>${row.help}</div>
        </div>
      `;
  }

  /** Opens or closes the inline definition under a key; used by click, Enter and Space. */
  private static toggleHelp_(key: HTMLElement): void {
    const help = getEl(key.dataset.helpToggle ?? '', true);

    if (!help) {
      return;
    }

    const isOpen = key.getAttribute('aria-expanded') === 'true';

    key.setAttribute('aria-expanded', String(!isOpen));
    help.hidden = isOpen;
  }

  /**
   * Center body and reference frame rows, shown only for OEM objects (hidden until one is selected). They are not
   * `sat-only-info` rows: SatInfoBox shows those for every satellite.
   */
  private createOemFrameRows_(): string {
    const rows = [
      {
        key: t7e('SatInfoBoxOrbital.CenterBody.label' as Parameters<typeof t7e>[0]),
        id: EL.CENTER_BODY,
        tooltip: t7e('SatInfoBoxOrbital.CenterBody.tooltip' as Parameters<typeof t7e>[0]),
      },
      {
        key: t7e('SatInfoBoxOrbital.RefFrame.label' as Parameters<typeof t7e>[0]),
        id: EL.REF_FRAME,
        tooltip: t7e('SatInfoBoxOrbital.RefFrame.tooltip' as Parameters<typeof t7e>[0]),
      },
    ];

    return rows
      .map(
        (row) => html`
        <div class="sat-info-row sat-oem-only-info" id="${row.id}-row" style="display: none;">
          <div class="sat-info-key" kt-tooltip="${row.tooltip}">${row.key}</div>
          <div class="sat-info-value" id="${row.id}"></div>
        </div>
      `
      )
      .join('');
  }

  /** Show the OEM header's center body and frame for an OEM object; hide both rows for anything else. */
  private updateOemFrameRows_(obj: BaseObject): void {
    const isOem = obj instanceof OemSatellite;
    const isGp = obj instanceof Satellite;

    for (const id of [EL.CENTER_BODY, EL.REF_FRAME]) {
      const row = getEl(`${id}-row`, true);

      if (row) {
        row.style.display = isOem || (isGp && id === EL.REF_FRAME) ? 'flex' : 'none';
      }
    }

    if (isGp) {
      setValueWithInfo(EL.REF_FRAME, t7e('SatInfoBoxOrbital.RefFrame.teme' as Parameters<typeof t7e>[0]), t7e('SatInfoBoxOrbital.RefFrame.temeInfo' as Parameters<typeof t7e>[0]));
    }

    if (!isOem) {
      return;
    }

    const { centerName, refFrame } = obj.centerNameAndFrame;

    setInnerHtml(EL.CENTER_BODY, SatInfoBoxOrbital.formatCenterName(centerName) || notAvailableText());
    setInnerHtml(EL.REF_FRAME, refFrame || notAvailableText());
  }

  /** OEM CENTER_NAME in title case for display: `EARTH` -> `Earth`, `SOLAR SYSTEM BARYCENTER` -> `Solar System Barycenter`. */
  static formatCenterName(centerName: string): string {
    return centerName
      .trim()
      .toLowerCase()
      .split(/\s+/u)
      .filter((word) => word.length > 0)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private updateOrbitData_(obj: BaseObject): void {
    if (obj === null || typeof obj === 'undefined') {
      return;
    }

    // updateSelectBox can fire before SatInfoBox.uiManagerFinal_ injects the section.
    // EL.APOGEE is created in createOrbitalDataRows(), so its presence implies the section exists.
    if (!getEl(EL.APOGEE, true)) {
      return;
    }

    if (obj instanceof Satellite) {
      this.updateSatelliteOrbitalElements_(obj);
    } else if (obj instanceof OemSatellite) {
      this.updateOemOrbitalElements_(obj);
    }

    // Only objects propagated from a GP element set (TLE) have a GP epoch; OEM, missiles, etc. show N/A
    setInnerHtml(EL.GP_EPOCH, obj instanceof Satellite ? SatInfoBoxOrbital.formatGpEpoch(obj.tle1) : notAvailableText());

    this.updateOemFrameRows_(obj);
    this.updateCovariance_(obj);
    this.updateSecondarySatellite_(obj);
    this.updateAltitudeAndVelocity_(obj);
  }

  /**
   * Position and speed of a satellite at the simulation clock, propagated on the main thread. obj.position and
   * obj.totalVelocity come from the worker and trail a time jump, so the panel does not read them for a Satellite.
   */
  private static currentState_(obj: Satellite): { position: Parameters<typeof eci2lla>[0]; speed: number } {
    const simTime = ServiceLocator.getTimeManager().simulationTimeObj;
    const pv = simTime ? obj.eci(simTime) : null;

    if (pv && pv.position && pv.velocity) {
      const { x, y, z } = pv.velocity;

      return { position: pv.position, speed: Math.hypot(x, y, z) };
    }

    return { position: obj.position, speed: obj.totalVelocity };
  }

  private updateSatelliteOrbitalElements_(obj: Satellite): void {
    setInnerHtml(EL.APOGEE, `${obj.apogee.toFixed(0)} ${t7e('SatInfoBoxOrbital.kilometer')}`);
    setInnerHtml(EL.PERIGEE, `${obj.perigee.toFixed(0)} ${t7e('SatInfoBoxOrbital.kilometer')}`);
    setInnerHtml(EL.INCLINATION, `${obj.inclination.toFixed(2)}°`);
    setInnerHtml(EL.ECCENTRICITY, obj.eccentricity.toFixed(3));
    setInnerHtml(EL.RAAN, `${obj.rightAscension.toFixed(2)}°`);
    setInnerHtml(EL.ARG_PE, `${obj.argOfPerigee.toFixed(2)}°`);

    // Hover or long-press shows the stored digits; the row keeps the short form.
    const km = ` ${t7e('SatInfoBoxOrbital.kilometer')}`;
    const digits: [string, number, number, string][] = [
      [EL.APOGEE, obj.apogee, 4, km],
      [EL.PERIGEE, obj.perigee, 4, km],
      [EL.INCLINATION, obj.inclination, 4, '°'],
      [EL.ECCENTRICITY, obj.eccentricity, 7, ''],
      [EL.RAAN, obj.rightAscension, 4, '°'],
      [EL.ARG_PE, obj.argOfPerigee, 4, '°'],
    ];

    // The unit is part of the stored-digit tooltip so a bare number never floats over the row (#273)
    for (const [id, value, places, unit] of digits) {
      getEl(id, true)?.setAttribute('kt-tooltip', `${value.toFixed(places)}${unit}`);
    }

    this.updatePeriodElement_(obj.period);
    this.updateRegimeElement_(obj.perigee, obj.apogee, obj.eccentricity);
    this.updateElsetAgeElement_(obj);
    this.updateLatLonElements_(SatInfoBoxOrbital.currentState_(obj).position);
    this.updateLatitudeBand_(obj.inclination);

    this.updateSectionHeader_();
  }

  /** Names the altitude regime of the orbit (LEO, MEO, GEO, HEO) in plain language. */
  private updateRegimeElement_(perigeeKm: number, apogeeKm: number, eccentricity: number): void {
    const regime = classifyOrbitRegime(perigeeKm, apogeeKm, eccentricity);

    if (regime) {
      setValueWithInfo(
        EL.REGIME,
        t7e(`SatInfoBoxOrbital.Regime.${regime}` as Parameters<typeof t7e>[0]),
        t7e(`SatInfoBoxOrbital.Regime.${regime}Info` as Parameters<typeof t7e>[0])
      );
    } else {
      setInnerHtml(EL.REGIME, notAvailableText());
    }
  }

  private updatePeriodElement_(period: number): void {
    const periodDom = getEl(EL.PERIOD);

    if (periodDom) {
      if (!Number.isFinite(period) || period <= 0) {
        periodDom.textContent = notAvailableText();
        periodDom.removeAttribute('kt-tooltip');

        return;
      }
      periodDom.innerHTML = `${period.toFixed(2)} ${t7e('SatInfoBoxOrbital.Period.min')}`;
      periodDom.dataset.position = 'top';
      periodDom.dataset.delay = '50';
      periodDom.setAttribute('kt-tooltip', `${t7e('SatInfoBoxOrbital.Period.meanMotion')}: ${(MINUTES_PER_DAY / period).toFixed(2)} ${t7e('SatInfoBoxOrbital.Period.revPerDay')}`);
    }
  }

  private updateElsetAgeElement_(obj: Satellite): void {
    // Age of GP is measured against the SIMULATION clock, not the wall clock, so it follows time jumps and reads
    // negative when the sim time is before the element set epoch.
    const simTime = ServiceLocator.getTimeManager().simulationTimeObj;
    const ageText = SatInfoBoxOrbital.formatElsetAge(obj.ageOfElset(simTime));

    const elsetAgeDom = getEl(EL.ELSET_AGE);

    if (elsetAgeDom) {
      // Same threshold and comparison as the watchlist STALE flag (hours past the stale setting).
      const ageDays = obj.ageOfElset(simTime);
      const staleHours = getStaleGpThresholdHours();
      const isStale = Number.isFinite(ageDays) && isGpStale(ageDays * 24, staleHours);
      const staleNote = isStale ? `<br/>${t7e('plugins.WatchlistPlugin.stale.tooltip').replace('{hours}', String(staleHours))}` : '';

      elsetAgeDom.innerHTML = isStale ? `${ageText} ${t7e('plugins.WatchlistPlugin.stale.marker')}` : ageText;
      elsetAgeDom.classList.toggle('sat-info-stale', isStale);
      elsetAgeDom.dataset.position = 'top';
      elsetAgeDom.dataset.delay = '50';
      elsetAgeDom.setAttribute(
        'kt-tooltip',
        `${t7e('SatInfoBoxOrbital.AgeOfGP.epochYear')}: ${obj.tle1.substring(18, 20)}<br/>
           ${t7e('SatInfoBoxOrbital.AgeOfGP.epochDay')}: ${obj.tle1.substring(20, 28)}${staleNote}`
      );
    }
  }

  /**
   * Formats an element set age (in days, signed) for the Age of GP row. Ages under one day show in hours. A negative
   * age means the GP epoch is after the simulation time; it keeps the minus sign and adds a short localized note.
   */
  static formatElsetAge(daysOld: number): string {
    if (!Number.isFinite(daysOld)) {
      return notAvailableText();
    }

    const absDays = Math.abs(daysOld);
    const isDays = absDays >= 1;
    const magnitude = isDays ? absDays : absDays * 24;
    const units = isDays ? t7e('SatInfoBoxOrbital.AgeOfGP.days') : t7e('SatInfoBoxOrbital.AgeOfGP.hours');
    // Treat anything that rounds to 0.00 as zero so the row never shows "-0.00"
    const isFuture = daysOld < 0 && magnitude.toFixed(2) !== '0.00';

    if (!isFuture) {
      return `${magnitude.toFixed(2)} ${units}`;
    }

    return `-${magnitude.toFixed(2)} ${units} (${t7e('SatInfoBoxOrbital.AgeOfGP.epochAfterSimTime')})`;
  }

  /**
   * Formats the epoch of a GP element set as `YYYY-MM-DD HH:MM:SS UTC`, or 'N/A' when the TLE has no parsable epoch.
   * Uses the same 57 year pivot as {@link Tle.calcElsetAge}, which drives the Age of GP row.
   */
  static formatGpEpoch(tle1: TleLine1 | undefined | null): string {
    if (typeof tle1 !== 'string' || tle1.length < 32) {
      return notAvailableText();
    }

    try {
      const year = Tle.epochYearFull(tle1);
      const dayOfYear = Tle.epochDay(tle1);
      // Round to the millisecond so float noise cannot turn :38.000 into :37.999
      const epochMs = Math.round(Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86400000);

      if (!Number.isFinite(epochMs)) {
        return notAvailableText();
      }

      return `${new Date(epochMs).toISOString().slice(0, 19).replace('T', ' ')} UTC`;
    } catch {
      return notAvailableText();
    }
  }

  private updateLatLonElements_(position: Parameters<typeof eci2lla>[0]): void {
    const gmst = ServiceLocator.getTimeManager().gmst;
    const lla = eci2lla(position, gmst);

    const satLonElement = getEl(EL.LONGITUDE);
    const satLatElement = getEl(EL.LATITUDE);

    if (satLonElement && satLatElement) {
      if (lla.lon >= 0) {
        satLonElement.innerHTML = `${lla.lon.toFixed(3)}°${t7e('SatInfoBoxOrbital.Longitude.east')}`;
      } else {
        satLonElement.innerHTML = `${(lla.lon * -1).toFixed(3)}°${t7e('SatInfoBoxOrbital.Longitude.west')}`;
      }
      if (lla.lat >= 0) {
        satLatElement.innerHTML = `${lla.lat.toFixed(3)}°${t7e('SatInfoBoxOrbital.Latitude.north')}`;
      } else {
        satLatElement.innerHTML = `${(lla.lat * -1).toFixed(3)}°${t7e('SatInfoBoxOrbital.Latitude.south')}`;
      }
    }

    this.updateRegionElement_(lla.lat, lla.lon);
  }

  /**
   * Latitude reach row: the highest latitude the ground track gets to, the same north and south (shown as ±). For an inclination i that is
   * i (i up to 90) or 180 - i (retrograde). Same for every point of the orbit, so it is the band the object stays in.
   */
  static formatLatitudeBand(inclinationDeg: number): string {
    if (!Number.isFinite(inclinationDeg)) {
      return notAvailableText();
    }

    const reach = inclinationDeg > 90 ? 180 - inclinationDeg : inclinationDeg;

    return `±${reach.toFixed(2)}°`;
  }

  private updateLatitudeBand_(inclinationDeg: number): void {
    setInnerHtml(EL.LAT_BAND, SatInfoBoxOrbital.formatLatitudeBand(inclinationDeg));
  }

  /**
   * "Over" row: country under the sub-satellite point, or "Over ocean". The country polygons load
   * once on first use; the row shows N/A until then. Runs at the info box's normal refresh rate.
   */
  private updateRegionElement_(lat: number, lon: number): void {
    const regionElement = getEl(EL.REGION, true);

    if (!regionElement) {
      return;
    }

    const index = getRegionIndex();

    if (!index) {
      loadRegionIndex().catch(() => undefined);
      regionElement.textContent = notAvailableText();

      return;
    }

    const hit = findGeoRegion(index, lat, lon);
    const language = i18next.language || 'en';

    if (hit) {
      regionElement.textContent = getGeoRegionName(hit, language);

      return;
    }

    // Over water: named sea or ocean polygons (lazy-loaded), else the coarse boxes while loading or if the fetch failed.
    const marine = getMarineIndex();
    const marineHit = marine ? findGeoRegion(marine, lat, lon) : null;

    if (!marine) {
      loadMarineIndex().catch(() => undefined);
    }

    regionElement.textContent = marineHit ? getGeoRegionName(marineHit, language) : t7e(`SatInfoBoxOrbital.Region.Water.${findWaterBody(lat, lon)}` as Parameters<typeof t7e>[0]);
  }

  /**
   * Updates the altitude/velocity rows. Returns false when the caller should
   * abort the rest of the update (non-Earth center body not found).
   */
  private updateAltitudeAndVelocity_(obj: BaseObject): boolean {
    const satAltitudeElement = getEl(EL.ALTITUDE);
    const satVelocityElement = getEl(EL.VELOCITY);

    if (satAltitudeElement && satVelocityElement) {
      if (obj instanceof Satellite || obj instanceof OemSatellite) {
        return this.updateSatelliteAltitudeAndVelocity_(obj, satAltitudeElement, satVelocityElement);
      }

      this.updateMissileAltitudeAndVelocity_(obj as MissileObject, satAltitudeElement, satVelocityElement);
    }

    return true;
  }

  private updateSatelliteAltitudeAndVelocity_(obj: Satellite | OemSatellite, satAltitudeElement: HTMLElement, satVelocityElement: HTMLElement): boolean {
    const gmst = ServiceLocator.getTimeManager().gmst;
    let speedKmS = obj.totalVelocity;

    if (((obj as OemSatellite).centerBody ?? SolarBody.Earth) !== SolarBody.Earth) {
      const centerBody = ServiceLocator.getScene().getBodyById((obj as OemSatellite).centerBody) as CelestialBody | null;

      if (!centerBody) {
        errorManagerInstance.debug(`Error calculating altitude for non-Earth centered object ${obj.name}: center body not found.`);

        satAltitudeElement.textContent = notAvailableText();
        satVelocityElement.textContent = notAvailableText();

        return false;
      }
      const position = {
        x: (obj.position.x - centerBody.position[0]) as Kilometers,
        y: (obj.position.y - centerBody.position[1]) as Kilometers,
        z: (obj.position.z - centerBody.position[2]) as Kilometers,
      };

      satAltitudeElement.innerHTML = `${SatMath.getAlt(position, gmst, centerBody.RADIUS as Kilometers).toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}`;
    } else {
      const state = obj instanceof Satellite ? SatInfoBoxOrbital.currentState_(obj) : { position: obj.position, speed: obj.totalVelocity };

      satAltitudeElement.innerHTML = `${SatMath.getAlt(state.position, gmst).toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}`;
      speedKmS = state.speed;
    }

    satVelocityElement.innerHTML = `${speedKmS.toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}/${t7e('SatInfoBoxOrbital.second')}`;

    return true;
  }

  private updateMissileAltitudeAndVelocity_(misl: MissileObject, satAltitudeElement: HTMLElement, satVelocityElement: HTMLElement): void {
    satAltitudeElement.innerHTML = `${(ServiceLocator.getSensorManager().currentTEARR?.alt ?? 0).toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}`;
    if (misl.totalVelocity) {
      satVelocityElement.innerHTML = `${misl.totalVelocity.toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}/${t7e('SatInfoBoxOrbital.second')}`;
    } else {
      satVelocityElement.innerHTML = t7e('SatInfoBoxOrbital.unknown');
    }
  }

  /**
   * Sigma rows: 1-sigma R / I / C of the TLE-derived screening covariance at the GP epoch, the
   * same numbers the Conjunction Report prints and the model Pc is computed from. Deliberately not
   * SelectSatManager.primarySatCovMatrix: that holds ellipsoid display radii, which are scaled by
   * the confidence level and replaced by the Pro Covariance plugin's measured covariance.
   */
  private updateCovariance_(obj: BaseObject): void {
    const sigmas = obj instanceof Satellite ? screeningSigmasKm(obj.tle1, obj.tle2) : null;

    if (!sigmas) {
      setInnerHtml(EL.UNCERTAINTY_RADIAL, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.UNCERTAINTY_CROSSTRACK, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.UNCERTAINTY_INTRACK, t7e('SatInfoBoxOrbital.unknown'));

      return;
    }

    // These sigmas always come from the app's screening model, never from the source record, so each carries the tag.
    const rows: [string, number][] = [
      [EL.UNCERTAINTY_RADIAL, sigmas.radial],
      [EL.UNCERTAINTY_INTRACK, sigmas.inTrack],
      [EL.UNCERTAINTY_CROSSTRACK, sigmas.crossTrack],
    ];

    for (const [id, sigmaKm] of rows) {
      // The info circle explains what "default" means; the same note stays as the value's own tooltip.
      const note = `${t7e('SatInfoBoxOrbital.Sigma.defaultNote' as Parameters<typeof t7e>[0])} ${(sigmaKm * 1000).toFixed(3)} ${t7e('SatInfoBoxOrbital.meter')}`;

      setValueWithInfo(id, `${SatInfoBoxOrbital.formatSigmaKm(sigmaKm)} (${t7e('SatInfoBoxOrbital.Sigma.defaultTag' as Parameters<typeof t7e>[0])})`, note);
      getEl(id, true)?.setAttribute('kt-tooltip', note);
    }
  }

  /** A 1-sigma value (km) with its unit: meters below 1 km, km (3 decimals, as in the reports) above. */
  static formatSigmaKm(sigmaKm: number): string {
    if (sigmaKm < 1) {
      return `${(sigmaKm * 1000).toFixed(1)} ${t7e('SatInfoBoxOrbital.meter')}`;
    }

    return `${sigmaKm.toFixed(3)} ${t7e('SatInfoBoxOrbital.kilometer')}`;
  }

  private updateSecondarySatellite_(obj: BaseObject): void {
    const secondarySatObj = PluginRegistry.getPlugin(SelectSatManager)!.secondarySatObj;

    if (!secondarySatObj || !(obj instanceof Satellite)) {
      ['sat-sec-dist', 'sat-sec-rad', 'sat-sec-intrack', 'sat-sec-crosstrack'].forEach((id) => {
        setInnerHtml(id, notAvailableText());
      });

      return;
    }

    const sat = obj as Satellite;
    const ric = secondarySatObj.toRIC(sat, ServiceLocator.getTimeManager().simulationTimeObj);
    /*
     * Linear range comes from the same main-thread SGP4 states as R/I/C. The cruncher-buffer positions lag a
     * time jump by up to two cruncher cycles, so mixing the two sources showed a stale range on first paint.
     */
    const dist = ric.range.toFixed(2);

    const satDistanceElement = getEl('sat-sec-dist');
    const satRadiusElement = getEl('sat-sec-rad');
    const satInTrackElement = getEl('sat-sec-intrack');
    const satCrossTrackElement = getEl('sat-sec-crosstrack');

    if (satDistanceElement && satRadiusElement && satInTrackElement && satCrossTrackElement) {
      satDistanceElement.innerHTML = `${dist} km`;
      satRadiusElement.innerHTML = `${ric.position.x.toFixed(2)}km`;
      satInTrackElement.innerHTML = `${ric.position.y.toFixed(2)}km`;
      satCrossTrackElement.innerHTML = `${ric.position.z.toFixed(2)}km`;
    } else {
      errorManagerInstance.debug('Error updating secondary satellite info!');
    }
  }

  private updateOemOrbitalElements_(obj: OemSatellite): void {
    // OemSatellite.toClassicalElements uses the Earth-gravity J2000 conversion.
    // Interplanetary ephemerides do not have Earth-centered osculating elements;
    // report unavailable until a body/frame-aware element model is provided.
    if (obj.centerBody !== SolarBody.Earth) {
      [EL.APOGEE, EL.PERIGEE, EL.INCLINATION, EL.ECCENTRICITY, EL.RAAN, EL.ARG_PE, EL.PERIOD, EL.REGIME, EL.ELSET_AGE, EL.LATITUDE, EL.LONGITUDE, EL.REGION, EL.LAT_BAND].forEach(
        (id) => {
          setInnerHtml(id, notAvailableText());
        }
      );
      getEl(EL.PERIOD, true)?.removeAttribute('kt-tooltip');
      this.updateSectionHeader_(obj);

      return;
    }
    try {
      const elements = obj.toClassicalElements();

      const finite = (value: number, digits: number, suffix = ''): string => (Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : notAvailableText());
      const isElliptic = elements.eccentricity >= 0 && elements.eccentricity < 1;
      /*
       * During a powered ascent the osculating elements are not an orbit yet (at liftoff they read apogee 0 km and
       * perigee about -6367 km), so apogee and perigee are not shown until insertion.
       */
      const isApsisAvailable = isElliptic && !(obj instanceof PhasedOrbitSatellite && obj.isInAscent());

      setInnerHtml(EL.APOGEE, isApsisAvailable ? finite(elements.apogee, 0, ` ${t7e('SatInfoBoxOrbital.kilometer')}`) : notAvailableText());
      // Earth-centered elements of an escape or heliocentric trajectory are not an orbit, so do not show them as one.
      setInnerHtml(EL.PERIGEE, isApsisAvailable ? finite(elements.perigee, 0, ` ${t7e('SatInfoBoxOrbital.kilometer')}`) : notAvailableText());
      setInnerHtml(EL.INCLINATION, finite(elements.inclinationDegrees, 2, '°'));
      setInnerHtml(EL.ECCENTRICITY, isElliptic ? finite(elements.eccentricity, 3) : notAvailableText());
      setInnerHtml(EL.RAAN, finite(elements.rightAscensionDegrees, 2, '°'));
      setInnerHtml(EL.ARG_PE, finite(elements.argPerigeeDegrees, 2, '°'));

      this.updatePeriodElement_(isElliptic ? elements.period : Number.NaN);
      this.updateRegimeElement_(isApsisAvailable ? elements.perigee : Number.NaN, elements.apogee, elements.eccentricity);

      setInnerHtml(EL.ELSET_AGE, notAvailableText());

      this.updateLatLonElements_(obj.position);
      this.updateLatitudeBand_(elements.inclinationDegrees);
    } catch {
      setInnerHtml(EL.LAT_BAND, notAvailableText());
      setInnerHtml(EL.APOGEE, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.PERIGEE, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.INCLINATION, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.ECCENTRICITY, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.RAAN, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.ARG_PE, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.PERIOD, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.REGIME, t7e('SatInfoBoxOrbital.unknown'));
      getEl(EL.PERIOD, true)?.removeAttribute('kt-tooltip');
      setInnerHtml(EL.ELSET_AGE, notAvailableText());
      setInnerHtml(EL.LATITUDE, notAvailableText());
      setInnerHtml(EL.LONGITUDE, notAvailableText());
      setInnerHtml(EL.REGION, notAvailableText());
    }

    this.updateSectionHeader_(obj);
  }

  private updateSectionHeader_(obj?: OemSatellite): void {
    const sectionEl = getEl(SECTIONS.ORBITAL);

    if (!sectionEl) {
      return;
    }

    const headerSpan = sectionEl.querySelector('.sat-info-section-header > span:first-child') as HTMLSpanElement | null;

    if (!headerSpan) {
      return;
    }

    if (obj instanceof PhasedOrbitSatellite) {
      const phase = obj.getActivePhase();
      const phaseName = phase ? phase.name : '';

      headerSpan.textContent = phaseName ? `${t7e('SatInfoBoxOrbital.title')} (${phaseName})` : t7e('SatInfoBoxOrbital.title');
    } else {
      headerSpan.textContent = t7e('SatInfoBoxOrbital.title');
    }
  }
}
