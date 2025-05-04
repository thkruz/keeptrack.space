import { KeepTrackApiEvents } from '@app/interfaces';
import { SoundNames } from '@app/plugins/sounds/SoundNames';
import { SoundManager } from '@app/plugins/sounds/sound-manager';
import { standardPluginSuite } from './generic-tests';
import { Doris } from '@app/doris/doris';

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

    // eslint-disable-next-line guard-for-in
    for (const sound in sounds) {
      const soundManagerPlugin2 = soundManagerPlugin;

      jest.spyOn(global, 'navigator', 'get').mockReturnValue({
        userActivation: {
          isActive: true,
          hasBeenActive: true,
        },
      } as Navigator);

      expect(() => soundManagerPlugin2.play(sound as SoundNames)).not.toThrow();
    }

    for (let i = 0; i < 30; i++) {
      const soundManagerPlugin2 = soundManagerPlugin;

      expect(() => soundManagerPlugin2.play(SoundNames.BEEP)).not.toThrow();
    }
  });

  it('should_be_able_to_speak', () => {
    Doris.getInstance().emit(KeepTrackApiEvents.HtmlInitialize);
    // Mock SpeechSynthesisUtterance
    const mockSpeechUtterance = jest.fn(() => ({
      lang: 'en-US',
      pitch: 1,
      rate: 1,
      text: 'hello',
      voice: null,
      volume: 1,
    }));

    mockSpeechUtterance.prototype = {};
    global.SpeechSynthesisUtterance = mockSpeechUtterance as unknown as typeof SpeechSynthesisUtterance;
    global.speechSynthesis = {
      speak: jest.fn(),
    } as unknown as SpeechSynthesis;
    expect(() => soundManagerPlugin.speak('hello')).not.toThrow();
  });
});
