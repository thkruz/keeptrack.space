import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { init } from './sounds';

describe('sounds', () => {
  beforeEach(() => {
    init();
    keepTrackApi.methods.uiManagerInit();
  });

  it('should load voices', () => {
    window.speechSynthesis = {
      getVoices: () => jest.fn(() => [{ voiceURI: 'voice1' }]),
    };
    keepTrackApi.programs.soundManager.loadVoices();
  });

  it('should speak', () => {
    window.SpeechSynthesisUtterance = jest.fn();
    window.speechSynthesis = {
      getVoices: () => ({ filter: (cb) => cb({ name: 'Google UK English Female' }) }),
      speak: jest.fn(),
    };
    keepTrackApi.programs.soundManager.speak('Hello');
  });

  it('should play sounds', () => {
    keepTrackApi.programs.soundManager.play('standby');
  });
});
