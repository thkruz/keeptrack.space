import { GroupType } from '@app/app/data/object-group';
import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsManager } from '@app/settings/settings';
import disabledVisiblePng from '@public/img/icons/disabled-visible.png';

/**
 * Hide Others: switches the color of every object outside the selected group (a selection or a search)
 * between a dim white (off, the default) and fully hidden (on). The color worker reads the value from
 * `settingsManager.colors.transparent`; the toggle state persists under its own storage key.
 *
 * No keyboard shortcut: Shift+H belongs to Satellite Photos.
 */
export class HideOtherSatellitesPlugin extends KeepTrackPlugin {
  readonly id = 'HideOtherSatellitesPlugin';
  dependencies_ = [];

  /** Out-of-group color with Hide Others on. */
  static readonly HIDDEN_COLOR: [number, number, number, number] = [1.0, 1.0, 1.0, 0];
  /** Out-of-group color with Hide Others off. */
  static readonly DIM_COLOR: [number, number, number, number] = [1, 1, 1, 0.1];

  /** Group this plugin created on Hide Others (null when it reused the user's own group or search). */
  private createdGroup_: unknown = null;
  private prevColorScheme_: unknown = null;
  private prevUseGroupColorScheme_ = false;

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'hide-other-sats-bottom-icon',
      label: 'Hide Others',
      image: disabledVisiblePng,
      menuMode: [MenuMode.CATALOG, MenuMode.ALL],
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.LAYER_TOGGLE,
    };
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'HideOtherSatellitesPlugin.toggle',
        label: t7e('plugins.HideOtherSatellitesPlugin.commandPalette.toggle'),
        category: 'Display',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  addJs(): void {
    super.addJs();

    const eventBus = EventBus.getInstance();

    eventBus.on(EventBusEvent.uiManagerFinal, () => {
      this.restoreState_();
    });

    // An account sync brought a newer toggle state from another device
    eventBus.on(EventBusEvent.remoteSettingsApplied, (changedKeys) => {
      if (changedKeys.includes(StorageKey.SETTINGS_HIDE_OTHER_SATS)) {
        this.restoreState_();
        this.recolor_();
      }
    });
  }

  onBottomIconClick(): void {
    if (this.isMenuButtonActive) {
      this.hideOtherSats();
    } else {
      this.showOtherSats();
    }
  }

  hideOtherSats(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    settingsManager.colors.transparent = [...HideOtherSatellitesPlugin.HIDDEN_COLOR];
    this.saveState_(true);
    this.groupSelectedObjects_();
    this.applyColorChange_();
    this.setBottomIconToSelected();
  }

  showOtherSats(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    settingsManager.colors.transparent = [...HideOtherSatellitesPlugin.DIM_COLOR];
    this.saveState_(false);
    this.undoGroup_();
    this.applyColorChange_();
    this.setBottomIconToUnselected();
  }

  /**
   * With no group or search active, a plain selection (primary and secondary object) is the set to keep:
   * wrap it in a group so every other dot is hidden in all views (3D, Flat Map, Polar). An existing group
   * or search result is left alone, and with nothing selected nothing changes.
   */
  private groupSelectedObjects_(): void {
    const groupsManager = ServiceLocator.getGroupsManager();

    if (!groupsManager || groupsManager.selectedGroup) {
      return;
    }

    const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);
    const ids = [selectSatManager?.selectedSat, selectSatManager?.secondarySat].filter((id): id is number => typeof id === 'number' && id >= 0);

    if (ids.length > 0) {
      const colorSchemeManager = ServiceLocator.getColorSchemeManager();

      this.prevColorScheme_ = colorSchemeManager?.currentColorScheme ?? null;
      this.prevUseGroupColorScheme_ = colorSchemeManager?.isUseGroupColorScheme ?? false;
      const group = groupsManager.createGroup(GroupType.ID_LIST, ids);

      // Scoped to this group, so a later search or country group draws its orbit lines normally.
      group.isOverlayHidden = true;
      this.createdGroup_ = group;
      groupsManager.selectGroup(this.createdGroup_ as never);
    }
  }

  /**
   * Undoes only the group Hide Others created: clears it, then restores the color scheme and orbit overlay
   * state from before. A group or search the user made is never touched.
   */
  private undoGroup_(): void {
    const created = this.createdGroup_;

    this.createdGroup_ = null;
    if (!created) {
      return;
    }

    const groupsManager = ServiceLocator.getGroupsManager();

    if (groupsManager?.selectedGroup !== created) {
      return;
    }

    groupsManager.clearSelect();

    const colorSchemeManager = ServiceLocator.getColorSchemeManager();

    if (colorSchemeManager) {
      colorSchemeManager.isUseGroupColorScheme = this.prevUseGroupColorScheme_;
      if (this.prevColorScheme_ && colorSchemeManager.currentColorScheme !== this.prevColorScheme_) {
        colorSchemeManager.setColorScheme(this.prevColorScheme_ as never, true);
      }
    }
    this.prevColorScheme_ = null;
  }

  /**
   * Applies the saved toggle state, then syncs the icon with the color in force. With no saved state the
   * color is left alone, so a preset that sets its own out-of-group color keeps it.
   */
  private restoreState_(): void {
    const saved = PersistenceManager.getInstance().getItem(StorageKey.SETTINGS_HIDE_OTHER_SATS);
    const colors = settingsManager.colors;

    if (!colors) {
      return;
    }

    if (saved === 'true') {
      colors.transparent = [...HideOtherSatellitesPlugin.HIDDEN_COLOR];
    } else if (saved === 'false' && colors.transparent?.[3] === 0) {
      colors.transparent = [...HideOtherSatellitesPlugin.DIM_COLOR];
    }

    if (colors.transparent?.[3] === 0) {
      this.setBottomIconToSelected();
    } else if (this.isMenuButtonActive) {
      this.setBottomIconToUnselected();
    }
  }

  private saveState_(isHidden: boolean): void {
    PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_HIDE_OTHER_SATS, String(isHidden));
  }

  private applyColorChange_(): void {
    this.recolor_();
    SettingsManager.preserveSettings();
  }

  private recolor_(): void {
    const colorSchemeManager = ServiceLocator.getColorSchemeManager();

    if (!colorSchemeManager) {
      return;
    }

    colorSchemeManager.calculateColorBuffers(true);
    colorSchemeManager.reloadColors();
  }
}
