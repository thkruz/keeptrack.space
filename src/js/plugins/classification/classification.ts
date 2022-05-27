import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { getEl } from '@app/js/lib/helpers';

export const init = (): void => {
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'classification',
    cb: setClassificationBanner,
  });
};

export const setClassificationBanner = (): void => {
  if (settingsManager.classificationStr !== '') {
    getEl('main-container').insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
    <div id="classification-container">
      <span>${settingsManager.classificationStr}</span>
    </div>        
  `
    );

    let topMenuHeight = parseInt(document.documentElement.style.getPropertyValue('--top-menu-height').replace('px', ''));
    if (isNaN(topMenuHeight)) topMenuHeight = 0;
    document.documentElement.style.setProperty('--top-menu-height', topMenuHeight + 20 + 'px');

    if (settingsManager.classificationStr.slice(0, 12) === 'Unclassified') {
      getEl('classification-container').style.backgroundColor = 'var(--classificationUnclassifiedBackgroundColor)';
      getEl('classification-container').style.color = 'white';
    }
    if (settingsManager.classificationStr.slice(0, 6) === 'Secret') {
      getEl('classification-container').style.backgroundColor = 'var(--classificationSecretBackgroundColor)';
      getEl('classification-container').style.color = 'white';
    }
    if (settingsManager.classificationStr.slice(0, 10) === 'Top Secret') {
      getEl('classification-container').style.backgroundColor = 'var(--classificationTopSecretBackgroundColor)';
      getEl('classification-container').style.color = 'white';
    }
    if (settingsManager.classificationStr.slice(0, 15) === 'Top Secret//SCI') {
      getEl('classification-container').style.backgroundColor = 'var(--classificationTopSecretSCIBackgroundColor)';
      getEl('classification-container').style.color = 'white';
    }
  }
};
