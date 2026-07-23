import beep1M4a from '@public/audio/beep1.m4a';
import buttonM4a from '@public/audio/button.m4a';
import button2M4a from '@public/audio/button2.m4a';
import chatter1M4a from '@public/audio/chatter1.m4a';
import chatter2M4a from '@public/audio/chatter2.m4a';
import chatter3M4a from '@public/audio/chatter3.m4a';
import chatter4M4a from '@public/audio/chatter4.m4a';
import chatter5M4a from '@public/audio/chatter5.m4a';
import chatter6M4a from '@public/audio/chatter6.m4a';
import chatter7M4a from '@public/audio/chatter7.m4a';
import chatter8M4a from '@public/audio/chatter8.m4a';
import click2M4a from '@public/audio/click2.m4a';
import click3M4a from '@public/audio/click3.m4a';
import click4M4a from '@public/audio/click4.m4a';
import click7M4a from '@public/audio/click7.m4a';
import click8M4a from '@public/audio/click8.m4a';
import click10M4a from '@public/audio/click10.m4a';
import click11M4a from '@public/audio/click11.m4a';
import click12M4a from '@public/audio/click12.m4a';
import click13M4a from '@public/audio/click13.m4a';
import click14M4a from '@public/audio/click14.m4a';
import click15M4a from '@public/audio/click15.m4a';
import click16M4a from '@public/audio/click16.m4a';
import click17M4a from '@public/audio/click17.m4a';
import click18M4a from '@public/audio/click18.m4a';
import click19M4a from '@public/audio/click19.m4a';
import click20M4a from '@public/audio/click20.m4a';
import click21M4a from '@public/audio/click21.m4a';
import click22M4a from '@public/audio/click22.m4a';
import click23M4a from '@public/audio/click23.m4a';
import click24M4a from '@public/audio/click24.m4a';
import click25M4a from '@public/audio/click25.m4a';
import click26M4a from '@public/audio/click26.m4a';
import click27M4a from '@public/audio/click27.m4a';
import click28M4a from '@public/audio/click28.m4a';
import click29M4a from '@public/audio/click29.m4a';
import click30M4a from '@public/audio/click30.m4a';
import error1M4a from '@public/audio/error.m4a';
import error2M4a from '@public/audio/error2.m4a';
import exportM4a from '@public/audio/export.m4a';
import genericBeep1M4a from '@public/audio/genericBeep1.m4a';
import genericBeep2M4a from '@public/audio/genericBeep2.m4a';
import genericBeep3M4a from '@public/audio/genericBeep3.m4a';
import liftoffM4a from '@public/audio/liftoff.m4a';
import loadingM4a from '@public/audio/loading.m4a';
import popM4a from '@public/audio/pop.m4a';
import switchM4a from '@public/audio/switch.m4a';
import toggleOffM4a from '@public/audio/toggle-off.m4a';
import toggleOnM4a from '@public/audio/toggle-on.m4a';
import whoosh1M4a from '@public/audio/whoosh1.m4a';
import whoosh2M4a from '@public/audio/whoosh2.m4a';
import whoosh3M4a from '@public/audio/whoosh3.m4a';
import whoosh4M4a from '@public/audio/whoosh4.m4a';
import whoosh5M4a from '@public/audio/whoosh5.m4a';
import whoosh6M4a from '@public/audio/whoosh6.m4a';
import whoosh7M4a from '@public/audio/whoosh7.m4a';
import whoosh8M4a from '@public/audio/whoosh8.m4a';

export enum SoundNames {
  BEEP = 'beep',
  WHOOSH = 'whoosh',
  ERROR = 'error',
  CLICK = 'click',
  CHATTER = 'chatter',
  TOGGLE_ON = 'toggleOn',
  TOGGLE_OFF = 'toggleOff',
  LIFT_OFF = 'liftoff',
  BUTTON_CLICK = 'button',
  WARNING = 'standby',
  MENU_BUTTON = 'menuButton',
  LOADING = 'loading',
  EXPORT = 'export',
}

export const sounds = {
  standby: popM4a,
  error1: error1M4a,
  error2: error2M4a,
  export: exportM4a,
  click: switchM4a,
  beep1: beep1M4a,
  genericBeep1: genericBeep1M4a,
  genericBeep2: genericBeep2M4a,
  genericBeep3: genericBeep3M4a,
  whoosh1: whoosh1M4a,
  whoosh2: whoosh2M4a,
  whoosh3: whoosh3M4a,
  whoosh4: whoosh4M4a,
  whoosh5: whoosh5M4a,
  whoosh6: whoosh6M4a,
  whoosh7: whoosh7M4a,
  whoosh8: whoosh8M4a,
  click1: click30M4a,
  click2: click2M4a,
  click3: click3M4a,
  click4: click4M4a,
  click5: click29M4a,
  click6: click27M4a,
  click7: click7M4a,
  click8: click8M4a,
  click9: click28M4a,
  click10: click10M4a,
  click11: click11M4a,
  click12: click12M4a,
  click13: click13M4a,
  click14: click14M4a,
  click15: click15M4a,
  click16: click16M4a,
  click17: click17M4a,
  click18: click18M4a,
  click19: click19M4a,
  click20: click20M4a,
  click21: click21M4a,
  click22: click22M4a,
  click23: click23M4a,
  click24: click24M4a,
  click25: click25M4a,
  click26: click26M4a,
  chatter1: chatter1M4a,
  chatter2: chatter2M4a,
  chatter3: chatter3M4a,
  chatter4: chatter4M4a,
  chatter5: chatter5M4a,
  chatter6: chatter6M4a,
  chatter7: chatter7M4a,
  chatter8: chatter8M4a,
  loading: loadingM4a,
  button: buttonM4a,
  menuButton: button2M4a,
  toggleOn: toggleOnM4a,
  toggleOff: toggleOffM4a,
  liftoff: liftoffM4a,
} as Record<string, string>;
