import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { settingsManager } from '@app/settings/settings';

export type StepExitReason = 'next' | 'back' | 'action' | 'skip' | 'button' | 'missing-target';

export type TourFinishReason = 'completed' | 'skipped';

export interface TourStepButton {
  id: string;
  label: string;
  isPrimary?: boolean;
}

export interface TourStep {
  /** Stable id used for analytics and resume. */
  id: string;
  /** Pre-translated title. */
  title: string;
  /** Pre-translated body. May contain simple inline HTML. */
  body: string;
  /** Coachmarks anchor to a target element; cards render centered. */
  kind: 'coachmark' | 'card';
  target?: () => HTMLElement | null;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** Filtered out of the run when false. Checked at start and on entry. */
  isAvailable?: () => boolean;
  /** Runs before the step renders (e.g. open the drawer, expand a group). */
  beforeEnter?: () => void;
  afterExit?: (reason: StepExitReason) => void;
  /** Auto-advance when this event fires (and the predicate passes). */
  advanceOn?: {
    event: EventBusEvent;
    predicate?: (...args: unknown[]) => boolean;
    /**
     * Re-checked after the settle delay, once every other listener for the
     * event has run. Use for "did the menu really open" style verification
     * (base-plugin activation happens after the raw bottomMenuClick event).
     */
    verify?: () => boolean;
    /**
     * When set (with an actionButton), the "Do it for me" button starts hidden
     * and is revealed with a gentle pulse after this much inactivity, so stuck
     * users are rescued without being rushed.
     */
    timeoutHintMs?: number;
    /**
     * Dwell after the task completes before advancing: the shade lifts so the
     * user can SEE the result of what they pressed (the menu that opened, the
     * layer that toggled) and the popover shows a done note. Next skips it.
     * Defaults to 0 (advance immediately after the settle delay).
     */
    dwellMs?: number;
  };
  /** Optional "Do it for me" style helper button. */
  actionButton?: { label: string; action: () => void };
  /** Extra HTML rendered between the body and the buttons (e.g. persona chips). */
  extraHtml?: string;
  /** Custom buttons (cards). When set, the default Back/Next nav is not rendered. */
  buttons?: TourStepButton[];
  /** Button id triggered by Escape. Defaults to the skip flow. */
  escButtonId?: string;
  /** Called after the popover DOM for this step is in the document. */
  onRender?: (popoverEl: HTMLElement) => void;
}

export interface TourEngineOptions {
  steps: TourStep[];
  texts: {
    next: string;
    back: string;
    skip: string;
    skipConfirm: string;
    skipYes: string;
    skipNo: string;
    stepLabel: string;
    /** Success note shown while dwelling on a completed task step. */
    stepDone: string;
  };
  /** Fired on every step entry with the position within the filtered run. */
  onStepShown?: (step: TourStep, index: number, total: number) => void;
  onStepExit?: (step: TourStep, reason: StepExitReason) => void;
  /** Fired when a custom (card) button is clicked. */
  onCustomButton?: (stepId: string, buttonId: string) => void;
  onFinish: (reason: TourFinishReason, lastStepId: string | null) => void;
}

const RING_PADDING_PX = 6;
const POPOVER_GAP_PX = 12;
const VIEWPORT_MARGIN_PX = 8;
const MISSING_TARGET_RETRY_MS = 300;
/** Lets the triggering interaction settle before verifying/advancing. */
const ADVANCE_SETTLE_MS = 350;

/**
 * Generic guided-tour runner: a four-panel spotlight shade around the target,
 * an anchored popover with progress dots, and event-driven step advancement.
 * Coachmark shades are click-through (CSS pointer-events: none): task steps
 * need the WHOLE app interactive, since menus, pickers, and dropdowns open
 * outside the spotlight hole. Only centered card steps block the app behind
 * them. Content-free by design so it can be reused for contextual tips and
 * per-plugin mini-tours later.
 */
export class TourEngine {
  private readonly options_: TourEngineOptions;
  private steps_: TourStep[] = [];
  private index_ = -1;
  private rootEl_: HTMLElement | null = null;
  private popoverEl_: HTMLElement | null = null;
  private ringEl_: HTMLElement | null = null;
  private shadeEls_: HTMLElement[] = [];
  private tickCancel_: (() => void) | null = null;
  private lastRect_: DOMRect | null = null;
  private advanceCb_: ((...args: unknown[]) => void) | null = null;
  private advanceEvent_: EventBusEvent | null = null;
  private missingTargetTimeout_: ReturnType<typeof setTimeout> | null = null;
  private hintTimeout_: ReturnType<typeof setTimeout> | null = null;
  private dwellTimeout_: ReturnType<typeof setTimeout> | null = null;
  /** True while dwelling on a completed task step (shade lifted, done note up). */
  private isDwelling_ = false;
  private isConfirmingSkip_ = false;
  private readonly keydownCb_ = (evt: KeyboardEvent): void => this.onKeyDown_(evt);

  constructor(options: TourEngineOptions) {
    this.options_ = options;
  }

  get isActive(): boolean {
    return this.index_ >= 0;
  }

  get currentStep(): TourStep | null {
    return this.steps_[this.index_] ?? null;
  }

  /** Starts the run, optionally at a specific step id (for resume). */
  start(startStepId?: string): void {
    if (this.isActive) {
      this.stop();
    }

    this.steps_ = this.options_.steps.filter((step) => step.isAvailable?.() !== false);

    if (this.steps_.length === 0) {
      this.options_.onFinish('completed', null);

      return;
    }

    let startIndex = 0;

    if (startStepId) {
      const idx = this.steps_.findIndex((step) => step.id === startStepId);

      if (idx >= 0) {
        startIndex = idx;
      }
    }

    this.buildDom_();
    document.addEventListener('keydown', this.keydownCb_, true);
    this.showStep_(startIndex);
  }

  next(reason: StepExitReason = 'next'): void {
    if (!this.isActive) {
      return;
    }

    this.exitCurrentStep_(reason);

    if (this.index_ + 1 >= this.steps_.length) {
      this.finish('completed');

      return;
    }

    this.showStep_(this.index_ + 1);
  }

  back(): void {
    if (!this.isActive || this.index_ === 0) {
      return;
    }

    this.exitCurrentStep_('back');
    this.showStep_(this.index_ - 1);
  }

  skipTour(): void {
    this.finish('skipped');
  }

  finish(reason: TourFinishReason): void {
    const lastStepId = this.currentStep?.id ?? null;

    if (this.isActive) {
      this.exitCurrentStep_(reason === 'completed' ? 'next' : 'skip');
    }

    this.stop();
    this.options_.onFinish(reason, lastStepId);
  }

  /** Tears down all DOM and listeners without firing onFinish. */
  stop(): void {
    this.clearAdvanceSubscription_();
    this.clearMissingTargetTimeout_();
    this.clearHintTimeout_();
    this.clearDwell_();

    this.tickCancel_?.();
    this.tickCancel_ = null;

    document.removeEventListener('keydown', this.keydownCb_, true);
    this.rootEl_?.remove();
    this.rootEl_ = null;
    this.popoverEl_ = null;
    this.ringEl_ = null;
    this.shadeEls_ = [];
    this.index_ = -1;
    this.lastRect_ = null;
    this.isConfirmingSkip_ = false;
  }

  // ---------------------------------------------------------------------------
  // Step lifecycle
  // ---------------------------------------------------------------------------

  private showStep_(index: number): void {
    this.index_ = index;
    this.isConfirmingSkip_ = false;

    const step = this.steps_[index];

    if (step.isAvailable?.() === false) {
      this.next('missing-target');

      return;
    }

    step.beforeEnter?.();
    this.subscribeAdvance_(step);
    this.renderStep_(step);
    this.scheduleHintReveal_(step);
    this.options_.onStepShown?.(step, index, this.steps_.length);
    this.startPositionLoop_();
  }

  private exitCurrentStep_(reason: StepExitReason): void {
    const step = this.currentStep;

    this.clearAdvanceSubscription_();
    this.clearMissingTargetTimeout_();
    this.clearHintTimeout_();
    this.clearDwell_();

    if (step) {
      step.afterExit?.(reason);
      this.options_.onStepExit?.(step, reason);
    }
  }

  private subscribeAdvance_(step: TourStep): void {
    this.clearAdvanceSubscription_();

    if (!step.advanceOn) {
      return;
    }

    const { event, predicate, verify } = step.advanceOn;

    this.advanceCb_ = (...args: unknown[]): void => {
      if (predicate && !predicate(...args)) {
        return;
      }
      // Let the triggering interaction settle before moving the spotlight
      setTimeout(() => {
        if (verify && !verify()) {
          return;
        }
        if (!this.isActive || this.currentStep !== step || this.isDwelling_) {
          return;
        }

        const dwellMs = step.advanceOn?.dwellMs ?? 0;

        if (dwellMs > 0) {
          this.beginDwell_(step, dwellMs);
        } else {
          this.next('action');
        }
      }, ADVANCE_SETTLE_MS);
    };
    this.advanceEvent_ = event;
    EventBus.getInstance().on(event, this.advanceCb_);
  }

  private clearAdvanceSubscription_(): void {
    if (this.advanceCb_ && this.advanceEvent_ !== null) {
      EventBus.getInstance().unregister(this.advanceEvent_, this.advanceCb_);
    }
    this.advanceCb_ = null;
    this.advanceEvent_ = null;
  }

  private clearMissingTargetTimeout_(): void {
    if (this.missingTargetTimeout_ !== null) {
      clearTimeout(this.missingTargetTimeout_);
      this.missingTargetTimeout_ = null;
    }
  }

  private clearHintTimeout_(): void {
    if (this.hintTimeout_ !== null) {
      clearTimeout(this.hintTimeout_);
      this.hintTimeout_ = null;
    }
  }

  private clearDwell_(): void {
    if (this.dwellTimeout_ !== null) {
      clearTimeout(this.dwellTimeout_);
      this.dwellTimeout_ = null;
    }
    this.isDwelling_ = false;
    this.rootEl_?.classList.remove('kt-tour-dwell');
    this.popoverEl_?.classList.remove('kt-tour-popover-done');
  }

  /**
   * The task is done: lift the shade so the user can see the result of what
   * they pressed, show the done note, and advance after the dwell. Clicking
   * Next skips the wait.
   */
  private beginDwell_(step: TourStep, dwellMs: number): void {
    this.isDwelling_ = true;
    this.clearAdvanceSubscription_();
    this.clearHintTimeout_();

    this.rootEl_?.classList.add('kt-tour-dwell');
    this.popoverEl_?.classList.add('kt-tour-popover-done');

    const dotsEl = this.popoverEl_?.querySelector('.kt-tour-dots');

    if (dotsEl) {
      dotsEl.innerHTML = `<span class="kt-tour-done-note">&#x2713; ${this.options_.texts.stepDone}</span>`;
    }
    this.popoverEl_?.querySelector('[data-tour-action="do-it"]')?.classList.add('start-hidden');

    this.dwellTimeout_ = setTimeout(() => {
      this.dwellTimeout_ = null;

      if (this.isActive && this.currentStep === step) {
        this.next('action');
      }
    }, dwellMs);
  }

  /** Reveals a deferred "Do it for me" button after the step's hint timeout. */
  private scheduleHintReveal_(step: TourStep): void {
    this.clearHintTimeout_();

    const timeoutHintMs = step.advanceOn?.timeoutHintMs;

    if (!timeoutHintMs || !step.actionButton) {
      return;
    }

    this.hintTimeout_ = setTimeout(() => {
      this.hintTimeout_ = null;

      if (!this.isActive || this.currentStep !== step) {
        return;
      }

      const actionBtn = this.popoverEl_?.querySelector('[data-tour-action="do-it"]');

      actionBtn?.classList.remove('start-hidden');
      actionBtn?.classList.add('kt-tour-btn-hint-pulse');
    }, timeoutHintMs);
  }

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------

  private buildDom_(): void {
    const root = document.createElement('div');

    root.id = 'kt-tour-root';
    root.className = settingsManager.isMobileModeEnabled ? 'kt-tour-root kt-tour-mobile' : 'kt-tour-root';

    this.shadeEls_ = (['top', 'left', 'right', 'bottom'] as const).map((side) => {
      const shade = document.createElement('div');

      shade.className = `kt-tour-shade kt-tour-shade-${side}`;
      root.appendChild(shade);

      return shade;
    });

    const ring = document.createElement('div');

    ring.className = 'kt-tour-ring';
    root.appendChild(ring);
    this.ringEl_ = ring;

    const popover = document.createElement('div');

    popover.className = 'kt-tour-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'false');
    popover.tabIndex = -1;
    root.appendChild(popover);
    this.popoverEl_ = popover;

    document.body.appendChild(root);
    this.rootEl_ = root;
  }

  private renderStep_(step: TourStep): void {
    if (!this.popoverEl_ || !this.rootEl_) {
      return;
    }

    const total = this.steps_.length;
    const dots = Array.from({ length: total }, (_, i) => {
      const cls = i === this.index_ ? 'kt-tour-dot kt-tour-dot-active' : 'kt-tour-dot';

      return `<span class="${cls}"></span>`;
    }).join('');

    const stepLabel = this.options_.texts.stepLabel
      .replace('{current}', String(this.index_ + 1))
      .replace('{total}', String(total));

    // A hint-deferred action button starts hidden; scheduleHintReveal_ shows it
    const actionHiddenCls = step.advanceOn?.timeoutHintMs ? ' start-hidden' : '';
    const actionHtml = step.actionButton
      ? `<button type="button" class="kt-tour-btn kt-tour-btn-action${actionHiddenCls}" data-tour-action="do-it">${step.actionButton.label}</button>`
      : '';

    let buttonsHtml: string;

    if (step.buttons) {
      buttonsHtml = step.buttons
        .map((btn) => {
          const cls = btn.isPrimary ? 'kt-tour-btn kt-tour-btn-primary' : 'kt-tour-btn';

          return `<button type="button" class="${cls}" data-tour-button="${btn.id}">${btn.label}</button>`;
        })
        .join('');
    } else {
      const backHtml = this.index_ > 0
        ? `<button type="button" class="kt-tour-btn" data-tour-action="back">${this.options_.texts.back}</button>`
        : '';

      buttonsHtml =
        `${backHtml}${actionHtml}` +
        `<button type="button" class="kt-tour-btn kt-tour-btn-primary" data-tour-action="next">${this.options_.texts.next}</button>`;
    }

    const skipHtml = step.buttons
      ? ''
      : `<button type="button" class="kt-tour-skip-link" data-tour-action="skip">${this.options_.texts.skip}</button>`;

    this.popoverEl_.innerHTML =
      '<div class="kt-tour-popover-header">' +
      `<span class="kt-tour-popover-title" id="kt-tour-title">${step.title}</span>${
      step.buttons ? '' : `<span class="kt-tour-step-label">${stepLabel}</span>`
      }</div>` +
      `<div class="kt-tour-popover-body" id="kt-tour-body">${step.body}</div>${
      step.extraHtml ?? ''
      }<div class="kt-tour-confirm-skip start-hidden">` +
      `<span>${this.options_.texts.skipConfirm}</span>` +
      `<button type="button" class="kt-tour-btn" data-tour-action="confirm-skip">${this.options_.texts.skipYes}</button>` +
      `<button type="button" class="kt-tour-btn" data-tour-action="cancel-skip">${this.options_.texts.skipNo}</button>` +
      '</div>' +
      `<div class="kt-tour-popover-footer"><div class="kt-tour-dots">${step.buttons ? '' : dots}</div>` +
      `<div class="kt-tour-buttons">${buttonsHtml}</div></div>` +
      `<div class="kt-tour-skip-row">${skipHtml}</div>`;

    this.popoverEl_.setAttribute('aria-labelledby', 'kt-tour-title');
    this.popoverEl_.setAttribute('aria-describedby', 'kt-tour-body');
    this.rootEl_.classList.toggle('kt-tour-card-mode', step.kind === 'card' || !step.target);
    this.wireButtons_(step);
    this.position_(step, true);
    this.popoverEl_.focus({ preventScroll: true });
    step.onRender?.(this.popoverEl_);
  }

  private wireButtons_(step: TourStep): void {
    if (!this.popoverEl_) {
      return;
    }

    this.popoverEl_.querySelectorAll('[data-tour-action]').forEach((el) => {
      el.addEventListener('click', () => {
        const action = (el as HTMLElement).dataset.tourAction;

        switch (action) {
          case 'next':
            this.next();
            break;
          case 'back':
            this.back();
            break;
          case 'skip':
            this.toggleSkipConfirm_(true);
            break;
          case 'confirm-skip':
            this.skipTour();
            break;
          case 'cancel-skip':
            this.toggleSkipConfirm_(false);
            break;
          case 'do-it':
            step.actionButton?.action();
            break;
          default:
            break;
        }
      });
    });

    this.popoverEl_.querySelectorAll('[data-tour-button]').forEach((el) => {
      el.addEventListener('click', () => {
        const buttonId = (el as HTMLElement).dataset.tourButton;

        if (buttonId) {
          this.options_.onCustomButton?.(step.id, buttonId);
        }
      });
    });
  }

  private toggleSkipConfirm_(show: boolean): void {
    this.isConfirmingSkip_ = show;
    const confirmEl = this.popoverEl_?.querySelector('.kt-tour-confirm-skip');

    confirmEl?.classList.toggle('start-hidden', !show);
  }

  // ---------------------------------------------------------------------------
  // Positioning
  // ---------------------------------------------------------------------------

  /**
   * requestAnimationFrame with a setTimeout fallback (jsdom test envs).
   * Remembers the mechanism used so the matching cancel is always called.
   */
  private scheduleTick_(cb: () => void): void {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      const id = globalThis.requestAnimationFrame(() => cb());

      this.tickCancel_ = () => {
        // Some environments shim rAF over setTimeout; fall back accordingly
        try {
          globalThis.cancelAnimationFrame?.(id);
        } catch {
          clearTimeout(id);
        }
      };
    } else {
      const id = globalThis.setTimeout(cb, 50);

      this.tickCancel_ = () => clearTimeout(id);
    }
  }

  private startPositionLoop_(): void {
    this.tickCancel_?.();

    const tick = (): void => {
      if (!this.isActive) {
        return;
      }

      const step = this.currentStep;

      if (step) {
        this.position_(step, false);
      }
      this.scheduleTick_(tick);
    };

    this.scheduleTick_(tick);
  }

  private position_(step: TourStep, isForce: boolean): void {
    if (!this.rootEl_ || !this.popoverEl_ || !this.ringEl_) {
      return;
    }

    const targetEl = step.target?.() ?? null;

    if (step.kind === 'card' || !step.target) {
      this.applyCardLayout_();

      return;
    }

    if (!targetEl?.isConnected) {
      // While dwelling the step is already advancing; a target hidden behind
      // the just-opened result must not trigger the missing-target skip.
      if (!this.isDwelling_) {
        this.handleMissingTarget_(step);
      }

      return;
    }

    this.clearMissingTargetTimeout_();

    const rect = targetEl.getBoundingClientRect();

    if (
      !isForce &&
      this.lastRect_ &&
      rect.top === this.lastRect_.top &&
      rect.left === this.lastRect_.left &&
      rect.width === this.lastRect_.width &&
      rect.height === this.lastRect_.height
    ) {
      return;
    }

    this.lastRect_ = rect;
    this.applySpotlightLayout_(rect, step);
  }

  private handleMissingTarget_(step: TourStep): void {
    // The target can vanish mid-step (drawer closed itself, menu re-rendered).
    // Re-run beforeEnter once, then give it a moment; if it is still gone,
    // move on rather than stranding the user on an anchorless coachmark.
    if (this.missingTargetTimeout_ !== null) {
      return;
    }

    step.beforeEnter?.();
    this.missingTargetTimeout_ = setTimeout(() => {
      this.missingTargetTimeout_ = null;

      if (this.isActive && this.currentStep === step && !step.target?.()?.isConnected) {
        this.next('missing-target');
      }
    }, MISSING_TARGET_RETRY_MS);
  }

  private applyCardLayout_(): void {
    if (!this.popoverEl_ || !this.ringEl_) {
      return;
    }

    for (const shade of this.shadeEls_) {
      shade.style.inset = '';
      shade.style.display = 'none';
    }
    this.shadeEls_[0].style.display = 'block';
    this.shadeEls_[0].style.inset = '0';
    this.ringEl_.style.display = 'none';
    this.popoverEl_.classList.add('kt-tour-popover-card');
    this.popoverEl_.style.left = '';
    this.popoverEl_.style.top = '';
  }

  private applySpotlightLayout_(rect: DOMRect, step: TourStep): void {
    if (!this.popoverEl_ || !this.ringEl_) {
      return;
    }

    const pad = RING_PADDING_PX;
    const holeTop = Math.max(rect.top - pad, 0);
    const holeLeft = Math.max(rect.left - pad, 0);
    const holeRight = Math.min(rect.right + pad, window.innerWidth);
    const holeBottom = Math.min(rect.bottom + pad, window.innerHeight);

    const [topShade, leftShade, rightShade, bottomShade] = this.shadeEls_;

    for (const shade of this.shadeEls_) {
      shade.style.display = 'block';
      shade.style.inset = '';
    }

    topShade.style.inset = `0 0 ${window.innerHeight - holeTop}px 0`;
    bottomShade.style.inset = `${holeBottom}px 0 0 0`;
    leftShade.style.inset = `${holeTop}px ${window.innerWidth - holeLeft}px ${window.innerHeight - holeBottom}px 0`;
    rightShade.style.inset = `${holeTop}px 0 ${window.innerHeight - holeBottom}px ${holeRight}px`;

    this.ringEl_.style.display = 'block';
    this.ringEl_.style.top = `${holeTop}px`;
    this.ringEl_.style.left = `${holeLeft}px`;
    this.ringEl_.style.width = `${holeRight - holeLeft}px`;
    this.ringEl_.style.height = `${holeBottom - holeTop}px`;

    this.popoverEl_.classList.remove('kt-tour-popover-card');
    this.positionPopover_(rect, step.placement ?? 'auto');
  }

  private positionPopover_(rect: DOMRect, placement: 'top' | 'bottom' | 'left' | 'right' | 'auto'): void {
    if (!this.popoverEl_) {
      return;
    }

    // Mobile docks the popover to the bottom via CSS; skip anchoring math.
    if (this.rootEl_?.classList.contains('kt-tour-mobile')) {
      this.popoverEl_.style.left = '';
      this.popoverEl_.style.top = '';

      return;
    }

    const popRect = this.popoverEl_.getBoundingClientRect();
    const fits = {
      right: rect.right + POPOVER_GAP_PX + popRect.width <= window.innerWidth - VIEWPORT_MARGIN_PX,
      left: rect.left - POPOVER_GAP_PX - popRect.width >= VIEWPORT_MARGIN_PX,
      bottom: rect.bottom + POPOVER_GAP_PX + popRect.height <= window.innerHeight - VIEWPORT_MARGIN_PX,
      top: rect.top - POPOVER_GAP_PX - popRect.height >= VIEWPORT_MARGIN_PX,
    };

    let side = placement;

    if (side === 'auto' || !fits[side]) {
      side = (['right', 'bottom', 'left', 'top'] as const).find((s) => fits[s]) ?? 'bottom';
    }

    let left: number;
    let top: number;

    switch (side) {
      case 'right':
        left = rect.right + POPOVER_GAP_PX;
        top = rect.top + rect.height / 2 - popRect.height / 2;
        break;
      case 'left':
        left = rect.left - POPOVER_GAP_PX - popRect.width;
        top = rect.top + rect.height / 2 - popRect.height / 2;
        break;
      case 'top':
        left = rect.left + rect.width / 2 - popRect.width / 2;
        top = rect.top - POPOVER_GAP_PX - popRect.height;
        break;
      case 'bottom':
      default:
        left = rect.left + rect.width / 2 - popRect.width / 2;
        top = rect.bottom + POPOVER_GAP_PX;
        break;
    }

    left = Math.min(Math.max(left, VIEWPORT_MARGIN_PX), window.innerWidth - popRect.width - VIEWPORT_MARGIN_PX);
    top = Math.min(Math.max(top, VIEWPORT_MARGIN_PX), window.innerHeight - popRect.height - VIEWPORT_MARGIN_PX);

    this.popoverEl_.style.left = `${left}px`;
    this.popoverEl_.style.top = `${top}px`;
  }

  // ---------------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------------

  private onKeyDown_(evt: KeyboardEvent): void {
    if (!this.isActive) {
      return;
    }

    const step = this.currentStep;

    if (evt.key === 'Escape') {
      evt.stopPropagation();

      if (step?.buttons) {
        const escId = step.escButtonId ?? step.buttons.at(-1)?.id;

        if (escId) {
          this.options_.onCustomButton?.(step.id, escId);
        }
      } else if (this.isConfirmingSkip_) {
        this.skipTour();
      } else {
        this.toggleSkipConfirm_(true);
      }

      return;
    }

    // Only handle arrow navigation for default-nav coachmarks
    if (step?.buttons) {
      return;
    }

    if (evt.key === 'ArrowRight') {
      this.next();
    } else if (evt.key === 'ArrowLeft') {
      this.back();
    }
  }
}
