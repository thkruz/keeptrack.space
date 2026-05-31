import { SoundManager } from '@app/engine/audio/sound-manager';
import { SoundNames } from '@app/engine/audio/sounds';
import { getEl } from '@app/engine/utils/get-el';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('SoundManager stop / play guards', () => {
  let sm: SoundManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => sm as any;

  const fakeWebAudio = () => ({ source: { stop: vi.fn() }, gainNode: { gain: { setTargetAtTime: vi.fn() } } });
  const fakeHtmlAudio = () => ({ pause: vi.fn(), play: vi.fn(), currentTime: 5, volume: 1, addEventListener: vi.fn() });

  const speechCancel = vi.fn();

  beforeEach(() => {
    setupStandardEnvironment();
    sm = new SoundManager();
    // jsdom has no speechSynthesis; stopAll_ calls window.speechSynthesis.cancel.
    Object.defineProperty(window, 'speechSynthesis', {
      value: { cancel: speechCancel },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    speechCancel.mockClear();
  });

  it('stop immediately stops a Web Audio source when not fading out', () => {
    const entry = fakeWebAudio();

    p().playingSounds.set(SoundNames.CLICK, [entry]);

    sm.stop(SoundNames.CLICK, false);

    expect(entry.source.stop).toHaveBeenCalled();
    expect(p().playingSounds.get(SoundNames.CLICK)).toStrictEqual([]);
  });

  it('stop pauses and rewinds an HTML audio element when not fading out', () => {
    const audio = fakeHtmlAudio();

    p().htmlAudioElements.set(SoundNames.CLICK, audio);

    sm.stop(SoundNames.CLICK, false);

    expect(audio.pause).toHaveBeenCalled();
    expect(audio.currentTime).toBe(0);
  });

  it('stop(CHATTER) recurses across all chatter clips', () => {
    const stopSpy = vi.spyOn(sm, 'stop');

    sm.stop(SoundNames.CHATTER, false);

    // Original call + 8 recursive chatter1..8 stops.
    expect(stopSpy.mock.calls.length).toBeGreaterThanOrEqual(9);
  });

  it('stopAll_ stops every active source, pauses html audio and cancels speech', () => {
    const web = fakeWebAudio();
    const audio = fakeHtmlAudio();

    p().playingSounds.set(SoundNames.CLICK, [web]);
    p().htmlAudioElements.set(SoundNames.LOADING, audio);

    p().stopAll_();

    expect(web.source.stop).toHaveBeenCalled();
    expect(audio.pause).toHaveBeenCalled();
    expect(speechCancel).toHaveBeenCalled();
  });

  it('fadeOut_ ramps the volume down and pauses the element', () => {
    vi.useFakeTimers();
    const audio = { volume: 1, pause: vi.fn(), currentTime: 3 } as unknown as HTMLAudioElement;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (SoundManager as any).fadeOut_(audio, 100);
    vi.advanceTimersByTime(200);

    expect(audio.pause).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('play is a no-op while muted', () => {
    sm.isMute = true;
    const webSpy = vi.spyOn(p(), 'playWithWebAudio');

    sm.play(SoundNames.CLICK);

    expect(webSpy).not.toHaveBeenCalled();
  });

  it('play is a no-op while the loading screen is fullscreen', () => {
    sm.isMute = false;
    if (!getEl('loading-screen', true)) {
      document.body.insertAdjacentHTML('beforeend', '<div id="loading-screen"></div>');
    }
    getEl('loading-screen', true)!.classList.add('fullscreen');
    const webSpy = vi.spyOn(p(), 'playWithWebAudio');

    sm.play(SoundNames.CLICK);

    expect(webSpy).not.toHaveBeenCalled();
    getEl('loading-screen', true)!.classList.remove('fullscreen');
  });

  it('play(ERROR) respects the long-audio cooldown', () => {
    sm.isMute = false;
    p().lastLongAudioTime = Date.now();
    const webSpy = vi.spyOn(p(), 'playWithWebAudio').mockReturnValue(null);

    sm.play(SoundNames.ERROR);

    // Within the cooldown window the error sound is skipped entirely.
    expect(webSpy).not.toHaveBeenCalled();
  });
});
