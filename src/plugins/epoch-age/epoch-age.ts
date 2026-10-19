import { ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ISettingsContribution, ISettingsContributor } from '@app/engine/plugins/core/plugin-capabilities';
import { KeepTrack } from '@app/keeptrack';
import { t7e } from '@app/locales/keys';
import { SettingsManager } from '@app/settings/settings';
import { Satellite } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { ageLevel, type EpochAgeLevel, formatDays } from './epoch-age-core';
import './epoch-age.css';

type TranslationKey = Parameters<typeof t7e>[0];

/**
 * Shows how far the simulation time is from the selected satellite's element
 * epoch. A small badge appears under the top bar once the age passes 3 days
 * (fair / low / very low at 3 / 7 / 14 days), and crossing 14 days shows a
 * one-time caution toast per satellite per session. Never blocks a time change.
 */
export class EpochAge extends KeepTrackPlugin implements ISettingsContributor {
  readonly id = 'EpochAge';
  dependencies_ = [SelectSatManager.name];

  static readonly BADGE_ID = 'epoch-age-badge';
  /** Real-time cadence of the refresh while time is running. */
  static readonly TICK_MS = 1000;

  private badge_: HTMLElement | null = null;
  private tickTimer_: ReturnType<typeof setInterval> | null = null;
  /** sccNums that already showed the 14 day toast this session. */
  private readonly toastedSccNums_ = new Set<string>();
  /** Satellite id and level seen on the previous refresh, to detect a crossing. */
  private lastSatId_ = -1;
  private lastLevel_: EpochAgeLevel | null = null;

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
      this.createBadge_();
    });
  }

  addJs(): void {
    super.addJs();
    const eventBus = EventBus.getInstance();

    eventBus.on(EventBusEvent.selectSatData, () => this.refresh());
    eventBus.on(EventBusEvent.staticOffsetChange, () => this.refresh());
    eventBus.on(EventBusEvent.propRateChanged, (propRate: number) => {
      this.updateTicker_(propRate);
      this.refresh();
    });
  }

  getSettingsContribution(): ISettingsContribution {
    return {
      sectionId: this.id,
      sectionLabel: t7e('plugins.EpochAge.settings.sectionLabel'),
      controls: [
        {
          type: 'toggle',
          id: 'showEpochAge',
          label: t7e('plugins.EpochAge.settings.showEpochAge.label'),
          helpText: t7e('plugins.EpochAge.settings.showEpochAge.helpText'),
          get: () => settingsManager.isShowEpochAge,
          set: (next: boolean) => {
            settingsManager.isShowEpochAge = next;
            SettingsManager.preserveSettings();
            this.refresh();
          },
        },
      ],
    };
  }

  /** Recompute the epoch age for the selected satellite and update the badge and toast. */
  refresh(): void {
    const sat = this.selectedSatellite_();

    if (!sat || !settingsManager.isShowEpochAge) {
      this.hideBadge_();
      this.lastSatId_ = -1;
      this.lastLevel_ = null;

      return;
    }

    const days = sat.ageOfElset(ServiceLocator.getTimeManager().simulationTimeObj, 'days');
    const level = ageLevel(days);

    this.maybeToast_(sat, level);
    this.lastSatId_ = sat.id;
    this.lastLevel_ = level;

    if (level === 'ok') {
      this.hideBadge_();
    } else {
      this.showBadge_(level, days);
    }
  }

  private selectedSatellite_(): Satellite | null {
    const obj = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

    return obj instanceof Satellite && obj.id >= 0 ? obj : null;
  }

  /** Toast once per sccNum per session when the age crosses from under to over 14 days. */
  private maybeToast_(sat: Satellite, level: EpochAgeLevel): void {
    const isSameSat = sat.id === this.lastSatId_;
    const crossed = isSameSat && this.lastLevel_ !== null && this.lastLevel_ !== 'poor' && level === 'poor';

    if (!crossed || this.toastedSccNums_.has(sat.sccNum)) {
      return;
    }
    this.toastedSccNums_.add(sat.sccNum);
    ServiceLocator.getUiManager().toast(t7e('plugins.EpochAge.toast.poor'), ToastMsgType.caution, true);
  }

  private updateTicker_(propRate: number): void {
    if (propRate !== 0 && this.tickTimer_ === null) {
      this.tickTimer_ = setInterval(() => this.refresh(), EpochAge.TICK_MS);
    } else if (propRate === 0 && this.tickTimer_ !== null) {
      clearInterval(this.tickTimer_);
      this.tickTimer_ = null;
    }
  }

  private createBadge_(): void {
    if (this.badge_) {
      return;
    }
    const badge = document.createElement('div');

    badge.id = EpochAge.BADGE_ID;
    badge.className = 'epoch-age-badge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('kt-tooltip', t7e('plugins.EpochAge.tooltip'));
    badge.style.display = 'none';
    KeepTrack.getInstance().containerRoot.appendChild(badge);
    this.badge_ = badge;
    this.refresh();
  }

  private showBadge_(level: EpochAgeLevel, days: number): void {
    if (!this.badge_) {
      return;
    }
    this.badge_.textContent = t7e(`plugins.EpochAge.badge.${level}` as TranslationKey).replace('{days}', formatDays(days));
    this.badge_.dataset.level = level;
    this.badge_.style.display = '';
  }

  private hideBadge_(): void {
    if (!this.badge_) {
      return;
    }
    this.badge_.style.display = 'none';
    delete this.badge_.dataset.level;
  }
}
