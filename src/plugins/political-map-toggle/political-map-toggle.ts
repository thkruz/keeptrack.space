import { SoundNames } from '@app/engine/audio/sounds';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, IKeyboardShortcut, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import mapImage from '@public/img/icons/map.png';

/** Cycle order for the political overlay: borders first, then both, then labels alone. */
const MODES: { borders: boolean; labels: boolean; toastKey: 'modeOff' | 'modeBorders' | 'modeBordersLabels' | 'modeLabels' }[] = [
  { borders: false, labels: false, toastKey: 'modeOff' },
  { borders: true, labels: false, toastKey: 'modeBorders' },
  { borders: true, labels: true, toastKey: 'modeBordersLabels' },
  { borders: false, labels: true, toastKey: 'modeLabels' },
];

export class PoliticalMapToggle extends KeepTrackPlugin {
  readonly id = 'PoliticalMapToggle';
  dependencies_ = [];

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'political-map-toggle-bottom-icon',
      label: 'Political Map',
      image: mapImage,
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.LAYER_TOGGLE,
    };
  }

  addJs(): void {
    super.addJs();

    // Sync button state with the settings at launch - the overlay may already be on
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      if (settingsManager.isDrawPoliticalMap || settingsManager.isDrawPoliticalLabels) {
        this.setBottomIconToSelected();
      }
    });
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'l',
        shift: false,
        callback: () => this.cycleMode(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'PoliticalMapToggle.cycle',
        label: t7e('plugins.PoliticalMapToggle.commandPalette.cycle'),
        category: 'Display',
        shortcutHint: 'l',
        callback: () => this.cycleMode(),
      },
      {
        id: 'PoliticalMapToggle.toggle',
        label: t7e('plugins.PoliticalMapToggle.commandPalette.toggle'),
        category: 'Display',
        callback: () => this.toggleBorders(),
      },
      {
        id: 'PoliticalMapToggle.toggleLabels',
        label: t7e('plugins.PoliticalMapToggle.commandPalette.toggleLabels'),
        category: 'Display',
        callback: () => this.toggleCountryLabels(),
      },
    ];
  }

  /** Icon clicks walk the same 4-state cycle as the 'L' key. */
  onBottomIconClick(): void {
    this.cycleMode();
  }

  /**
   * Advances the overlay through: off -> borders -> borders + labels -> labels -> off.
   * The bottom icon lights up whenever any part of the overlay is visible.
   */
  cycleMode(): void {
    const current = MODES.findIndex((m) => m.borders === settingsManager.isDrawPoliticalMap && m.labels === settingsManager.isDrawPoliticalLabels);
    const next = MODES[(current + 1) % MODES.length];

    settingsManager.isDrawPoliticalMap = next.borders;
    settingsManager.isDrawPoliticalLabels = next.labels;

    this.syncIconState();
    ServiceLocator.getSoundManager()?.play(next.borders || next.labels ? SoundNames.TOGGLE_ON : SoundNames.TOGGLE_OFF);
    ServiceLocator.getUiManager()?.toast(t7e(`plugins.PoliticalMapToggle.${next.toastKey}` as Parameters<typeof t7e>[0]), ToastMsgType.normal);
  }

  toggleBorders(): void {
    settingsManager.isDrawPoliticalMap = !settingsManager.isDrawPoliticalMap;
    this.syncIconState();
    ServiceLocator.getSoundManager()?.play(settingsManager.isDrawPoliticalMap ? SoundNames.TOGGLE_ON : SoundNames.TOGGLE_OFF);
  }

  /** Country name labels are independent of the border overlay so either can be shown alone. */
  toggleCountryLabels(): void {
    settingsManager.isDrawPoliticalLabels = !settingsManager.isDrawPoliticalLabels;
    this.syncIconState();
    ServiceLocator.getSoundManager()?.play(settingsManager.isDrawPoliticalLabels ? SoundNames.TOGGLE_ON : SoundNames.TOGGLE_OFF);
  }

  /**
   * Light the icon while any part of the overlay is visible, dim it otherwise. Public so code
   * that writes the political-map settings directly (Earth presets) can keep the icon honest.
   */
  syncIconState(): void {
    const isAnyVisible = settingsManager.isDrawPoliticalMap || settingsManager.isDrawPoliticalLabels;

    if (isAnyVisible) {
      this.setBottomIconToSelected();
    } else {
      // A layer icon going dark must not close whatever side menu is open.
      this.setBottomIconToUnselected(false);
    }
  }
}
