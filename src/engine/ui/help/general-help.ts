import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';

const l = (key: string): string => t7e(`generalHelp.${key}` as Parameters<typeof t7e>[0]);

/**
 * App-level help shown by Shift+F1 when no side menu is open and no view or overlay is active,
 * so the key never falls through to an unrelated plugin's help.
 */
export const getGeneralHelpConfig = (): IHelpConfig => ({
  title: l('title'),
  sections: [
    {
      heading: t7e('help.overview'),
      content: l('overview'),
    },
    {
      heading: t7e('help.howToUse'),
      content: l('howToUse'),
    },
  ],
  tips: [l('tip1'), l('tip2')],
  shortcuts: [{ keys: ['Esc'], description: l('shortcutClose') }],
});
