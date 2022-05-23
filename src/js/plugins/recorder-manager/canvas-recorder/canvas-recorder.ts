// @ts-nocheck

import { getEl, shake } from '@app/js/lib/helpers';
import { MediaRecorderOptions } from '@app/types/types';

export class CanvasRecorder {
  isVideoRecording: boolean;
  start: any;
  stop: any;
  save: any;

  static isVideoRecording = false;

  constructor(videoBitsPerSec: number) {
    let recordedBlobs = [];
    let supportedType = null;
    let mediaRecorder = null;

    const video = document.createElement('video');
    video.style.display = 'none';

    const startCapture = (displayMediaOptions?: MediaRecorderOptions) => {
      displayMediaOptions ??= {
        video: {
          cursor: 'never',
        },
        audio: false,
      };

      /* istanbul ignore next */
      if (window.location.protocol === 'https:' || settingsManager.offline) {
        if ('getDisplayMedia' in navigator) {
          return (<any>navigator).getDisplayMedia(displayMediaOptions).catch((err) => {
            console.warn('Error:' + err);
            return null;
          });
        } else if ('getDisplayMedia' in navigator.mediaDevices) {
          return (<any>navigator).mediaDevices.getDisplayMedia(displayMediaOptions).catch((err) => {
            console.warn('Error:' + err);
            return null;
          });
        } else {
          console.debug('No Recording Support');
          CanvasRecorder.isVideoRecording = false;
          getEl('menu-record').classList.remove('bmenu-item-selected');
          getEl('menu-record').classList.add('bmenu-item-disabled');
          M.toast({
            html: `Compatibility Error with Recording`,
          });
          shake(getEl('menu-record'));
          return false;
        }
      } else {
        console.debug('No Recording Support in Http! Try Https!');
        CanvasRecorder.isVideoRecording = false;
        getEl('menu-record').classList.remove('bmenu-item-selected');
        getEl('menu-record').classList.add('bmenu-item-disabled');
        M.toast({
          html: `Recording Only Available with HTTPS`,
        });
        shake(getEl('menu-record'));
        return false;
      }
    };

    const startRecording = (): void => {
      let selectCapture = Promise.resolve(startCapture());
      /* istanbul ignore next */
      selectCapture
        .then(function beginRecording(srcObject) {
          if (srcObject == false) return;
          CanvasRecorder.isVideoRecording = true;
          getEl('menu-record').classList.add('bmenu-item-selected');
          let stream = srcObject;
          video.srcObject = <any>srcObject;
          let types = ['video/webm', 'video/webm,codecs=vp9', 'video/vp8', 'video/webm;codecs=vp8', 'video/webm;codecs=daala', 'video/webm;codecs=h264', 'video/mpeg'];

          for (let i in types) {
            if (window.MediaRecorder.isTypeSupported(types[i])) {
              supportedType = types[i];
              break;
            }
          }
          if (supportedType == null) {
            console.log('No supported type found for MediaRecorder');
          }
          let options = {
            mimeType: supportedType,
            videoBitsPerSecond: videoBitsPerSec || 30000000, // 30.0Mbps
            // videoBitsPerSecond: videoBitsPerSec || 10000000, // 10.0Mbps
            // videoBitsPerSecond: videoBitsPerSec || 5000000 // 5.0Mbps
            // videoBitsPerSecond: videoBitsPerSec || 2500000 // 2.5Mbps
          };

          recordedBlobs = [];
          try {
            mediaRecorder = new window.MediaRecorder(stream, options);
          } catch (e) {
            CanvasRecorder.isVideoRecording = false;
            getEl('menu-record').classList.remove('bmenu-item-selected');
            console.warn('Exception while creating MediaRecorder:', e);
            return;
          }

          console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
          mediaRecorder.onstop = handleStop;
          mediaRecorder.ondataavailable = handleDataAvailable;
          mediaRecorder.start(100); // collect 100ms of data blobs
          console.log('MediaRecorder started', mediaRecorder);
        })
        .catch((err) => {
          console.debug('Error:' + err);
        });
    };

    /* istanbul ignore next */
    const handleDataAvailable = (event): void => {
      if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
      }
    };

    /* istanbul ignore next */
    const handleStop = (event): void => {
      console.log('Recorder stopped: ', event);
      const superBuffer = new Blob(recordedBlobs, { type: supportedType });
      video.src = window.URL.createObjectURL(superBuffer);
    };

    const stopRecording = (): void => {
      if (!mediaRecorder) throw new Error('MediaRecorder is not initialized');
      mediaRecorder.stop();
      video.controls = true;
    };

    const save = (fileName: string): void => {
      const name = fileName || 'recording.webm';
      const blob = new Blob(recordedBlobs, { type: supportedType });
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
    };

    // These have to be at the bottom of the constructor
    this.isVideoRecording = false;
    this.start = startRecording;
    this.stop = stopRecording;
    this.save = save;
  }

  checkIfRecording = (): boolean => this.isVideoRecording;

  setIsRecording = (bool: boolean): void => {
    this.isVideoRecording = bool;
  };
}
