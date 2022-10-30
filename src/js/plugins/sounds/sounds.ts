import beep1Mp3 from '@app/audio/beep1.mp3';
import buttonMp3 from '@app/audio/button.mp3';
import errorMp3 from '@app/audio/error.mp3';
import genericBeep1Mp3 from '@app/audio/genericBeep1.mp3';
import genericBeep2Mp3 from '@app/audio/genericBeep2.mp3';
import genericBeep3Mp3 from '@app/audio/genericBeep3.mp3';
import { getEl } from '@app/js/lib/helpers';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import liftoffMp3 from '@app/audio/liftoff.mp3';
import popMp3 from '@app/audio/pop.mp3';
import switchMp3 from '@app/audio/switch.mp3';
import toggleOffMp3 from '@app/audio/toggle-off.mp3';
import toggleOnMp3 from '@app/audio/toggle-on.mp3';
import whoosh1Mp3 from '@app/audio/whoosh1.mp3';
import whoosh2Mp3 from '@app/audio/whoosh2.mp3';
import whoosh3Mp3 from '@app/audio/whoosh3.mp3';
import whoosh4Mp3 from '@app/audio/whoosh4.mp3';
import whoosh5Mp3 from '@app/audio/whoosh5.mp3';
import whoosh6Mp3 from '@app/audio/whoosh6.mp3';
import whoosh7Mp3 from '@app/audio/whoosh7.mp3';
import whoosh8Mp3 from '@app/audio/whoosh8.mp3';

let lastLongAudioTimne = 0;

export const init = (): void => {
  // const { settingsManager } = keepTrackApi.programs;
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'soundManager',
    cb: () => {
      keepTrackApi.programs.soundManager = {
        // Fetch the list of voices and populate the voice options.
        loadVoices: () => {
          // Fetch the available voices.
          keepTrackApi.programs.soundManager.voices = speechSynthesis.getVoices();
        },
        // Create a new utterance for the specified text and add it to
        // the queue.
        speak: (text: string) => {
          if (keepTrackApi.programs.soundManager.isMute) return; // Muted

          // Create a new instance of SpeechSynthesisUtterance.
          const msg = new SpeechSynthesisUtterance();

          // Set the text.
          msg.text = text;

          // Set the attributes.
          msg.volume = 0.5;
          msg.rate = 1;
          msg.pitch = 1;

          // If a voice has been selected, find the voice and set the
          // utterance instance's voice attribute.
          msg.voice = speechSynthesis.getVoices().filter(function (voice) {
            return voice.name == 'Google UK English Female';
          })[0];

          // Queue this utterance.
          window.speechSynthesis.speak(msg);
        },
        sounds: {
          standby: new Audio(popMp3),
          error: new Audio(errorMp3),
          click: new Audio(switchMp3),
          beep1: new Audio(beep1Mp3),
          genericBeep1: new Audio(genericBeep1Mp3),
          genericBeep2: new Audio(genericBeep2Mp3),
          genericBeep3: new Audio(genericBeep3Mp3),
          whoosh1: new Audio(whoosh1Mp3),
          whoosh2: new Audio(whoosh2Mp3),
          whoosh3: new Audio(whoosh3Mp3),
          whoosh4: new Audio(whoosh4Mp3),
          whoosh5: new Audio(whoosh5Mp3),
          whoosh6: new Audio(whoosh6Mp3),
          whoosh7: new Audio(whoosh7Mp3),
          whoosh8: new Audio(whoosh8Mp3),
          button: new Audio(buttonMp3),
          toggleOn: new Audio(toggleOnMp3),
          toggleOff: new Audio(toggleOffMp3),
          liftoff: new Audio(liftoffMp3),
        },
        play: (sound: string) => {
          if (keepTrackApi.programs.soundManager.isMute) return; // Muted
          if (getEl('loading-screen').classList.contains('fullscreen')) return; // Not Ready Yet

          let random = 1;
          switch (sound) {
            case 'genericBeep':
              random = Math.floor(Math.random() * 3) + 1;
              keepTrackApi.programs.soundManager.sounds[`genericBeep${random}`].play();
              return;
            case 'whoosh':
              random = Math.floor(Math.random() * 8) + 1;
              keepTrackApi.programs.soundManager.sounds[`whoosh${random}`].play();
              return;
            case 'error':
              if (lastLongAudioTimne + 1200000 > Date.now()) return; // Don't play if played in last 30 second
              lastLongAudioTimne = Date.now();
              keepTrackApi.programs.soundManager.sounds.error.play();
              return;
            default:
              keepTrackApi.programs.soundManager.sounds[sound].play();
              return;
          }
        },
        voices: [],
        isMute: false,
      };

      // Load the voices.
      keepTrackApi.programs.soundManager.loadVoices();
    },
  });
};
