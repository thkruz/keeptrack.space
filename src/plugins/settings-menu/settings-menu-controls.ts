/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * settings-menu-controls.ts is the single, DOM-free source of truth for the
 * Settings menu's *own* controls (the General and Fast-CPU sections). Each
 * control is expressed in the same {@link ISettingControl} model the plugin
 * contribution system uses, so the menu renders, syncs, applies, and resets
 * them through the shared renderer instead of four hand-maintained parallel
 * lists (the structure that previously let the "Show Next Pass" toggle read one
 * setting and write another).
 *
 * Controls apply immediately: every `set()` writes `settingsManager`, runs any
 * scene-recalc side effect, and persists. There is no "Update Settings" button.
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

import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ISettingSelectControl, ISettingsContribution, ISettingToggleControl } from '@app/engine/plugins/core/plugin-capabilities';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
import { defaultCameraSettings } from '@app/settings/camera-settings';
import { defaultCoreSettings } from '@app/settings/core-settings';
import { defaultOrbitalSettings } from '@app/settings/orbital-settings';
import { SettingsManager } from '@app/settings/settings';
import { defaultUiSettings, SatLabelMode } from '@app/settings/ui-settings';
import { collectSettingsContributions } from './settings-contributions';

/** Section ids for the Settings menu's own contributions. */
export const SETTINGS_OWN_GENERAL_SECTION = 'general';
export const SETTINGS_OWN_FAST_CPU_SECTION = 'fastCpu';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.SettingsMenuPlugin.${key}` as Parameters<typeof t7e>[0]);

/** Persist after a control changes. Centralized so every `set()` is consistent. */
const persist_ = (): void => {
  SettingsManager.preserveSettings();
};

/**
 * Re-run the orbit cruncher / draw pipeline after an orbit-related toggle.
 * `drawOrbitsChanged` is only true when the master "Draw Orbits" flag flipped,
 * which is the one case that needs the heavier {@link drawOrbitsSettingChanged}.
 */
const applyOrbitChange_ = (drawOrbitsChanged = false): void => {
  const orbitManager = ServiceLocator.getOrbitManager();

  if (drawOrbitsChanged) {
    orbitManager.drawOrbitsSettingChanged();
  }
  orbitManager.updateOrbitType();
};

/** Recompute color buffers so confidence-level coloring takes effect immediately. */
const applyColorRecalc_ = (): void => {
  const colorSchemeManager = ServiceLocator.getColorSchemeManager();

  colorSchemeManager.calculateColorBuffers(true);
  colorSchemeManager.reloadColors();
  colorSchemeManager.calculateColorBuffers(true);
};

/**
 * One own-control descriptor plus its factory default. Kept together so
 * rendering, applying, and "Reset to Defaults" all read from the same place.
 */
interface OwnSettingDescriptor {
  control: ISettingToggleControl | ISettingSelectControl;
  /** Restore this control to its factory value (used by Reset to Defaults). */
  reset: () => void;
}

interface BoolToggleOpts {
  /** Side effect to run after the flag is written (e.g. orbit / color recalc). */
  apply?: (next: boolean) => void;
  /** Predicate gating visibility, e.g. a data-dependent feature. */
  isAvailable?: () => boolean;
}

/** Build a boolean toggle bound directly to a `settingsManager` flag. */
const boolToggle_ = (id: string, settingKey: string, defaultValue: boolean, opts: BoolToggleOpts = {}): OwnSettingDescriptor => ({
  control: {
    type: 'toggle',
    id,
    label: l(`labels.${id}`),
    helpText: l(`tooltips.${id}`),
    isAvailable: opts.isAvailable,
    get: () => settingsManager[settingKey] as boolean,
    set: (next: boolean) => {
      settingsManager[settingKey] = next;
      opts.apply?.(next);
      persist_();
    },
  },
  reset: () => {
    settingsManager[settingKey] = defaultValue;
    opts.apply?.(defaultValue);
  },
});

const ECF_ORBIT_OPTIONS = ['1', '2', '3', '4', '5', '10'] as const;

/**
 * Factory defaults, read from the settings classes' own default instances so a
 * Reset descriptor can never drift from the real default again (it once passed
 * `true` for Draw Orbits in ECF, whose default is `false`).
 */
export const OWN_SETTING_DEFAULTS = {
  get enableHoverOverlay(): boolean {
    // MobileManager turns the hover overlay off on phones; that IS the default there.
    return settingsManager.isMobileModeEnabled ? false : defaultUiSettings.enableHoverOverlay;
  },
  isDrawOrbits: defaultOrbitalSettings.isDrawOrbits,
  isDrawTrailingOrbits: defaultOrbitalSettings.isDrawTrailingOrbits,
  isOrbitCruncherInEcf: defaultOrbitalSettings.isOrbitCruncherInEcf,
  numberOfEcfOrbitsToDraw: defaultOrbitalSettings.numberOfEcfOrbitsToDraw,
  isDrawInCoverageLines: defaultOrbitalSettings.isDrawInCoverageLines,
  isEciOnHover: defaultUiSettings.isEciOnHover,
  drawCameraWidget: defaultCameraSettings.drawCameraWidget,
  isShowConfidenceLevels: defaultUiSettings.isShowConfidenceLevels,
  isDemoModeOn: defaultCoreSettings.isDemoModeOn,
  isFreezePropRateOnDrag: defaultCoreSettings.isFreezePropRateOnDrag,
  isCompensateForEarthRotation: defaultCameraSettings.isCompensateForEarthRotation,
  isDisableToasts: defaultUiSettings.isDisableToasts,
  isShowNextPass: defaultUiSettings.isShowNextPass,
  // Settings that live on contributed sections but are display options Reset covers too.
  satLabelMode: defaultUiSettings.satLabelMode,
  isFocusOnSatelliteWhenSelected: defaultCameraSettings.isFocusOnSatelliteWhenSelected,
  isDisableTimeMachineToasts: defaultUiSettings.isDisableTimeMachineToasts,
  isShowEpochAge: defaultUiSettings.isShowEpochAge,
  covarianceConfidenceLevel: defaultOrbitalSettings.covarianceConfidenceLevel,
};

/** The "Number of ECF Orbits to Draw" select. */
const ecfOrbitsSelect_ = (): OwnSettingDescriptor => {
  const setCount = (count: number): void => {
    if (count !== settingsManager.numberOfEcfOrbitsToDraw) {
      ServiceLocator.getOrbitManager().orbitThreadMgr.sendSettingsUpdate(count);
    }
    settingsManager.numberOfEcfOrbitsToDraw = count;
    applyOrbitChange_();
  };

  return {
    control: {
      type: 'select',
      id: 'numberOfEcfOrbits',
      label: l('labels.numberOfEcfOrbits'),
      helpText: l('tooltips.drawOrbitsInEcf'),
      options: ECF_ORBIT_OPTIONS.map((value) => ({ value, label: value })),
      get: () => String(settingsManager.numberOfEcfOrbitsToDraw),
      set: (next: string) => {
        const parsed = parseInt(next, 10);

        if (!Number.isNaN(parsed)) {
          setCount(parsed);
          persist_();
        }
      },
    },
    reset: () => setCount(OWN_SETTING_DEFAULTS.numberOfEcfOrbitsToDraw),
  };
};

/**
 * Label mode the user had when Demo Mode was switched on, restored when it is
 * switched off. `null` when Demo Mode was not entered this session (e.g. it was
 * already on at boot); leaving it then falls back to the default label mode.
 */
let labelModeBeforeDemo_: SatLabelMode | null = null;

/** Test-only: forget the remembered pre-demo label mode. */
export const resetDemoLabelMemoryForTest = (): void => {
  labelModeBeforeDemo_ = null;
};

/**
 * Demo mode forces satellite labels off while it runs and gives the user's label
 * mode back when it stops, then refreshes contributed sections so the Watchlist
 * label dropdown follows.
 */
const demoModeToggle_ = (): OwnSettingDescriptor => {
  const apply = (next: boolean): void => {
    const wasOn = settingsManager.isDemoModeOn;

    settingsManager.isDemoModeOn = next;
    if (next && !wasOn) {
      // The label dropdown lives on WatchlistPlugin's contribution; flip the
      // backing state and refresh so that section re-renders.
      labelModeBeforeDemo_ = settingsManager.satLabelMode;
      settingsManager.satLabelMode = SatLabelMode.OFF;
      EventBus.getInstance().emit(EventBusEvent.settingsMenuRefresh);
    } else if (!next && wasOn) {
      // Only give the old mode back if the user did not pick another one while the demo ran.
      if (settingsManager.satLabelMode === SatLabelMode.OFF) {
        settingsManager.satLabelMode = labelModeBeforeDemo_ ?? OWN_SETTING_DEFAULTS.satLabelMode;
      }
      labelModeBeforeDemo_ = null;
      EventBus.getInstance().emit(EventBusEvent.settingsMenuRefresh);
    }
  };

  return {
    control: {
      type: 'toggle',
      id: 'enableDemoMode',
      label: l('labels.enableDemoMode'),
      helpText: l('tooltips.enableDemoMode'),
      get: () => settingsManager.isDemoModeOn,
      set: (next: boolean) => {
        apply(next);
        persist_();
      },
    },
    reset: () => {
      // resetOwnSettings restores the label mode itself, so only forget the memory here.
      settingsManager.isDemoModeOn = OWN_SETTING_DEFAULTS.isDemoModeOn;
      labelModeBeforeDemo_ = null;
    },
  };
};

/**
 * All own controls, grouped by section. Declaration order is render order.
 * Reset values come from {@link OWN_SETTING_DEFAULTS} (the settings classes' own defaults).
 */
const ownDescriptors_ = (): { general: OwnSettingDescriptor[]; fastCpu: OwnSettingDescriptor[] } => ({
  general: [
    boolToggle_('showInfoOnHover', 'enableHoverOverlay', OWN_SETTING_DEFAULTS.enableHoverOverlay),
    // The master flag always flipped here (the user clicked it), so the heavier
    // drawOrbitsSettingChanged path runs unconditionally.
    boolToggle_('drawOrbits', 'isDrawOrbits', OWN_SETTING_DEFAULTS.isDrawOrbits, { apply: () => applyOrbitChange_(true) }),
    boolToggle_('drawTrailingOrbits', 'isDrawTrailingOrbits', OWN_SETTING_DEFAULTS.isDrawTrailingOrbits, { apply: () => applyOrbitChange_() }),
    boolToggle_('drawOrbitsInEcf', 'isOrbitCruncherInEcf', OWN_SETTING_DEFAULTS.isOrbitCruncherInEcf, { apply: () => applyOrbitChange_() }),
    ecfOrbitsSelect_(),
    boolToggle_('drawFovLines', 'isDrawInCoverageLines', OWN_SETTING_DEFAULTS.isDrawInCoverageLines),
    boolToggle_('displayEciOnHover', 'isEciOnHover', OWN_SETTING_DEFAULTS.isEciOnHover),
    boolToggle_('showCameraWidget', 'drawCameraWidget', OWN_SETTING_DEFAULTS.drawCameraWidget),
    // Only surfaced when the catalog actually carries confidence data.
    boolToggle_('showConfidenceLevels', 'isShowConfidenceLevels', OWN_SETTING_DEFAULTS.isShowConfidenceLevels, {
      apply: applyColorRecalc_,
      isAvailable: () => settingsManager.isShowConfidenceLevels,
    }),
    demoModeToggle_(),
    boolToggle_('enableFreezeTime', 'isFreezePropRateOnDrag', OWN_SETTING_DEFAULTS.isFreezePropRateOnDrag),
    boolToggle_('compensateEarthRotation', 'isCompensateForEarthRotation', OWN_SETTING_DEFAULTS.isCompensateForEarthRotation),
    boolToggle_('disableToasts', 'isDisableToasts', OWN_SETTING_DEFAULTS.isDisableToasts),
  ],
  fastCpu: [boolToggle_('showNextPassOnHover', 'isShowNextPass', OWN_SETTING_DEFAULTS.isShowNextPass)],
});

/**
 * The Settings menu's own sections as plugin-style contributions, so they
 * render through the same {@link renderSettingsSection} pipeline as every
 * contributed section.
 */
export const getOwnSettingsSections = (): ISettingsContribution[] => {
  const descriptors = ownDescriptors_();

  return [
    {
      sectionId: SETTINGS_OWN_GENERAL_SECTION,
      sectionLabel: l('sections.general'),
      controls: descriptors.general.map((d) => d.control),
    },
    {
      sectionId: SETTINGS_OWN_FAST_CPU_SECTION,
      sectionLabel: l('sections.fastCpu'),
      controls: descriptors.fastCpu.map((d) => d.control),
    },
  ];
};

/**
 * Run a contributed control's own `set()` so its plugin applies its side effects
 * (the Epoch Age badge refresh, the covariance ellipsoid resize). No-op when the
 * contributing plugin is not loaded (the OSS build has no Covariance plugin).
 */
const resetContributedControl_ = (sectionId: string, controlId: string, value: boolean | string): void => {
  const control = collectSettingsContributions('general')
    .find((c) => c.sectionId === sectionId)
    ?.controls.find((c) => c.id === controlId);

  if (control?.type === 'toggle' && typeof value === 'boolean') {
    control.set(value);
  } else if (control?.type === 'select' && typeof value === 'string') {
    control.set(value);
  }
};

/**
 * Restore every display option to its factory default and apply the side
 * effects: the own controls plus the settings that live on contributed sections
 * (Watchlist labels, Satellite Selection, Time Machine, Epoch Age, covariance
 * confidence). The Getting Started "show on first run" toggle is deliberately
 * left alone: resetting it would replay the first-visit tour. Persists once and
 * recomputes colors for the dot-color reset. Callers re-render the menu after.
 */
export const resetOwnSettings = (): void => {
  const descriptors = ownDescriptors_();

  [...descriptors.general, ...descriptors.fastCpu].forEach((d) => {
    d.reset();
  });

  // These live in plugin-contributed sections, but "Reset to defaults" restores them too.
  settingsManager.satLabelMode = OWN_SETTING_DEFAULTS.satLabelMode;
  settingsManager.isFocusOnSatelliteWhenSelected = OWN_SETTING_DEFAULTS.isFocusOnSatelliteWhenSelected;
  settingsManager.isDisableTimeMachineToasts = OWN_SETTING_DEFAULTS.isDisableTimeMachineToasts;
  settingsManager.isShowEpochAge = OWN_SETTING_DEFAULTS.isShowEpochAge;
  settingsManager.covarianceConfidenceLevel = OWN_SETTING_DEFAULTS.covarianceConfidenceLevel;
  resetContributedControl_('EpochAge', 'showEpochAge', OWN_SETTING_DEFAULTS.isShowEpochAge);
  resetContributedControl_('CovariancePlugin', 'confidenceLevel', String(OWN_SETTING_DEFAULTS.covarianceConfidenceLevel));

  PersistenceManager.getInstance().removeItem(StorageKey.SETTINGS_DOT_COLORS);
  applyColorRecalc_();
  persist_();
};
