import { MediaRecorderOptions } from '@app/js/interfaces';
import { errorManagerInstance } from '@app/js/singletons/errorManager';

export class StreamManager {
  static readonly BIT_RATE_30_MBPS = 30000000;
  static readonly BIT_RATE_20_MBPS = 20000000;
  static readonly BIT_RATE_10_MBPS = 10000000;
  static readonly BIT_RATE_5_MBPS = 5000000;
  static readonly BIT_RATE_2_MBPS = 2000000;
  static readonly BIT_RATE_1_MBPS = 1000000;

  private mediaRecorder_: MediaRecorder = null;
  private recordedBlobs = [];
  private supportedType = <string>null;
  private videoBitsPerSec_ = null;

  public isVideoRecording = false;
  private stream_: MediaStream;
  private onError_: () => void;
  private onMinorError_: () => void;
  private onStop_: () => void;

  constructor(videoBitsPerSec: number, onStop: () => void, onMinorError: () => void, onError: () => void) {
    this.videoBitsPerSec_ = videoBitsPerSec;
    this.onStop_ = onStop;
    this.onMinorError_ = onMinorError;
    this.onError_ = onError;
  }

  static handleError(error: Error): void {
    if (error.message.includes('Permission denied')) {
      errorManagerInstance.warn('Permission denied! Did you click "Share"?');
    } else {
      errorManagerInstance.warn('Error:' + error);
    }
  }

  async getStream(displayMediaOptions?: MediaRecorderOptions) {
    displayMediaOptions ??= {
      video: {
        cursor: 'never',
      },
      audio: false,
    };

    if (window.location.protocol === 'https:' || settingsManager.offline) {
      if ('getDisplayMedia' in navigator) {
        return (navigator as any).getDisplayMedia(displayMediaOptions).catch((err: Error) => {
          StreamManager.handleError(err);
          return null;
        });
      } else if ('getDisplayMedia' in navigator.mediaDevices) {
        return navigator.mediaDevices.getDisplayMedia(displayMediaOptions as any).catch((err) => {
          StreamManager.handleError(err);
          return null;
        });
      } else {
        errorManagerInstance.warn('Compatibility Error with Recording');
        this.onError_();
        return false;
      }
    } else {
      errorManagerInstance.warn('No Recording Support in Http! Try Https!');
      this.onError_();
      return false;
    }
  }

  handleDataAvailable(event: BlobEvent): void {
    if (event.data && event.data.size > 0) {
      this.recordedBlobs.push(event.data);
    }
  }

  stop(): void {
    if (!this.mediaRecorder_) throw new Error('MediaRecorder is not initialized');
    if (this.isVideoRecording == false) return; // Already stopped

    errorManagerInstance.debug('Recorder stopped.');

    // Stop all streaming
    this.stream_.getTracks().forEach((track) => track.stop());

    this.mediaRecorder_.stop();
    this.isVideoRecording = false;

    this.onStop_();
  }

  save(fileName: string): void {
    const name = fileName;
    const blob = new Blob(this.recordedBlobs, { type: this.supportedType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  start(): void {
    this.getStream()
      .then((steam) => {
        if (steam == false) return;
        this.isVideoRecording = true;
        this.stream_ = steam;
        let types = ['video/webm', 'video/webm,codecs=vp9', 'video/vp8', 'video/webm;codecs=vp8', 'video/webm;codecs=daala', 'video/webm;codecs=h264', 'video/mpeg'];

        for (let i in types) {
          if (window.MediaRecorder.isTypeSupported(types[i])) {
            this.supportedType = types[i];
            break;
          }
        }
        if (this.supportedType == null) {
          errorManagerInstance.debug('No supported type found for MediaRecorder');
        }
        let options = {
          mimeType: this.supportedType,
          videoBitsPerSecond: this.videoBitsPerSec_ || StreamManager.BIT_RATE_30_MBPS,
        };

        this.recordedBlobs = [];
        try {
          this.mediaRecorder_ = new window.MediaRecorder(this.stream_, options);
        } catch (e) {
          this.onMinorError_();
          this.isVideoRecording = false;
          return;
        }

        errorManagerInstance.debug(`Created MediaRecorder ${this.mediaRecorder_} with options ${options}`);
        this.mediaRecorder_.onstop = this.stop.bind(this);
        this.mediaRecorder_.ondataavailable = this.handleDataAvailable.bind(this);
        this.mediaRecorder_.start(100); // collect 100ms of data blobs
        errorManagerInstance.debug(`Created MediaRecorder ${this.mediaRecorder_}`);
      })
      .catch(() => {
        // errorManagerInstance.warn('Error:' + err);
      });
  }
}
