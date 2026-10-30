import { SatMath } from '@app/app/analysis/sat-math';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { ECLIPSE_CYLINDER_RADIUS_KM } from '@app/webworker/orbit-eclipse';
import { Satellite, Sun } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { ScenarioData, ScenarioManagementPlugin } from '../scenario-management/scenario-management';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { TopMenu } from '../top-menu/top-menu';
import { bandsToGradient, type EclipseSample, eclipseBands, trustBands } from './slider-bands-core';
import './time-slider.css';

export class TimeSlider extends KeepTrackPlugin {
  readonly id = 'TimeSlider';
  dependencies_ = [ScenarioManagementPlugin.name, TopMenu.name];
  sliderTimeValue: number = 0;
  scenario: ScenarioData | null;

  /** Real-time debounce for band rebuilds. */
  static readonly BAND_DEBOUNCE_MS = 250;
  /** Sampling step for the eclipse bands (sim time). */
  static readonly BAND_STEP_MS = 60e3;
  /** Cap on samples per rebuild; long scenario windows widen the step instead. */
  static readonly BAND_MAX_SAMPLES = 20000;
  /** Sun.eci is evaluated on this grid and linearly interpolated between nodes. */
  private static readonly SUN_NODE_MS_ = 30 * 60e3;
  static readonly BAND_LAYER_ID = 'time-slider-bands';

  private bandTimer_: ReturnType<typeof setTimeout> | null = null;
  /** Identity of the last rendered bands (sat, element set, window); a rebuild with the same key is skipped. */
  private lastBandKey_ = '';

  addHtml() {
    super.addHtml();
    EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
      const navWrapperElement = getEl(TopMenu.NAV_WRAPPER_ID);

      if (navWrapperElement) {
        navWrapperElement.parentElement!.insertAdjacentHTML(
          'beforeend',
          html`
            <div id="time-slider-container" class="time-slider-container">
              <div id="time-slider-container-slider" class="ui-slider ui-corner-all ui-slider-horizontal ui-widget ui-widget-content"
                 style="display: inline-block;" data-min="0" data-max="100" data-step="0.1"
                 kt-tooltip="${t7e('plugins.TimeSlider.tooltip' as Parameters<typeof t7e>[0])}"
              >
                <div id="${TimeSlider.BAND_LAYER_ID}" class="time-slider-bands" aria-hidden="true"></div>
                <span
                  tabindex="0" class="ui-slider-handle ui-corner-all ui-state-default"
                  style="left: ${(this.getSliderValue(ServiceLocator.getTimeManager().simulationTimeObj)).toString()}%;">
                </span>
              </div>
            </div>
          `
        );
      }
    });
  }

  getSliderValue(date: Date): number {
    this.scenario = PluginRegistry.getPlugin(ScenarioManagementPlugin)?.scenario ?? null;
    // When scenario has no bounds
    if (!this.scenario?.startTime && !this.scenario?.endTime) {
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();

      // Calculate the total minutes in the day
      const totalMinutes = hours * 60 + minutes;

      // Convert total minutes to a percentage of the day (0-100)
      return (totalMinutes / 1439) * 100; // 1439 = 23*60 + 59
    }

    // When scenario has bounds
    const minPosition = this.scenario.startTime as Date;
    const maxPosition = this.scenario.endTime as Date;
    const differenceInMs = maxPosition.getTime() - minPosition.getTime();
    const currentDifferenceInMs = date.getTime() - minPosition.getTime();

    return (currentDifferenceInMs / differenceInMs) * 100;
  }

  addJs() {
    super.addJs();

    this.scenario = PluginRegistry.getPlugin(ScenarioManagementPlugin)?.scenario ?? null;

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      this.attachSliderEvents('time-slider-container-slider', (value: number) => {
        this.scenario = PluginRegistry.getPlugin(ScenarioManagementPlugin)?.scenario ?? null;
        if (!this.scenario?.startTime && !this.scenario?.endTime) {
          this.sliderWithoutBounds(value);
        } else {
          this.sliderWithBounds(value);
        }
      });
    });

    EventBus.getInstance().on(EventBusEvent.selectedDateChange, () => {
      this.updateSliderPosition();
      // While playing, the bands only need rebuilding when the window itself moves
      // (UTC day rollover); otherwise the key matches and nothing is queued.
      if (this.lastBandKey_ !== '' && this.bandKey_() !== this.lastBandKey_) {
        this.scheduleBandRebuild();
      }
    });

    EventBus.getInstance().on(EventBusEvent.staticOffsetChange, () => {
      this.updateSliderPosition();
      this.scheduleBandRebuild();
    });

    EventBus.getInstance().on(EventBusEvent.scenarioBoundsChanged, () => {
      this.scenario = PluginRegistry.getPlugin(ScenarioManagementPlugin)?.scenario ?? null;
      this.updateSliderPosition();
      this.scheduleBandRebuild();
    });

    EventBus.getInstance().on(EventBusEvent.selectSatData, () => {
      this.scheduleBandRebuild();
    });
  }

  /**
   * Queue a rebuild of the eclipse / epoch-trust bands. Trailing debounce: bursts
   * of events (slider drags, selection changes) collapse into one rebuild
   * {@link TimeSlider.BAND_DEBOUNCE_MS} after the last one. Never runs per frame.
   */
  scheduleBandRebuild(): void {
    if (this.bandTimer_ !== null) {
      clearTimeout(this.bandTimer_);
    }
    this.bandTimer_ = setTimeout(() => {
      this.bandTimer_ = null;
      this.rebuildBands_();
    }, TimeSlider.BAND_DEBOUNCE_MS);
  }

  /** The slider's time window: scenario bounds, or the UTC day the slider maps (00:00..23:59). */
  getSliderWindow(date: Date): { startMs: number; endMs: number } {
    this.scenario = PluginRegistry.getPlugin(ScenarioManagementPlugin)?.scenario ?? null;
    if (this.scenario?.startTime && this.scenario?.endTime) {
      return { startMs: (this.scenario.startTime as Date).getTime(), endMs: (this.scenario.endTime as Date).getTime() };
    }
    const startMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

    // getSliderValue maps 0..100% onto minutes 0..1439 of the day.
    return { startMs, endMs: startMs + 1439 * 60e3 };
  }

  private selectedSatellite_(): Satellite | null {
    const obj = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

    return obj instanceof Satellite && obj.id >= 0 ? obj : null;
  }

  private bandKey_(): string {
    const sat = this.selectedSatellite_();

    if (!sat) {
      return '';
    }
    const { startMs, endMs } = this.getSliderWindow(ServiceLocator.getTimeManager().simulationTimeObj);

    return `${sat.id}|${sat.tle1}|${startMs}|${endMs}`;
  }

  private rebuildBands_(): void {
    const layer = getEl(TimeSlider.BAND_LAYER_ID, true);

    if (!layer) {
      return;
    }
    const sat = this.selectedSatellite_();

    if (!sat) {
      this.lastBandKey_ = '';
      this.applyBands_(layer, 'none', 'none');

      return;
    }
    const key = this.bandKey_();

    if (key === this.lastBandKey_) {
      return;
    }
    this.lastBandKey_ = key;

    const simTime = ServiceLocator.getTimeManager().simulationTimeObj;
    const { startMs, endMs } = this.getSliderWindow(simTime);
    const samples = TimeSlider.sampleEclipse(sat, startMs, endMs);
    const epochMs = simTime.getTime() - sat.ageOfElset(simTime, 'days') * 86400e3;
    const eclipseGradient = bandsToGradient(eclipseBands(samples, startMs, endMs), 'var(--time-slider-eclipse-rgb)');
    const trustGradient = bandsToGradient(trustBands(epochMs, startMs, endMs), 'var(--time-slider-trust-rgb)');

    this.applyBands_(layer, eclipseGradient, trustGradient);
  }

  /** Stack the two layers; when both are present each takes --band-share of the height. */
  private applyBands_(layer: HTMLElement, eclipseGradient: string, trustGradient: string): void {
    const hasEclipse = eclipseGradient !== 'none';
    const hasTrust = trustGradient !== 'none';

    layer.classList.toggle('time-slider-bands--split', hasEclipse && hasTrust);
    if (hasEclipse && hasTrust) {
      layer.style.backgroundImage = `${eclipseGradient}, ${trustGradient}`;
    } else if (hasEclipse) {
      layer.style.backgroundImage = eclipseGradient;
    } else {
      layer.style.backgroundImage = trustGradient;
    }
  }

  /**
   * Sample a satellite's illumination across a window at {@link TimeSlider.BAND_STEP_MS}
   * (widened so no more than {@link TimeSlider.BAND_MAX_SAMPLES} are taken). Status comes
   * from SatMath.calculateIsInSun (conical umbra/penumbra); the cylindrical clearance is
   * attached so band edges can be interpolated between samples.
   */
  static sampleEclipse(sat: Satellite, startMs: number, endMs: number): EclipseSample[] {
    const span = endMs - startMs;

    if (!(span > 0)) {
      return [];
    }
    const step = Math.max(TimeSlider.BAND_STEP_MS, span / TimeSlider.BAND_MAX_SAMPLES);
    const nodeMs = TimeSlider.SUN_NODE_MS_;
    const nodeCount = Math.ceil(span / nodeMs) + 2;
    const nodes: { x: number; y: number; z: number }[] = [];

    for (let n = 0; n < nodeCount; n++) {
      const v = Sun.eci(new Date(startMs + n * nodeMs));

      nodes.push({ x: v.x, y: v.y, z: v.z });
    }

    const samples: EclipseSample[] = [];
    const sun = { x: 0, y: 0, z: 0 };
    const R = ECLIPSE_CYLINDER_RADIUS_KM;

    for (let t = startMs; t <= endMs; t += step) {
      const pv = sat.eci(new Date(t));

      if (!pv) {
        continue;
      }
      const f = (t - startMs) / nodeMs;
      const n0 = Math.min(Math.floor(f), nodeCount - 2);
      const u = f - n0;
      const a = nodes[n0];
      const b = nodes[n0 + 1];

      sun.x = a.x + (b.x - a.x) * u;
      sun.y = a.y + (b.y - a.y) * u;
      sun.z = a.z + (b.z - a.z) * u;

      const status = SatMath.calculateIsInSun({ position: pv.position } as Parameters<typeof SatMath.calculateIsInSun>[0], sun as Parameters<typeof SatMath.calculateIsInSun>[1]);
      const r = pv.position;
      const sunMag = Math.sqrt(sun.x * sun.x + sun.y * sun.y + sun.z * sun.z);
      const along = (r.x * sun.x + r.y * sun.y + r.z * sun.z) / sunMag;
      const rMag = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z);
      const clearance = along >= 0 ? rMag - R : Math.sqrt(Math.max(rMag * rMag - along * along, 0)) - R;

      samples.push({ ms: t, status, clearance });
    }

    return samples;
  }

  private sliderWithoutBounds(value: number) {
    const timeManager = ServiceLocator.getTimeManager();
    const currentDate = timeManager.simulationTimeObj;

    // Calculate new hours and minutes based on slider value
    const totalMinutes = Math.floor((value / 100) * 1439); // Total minutes in a day
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;

    // Update the simulation time object
    const newDate = new Date(currentDate);

    newDate.setUTCHours(newHours, newMinutes, 0, 0);

    timeManager.changeSimulationTime(newDate.getTime());

    // Notify other components of the time change
    EventBus.getInstance().emit(EventBusEvent.updateDateTime, newDate);
  }

  private sliderWithBounds(value: number) {
    const timeManager = ServiceLocator.getTimeManager();

    const minPosition = this.scenario!.startTime as Date;
    const maxPosition = this.scenario!.endTime as Date;
    const differenceInMs = maxPosition.getTime() - minPosition.getTime();
    const newTimeInMs = minPosition.getTime() + differenceInMs * (value / 100);

    const newDate = new Date(newTimeInMs);

    timeManager.changeSimulationTime(newDate.getTime());

    // Notify other components of the time change
    EventBus.getInstance().emit(EventBusEvent.updateDateTime, newDate);
  }

  updateSliderPosition() {
    const slider = getEl('time-slider-container-slider');
    const handle = slider?.querySelector('.ui-slider-handle') as HTMLElement | null;

    if (slider && handle) {
      const sliderValue = this.getSliderValue(ServiceLocator.getTimeManager().simulationTimeObj);

      handle.style.left = `${sliderValue}%`;
    }
  }

  private attachSliderEvents(sliderId: string, updateFunction: (value: number) => void): void {
    const slider = document.getElementById(sliderId);

    if (slider) {
      const min = parseInt(slider.dataset.min || '0');
      const max = parseInt(slider.dataset.max || '59');
      const step = parseFloat(slider.dataset.step || '1');
      const handle: HTMLElement | null = slider.querySelector('.ui-slider-handle');

      const updateSliderPosition = (clientX: number) => {
        const rect = slider.getBoundingClientRect();
        let percentage = (clientX - rect.left) / rect.width;

        percentage = Math.max(0, Math.min(1, percentage));
        const value = Math.round((percentage * (max - min) + min) / step) * step;

        if (handle) {
          handle.style.left = `${percentage * 100}%`;
        }
        updateFunction(value);
      };

      const onMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        updateSliderPosition(e.clientX);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      slider.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        updateSliderPosition(e.clientX);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        updateSliderPosition(e.touches[0].clientX);
      };

      const onTouchEnd = () => {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
      };

      slider.addEventListener(
        'touchstart',
        (e: TouchEvent) => {
          e.preventDefault();
          updateSliderPosition(e.touches[0].clientX);
          document.addEventListener('touchmove', onTouchMove, { passive: false });
          document.addEventListener('touchend', onTouchEnd);
        },
        { passive: false }
      );
    }
  }
}
