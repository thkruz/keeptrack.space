import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { KeepTrack } from '@app/keeptrack';
import { injectWebmDuration } from './webm-duration';

export interface MediaRecorderOptions {
  audio: boolean;
  video: { cursor: string };
}

const DEFAULT_DISPLAY_MEDIA_OPTIONS: MediaRecorderOptions = { video: { cursor: 'never' }, audio: false };

export type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopping';

/**
 * Outcomes the plugin turns into localized toasts. The manager never shows browser
 * error text itself; the raw message only reaches the debug log.
 * - cancelled: the user cancelled the share picker or a pending request
 * - tooShort: capture ended before any video data was recorded, so nothing was saved
 * - notReadable: the browser could not read the chosen surface (OS or another app blocked it)
 * - failed: any other failure
 */
export type RecordingNotice = 'cancelled' | 'tooShort' | 'notReadable' | 'failed';

/** Who asked the recording to stop: the user (KeepTrack UI) or the browser (Stop Sharing ended a track). */
export type StopReason = 'user' | 'ended';

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
  /** Bytes of the first chunk (EBML header + Segment Info), read eagerly so save() can stay synchronous. */
  private headBytes_: Uint8Array | null = null;
  private recordStartMs_ = 0;
  private recordedDurationMs_ = 0;

  constructor(
    private readonly videoBitsPerSec_: number,
    private readonly onStop_: () => void,
    private readonly onMinorError_: () => void,
    private readonly onError_: () => void,
    private readonly onStateChange_: (state: RecordingState) => void = () => undefined,
    private readonly onNotice_: (notice: RecordingNotice) => void = () => undefined
  ) {}

  get state(): RecordingState {
    return this.state_;
  }

  get isVideoRecording(): boolean {
    return this.state_ === 'recording';
  }

  /** Maps a capture or recorder error to the notice the user sees. */
  static classifyError(error: unknown): RecordingNotice {
    const name = (error as { name?: unknown } | null)?.name;

    // Chromium rejects a cancelled picker with NotAllowedError ("Permission denied"); Firefox may use AbortError.
    if (name === 'NotAllowedError' || name === 'AbortError') {
      return 'cancelled';
    }
    if (name === 'NotReadableError') {
      return 'notReadable';
    }

    return 'failed';
  }

  getStream(displayMediaOptions: MediaRecorderOptions = DEFAULT_DISPLAY_MEDIA_OPTIONS): Promise<MediaStream> | false {
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
    this.headBytes_ = null;
    this.recordedDurationMs_ = 0;
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
          this.trackEnded_ = () => this.stop('ended');
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

  /**
   * Stops a pending request or an active recording. A user stop during `requesting`
   * cancels; a browser Stop Sharing before recording began means nothing was recorded.
   */
  stop(reason: StopReason = 'user'): void {
    if (this.state_ === 'idle' || this.state_ === 'stopping') {
      return;
    }
    if (this.state_ === 'requesting') {
      ++this.requestId_;
      this.releaseTracks_();
      this.setState_('idle');
      this.onMinorError_();
      this.onNotice_(reason === 'ended' ? 'tooShort' : 'cancelled');

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

  /** Downloads the finished recording. Returns false when there is nothing (left) to save. */
  save(fileName: string): boolean {
    if (!this.canSave_ || this.state_ !== 'idle') {
      return false;
    }
    this.canSave_ = false;
    const blob = new Blob(this.blobPartsWithDuration_(), { type: this.supportedType_ });
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

    return true;
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
          if (this.recordedBlobs_.length === 1) {
            this.readHead_(event.data, requestId);
          }
        }
      };
      recorder.onstop = () => {
        if (requestId !== this.requestId_ || this.state_ === 'idle') {
          return;
        }
        ++this.requestId_;
        this.recordedDurationMs_ = performance.now() - this.recordStartMs_;
        this.canSave_ = this.recordedBlobs_.length > 0;
        this.releaseTracks_();
        this.mediaRecorder_ = null;
        this.setState_('idle');
        if (this.canSave_) {
          this.onStop_();
        } else {
          this.onMinorError_();
          this.onNotice_('tooShort');
        }
      };
      recorder.onerror = () => {
        if (requestId === this.requestId_) {
          this.fail_(new Error('MediaRecorder error event'));
        }
      };
      recorder.start(100);
      this.recordStartMs_ = performance.now();
      this.setState_('recording');
    } catch (error) {
      this.fail_(error as Error);
    }
  }

  /** Cache the first chunk's bytes; MediaRecorder writes the whole WebM header into it. */
  private readHead_(chunk: Blob, requestId: number): void {
    if (typeof chunk.arrayBuffer !== 'function') {
      return;
    }
    chunk
      .arrayBuffer()
      .then((buffer) => {
        if (requestId === this.requestId_ || (this.canSave_ && this.recordedBlobs_[0] === chunk)) {
          this.headBytes_ = new Uint8Array(buffer);
        }
      })
      .catch(() => {
        // Without the head the file is still saved, just without a duration.
      });
  }

  /**
   * MediaRecorder WebM carries no Duration, so players cannot seek. Patch the first chunk when
   * its bytes are available; otherwise (or when the head is not patchable) save the original parts.
   */
  private blobPartsWithDuration_(): BlobPart[] {
    const head = this.headBytes_;

    if (!head || this.recordedBlobs_.length === 0 || head.length !== this.recordedBlobs_[0].size) {
      return this.recordedBlobs_;
    }
    const patched = injectWebmDuration(head, this.recordedDurationMs_);

    return patched ? [patched as Uint8Array<ArrayBuffer>, ...this.recordedBlobs_.slice(1)] : this.recordedBlobs_;
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
    // Browser text is English-only and often technical: keep it in the log, show a localized notice.
    errorManagerInstance.debug(`ScreenRecorder: ${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`);
    this.onMinorError_();
    this.onNotice_(StreamManager.classifyError(error));
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
