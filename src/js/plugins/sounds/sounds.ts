import { getEl } from '@app/js/lib/helpers';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

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
          standby: new Audio('./audio/pop.mp3'),
          error: new Audio('./audio/error.mp3'),
          click: new Audio('./audio/switch.mp3'),
          beep1: new Audio('./audio/beep1.mp3'),
          genericBeep1: new Audio('./audio/genericBeep1.mp3'),
          genericBeep2: new Audio('./audio/genericBeep2.mp3'),
          genericBeep3: new Audio('./audio/genericBeep3.mp3'),
          whoosh1: new Audio('./audio/whoosh1.mp3'),
          whoosh2: new Audio('./audio/whoosh2.mp3'),
          whoosh3: new Audio('./audio/whoosh3.mp3'),
          whoosh4: new Audio('./audio/whoosh4.mp3'),
          whoosh5: new Audio('./audio/whoosh5.mp3'),
          whoosh6: new Audio('./audio/whoosh6.mp3'),
          whoosh7: new Audio('./audio/whoosh7.mp3'),
          whoosh8: new Audio('./audio/whoosh8.mp3'),
          button: new Audio('./audio/button.mp3'),
          toggleOn: new Audio('./audio/toggle-on.mp3'),
          toggleOff: new Audio('./audio/toggle-off.mp3'),
          liftoff: new Audio('./audio/liftoff.mp3'),
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
