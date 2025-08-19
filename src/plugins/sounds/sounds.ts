import beep1Mp3 from '@public/audio/beep1.mp3';
import buttonMp3 from '@public/audio/button.mp3';
import button2Mp3 from '@public/audio/button2.mp3';
import chatter1Mp3 from '@public/audio/chatter1.mp3';
import chatter2Mp3 from '@public/audio/chatter2.mp3';
import chatter3Mp3 from '@public/audio/chatter3.mp3';
import chatter4Mp3 from '@public/audio/chatter4.mp3';
import chatter5Mp3 from '@public/audio/chatter5.mp3';
import chatter6Mp3 from '@public/audio/chatter6.mp3';
import chatter7Mp3 from '@public/audio/chatter7.mp3';
import chatter8Mp3 from '@public/audio/chatter8.mp3';
import click10Mp3 from '@public/audio/click10.mp3';
import click11Mp3 from '@public/audio/click11.mp3';
import click12Mp3 from '@public/audio/click12.mp3';
import click13Mp3 from '@public/audio/click13.mp3';
import click14Mp3 from '@public/audio/click14.mp3';
import click15Mp3 from '@public/audio/click15.mp3';
import click16Mp3 from '@public/audio/click16.mp3';
import click17Mp3 from '@public/audio/click17.mp3';
import click18Mp3 from '@public/audio/click18.mp3';
import click19Mp3 from '@public/audio/click19.mp3';
import click2Mp3 from '@public/audio/click2.mp3';
import click20Mp3 from '@public/audio/click20.mp3';
import click21Mp3 from '@public/audio/click21.mp3';
import click22Mp3 from '@public/audio/click22.mp3';
import click23Mp3 from '@public/audio/click23.mp3';
import click24Mp3 from '@public/audio/click24.mp3';
import click25Mp3 from '@public/audio/click25.mp3';
import click26Mp3 from '@public/audio/click26.mp3';
import click27Mp3 from '@public/audio/click27.mp3';
import click28Mp3 from '@public/audio/click28.mp3';
import click29Mp3 from '@public/audio/click29.mp3';
import click3Mp3 from '@public/audio/click3.mp3';
import click30Mp3 from '@public/audio/click30.mp3';
import click4Mp3 from '@public/audio/click4.mp3';
import click7Mp3 from '@public/audio/click7.mp3';
import click8Mp3 from '@public/audio/click8.mp3';
import error1Mp3 from '@public/audio/error.mp3';
import error2Mp3 from '@public/audio/error2.mp3';
import exportMp3 from '@public/audio/export.wav';
import genericBeep1Mp3 from '@public/audio/genericBeep1.mp3';
import genericBeep2Mp3 from '@public/audio/genericBeep2.mp3';
import genericBeep3Mp3 from '@public/audio/genericBeep3.mp3';
import liftoffMp3 from '@public/audio/liftoff.mp3';
import loadingMp3 from '@public/audio/loading.wav';
import popMp3 from '@public/audio/pop.mp3';
import switchMp3 from '@public/audio/switch.mp3';
import toggleOffMp3 from '@public/audio/toggle-off.mp3';
import toggleOnMp3 from '@public/audio/toggle-on.mp3';
import whoosh1Mp3 from '@public/audio/whoosh1.mp3';
import whoosh2Mp3 from '@public/audio/whoosh2.mp3';
import whoosh3Mp3 from '@public/audio/whoosh3.mp3';
import whoosh4Mp3 from '@public/audio/whoosh4.mp3';
import whoosh5Mp3 from '@public/audio/whoosh5.mp3';
import whoosh6Mp3 from '@public/audio/whoosh6.mp3';
import whoosh7Mp3 from '@public/audio/whoosh7.mp3';
import whoosh8Mp3 from '@public/audio/whoosh8.mp3';


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
  EXPORT = 'export'
}

export const sounds = {
  standby: popMp3,
  error1: error1Mp3,
  error2: error2Mp3,
  export: exportMp3,
  click: switchMp3,
  beep1: beep1Mp3,
  genericBeep1: genericBeep1Mp3,
  genericBeep2: genericBeep2Mp3,
  genericBeep3: genericBeep3Mp3,
  whoosh1: whoosh1Mp3,
  whoosh2: whoosh2Mp3,
  whoosh3: whoosh3Mp3,
  whoosh4: whoosh4Mp3,
  whoosh5: whoosh5Mp3,
  whoosh6: whoosh6Mp3,
  whoosh7: whoosh7Mp3,
  whoosh8: whoosh8Mp3,
  click1: click30Mp3,
  click2: click2Mp3,
  click3: click3Mp3,
  click4: click4Mp3,
  click5: click29Mp3,
  click6: click27Mp3,
  click7: click7Mp3,
  click8: click8Mp3,
  click9: click28Mp3,
  click10: click10Mp3,
  click11: click11Mp3,
  click12: click12Mp3,
  click13: click13Mp3,
  click14: click14Mp3,
  click15: click15Mp3,
  click16: click16Mp3,
  click17: click17Mp3,
  click18: click18Mp3,
  click19: click19Mp3,
  click20: click20Mp3,
  click21: click21Mp3,
  click22: click22Mp3,
  click23: click23Mp3,
  click24: click24Mp3,
  click25: click25Mp3,
  click26: click26Mp3,
  chatter1: chatter1Mp3,
  chatter2: chatter2Mp3,
  chatter3: chatter3Mp3,
  chatter4: chatter4Mp3,
  chatter5: chatter5Mp3,
  chatter6: chatter6Mp3,
  chatter7: chatter7Mp3,
  chatter8: chatter8Mp3,
  loading: loadingMp3,
  button: buttonMp3,
  menuButton: button2Mp3,
  toggleOn: toggleOnMp3,
  toggleOff: toggleOffMp3,
  liftoff: liftoffMp3,
} as Record<string, string>;
