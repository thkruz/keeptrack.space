import recorderPng from '@app/img/icons/video.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { getEl, shake } from '@app/js/lib/helpers';
import { CanvasRecorder } from './canvas-recorder/canvas-recorder';

let recorder: CanvasRecorder;

export const getRecorderObject = (): CanvasRecorder => recorder;

export const uiManagerInit = (): void => {
  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
      <div id="menu-record" class="bmenu-item">
        <img alt="video" src="" delayedsrc="${recorderPng}" />
        <span class="bmenu-title">Record Video</span>
        <div class="status-icon"></div>
      </div>     
      `
  );
};
export const uiManagerOnReady = (): void => {
  try {
    recorder = new CanvasRecorder(settingsManager.videoBitsPerSecond);
  } catch (e) {
    console.warn(e);
  }
};

/* istanbul ignore next */
export const bottomMenuClick = (iconName: string): void => {
  if (iconName === 'menu-record') {
    if (recorder.checkIfRecording()) {
      recorder.stop();
      recorder.save('keeptrack.webm');
      recorder.setIsRecording(false);
      getEl('menu-record').classList.remove('bmenu-item-selected');
      return;
    } else {
      try {
        recorder.start();
      } catch (e) {
        (<any>window.M).toast({
          html: `Compatibility Error with Recording`,
        });
        recorder.setIsRecording(false);
        getEl('menu-record').classList.remove('bmenu-item-selected');
        getEl('menu-record').classList.add('bmenu-item-disabled');
        shake(getEl('menu-record'));
      }
      return;
    }
  }
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'recorderManager',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'uiManagerOnReady',
    cbName: 'recorderManager',
    cb: uiManagerOnReady,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'recordVideo',
    cb: bottomMenuClick,
  });
};
