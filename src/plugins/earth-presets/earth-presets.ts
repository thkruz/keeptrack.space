import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ICommandPaletteCommand, IContextMenuConfig, RmbMenuContext } from '@app/engine/plugins/core/plugin-capabilities';
import { AtmosphereSettings, EarthTextureStyle } from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { html } from '@app/engine/utils/development/formatter';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { NightToggle } from '../night-toggle/night-toggle';
import { PoliticalMapToggle } from '../political-map-toggle/political-map-toggle';

export type EarthPresetId = 'satellite' | 'nadir' | 'engineer' | 'opscenter' | '90sGraphics';

/** The settings a preset writes; also what decides whether the preset is still in effect. */
interface EarthPresetLook {
  texture: EarthTextureStyle;
  isDrawCloudsMap: boolean;
  isDrawBumpMap: boolean;
  isDrawSpecMap: boolean;
  isEarthGrayScale: boolean;
  isDrawPoliticalMap: boolean;
  isDrawAtmosphere: AtmosphereSettings;
  isEarthAmbientLighting: boolean;
  /** Night drawn as day (NightToggle on). */
  isNight: boolean;
}

interface EarthPresetDef {
  id: EarthPresetId;
  /** Key under plugins.EarthPresetsPlugin.rmbMenu.* */
  labelKey: string;
  look: EarthPresetLook;
  apply: () => void;
}

const LOOK_FLAGS_ = ['isDrawCloudsMap', 'isDrawBumpMap', 'isDrawSpecMap', 'isEarthGrayScale', 'isDrawPoliticalMap', 'isDrawAtmosphere', 'isEarthAmbientLighting'] as const;

function applyLook_(look: EarthPresetLook): void {
  ServiceLocator.getScene().earth.changeEarthTextureStyle(look.texture);
  for (const flag of LOOK_FLAGS_) {
    (settingsManager as unknown as Record<string, unknown>)[flag] = look[flag];
  }
  const nightToggle = PluginRegistry.getPlugin(NightToggle);

  if (!nightToggle) {
    settingsManager.isDrawNightAsDay = look.isNight;
  } else if (look.isNight) {
    nightToggle.on();
  } else {
    nightToggle.off();
  }
}

function isLookActive_(look: EarthPresetLook): boolean {
  return (
    settingsManager.earthTextureStyle === look.texture &&
    Boolean(settingsManager.isDrawNightAsDay) === look.isNight &&
    LOOK_FLAGS_.every((flag) => (settingsManager as unknown as Record<string, unknown>)[flag] === look[flag])
  );
}

function definePreset_(id: EarthPresetId, labelKey: string, look: EarthPresetLook): EarthPresetDef {
  return { id, labelKey, look, apply: () => applyLook_(look) };
}

export class EarthPresetsPlugin extends KeepTrackPlugin {
  readonly id = 'EarthPresetsPlugin';
  dependencies_ = [];

  private static t_(key: string): string {
    return t7e(`plugins.EarthPresetsPlugin.${key}` as Parameters<typeof t7e>[0]);
  }

  private static appliedPresetId_: EarthPresetId | null = null;

  /**
   * The preset in effect, or null for "Custom". A preset stops being in effect
   * as soon as any of the settings it wrote is changed by hand.
   */
  static get lastAppliedPresetId(): EarthPresetId | null {
    const preset = EarthPresetsPlugin.findPreset_(EarthPresetsPlugin.appliedPresetId_);

    return preset && isLookActive_(preset.look) ? preset.id : null;
  }

  static set lastAppliedPresetId(id: EarthPresetId | null) {
    EarthPresetsPlugin.appliedPresetId_ = id;
  }

  /**
   * Single source of truth for the earth style presets. The right-click menu,
   * the command palette, and the graphics menu dropdown all derive from this.
   */
  static readonly PRESETS: EarthPresetDef[] = [
    definePreset_('satellite', 'satelliteImages', {
      texture: EarthTextureStyle.BLUE_MARBLE,
      isDrawCloudsMap: true,
      isDrawBumpMap: true,
      isDrawSpecMap: true,
      isEarthGrayScale: false,
      isDrawPoliticalMap: true,
      isDrawAtmosphere: AtmosphereSettings.ON,
      isEarthAmbientLighting: true,
      isNight: false,
    }),
    definePreset_('nadir', 'alternateSatelliteImages', {
      texture: EarthTextureStyle.NADIR,
      isDrawCloudsMap: false,
      isDrawBumpMap: false,
      isDrawSpecMap: false,
      isEarthGrayScale: false,
      isDrawPoliticalMap: true,
      isDrawAtmosphere: AtmosphereSettings.ON,
      isEarthAmbientLighting: true,
      isNight: false,
    }),
    definePreset_('engineer', 'engineeringTool', {
      texture: EarthTextureStyle.BLUE_MARBLE,
      isDrawCloudsMap: false,
      isDrawBumpMap: false,
      isDrawSpecMap: false,
      isEarthGrayScale: false,
      isDrawPoliticalMap: false,
      isDrawAtmosphere: AtmosphereSettings.OFF,
      isEarthAmbientLighting: false,
      isNight: true,
    }),
    definePreset_('opscenter', 'operationsCenter', {
      texture: EarthTextureStyle.FLAT,
      isDrawCloudsMap: false,
      isDrawBumpMap: false,
      isDrawSpecMap: false,
      isEarthGrayScale: true,
      isDrawPoliticalMap: true,
      isDrawAtmosphere: AtmosphereSettings.OFF,
      isEarthAmbientLighting: false,
      isNight: true,
    }),
    definePreset_('90sGraphics', 'nineties', {
      texture: EarthTextureStyle.FLAT,
      isDrawCloudsMap: false,
      isDrawBumpMap: false,
      isDrawSpecMap: false,
      isEarthGrayScale: false,
      isDrawPoliticalMap: false,
      isDrawAtmosphere: AtmosphereSettings.OFF,
      isEarthAmbientLighting: false,
      isNight: true,
    }),
  ];

  private static findPreset_(id: string | null): EarthPresetDef | null {
    return id ? (EarthPresetsPlugin.PRESETS.find((p) => p.id === id) ?? null) : null;
  }

  /** Translated display label for a preset. */
  static presetLabel(preset: EarthPresetDef): string {
    return EarthPresetsPlugin.t_(`rmbMenu.${preset.labelKey}`);
  }

  /** Applies a preset by id. Shared by the RMB menu, palette, and graphics menu. */
  static applyPreset(presetId: EarthPresetId): void {
    const preset = EarthPresetsPlugin.findPreset_(presetId);

    if (!preset) {
      return;
    }
    preset.apply();
    // Presets write isDrawPoliticalMap directly; keep the Political Map icon in step with it.
    PluginRegistry.getPlugin(PoliticalMapToggle)?.syncIconState();
    EarthPresetsPlugin.appliedPresetId_ = preset.id;
    // Persist the id so a reload re-applies the whole look, not just the texture.
    PersistenceManager.getInstance().saveItem(StorageKey.EARTH_PRESET, preset.id);
  }

  /**
   * Re-apply the saved preset at boot. Only the texture survives a reload on its
   * own (LAST_MAP), so without this a preset comes back half-applied. Gated like
   * the LAST_MAP restore.
   */
  static restoreSavedPreset(): void {
    if (!settingsManager.isLoadLastMap || settingsManager.isDrawLess || settingsManager.disableUI) {
      return;
    }

    const preset = EarthPresetsPlugin.findPreset_(PersistenceManager.getInstance().getItem(StorageKey.EARTH_PRESET));

    if (preset) {
      EarthPresetsPlugin.applyPreset(preset.id);
    }
  }

  /** Forget the saved preset once a hand-made change means it is no longer in effect ("Custom"). */
  static forgetPresetIfChanged(): void {
    if (EarthPresetsPlugin.appliedPresetId_ && !EarthPresetsPlugin.lastAppliedPresetId) {
      EarthPresetsPlugin.appliedPresetId_ = null;
      PersistenceManager.getInstance().removeItem(StorageKey.EARTH_PRESET);
    }
  }

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, () => EarthPresetsPlugin.restoreSavedPreset());
    // Settings writes and page exit are the moments a hand-made change must clear the saved id.
    EventBus.getInstance().on(EventBusEvent.saveSettings, () => EarthPresetsPlugin.forgetPresetIfChanged());
    window.addEventListener('pagehide', () => EarthPresetsPlugin.forgetPresetIfChanged());
  }

  getContextMenuConfig(): IContextMenuConfig {
    const items = EarthPresetsPlugin.PRESETS.map((preset) => html`<li id="earth-${preset.id}-rmb"><a href="#">${EarthPresetsPlugin.presetLabel(preset)}</a></li>`).join('');

    return {
      level1ElementName: 'earth-rmb',
      level1Html: html`<li class="rmb-menu-item" id="earth-rmb"><a href="#">${EarthPresetsPlugin.t_('rmbMenu.title')} &#x27A4;</a></li>`,
      level2ElementName: 'earth-rmb-menu',
      level2Html: html`<ul class='dropdown-contents'>${items}</ul>`,
      order: 15,
      isVisible: (ctx: RmbMenuContext) => ctx.surface === 'earth',
    };
  }

  onContextMenuAction(targetId: string): void {
    const preset = EarthPresetsPlugin.PRESETS.find((p) => `earth-${p.id}-rmb` === targetId);

    if (preset) {
      EarthPresetsPlugin.applyPreset(preset.id);
    }
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = EarthPresetsPlugin.t_('rmbMenu.title');

    return EarthPresetsPlugin.PRESETS.map((preset) => ({
      id: `EarthPresetsPlugin.preset.${preset.id}`,
      label: EarthPresetsPlugin.presetLabel(preset),
      category,
      callback: () => EarthPresetsPlugin.applyPreset(preset.id),
    }));
  }
}
