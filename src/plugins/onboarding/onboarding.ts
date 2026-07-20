import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  ICommandPaletteCapable,
  ICommandPaletteCommand,
  IHelpConfig,
  ISettingsContribution,
  ISettingsContributor,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { settingsManager } from '@app/settings/settings';
import checkCirclePng from '@public/img/icons/check-circle.png';
import type { User } from '@supabase/supabase-js';
import { buildMissions, type ChecklistMission, MISSION_POWER_TOUR, sortMissionsForPersona, wireMissionAutoChecks } from './checklist';
import { GetStartedCard } from './get-started-card';
import {
  type ChapterId,
  createDefaultOnboardingState,
  isResumable,
  loadOnboardingState,
  type OnboardingPersona,
  type OnboardingState,
  saveOnboardingState,
} from './onboarding-state';
import { l } from './onboarding-t7e';
import { areAllAvailableChaptersDone, buildHubStep, POWER_CHAPTERS } from './power-hub';
import { TourEngine, type TourStep } from './tour-engine';
import { buildBasicsSteps, openDrawer } from './tour-steps';
import './onboarding.css';

const AUTO_START_DELAY_MS = 1500;
const PERSONAS: OnboardingPersona[] = ['explorer', 'student', 'operator', 'developer'];

/**
 * Onboarding Plugin
 *
 * Two-tier first-run experience: a short Basics tour for everyone (globe,
 * search/select, time, drawer pointer), a bridge card offering the opt-in
 * Power tour (drawer depth, sensors, watchlist, command palette), an optional
 * create-account card (Pro builds only, via the login-gate hook), and a
 * persistent Storybook-style "Get started" checklist card pinned at the top
 * of the plugin drawer.
 */
export class OnboardingPlugin extends KeepTrackPlugin implements ICommandPaletteCapable, ISettingsContributor {
  readonly id = 'OnboardingPlugin';
  dependencies_ = [];
  /** The Getting Started entry lives in the drawer's About group, not a mode group. */
  drawerGroupKey = 'about';

  private state_: OnboardingState = createDefaultOnboardingState();
  private engine_: TourEngine | null = null;
  private card_: GetStartedCard | null = null;
  private missions_: ChecklistMission[] = [];
  private accountLoginCb_: ((user: User | null) => void) | null = null;

  // =========================================================================
  // Composition-based configuration
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'onboarding-bottom-icon',
      label: l('bottomIconLabel'),
      image: checkCirclePng,
      menuMode: [MenuMode.TOOLS, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'onboarding-menu',
      title: l('title'),
      html: this.buildSideMenuHtml_(),
    };
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = l('title');

    return [
      {
        id: 'OnboardingPlugin.startTour',
        label: l('commands.startTour'),
        category,
        keywords: ['tutorial', 'onboarding', 'tour', 'help'],
        callback: () => this.restartTour(),
      },
      {
        id: 'OnboardingPlugin.startPowerTour',
        label: l('commands.startPowerTour'),
        category,
        keywords: ['tutorial', 'power', 'advanced', 'tour'],
        callback: () => this.startPowerTour(true),
      },
      {
        id: 'OnboardingPlugin.openChecklist',
        label: l('commands.openChecklist'),
        category,
        keywords: ['checklist', 'get started', 'missions'],
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getSettingsContribution(): ISettingsContribution {
    return {
      sectionId: this.id,
      sectionLabel: l('title'),
      controls: [
        {
          id: 'showOnboardingOnFirstRun',
          type: 'toggle',
          label: l('settings.showOnFirstRun'),
          get: () => !settingsManager.isDisableOnboarding,
          set: (next: boolean) => {
            settingsManager.isDisableOnboarding = !next;
          },
        },
        {
          id: 'restartTutorial',
          type: 'button',
          label: l('settings.restartTutorial'),
          buttonLabel: l('settings.restartTutorialButton'),
          onClick: () => this.restartTour(),
        },
      ],
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      body: l('helpBody'),
    };
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  addJs(): void {
    super.addJs();

    this.state_ = loadOnboardingState();
    this.missions_ = buildMissions(() => this.startPowerTour(true));
    this.card_ = new GetStartedCard({
      getMissions: () => sortMissionsForPersona(this.missions_, this.state_.persona),
      getState: () => this.state_,
      onLaunch: (missionId: string) => this.launchMission_(missionId),
      onDismiss: () => {
        this.state_.isCardDismissed = true;
        this.saveState_();
        this.card_?.render();
        this.track_('onboarding_card_dismissed', { percent: this.checklistPercent_() });
      },
    });

    wireMissionAutoChecks((missionId: string) => this.markMissionDone_(missionId));

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      this.renderChecklistMenu_();
      this.card_?.render();
      this.wireChecklistMenu_();
    });

    EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, () => {
      this.onReady_();
    });
  }

  // =========================================================================
  // First-run gating
  // =========================================================================

  private onReady_(): void {
    const tourParam = new URLSearchParams(globalThis.location?.search ?? '').get('tour');

    if (tourParam === 'off') {
      return;
    }

    if (tourParam === 'start') {
      this.afterSplash_(() => this.startWelcome_());

      return;
    }

    if (tourParam === 'power') {
      this.afterSplash_(() => this.startPowerTour(true));

      return;
    }

    if (settingsManager.isDisableOnboarding) {
      return;
    }

    if (this.state_.status === 'done' || this.state_.status === 'skipped') {
      return;
    }

    if (isResumable(this.state_)) {
      this.afterSplash_(() => this.resume_());

      return;
    }

    // Stale partial state (or a fresh profile): start from the top
    this.afterSplash_(() => this.startWelcome_());
  }

  /** Defers cb until the loading screen is actually gone and the globe is visible. */
  private afterSplash_(cb: () => void): void {
    const loadingScreen = getEl('loading-screen', true);
    const isHidden = !loadingScreen || globalThis.getComputedStyle(loadingScreen).display === 'none';

    if (isHidden) {
      setTimeout(cb, AUTO_START_DELAY_MS);
    } else {
      EventBus.getInstance().once(EventBusEvent.splashScreenHidden, () => {
        setTimeout(cb, AUTO_START_DELAY_MS);
      });
    }
  }

  private resume_(): void {
    switch (this.state_.stage) {
      case 'basics':
        this.startBasics_(this.state_.stepId ?? undefined);
        break;
      case 'bridge':
        this.showBridge_();
        break;
      case 'power':
        // Chapter-level resume lives in powerChapters; land on the hub
        this.openHub_(true);
        break;
      case 'account':
        this.showAccount_();
        break;
      case 'welcome':
      default:
        this.startWelcome_();
        break;
    }
  }

  // =========================================================================
  // Public entry points
  // =========================================================================

  /** Restarts the full tour from the welcome card. */
  restartTour(): void {
    this.teardownEngine_();
    this.state_ = {
      ...createDefaultOnboardingState(),
      persona: this.state_.persona,
      checklist: this.state_.checklist,
      powerChapters: this.state_.powerChapters,
      tiers: {
        ...createDefaultOnboardingState().tiers,
        power: this.state_.tiers.power,
      },
    };
    this.saveState_();
    this.track_('onboarding_restarted');
    this.startWelcome_();
  }

  /**
   * Opens the Power Tour hub. Standalone openings (checklist mission, command
   * palette, Getting Started menu, ?tour=power) never trigger the account
   * stage; only the first-run bridge flow does, exactly once, on hub close.
   */
  startPowerTour(isStandalone: boolean): void {
    this.teardownEngine_();

    if (isStandalone) {
      this.track_('onboarding_power_started', { source: 'relaunch' });
    }

    this.openHub_(!isStandalone);
  }

  // =========================================================================
  // Stage: welcome
  // =========================================================================

  private startWelcome_(): void {
    if (this.engine_?.isActive) {
      return;
    }

    this.state_.status = 'in-progress';
    this.state_.stage = 'welcome';
    this.state_.stepId = null;
    this.saveState_();
    this.track_('onboarding_shown');

    const personaChips = PERSONAS.map((persona) => {
      const selected = this.state_.persona === persona ? ' kt-tour-chip-selected' : '';

      return `<button type="button" class="kt-tour-chip${selected}" data-persona="${persona}">${l(`personas.${persona}`)}</button>`;
    }).join('');

    const welcomeStep: TourStep = {
      id: 'welcome',
      kind: 'card',
      title: l('welcome.title'),
      body: l('welcome.body'),
      extraHtml: `<div class="kt-tour-persona"><div class="kt-tour-persona-label">${l('welcome.personaQuestion')}</div>` + `<div class="kt-tour-chips">${personaChips}</div></div>`,
      buttons: [
        { id: 'start', label: l('buttons.startTour'), isPrimary: true },
        { id: 'explore', label: l('buttons.exploreOnMyOwn') },
      ],
      escButtonId: 'explore',
      onRender: (popoverEl: HTMLElement) => {
        popoverEl.querySelectorAll('.kt-tour-chip').forEach((chip) => {
          chip.addEventListener('click', () => {
            const persona = (chip as HTMLElement).dataset.persona as OnboardingPersona;

            this.state_.persona = this.state_.persona === persona ? null : persona;
            this.saveState_();
            popoverEl.querySelectorAll('.kt-tour-chip').forEach((c) => {
              c.classList.toggle('kt-tour-chip-selected', (c as HTMLElement).dataset.persona === this.state_.persona);
            });
          });
        });
      },
    };

    this.runCardStage_(welcomeStep, (buttonId: string) => {
      if (buttonId === 'start') {
        this.track_('onboarding_started', { persona: this.state_.persona ?? 'none' });
        this.startBasics_();
      } else {
        this.state_.status = 'skipped';
        this.state_.stage = null;
        this.saveState_();
        this.track_('onboarding_skipped', { tier: 'welcome', stepId: 'welcome' });
        this.card_?.render();
        keepTrackApi.toast(l('toasts.restartHint'), ToastMsgType.normal);
      }
    });
  }

  // =========================================================================
  // Stage: basics tour (Tier 1)
  // =========================================================================

  private startBasics_(resumeStepId?: string): void {
    this.teardownEngine_();
    this.state_.status = 'in-progress';
    this.state_.stage = 'basics';
    this.state_.tiers.basics = 'in-progress';
    this.saveState_();

    this.engine_ = new TourEngine({
      steps: buildBasicsSteps(),
      texts: this.engineTexts_(),
      onStepShown: (step, index, total) => {
        this.state_.stepId = step.id;
        this.saveState_();
        this.track_('onboarding_step_viewed', { tier: 'basics', stepId: step.id, index, total });
      },
      onStepExit: (step, reason) => {
        if (reason === 'next' || reason === 'action') {
          this.track_('onboarding_step_completed', { tier: 'basics', stepId: step.id, mode: reason });
        }
      },
      onFinish: (reason, lastStepId) => {
        this.engine_ = null;

        if (reason === 'completed') {
          this.state_.tiers.basics = 'done';
          this.saveState_();
          this.track_('onboarding_completed', { tier: 'basics' });
          this.showBridge_();
        } else {
          this.state_.tiers.basics = 'skipped';
          this.state_.status = 'skipped';
          this.state_.stage = null;
          this.saveState_();
          this.track_('onboarding_skipped', { tier: 'basics', stepId: lastStepId ?? 'unknown' });
          this.finishTour_(false);
        }
      },
    });
    this.engine_.start(resumeStepId);
  }

  // =========================================================================
  // Stage: bridge (the two-tier pivot)
  // =========================================================================

  private showBridge_(): void {
    this.state_.stage = 'bridge';
    this.state_.stepId = null;
    this.saveState_();
    this.track_('onboarding_bridge_shown', { persona: this.state_.persona ?? 'none' });

    const isPowerPrimary = this.state_.persona === 'operator' || this.state_.persona === 'developer';

    const bridgeStep: TourStep = {
      id: 'bridge',
      kind: 'card',
      title: l('bridge.title'),
      body: l('bridge.body'),
      extraHtml: '<ul class="kt-tour-recap">' + `<li>${l('bridge.recap1')}</li>` + `<li>${l('bridge.recap2')}</li>` + `<li>${l('bridge.recap3')}</li>` + '</ul>',
      buttons: [
        { id: 'power', label: l('buttons.keepGoing'), isPrimary: isPowerPrimary },
        { id: 'finish', label: l('buttons.finishUp'), isPrimary: !isPowerPrimary },
      ],
      escButtonId: 'finish',
    };

    this.runCardStage_(bridgeStep, (buttonId: string) => {
      if (buttonId === 'power') {
        this.track_('onboarding_power_started', { source: 'bridge' });
        this.openHub_(true);
      } else {
        this.state_.tiers.power = 'declined';
        this.saveState_();
        this.track_('onboarding_power_declined');
        this.showAccount_();
      }
    });
  }

  // =========================================================================
  // Stage: power tour hub + chapters (Tier 2)
  // =========================================================================

  /**
   * Shows the Power Tour hub card. In the first-run flow (isFirstRun) closing
   * the hub proceeds to the account stage exactly once, as the linear tour
   * did; chapters always return here so the loop is hub -> chapter -> hub.
   */
  private openHub_(isFirstRun: boolean): void {
    this.teardownEngine_();

    if (isFirstRun) {
      this.state_.status = 'in-progress';
      this.state_.stage = 'power';
      this.state_.stepId = null;
    }
    this.saveState_();
    this.track_('onboarding_hub_shown', {
      source: isFirstRun ? 'first-run' : 'standalone',
      persona: this.state_.persona ?? 'none',
    });

    const hubStep = buildHubStep({
      getState: () => this.state_,
      onChapterSelected: (chapterId: ChapterId) => this.startChapter_(chapterId, isFirstRun),
    });

    this.runCardStage_(hubStep, () => {
      // Close (the hub's only button)
      if (isFirstRun) {
        this.showAccount_();
      } else {
        this.card_?.render();
        this.renderChecklistMenu_();
      }
    });
  }

  /** Runs one chapter, resuming at its saved step when it was left mid-way. */
  private startChapter_(chapterId: ChapterId, isFirstRun: boolean): void {
    const chapter = POWER_CHAPTERS.find((c) => c.id === chapterId);

    if (!chapter) {
      return;
    }

    this.teardownEngine_();

    const progress = this.state_.powerChapters[chapterId];
    const resumeStepId = progress.status === 'done' ? undefined : (progress.stepId ?? undefined);

    progress.status = 'in-progress';
    this.state_.tiers.power = 'in-progress';
    this.saveState_();
    this.track_('onboarding_chapter_started', { chapterId });

    this.engine_ = new TourEngine({
      steps: chapter.buildSteps(this.state_.persona),
      texts: this.engineTexts_(),
      onStepShown: (step, index, total) => {
        progress.stepId = step.id;
        this.saveState_();
        this.track_('onboarding_step_viewed', { tier: 'power', chapterId, stepId: step.id, index, total });
      },
      onStepExit: (step, reason) => {
        if (reason === 'next' || reason === 'action') {
          this.track_('onboarding_step_completed', { tier: 'power', chapterId, stepId: step.id, mode: reason });
        }
      },
      onFinish: (reason, lastStepId) => {
        this.engine_ = null;

        if (reason === 'completed') {
          progress.status = 'done';
          progress.stepId = null;
          progress.completedAt = Date.now();
          // The checklist mission checks off on the FIRST chapter completion
          this.markMissionDone_(MISSION_POWER_TOUR);
          this.track_('onboarding_chapter_completed', { chapterId });
        } else {
          progress.status = 'skipped';
          progress.stepId = lastStepId;
          this.track_('onboarding_chapter_skipped', { chapterId, stepId: lastStepId ?? 'unknown' });
        }

        this.updatePowerTierStatus_();
        this.saveState_();
        this.card_?.render();
        this.renderChecklistMenu_();
        this.openHub_(isFirstRun);
      },
    });
    this.engine_.start(resumeStepId);
  }

  /** `tiers.power` is done only when every available chapter is done. */
  private updatePowerTierStatus_(): void {
    if (this.state_.tiers.power === 'done' || !areAllAvailableChaptersDone(this.state_)) {
      return;
    }

    this.state_.tiers.power = 'done';
    this.track_('onboarding_completed', { tier: 'power' });
    keepTrackApi.toast(l('toasts.allChaptersDone'), ToastMsgType.normal);
    this.pulseHamburger_();
  }

  // =========================================================================
  // Stage: account (optional, Pro builds only)
  // =========================================================================

  private isAccountStepAvailable_(): boolean {
    return typeof KeepTrackPlugin.loginGateOpenModal === 'function' && !document.body.classList.contains('user-logged-in');
  }

  private showAccount_(): void {
    if (!this.isAccountStepAvailable_()) {
      this.finishTour_(true);

      return;
    }

    this.state_.stage = 'account';
    this.state_.stepId = null;
    this.saveState_();

    const isPowerDone = this.state_.tiers.power === 'done';

    const accountStep: TourStep = {
      id: 'account',
      kind: 'card',
      title: l('account.title'),
      body: isPowerDone ? l('account.bodyPower') : l('account.body'),
      extraHtml: '<ul class="kt-tour-recap">' + `<li>${l('account.benefit1')}</li>` + `<li>${l('account.benefit2')}</li>` + `<li>${l('account.benefit3')}</li>` + '</ul>',
      buttons: [
        { id: 'create', label: l('buttons.createAccount'), isPrimary: true },
        { id: 'later', label: l('buttons.maybeLater') },
      ],
      escButtonId: 'later',
    };

    this.accountLoginCb_ = () => {
      this.clearAccountLoginCb_();
      keepTrackApi.toast(l('toasts.accountCreated'), ToastMsgType.normal);
      this.track_('onboarding_account_created');
      this.teardownEngine_();
      this.finishTour_(true);
    };
    EventBus.getInstance().on(EventBusEvent.userLogin, this.accountLoginCb_);

    this.runCardStage_(
      accountStep,
      (buttonId: string) => {
        if (buttonId === 'create') {
          this.track_('onboarding_account_cta_clicked');
          KeepTrackPlugin.loginGateOpenModal?.();
        } else {
          this.clearAccountLoginCb_();
          this.finishTour_(true);
        }
      },
      { isKeepOpenOn: ['create'] }
    );
  }

  private clearAccountLoginCb_(): void {
    if (this.accountLoginCb_) {
      EventBus.getInstance().unregister(EventBusEvent.userLogin, this.accountLoginCb_);
      this.accountLoginCb_ = null;
    }
  }

  // =========================================================================
  // Stage: finish
  // =========================================================================

  private finishTour_(isCelebrate: boolean): void {
    this.clearAccountLoginCb_();
    this.teardownEngine_();

    if (this.state_.status !== 'skipped') {
      this.state_.status = 'done';
      this.state_.completedAt = Date.now();
    }
    this.state_.stage = null;
    this.state_.stepId = null;
    this.saveState_();

    this.card_?.render();
    this.renderChecklistMenu_();

    if (isCelebrate) {
      keepTrackApi.toast(l('toasts.finished'), ToastMsgType.normal);
      this.pulseHamburger_();
      openDrawer();
    }
  }

  private pulseHamburger_(): void {
    const hamburger = getEl('drawer-hamburger', true);

    if (!hamburger) {
      return;
    }

    hamburger.classList.add('kt-onboarding-pulse');
    setTimeout(() => hamburger.classList.remove('kt-onboarding-pulse'), 4000);
  }

  // =========================================================================
  // Card-stage helper
  // =========================================================================

  /**
   * Runs a single centered card as its own TourEngine pass. onButton decides
   * the next stage; buttons listed in isKeepOpenOn leave the card up (e.g. the
   * account CTA opens the login modal on top of the card).
   */
  private runCardStage_(step: TourStep, onButton: (buttonId: string) => void, options: { isKeepOpenOn?: string[] } = {}): void {
    this.teardownEngine_();

    this.engine_ = new TourEngine({
      steps: [step],
      texts: this.engineTexts_(),
      onCustomButton: (_stepId: string, buttonId: string) => {
        if (options.isKeepOpenOn?.includes(buttonId)) {
          onButton(buttonId);

          return;
        }

        this.teardownEngine_();
        onButton(buttonId);
      },
      onFinish: () => {
        this.engine_ = null;
      },
    });
    this.engine_.start();
  }

  private teardownEngine_(): void {
    this.engine_?.stop();
    this.engine_ = null;
  }

  private engineTexts_() {
    return {
      next: l('buttons.next'),
      back: l('buttons.back'),
      skip: l('buttons.skipTour'),
      skipConfirm: l('buttons.skipConfirm'),
      skipYes: l('buttons.skipYes'),
      skipNo: l('buttons.skipNo'),
      stepLabel: l('stepLabel'),
      stepDone: l('stepDone'),
    };
  }

  // =========================================================================
  // Checklist + card
  // =========================================================================

  private visibleMissions_(): ChecklistMission[] {
    return sortMissionsForPersona(this.missions_, this.state_.persona).filter((mission) => mission.isVisible?.(this.state_) !== false);
  }

  private checklistPercent_(): number {
    const missions = this.visibleMissions_();
    const doneCount = missions.filter((mission) => this.state_.checklist[mission.id] === true).length;

    return missions.length === 0 ? 100 : Math.round((doneCount / missions.length) * 100);
  }

  private markMissionDone_(missionId: string): void {
    if (this.state_.checklist[missionId] === true) {
      return;
    }

    this.state_.checklist[missionId] = true;
    this.saveState_();
    this.card_?.render();
    this.renderChecklistMenu_();
    this.track_('onboarding_checklist_item_done', { missionId });

    if (this.checklistPercent_() >= 100) {
      this.track_('onboarding_card_completed');
    }
  }

  private launchMission_(missionId: string): void {
    const mission = this.missions_.find((m) => m.id === missionId);

    if (!mission) {
      return;
    }

    ServiceLocator.getUiManager()?.pluginDrawer?.close();
    mission.launch();
  }

  private buildSideMenuHtml_(): string {
    return html`
      <div id="onboarding-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="onboarding-menu-content" class="side-menu">
          <section class="kt-section">
            <div class="kt-section-label">${l('menu.missionsLabel')}</div>
            <div id="onboarding-checklist-list"></div>
          </section>
          <section class="kt-section">
            <div class="kt-section-label">${l('menu.toursLabel')}</div>
            <button id="onboarding-restart-tour" type="button" class="kt-action waves-effect">
              <span class="kt-action-label">${l('settings.restartTutorialButton')}</span>
            </button>
            <button id="onboarding-start-power" type="button" class="kt-action waves-effect">
              <span class="kt-action-label">${l('commands.startPowerTour')}</span>
            </button>
            <button id="onboarding-restore-card" type="button" class="kt-action waves-effect start-hidden">
              <span class="kt-action-label">${l('menu.restoreCard')}</span>
            </button>
          </section>
        </div>
      </div>
    `;
  }

  private wireChecklistMenu_(): void {
    getEl('onboarding-restart-tour', true)?.addEventListener('click', () => {
      ServiceLocator.getUiManager()?.hideSideMenus();
      this.restartTour();
    });
    getEl('onboarding-start-power', true)?.addEventListener('click', () => {
      ServiceLocator.getUiManager()?.hideSideMenus();
      this.startPowerTour(true);
    });
    getEl('onboarding-restore-card', true)?.addEventListener('click', () => {
      this.restoreCard();
    });
  }

  /** Brings the dismissed get-started card back into the drawer and shows it. */
  restoreCard(): void {
    this.state_.isCardDismissed = false;
    this.saveState_();
    this.card_?.render();
    this.renderChecklistMenu_();
    this.track_('onboarding_card_restored');
    ServiceLocator.getUiManager()?.hideSideMenus();
    openDrawer();
  }

  private renderChecklistMenu_(): void {
    // The restore button is only useful while the drawer card is dismissed
    getEl('onboarding-restore-card', true)?.classList.toggle('start-hidden', !this.state_.isCardDismissed);

    const listEl = getEl('onboarding-checklist-list', true);

    if (!listEl) {
      return;
    }

    listEl.innerHTML = this.visibleMissions_()
      .map((mission) => {
        const isDone = this.state_.checklist[mission.id] === true;
        const doneClass = isDone ? ' kt-onboarding-mission-done' : '';

        return (
          `<button type="button" class="kt-action waves-effect kt-onboarding-mission${doneClass}" data-mission-id="${mission.id}">` +
          `<span class="kt-action-label"><span class="kt-onboarding-mission-check">${isDone ? '&#x2713;' : ''}</span>${mission.label()}</span>` +
          '</button>'
        );
      })
      .join('');

    listEl.querySelectorAll('[data-mission-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const missionId = (el as HTMLElement).dataset.missionId;

        if (missionId) {
          ServiceLocator.getUiManager()?.hideSideMenus();
          this.launchMission_(missionId);
        }
      });
    });
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  private saveState_(): void {
    saveOnboardingState(this.state_);
  }

  private track_(event: string, params?: Record<string, unknown>): void {
    keepTrackApi.analytics?.track?.(event, params);
  }
}
