import { keepTrackApi } from '@app/js/api/keepTrackApi';
import $ from 'jquery';

export const init = (): void => {
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'classification',
    cb: setClassificationBanner,
  });
};

export const setClassificationBanner = (): void => {
  if (settingsManager.classificationStr !== '') {
    (<any>$('#main-container')).prepend(keepTrackApi.html`
    <div id="classification-container">
      <span>${settingsManager.classificationStr}</span>
    </div>        
  `);

    let topMenuHeight = parseInt(document.documentElement.style.getPropertyValue('--top-menu-height').replace('px', ''));
    if (isNaN(topMenuHeight)) topMenuHeight = 0;
    document.documentElement.style.setProperty('--top-menu-height', topMenuHeight + 20 + 'px');
    const classificationContainerDOM = $('#classification-container');

    if (settingsManager.classificationStr.slice(0, 12) === 'Unclassified') {
      classificationContainerDOM.css({ 'background-color': 'var(--classificationUnclassifiedBackgroundColor)', 'color': 'white' });
    }
    if (settingsManager.classificationStr.slice(0, 6) === 'Secret') {
      classificationContainerDOM.css({ 'background-color': 'var(--classificationSecretBackgroundColor)', 'color': 'white' });
    }
    if (settingsManager.classificationStr.slice(0, 10) === 'Top Secret') {
      classificationContainerDOM.css({ 'background-color': 'var(--classificationTopSecretBackgroundColor)', 'color': 'black' });
    }
    if (settingsManager.classificationStr.slice(0, 15) === 'Top Secret//SCI') {
      classificationContainerDOM.css({ 'background-color': 'var(--classificationTopSecretSCIBackgroundColor)', 'color': 'black' });
    }
  }
};
