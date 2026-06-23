import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import polarPlotPng from '@public/img/icons/polar-plot.png';


import { SatMath } from '@app/app/analysis/sat-math';
import { SoundNames } from '@app/engine/audio/sounds';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { IHelpConfig, IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { keepTrackApi } from '@app/keepTrackApi';
import { t7e } from '@app/locales/keys';
import { BestPassDeps } from '@app/plugins/best-pass/best-pass-calculator';
import { BaseObject, Kilometers, Satellite, SatelliteRecord } from '@ootk/src/main';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { findPolarPasses, PolarPass } from './polar-plot-pass';
import { drawPolarChart, PolarChartLabels } from './polar-plot-renderer';
import './polar-plot.css';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.PolarPlotPlugin.${key}` as Parameters<typeof t7e>[0]);

/** Square-canvas background used for both the in-menu chart and exported images. */
const CHART_BACKGROUND = '#101522';

/** Image-size presets for export, biased toward common social aspect ratios. */
interface SizePreset { id: string; w: number; h: number }
const SIZE_PRESETS: SizePreset[] = [
  { id: 'square', w: 1080, h: 1080 },
  { id: 'wide', w: 1200, h: 675 },
  { id: 'large', w: 2000, h: 2000 },
];

export class PolarPlotPlugin extends KeepTrackPlugin {
  readonly id = 'PolarPlotPlugin';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  /** Days to look ahead when collecting upcoming passes. */
  private readonly windowDays_ = 3;
  /** Cap on how many passes are kept for stepping. */
  private readonly maxPasses_ = 12;

  /** Detected passes (current + upcoming) and which one is on screen. */
  private passes_: PolarPass[] = [];
  private currentIndex_ = 0;
  private selectedSizeId_ = SIZE_PRESETS[0].id;
  private recomputeTimer_: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  isRequireSatelliteSelected = true;
  isRequireSensorSelected = true;

  menuMode: MenuMode[] = [MenuMode.SENSORS, MenuMode.ALL];

  bottomIconImg = polarPlotPng;
  bottomIconCallback: () => void = () => {
    this.onMenuOpened_();
  };
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/polar-plot/polar-plot-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: l('help.readingHeading'),
          content: l('help.reading'),
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2')],
      shortcuts: [{ keys: ['P'], description: l('help.shortcutToggle') }],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'P',
        callback: () => this.togglePolarPlot_(),
      },
    ];
  }
  sideMenuElementName: string = 'polar-plot-menu';
  sideMenuElementHtml: string = html`
  <div id="polar-plot-menu" class="side-menu-parent start-hidden kt-ui-v13">
    <div id="polar-plot-content" class="side-menu">
      <div id="polar-plot-warning" class="kt-note text-center">${l('labels.notInView').replace('{hours}', (this.windowDays_ * 24).toFixed(0))}</div>
      <canvas id="polar-plot" class="polar-plot-canvas" width="1000" height="1000"></canvas>
      <section id="polar-plot-pass-section" class="kt-section">
        <div class="kt-section-label">${l('sections.pass')}</div>
        <div id="polar-plot-readout" class="polar-plot-readout"></div>
        <button id="polar-plot-prev" type="button" class="kt-action waves-effect waves-light">
          <span class="kt-action-label">${l('labels.prevPass')}</span>
        </button>
        <button id="polar-plot-next" type="button" class="kt-action waves-effect waves-light">
          <span class="kt-action-label">${l('labels.nextPass')}</span>
        </button>
      </section>
      <section id="polar-plot-export-section" class="kt-section">
        <div class="kt-section-label">${l('sections.export')}</div>
        <div class="polar-plot-size-field">
          <label for="polar-plot-size">${l('labels.imageSize')}</label>
          <select id="polar-plot-size" class="browser-default">
            ${SIZE_PRESETS.map((p) => html`<option value="${p.id}">${l(`labels.size_${p.id}`)}</option>`).join('')}
          </select>
        </div>
        <button id="polar-plot-save" type="button" class="kt-action waves-effect waves-light">
          <span class="kt-action-label">${l('labels.saveImage')}</span>
        </button>
        <button id="polar-plot-copy" type="button" class="kt-action waves-effect waves-light">
          <span class="kt-action-label">${l('labels.copyImage')}</span>
        </button>
      </section>
    </div>
  </div>
  `;

  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 450,
    maxWidth: 1000,
  };

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('polar-plot-save')?.addEventListener('click', () => this.saveImage_());
        getEl('polar-plot-copy')?.addEventListener('click', () => {
          this.copyImage_();
        });
        getEl('polar-plot-prev')?.addEventListener('click', () => this.stepPass_(-1));
        getEl('polar-plot-next')?.addEventListener('click', () => this.stepPass_(1));
        getEl('polar-plot-size')?.addEventListener('change', (e) => {
          this.selectedSizeId_ = (e.target as HTMLSelectElement).value;
        });
      },
    );
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.staticOffsetChange,
      () => {
        if (this.isMenuButtonActive) {
          this.scheduleUpdate_();
        }
      },
    );

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj: BaseObject) => {
        if (obj?.isSatellite() && ServiceLocator.getSensorManager().isSensorSelected()) {
          getEl(this.bottomIconElementName)?.classList.remove('bmenu-item-disabled');
          this.isIconDisabled = false;
          // If it is open then refresh the plot
          if (this.isMenuButtonActive) {
            this.scheduleUpdate_();
          }
        } else {
          getEl(this.bottomIconElementName)?.classList.add('bmenu-item-disabled');
          this.isIconDisabled = true;
        }
      },
    );

  }

  private togglePolarPlot_(): void {
    if ((PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? '-1') === '-1') {
      return;
    }

    if (!ServiceLocator.getSensorManager().isSensorSelected()) {
      return;
    }

    if (!this.isMenuButtonActive) {
      this.openSideMenu();
      this.setBottomIconToSelected();
      this.onMenuOpened_();
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    } else {
      this.closeSideMenu();
      this.setBottomIconToUnselected();
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    }
  }

  /** Shared "the menu just opened" entry point used by both the bottom icon and the P shortcut. */
  private onMenuOpened_(): void {
    this.updatePlot_();
  }

  /** Coalesces rapid recompute triggers (e.g. time scrubbing) into a single pass search. */
  private scheduleUpdate_(): void {
    if (this.recomputeTimer_) {
      clearTimeout(this.recomputeTimer_);
    }
    this.recomputeTimer_ = setTimeout(() => {
      this.recomputeTimer_ = null;
      this.updatePlot_();
    }, 150);
  }

  private updatePlot_(): void {
    this.passes_ = this.computePasses_();
    this.currentIndex_ = 0;
    this.renderCurrent_();
  }

  /** Finds the current and upcoming passes for the selected satellite/sensor. */
  private computePasses_(): PolarPass[] {
    const sensor = ServiceLocator.getSensorManager().getSensor();
    const sat = this.selectSatManager_.getSelectedSat() as Satellite;

    if (!sensor?.isSensor() || !sat?.isSatellite()) {
      return [];
    }

    // Fast reject: the satellite can never reach this sensor's range shell.
    if (sat.perigee > sensor.maxRng || sat.apogee < sensor.minRng) {
      return [];
    }

    let satrec: SatelliteRecord;

    try {
      satrec = ServiceLocator.getCatalogManager().calcSatrec(sat);
    } catch {
      return [];
    }

    return findPolarPasses(sat.sccNum, satrec, sensor, this.buildPassDeps_(), {
      windowDays: this.windowDays_,
      maxPasses: this.maxPasses_,
    });
  }

  /** Assembles the application-state dependencies the pure pass finder needs (mirrors Best Pass / Polar View). */
  private buildPassDeps_(): BestPassDeps {
    const scene = ServiceLocator.getScene();

    return {
      baseTimeMs: ServiceLocator.getTimeManager().simulationTimeObj.getTime(),
      // Suppress toasts: the search probes many times and a near-decay satellite legitimately fails at some.
      getRae: (date, satrec, sensor) => SatMath.getRae(date, satrec, sensor, true),
      checkIsInView: (sensor, rae) => SatMath.checkIsInView(sensor, rae as Parameters<typeof SatMath.checkIsInView>[1]),
      sunEciKm: () => ({
        x: scene.sun.position[0] as Kilometers,
        y: scene.sun.position[1] as Kilometers,
        z: scene.sun.position[2] as Kilometers,
      }),
    };
  }

  /** Draws the currently selected pass, or the not-in-view notice when there is none. */
  private renderCurrent_(): void {
    const pass = this.passes_[this.currentIndex_];

    if (!pass) {
      this.showWarning_();

      return;
    }

    const canvas = getEl('polar-plot') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');

    if (!ctx) {
      return;
    }

    const sat = this.selectSatManager_.getSelectedSat() as Satellite;

    drawPolarChart(ctx, pass, {
      labels: this.buildLabels_(sat, this.passes_, this.currentIndex_),
      backgroundColor: CHART_BACKGROUND,
    });

    hideEl('polar-plot-warning');
    showEl('polar-plot');
    showEl('polar-plot-pass-section');
    showEl('polar-plot-export-section');
    this.updateReadout_(pass);
    this.updateNavButtons_();
  }

  private showWarning_(): void {
    hideEl('polar-plot');
    hideEl('polar-plot-pass-section');
    hideEl('polar-plot-export-section');
    showEl('polar-plot-warning');
    const warning = getEl('polar-plot-warning');

    if (warning) {
      warning.textContent = l('labels.notInView').replace('{hours}', (this.windowDays_ * 24).toFixed(0));
    }
  }

  private buildLabels_(sat: Satellite | null, passes: PolarPass[], index: number): PolarChartLabels {
    const sensorName = ServiceLocator.getSensorManager().getSensor()?.name ?? l('labels.unknownSensor');

    return {
      sensorName,
      satLabel: l('labels.satellite').replace('{sccNum}', sat?.sccNum ?? ''),
      passLabel: passes.length > 1
        ? l('labels.passLabel').replace('{n}', String(index + 1)).replace('{total}', String(passes.length))
        : undefined,
    };
  }

  private updateReadout_(pass: PolarPass): void {
    const readout = getEl('polar-plot-readout');

    if (!readout) {
      return;
    }

    const durationMin = Math.round(pass.durationMs / 60000);
    const passOf = l('labels.passLabel').replace('{n}', String(this.currentIndex_ + 1)).replace('{total}', String(this.passes_.length));

    readout.textContent = `${passOf} • ${l('labels.maxEl').replace('{deg}', pass.maxEl.toFixed(0))} • ${durationMin} min`;
  }

  private updateNavButtons_(): void {
    const prev = getEl('polar-plot-prev') as HTMLButtonElement | null;
    const next = getEl('polar-plot-next') as HTMLButtonElement | null;
    const multiple = this.passes_.length > 1;

    if (prev) {
      prev.style.display = multiple ? '' : 'none';
      prev.disabled = this.currentIndex_ <= 0;
    }
    if (next) {
      next.style.display = multiple ? '' : 'none';
      next.disabled = this.currentIndex_ >= this.passes_.length - 1;
    }
  }

  private stepPass_(delta: number): void {
    if (this.passes_.length === 0) {
      return;
    }
    const nextIndex = Math.max(0, Math.min(this.passes_.length - 1, this.currentIndex_ + delta));

    if (nextIndex === this.currentIndex_) {
      return;
    }
    this.currentIndex_ = nextIndex;
    this.renderCurrent_();
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
  }

  /** Renders the active pass into a fresh off-DOM canvas sized to the selected export preset. */
  private renderExportCanvas_(): HTMLCanvasElement | null {
    const pass = this.passes_[this.currentIndex_];

    if (!pass) {
      return null;
    }

    const preset = SIZE_PRESETS.find((p) => p.id === this.selectedSizeId_) ?? SIZE_PRESETS[0];
    const sat = this.selectSatManager_.getSelectedSat() as Satellite;

    return this.renderPassToCanvas_(pass, this.buildLabels_(sat, this.passes_, this.currentIndex_), preset.w, preset.h);
  }

  private renderPassToCanvas_(pass: PolarPass, labels: PolarChartLabels, width: number, height: number): HTMLCanvasElement | null {
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    drawPolarChart(ctx, pass, {
      labels,
      backgroundColor: CHART_BACKGROUND,
      watermark: settingsManager.copyrightOveride ? undefined : 'keeptrack.space',
    });

    return canvas;
  }

  private saveImage_(): void {
    const canvas = this.renderExportCanvas_();

    if (!canvas) {
      return;
    }

    const polarSat = this.selectSatManager_.getSelectedSat() as Satellite;
    const link = document.createElement('a');

    link.href = canvas.toDataURL('image/png');
    link.download = `sat-${polarSat.sccNum6 ?? polarSat.sccNum}-polar-plot.png`;
    link.click();
  }

  private copyImage_(): void {
    const canvas = this.renderExportCanvas_();

    if (!canvas || typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        .then(() => keepTrackApi.toast(l('labels.copied'), ToastMsgType.normal))
        .catch(() => keepTrackApi.toast(l('errorMsgs.copyFailed'), ToastMsgType.caution));
    }, 'image/png');
  }

  /**
   * Head-less render entry point: computes a pass for the given (or selected)
   * satellite over the current sensor and returns it as a PNG data URL, without
   * touching the menu. Used by automated content-generation scripts.
   */
  renderToDataUrl(opts: { sccNum?: string; satId?: number; passIndex?: number; size?: number; windowDays?: number } = {}): string | null {
    const catalog = ServiceLocator.getCatalogManager();
    const sensor = ServiceLocator.getSensorManager().getSensor();

    if (!sensor?.isSensor()) {
      return null;
    }

    let sat: Satellite | null = null;

    if (typeof opts.satId === 'number') {
      sat = catalog.getObject(opts.satId) as Satellite;
    } else if (opts.sccNum) {
      const id = catalog.sccNum2Id(opts.sccNum);

      sat = id !== null ? (catalog.getObject(id) as Satellite) : null;
    } else {
      sat = this.selectSatManager_.getSelectedSat() as Satellite;
    }

    if (!sat?.isSatellite()) {
      return null;
    }

    let satrec: SatelliteRecord;

    try {
      satrec = catalog.calcSatrec(sat);
    } catch {
      return null;
    }

    const passes = findPolarPasses(sat.sccNum, satrec, sensor, this.buildPassDeps_(), {
      windowDays: opts.windowDays ?? this.windowDays_,
      maxPasses: this.maxPasses_,
    });
    const pass = passes[opts.passIndex ?? 0];

    if (!pass) {
      return null;
    }

    const size = opts.size ?? SIZE_PRESETS[0].w;
    const canvas = this.renderPassToCanvas_(pass, this.buildLabels_(sat, passes, opts.passIndex ?? 0), size, size);

    return canvas?.toDataURL('image/png') ?? null;
  }
}
