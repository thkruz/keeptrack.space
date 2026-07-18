
import { AtmosphereSettings, EarthTextureStyle } from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { html } from '@app/engine/utils/development/formatter';
import { t7e } from '@app/locales/keys';
import { ICommandPaletteCommand, IContextMenuConfig, RmbMenuContext } from '@app/engine/plugins/core/plugin-capabilities';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { NightToggle } from '../night-toggle/night-toggle';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

export type EarthPresetId = 'satellite' | 'nadir' | 'engineer' | 'opscenter' | '90sGraphics';

interface EarthPresetDef {
  id: EarthPresetId;
  /** Key under plugins.EarthPresetsPlugin.rmbMenu.* */
  labelKey: string;
  apply: () => void;
}

export class EarthPresetsPlugin extends KeepTrackPlugin {
  readonly id = 'EarthPresetsPlugin';
  dependencies_ = [];

  private static t_(key: string): string {
    return t7e(`plugins.EarthPresetsPlugin.${key}` as Parameters<typeof t7e>[0]);
  }

  /** The last preset applied this session, or null when none/custom. */
  static lastAppliedPresetId: EarthPresetId | null = null;

  /**
   * Single source of truth for the earth style presets. The right-click menu,
   * the command palette, and the graphics menu dropdown all derive from this.
   */
  static readonly PRESETS: EarthPresetDef[] = [
    {
      id: 'satellite',
      labelKey: 'satelliteImages',
      apply: () => {
        ServiceLocator.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.BLUE_MARBLE);
        settingsManager.isDrawCloudsMap = true;
        settingsManager.isDrawBumpMap = true;
        settingsManager.isDrawSpecMap = true;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = true;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.ON;
        settingsManager.isEarthAmbientLighting = true;
        PluginRegistry.getPlugin(NightToggle)?.setBottomIconToUnselected();
        PluginRegistry.getPlugin(NightToggle)?.off();
      },
    },
    {
      id: 'nadir',
      labelKey: 'alternateSatelliteImages',
      apply: () => {
        ServiceLocator.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.NADIR);
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = true;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.ON;
        settingsManager.isEarthAmbientLighting = true;
        PluginRegistry.getPlugin(NightToggle)?.setBottomIconToUnselected();
        PluginRegistry.getPlugin(NightToggle)?.off();
      },
    },
    {
      id: 'engineer',
      labelKey: 'engineeringTool',
      apply: () => {
        ServiceLocator.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.BLUE_MARBLE);
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = false;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.OFF;
        settingsManager.isEarthAmbientLighting = false;
        PluginRegistry.getPlugin(NightToggle)?.on();
      },
    },
    {
      id: 'opscenter',
      labelKey: 'operationsCenter',
      apply: () => {
        ServiceLocator.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.FLAT);
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = true;
        settingsManager.isDrawPoliticalMap = true;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.OFF;
        settingsManager.isEarthAmbientLighting = false;
        PluginRegistry.getPlugin(NightToggle)?.on();
      },
    },
    {
      id: '90sGraphics',
      labelKey: 'nineties',
      apply: () => {
        ServiceLocator.getScene().earth.changeEarthTextureStyle(EarthTextureStyle.FLAT);
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = false;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.OFF;
        settingsManager.isEarthAmbientLighting = false;
        PluginRegistry.getPlugin(NightToggle)?.on();
      },
    },
  ];

  /** Translated display label for a preset. */
  static presetLabel(preset: EarthPresetDef): string {
    return EarthPresetsPlugin.t_(`rmbMenu.${preset.labelKey}`);
  }

  /** Applies a preset by id. Shared by the RMB menu, palette, and graphics menu. */
  static applyPreset(presetId: EarthPresetId): void {
    const preset = EarthPresetsPlugin.PRESETS.find((p) => p.id === presetId);

    if (!preset) {
      return;
    }
    preset.apply();
    EarthPresetsPlugin.lastAppliedPresetId = preset.id;
  }

  getContextMenuConfig(): IContextMenuConfig {
    const items = EarthPresetsPlugin.PRESETS
      .map((preset) => html`<li id="earth-${preset.id}-rmb"><a href="#">${EarthPresetsPlugin.presetLabel(preset)}</a></li>`)
      .join('');

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
