import { vi } from 'vitest';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SoundManager } from '@app/engine/audio/sound-manager';
import { SoundNames, sounds } from '@app/engine/audio/sounds';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { EventBus } from '@app/engine/events/event-bus';

describe('Sound Manager', () => {
  let soundManagerPlugin: SoundManager;

  beforeEach(() => {
    setupStandardEnvironment();
    soundManagerPlugin = new SoundManager();
  });

  it('should have a valid id', () => {
    expect(soundManagerPlugin.id).toBe('SoundManager');
  });

  it('should_play_sound', () => {
    expect(sounds).toBeDefined();
    expect(sounds.click).toBeDefined();

    // eslint-disable-next-line guard-for-in
    for (const sound in sounds) {
      const soundManagerPlugin2 = soundManagerPlugin;

      vi.spyOn(global, 'navigator', 'get').mockReturnValue({
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
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    // Mock SpeechSynthesisUtterance
    const mockSpeechUtterance = vi.fn(() => ({
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
      speak: vi.fn(),
    } as unknown as SpeechSynthesis;
    expect(() => soundManagerPlugin.speak('hello')).not.toThrow();
  });

  it('getVolumeForSound returns the right level per sound family', () => {
    const vol = (soundManagerPlugin as unknown as { getVolumeForSound(k: string): number }).getVolumeForSound;
    const sm = soundManagerPlugin as unknown as { getVolumeForSound(k: string): number };

    expect(sm.getVolumeForSound('click1')).toBeCloseTo(0.15);
    expect(sm.getVolumeForSound('chatter3')).toBeCloseTo(0.25);
    expect(sm.getVolumeForSound(SoundNames.LOADING)).toBeCloseTo(0.25);
    expect(sm.getVolumeForSound(SoundNames.EXPORT)).toBeCloseTo(0.3);
    expect(sm.getVolumeForSound('error2')).toBeCloseTo(0.5);
    expect(sm.getVolumeForSound('beep1')).toBeCloseTo(0.3);
    expect(sm.getVolumeForSound(SoundNames.MENU_BUTTON)).toBeCloseTo(0.25);
    // Anything unrecognized plays at full volume.
    expect(sm.getVolumeForSound('somethingElse')).toBeCloseTo(1.0);
    expect(vol).toBeTypeOf('function');
  });

  it('toggleMute flips mute state and emits the change once per transition', () => {
    // Muting calls stopAll_, which cancels speech synthesis (undefined in jsdom).
    window.speechSynthesis = { cancel: vi.fn() } as unknown as SpeechSynthesis;
    const emit = vi.spyOn(EventBus.getInstance(), 'emit');

    expect(soundManagerPlugin.isMute).toBe(false);
    expect(soundManagerPlugin.toggleMute()).toBe(true);
    expect(soundManagerPlugin.isMute).toBe(true);
    expect(soundManagerPlugin.toggleMute()).toBe(false);
    expect(soundManagerPlugin.isMute).toBe(false);
    expect(emit).toHaveBeenCalledWith(EventBusEvent.soundMuteChanged, true);
    expect(emit).toHaveBeenCalledWith(EventBusEvent.soundMuteChanged, false);
  });
});
