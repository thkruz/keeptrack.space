import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { KeepTrack } from '@app/keeptrack';
import { t7e } from '@app/locales/keys';

export interface MediaRecorderOptions {
  audio: boolean;
  video: { cursor: string };
}

export type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopping';

export class StreamManager {
  static readonly RECORDING_START_DELAY_MS = 500;
  static readonly BIT_RATE_30_MBPS = 30000000;
  static readonly BIT_RATE_20_MBPS = 20000000;
  static readonly BIT_RATE_10_MBPS = 10000000;
  static readonly BIT_RATE_5_MBPS = 5000000;
  static readonly BIT_RATE_2_MBPS = 2000000;
  static readonly BIT_RATE_1_MBPS = 1000000;

  private mediaRecorder_: MediaRecorder | null = null;
  private recordedBlobs_: Blob[] = [];
  private supportedType_: string | undefined;
  private startDelayTimer_: ReturnType<typeof setTimeout> | null = null;
  private stream_: MediaStream | null = null;
  private state_: RecordingState = 'idle';
  private requestId_ = 0;
  private canSave_ = false;
  private trackEnded_: (() => void) | null = null;

  constructor(
    private readonly videoBitsPerSec_: number,
    private readonly onStop_: () => void,
    private readonly onMinorError_: () => void,
    private readonly onError_: () => void,
    private readonly onStateChange_: (state: RecordingState) => void = () => undefined
  ) {}

  get state(): RecordingState {
    return this.state_;
  }

  get isVideoRecording(): boolean {
    return this.state_ === 'recording';
  }

  static handleError(error: Error): void {
    errorManagerInstance.warn(`Error: ${error.message}`);
  }

  getStream(displayMediaOptions: MediaRecorderOptions = { video: { cursor: 'never' }, audio: false }): Promise<MediaStream> | false {
    if (!window.isSecureContext && !settingsManager.offlineMode) {
      this.onError_();

      return false;
    }
    const legacyNavigator = navigator as Navigator & { getDisplayMedia?: (options: MediaRecorderOptions) => Promise<MediaStream> };

    if (legacyNavigator.getDisplayMedia) {
      return legacyNavigator.getDisplayMedia(displayMediaOptions);
    }
    if (navigator.mediaDevices?.getDisplayMedia) {
      return navigator.mediaDevices.getDisplayMedia(displayMediaOptions as DisplayMediaStreamOptions);
    }
    this.onError_();

    return false;
  }

  start(): void {
    if (this.state_ !== 'idle') {
      return;
    }
    const requestId = ++this.requestId_;

    this.canSave_ = false;
    this.recordedBlobs_ = [];
    this.supportedType_ = undefined;
    this.setState_('requesting');
    try {
      const streamPromise = this.getStream();

      if (!streamPromise) {
        this.setState_('idle');

        return;
      }
      streamPromise
        .then((stream) => {
          // Cancelled share pickers release eventual grants without touching newer recordings.
          if (requestId !== this.requestId_ || this.state_ !== 'requesting') {
            stream.getTracks().forEach((track) => {
              track.stop();
            });

            return;
          }
          this.stream_ = stream;
          this.trackEnded_ = () => this.stop();
          stream.getTracks().forEach((track) => {
            track.addEventListener('ended', this.trackEnded_!);
          });
          this.startDelayTimer_ = setTimeout(() => this.beginRecording_(requestId), StreamManager.RECORDING_START_DELAY_MS);
        })
        .catch((error: Error) => {
          if (requestId === this.requestId_) {
            this.fail_(error);
          }
        });
    } catch (error) {
      this.fail_(error as Error);
    }
  }

  stop(): void {
    if (this.state_ === 'idle' || this.state_ === 'stopping') {
      return;
    }
    if (this.state_ === 'requesting') {
      ++this.requestId_;
      this.releaseTracks_();
      this.setState_('idle');
      this.onMinorError_();

      return;
    }
    this.setState_('stopping');
    try {
      // The final dataavailable event precedes stop. Keep tracks alive until then.
      this.mediaRecorder_!.stop();
    } catch (error) {
      this.fail_(error as Error);
    }
  }

  save(fileName: string): void {
    if (!this.canSave_ || this.state_ !== 'idle') {
      return;
    }
    this.canSave_ = false;
    const blob = new Blob(this.recordedBlobs_, { type: this.supportedType_ });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.style.display = 'none';
    anchor.href = url;
    anchor.download = fileName;
    KeepTrack.getInstance().containerRoot.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      anchor.remove();
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  private beginRecording_(requestId: number): void {
    this.startDelayTimer_ = null;
    if (requestId !== this.requestId_ || !this.stream_) {
      return;
    }
    try {
      const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

      this.supportedType_ = types.find((type) => window.MediaRecorder.isTypeSupported(type));
      const recorder = new window.MediaRecorder(this.stream_, {
        ...(this.supportedType_ ? { mimeType: this.supportedType_ } : {}),
        videoBitsPerSecond: this.videoBitsPerSec_ || StreamManager.BIT_RATE_30_MBPS,
      });

      this.mediaRecorder_ = recorder;
      recorder.ondataavailable = (event) => {
        if (requestId === this.requestId_ && event.data?.size > 0) {
          this.recordedBlobs_.push(event.data);
        }
      };
      recorder.onstop = () => {
        if (requestId !== this.requestId_ || this.state_ === 'idle') {
          return;
        }
        ++this.requestId_;
        this.canSave_ = this.recordedBlobs_.length > 0;
        this.releaseTracks_();
        this.mediaRecorder_ = null;
        this.setState_('idle');
        if (this.canSave_) {
          this.onStop_();
        } else {
          this.onMinorError_();
        }
      };
      recorder.onerror = () => {
        if (requestId === this.requestId_) {
          this.fail_(new Error(t7e('ScreenRecorder.compatibilityError')));
        }
      };
      recorder.start(100);
      this.setState_('recording');
    } catch (error) {
      this.fail_(error as Error);
    }
  }

  private fail_(error: Error): void {
    ++this.requestId_;
    const recorder = this.mediaRecorder_;

    this.mediaRecorder_ = null;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // Release capture even when the browser recorder has already failed.
      }
    }
    this.canSave_ = false;
    this.releaseTracks_();
    this.setState_('idle');
    StreamManager.handleError(error);
    this.onMinorError_();
  }

  private releaseTracks_(): void {
    if (this.startDelayTimer_) {
      clearTimeout(this.startDelayTimer_);
      this.startDelayTimer_ = null;
    }
    this.stream_?.getTracks().forEach((track) => {
      if (this.trackEnded_) {
        track.removeEventListener('ended', this.trackEnded_);
      }
      track.stop();
    });
    this.stream_ = null;
    this.trackEnded_ = null;
  }

  private setState_(state: RecordingState): void {
    this.state_ = state;
    this.onStateChange_(state);
  }
}
