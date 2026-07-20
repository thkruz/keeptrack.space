import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';

/** Structured help dialog content for the Edit Satellite plugin. */
export const buildEditSatHelp = (): IHelpConfig => ({
  title: t7e('plugins.EditSat.title'),
  sections: [
    {
      heading: t7e('help.overview'),
      content: t7e('plugins.EditSat.help.overview'),
      image: {
        src: 'img/help/edit-sat/edit-sat-menu.png',
        alt: t7e('plugins.EditSat.help.imgAlt'),
        caption: t7e('plugins.EditSat.help.imgCaption'),
      },
    },
    {
      heading: t7e('plugins.EditSat.help.fieldsHeading'),
      content: t7e('plugins.EditSat.help.fields'),
    },
    {
      heading: t7e('help.howToUse'),
      content: t7e('plugins.EditSat.help.howToUse'),
    },
  ],
  tips: [t7e('plugins.EditSat.help.tip1'), t7e('plugins.EditSat.help.tip2'), t7e('plugins.EditSat.help.tip3')],
  shortcuts: [{ keys: ['E'], description: t7e('plugins.EditSat.help.shortcutToggle') }],
});
