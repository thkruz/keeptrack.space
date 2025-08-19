import { keepTrackContainer } from '@app/container';
import { KeepTrackApiEvents, Singletons } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SoundNames, sounds } from './sounds';

interface PlayingSound {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  startTime: number;
}

export class SoundManager extends KeepTrackPlugin {
  readonly id = 'SoundManager';
  dependencies_ = [];
  lastLongAudioTime = 0;
  isMute = false;
  private readonly currentChatterClip_ = 0;
  voices: SpeechSynthesisVoice[] = [];
  nextChatter: ReturnType<typeof setTimeout>;
  private maxClickClip_ = 0;

  // Web Audio API properties
  private audioContext: AudioContext | null = null;
  private readonly audioBuffers: Map<string, AudioBuffer> = new Map();
  private readonly playingSounds: Map<string, PlayingSound[]> = new Map();
  private isAudioReady = false;
  private audioLoadingPromise: Promise<void> | null = null;

  // Fallback to HTML5 Audio for speech and complex sounds
  private readonly htmlAudioElements: Map<string, HTMLAudioElement> = new Map();
  // Sounds that should always use HTML5 Audio due to length
  private readonly useHtmlAudioFor = new Set(['chatter1', 'chatter2', 'chatter3', 'chatter4', 'chatter5', 'chatter6', 'chatter7', 'chatter8']);

  private readonly LONG_AUDIO_COOLDOWN_MS = 30000;
  private readonly CHATTER_REPEAT_DELAY_MS = 10000;

  constructor() {
    super();

    // Initialize audio context and preload
    this.initializeAudio();

    // Find the maxClickClip_
    Object.keys(sounds).forEach((key) => {
      if (key.startsWith('click')) {
        const clipNumber = parseInt(key.replace('click', ''));

        if (clipNumber > this.maxClickClip_) {
          this.maxClickClip_ = clipNumber;
        }
      }
    });
  }

  private async initializeAudio() {
    try {
      // Initialize Web Audio Context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Preload all audio
      this.audioLoadingPromise = this.preloadAllAudio();
      await this.audioLoadingPromise;

      this.isAudioReady = true;
    } catch (error) {
      errorManagerInstance.log(`Web Audio API initialization failed, using HTML5 Audio fallback: ${error}`);
      this.audioContext = null;
      this.preloadHtmlAudio();
      this.isAudioReady = true;
    }
  }

  private async preloadAllAudio(): Promise<void> {
    if (!this.audioContext) {
      return;
    }

    const loadPromises = Object.entries(sounds).map(async ([key, path]) => {
      try {
        if (this.useHtmlAudioFor.has(key)) {
          // Use HTML5 Audio for complex sounds like chatter
          const audio = new Audio(path);

          audio.preload = 'auto';
          audio.volume = this.getVolumeForSound(key);
          audio.load();
          this.htmlAudioElements.set(key, audio);
        } else {
          // Use Web Audio API for simple sounds
          const response = await fetch(path);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext?.decodeAudioData(arrayBuffer);

          if (!audioBuffer) {
            throw new Error(`Failed to decode audio data: ${key}`);
          }

          this.audioBuffers.set(key, audioBuffer);
        }
      } catch (error) {
        errorManagerInstance.warn(`Failed to load audio: ${key}`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  private preloadHtmlAudio() {
    // Fallback to HTML5 Audio for all sounds
    Object.entries(sounds).forEach(([key, path]) => {
      const audio = new Audio(path);

      audio.preload = 'auto';
      audio.volume = this.getVolumeForSound(key);
      audio.load();
      this.htmlAudioElements.set(key, audio);
    });
  }

  private getVolumeForSound(soundKey: string): number {
    if (soundKey.startsWith('click')) {
      return 0.25;
    } else if (soundKey.startsWith('chatter')) {
      return 0.15;
    } else if (soundKey === 'loading') {
      return 0.25;
    } else if (soundKey === 'export') {
      return 0.3;
    } else if (soundKey === 'error2') {
      return 0.5;
    }

    return 1.0;
  }

  private playWithWebAudio(soundKey: string, volume = 1.0): AudioBufferSourceNode | null {
    if (!this.audioContext || !this.audioBuffers.has(soundKey)) {
      return null;
    }

    const buffer = this.audioBuffers.get(soundKey)!;
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Track playing sound for potential stopping
    const playingSound: PlayingSound = {
      source,
      gainNode,
      startTime: this.audioContext.currentTime,
    };

    if (!this.playingSounds.has(soundKey)) {
      this.playingSounds.set(soundKey, []);
    }
    this.playingSounds.get(soundKey)!.push(playingSound);

    // Clean up when finished
    source.onended = () => {
      const sounds = this.playingSounds.get(soundKey);

      if (sounds) {
        const index = sounds.indexOf(playingSound);

        if (index > -1) {
          sounds.splice(index, 1);
        }
      }
    };

    source.start();

    return source;
  }

  private playWithHtmlAudio(soundKey: string): boolean {
    const audio = this.htmlAudioElements.get(soundKey);

    if (!audio) {
      return false;
    }

    audio.currentTime = 0;
    audio.play()?.catch((error) => {
      errorManagerInstance.log(`Failed to play HTML audio: ${soundKey} ${error}`);
    });

    return true;
  }

  addJs = (): void => {
    super.addJs();

    keepTrackContainer.registerSingleton<SoundManager>(Singletons.SoundManager, this);

    keepTrackApi.on(KeepTrackApiEvents.uiManagerInit, () => {
      this.voices = speechSynthesis.getVoices();

      // Resume audio context if suspended (required by browser autoplay policies)
      if (this.audioContext?.state === 'suspended') {
        this.audioContext.resume();
      }
    });
  };

  /**
   * Wait for all audio to be ready for playback
   */
  async waitForAudioReady(): Promise<void> {
    if (this.audioLoadingPromise) {
      await this.audioLoadingPromise;
    }
  }

  /**
   * Check if audio is ready for playback
   */
  get audioReady(): boolean {
    return this.isAudioReady;
  }

  /**
   * Create a new utterance for the specified text and add it to the queue.
   */
  speak(text: string) {
    if (this.isMute) {
      return;
    }

    const msg = new SpeechSynthesisUtterance();

    msg.text = text;
    msg.volume = 0.5;
    msg.rate = 1;
    msg.pitch = 1;
    msg.voice = this.voices.filter((voice) => voice.name === 'Google UK English Female')[0];

    window.speechSynthesis.speak(msg);
  }

  stop(soundName: SoundNames, isFadeout = true) {
    if (soundName === SoundNames.CHATTER) {
      clearTimeout(this.nextChatter);
      for (let i = 1; i <= 8; i++) {
        this.stop(`chatter${i}` as SoundNames, isFadeout);
      }

      return;
    }

    // Stop Web Audio API sounds
    const playingSounds = this.playingSounds.get(soundName);

    if (playingSounds) {
      playingSounds.forEach(({ source, gainNode }) => {
        if (isFadeout && this.audioContext) {
          // Fade out over 1 second
          gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.3);
          setTimeout(() => {
            try {
              source.stop();
            } catch {
              // Source may have already stopped
            }
          }, 1000);
        } else {
          try {
            source.stop();
          } catch {
            // Source may have already stopped
          }
        }
      });
      this.playingSounds.set(soundName, []);
    }

    // Stop HTML5 Audio sounds
    const htmlAudio = this.htmlAudioElements.get(soundName);

    if (htmlAudio) {
      if (isFadeout) {
        SoundManager.fadeOut_(htmlAudio);
      } else {
        htmlAudio.pause();
        htmlAudio.currentTime = 0;
      }
    }
  }

  private static fadeOut_(sound: HTMLAudioElement, duration = 1000) {
    const volumeCached = sound.volume;
    const interval = 10;
    const steps = duration / interval;
    const decrement = sound.volume / steps;

    let i = 0;
    const intervalID = setInterval(() => {
      i++;
      if (sound.volume > 0.05) {
        sound.volume -= decrement;
      }

      if (i === steps) {
        sound.pause();
        sound.currentTime = 0;
        clearInterval(intervalID);
        sound.volume = volumeCached;
      }
    }, interval);
  }

  play(soundName: SoundNames) {
    if (navigator.userActivation?.hasBeenActive === false) {
      return;
    }

    if (this.isMute) {
      return;
    }

    if (getEl('loading-screen')?.classList.contains('fullscreen')) {
      return;
    }

    // Resume audio context if needed
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }

    let random = 1;
    let soundKey: string;
    let volume: number;

    switch (soundName) {
      case SoundNames.BEEP:
        random = Math.floor(Math.random() * 3) + 1;
        soundKey = `genericBeep${random}`;
        volume = this.getVolumeForSound(soundKey);
        break;

      case SoundNames.WHOOSH:
        random = Math.floor(Math.random() * 8) + 1;
        soundKey = `whoosh${random}`;
        volume = this.getVolumeForSound(soundKey);
        break;

      case SoundNames.ERROR:
        if (this.lastLongAudioTime + this.LONG_AUDIO_COOLDOWN_MS > Date.now()) {
          return;
        }
        this.lastLongAudioTime = Date.now();
        random = Math.floor(Math.random() * 2) + 1;
        soundKey = `error${random}`;
        volume = this.getVolumeForSound(soundKey);
        break;

      case SoundNames.CLICK:
        random = Math.floor(Math.random() * this.maxClickClip_) + 1;
        soundKey = `click${random}`;
        volume = this.getVolumeForSound(soundKey);
        break;

      case SoundNames.CHATTER:
        random = Math.floor(Math.random() * 8) + 1;
        if (random === this.currentChatterClip_) {
          random++;
          if (random > 8) {
            random = 1;
          }
        }
        soundKey = `chatter${random}`;

        this.stop(SoundNames.CHATTER, false);

        // Use HTML5 Audio for chatter (better for longer sounds)
        if (this.playWithHtmlAudio(soundKey)) {
          const audio = this.htmlAudioElements.get(soundKey)!;

          audio.addEventListener('ended', () => {
            this.nextChatter = setTimeout(() => {
              this.play(SoundNames.CHATTER);
            }, this.CHATTER_REPEAT_DELAY_MS);
          }, { once: true });
        }

        return;

      default:
        soundKey = soundName;
        volume = this.getVolumeForSound(soundKey);
    }

    // Try Web Audio API first, fallback to HTML5 Audio
    if (!this.playWithWebAudio(soundKey, volume)) {
      this.playWithHtmlAudio(soundKey);
    }
  }
}
