import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';

/** Structured help dialog content for the Create Satellite plugin. */
export const buildCreateSatHelp = (): IHelpConfig => ({
  title: t7e('plugins.CreateSat.title'),
  sections: [
    {
      heading: t7e('help.overview'),
      content: t7e('plugins.CreateSat.help.overview'),
      image: {
        src: 'img/help/create-sat/create-sat-menu.png',
        alt: t7e('plugins.CreateSat.help.imgAlt'),
        caption: t7e('plugins.CreateSat.help.imgCaption'),
      },
    },
    {
      heading: t7e('plugins.CreateSat.help.tabsHeading'),
      content: t7e('plugins.CreateSat.help.tabs'),
    },
    {
      heading: t7e('help.howToUse'),
      content: t7e('plugins.CreateSat.help.howToUse'),
    },
  ],
  tips: [t7e('plugins.CreateSat.help.tip1'), t7e('plugins.CreateSat.help.tip2'), t7e('plugins.CreateSat.help.tip3')],
});
