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
          standby: new Audio('./audio/pop-small.ogg'),
          error: new Audio('./audio/error.ogg'),
          click: new Audio('./audio/click.ogg'),
          liftoff: new Audio('./audio/liftoff.ogg'),
        },
        play: (sound: string) => {
          if (getEl('loading-screen').classList.contains('fullscreen')) return;
          keepTrackApi.programs.soundManager.sounds[sound].play();
        },
        voices: [],
      };
    },
  });
};
