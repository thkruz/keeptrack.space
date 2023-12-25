import { keepTrackApi } from '@app/keepTrackApi';
import { SoundManager } from '@app/plugins/sounds/sound-manager';
import { standardPluginSuite } from './generic-tests';

describe('Sound Manager', () => {
  let soundManagerPlugin: SoundManager;
  beforeEach(() => {
    soundManagerPlugin = new SoundManager();
  });

  standardPluginSuite(SoundManager, 'SoundManager');

  it('should_play_sound', () => {
    const sounds = soundManagerPlugin.sounds;

    expect(sounds).toBeDefined();
    expect(sounds.click).toBeDefined();

    for (const sound in sounds) {
      const soundManagerPlugin2 = soundManagerPlugin;

      jest.spyOn(global, 'navigator', 'get').mockReturnValue({
        userActivation: {
          isActive: true,
          hasBeenActive: true,
        },
      } as Navigator);

      expect(() => soundManagerPlugin2.play(sound)).not.toThrow();
    }

    for (let i = 0; i < 30; i++) {
      const soundManagerPlugin2 = soundManagerPlugin;
      expect(() => soundManagerPlugin2.play('genericBeep')).not.toThrow();
    }
  });

  it('should_be_able_to_speak', () => {
    keepTrackApi.methods.uiManagerInit();
    // Mock SpeechSynthesisUtterance
    global.SpeechSynthesisUtterance = jest.fn(() => ({
      lang: 'en-US',
      pitch: 1,
      rate: 1,
      text: 'hello',
      voice: null,
      volume: 1,
    })) as any;
    global.speechSynthesis = {
      speak: jest.fn(),
    } as any;
    expect(() => soundManagerPlugin.speak('hello')).not.toThrow();
  });
});
