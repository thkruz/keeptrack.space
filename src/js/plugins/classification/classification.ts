import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  const { settingsManager } = keepTrackApi.programs;
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'classification',
    cb: () => {
      if (settingsManager.classificationStr !== '') {
        (<any>$('#main-container')).prepend(keepTrackApi.html`
        <div id="classification-container">
          <span>${settingsManager.classificationStr}</span>
        </div>        
      `);

        let topMenuHeight = parseInt(document.documentElement.style.getPropertyValue('--top-menu-height').replace('px', ''));
        if (isNaN(topMenuHeight)) topMenuHeight = 0;
        document.documentElement.style.setProperty('--top-menu-height', topMenuHeight + 20 + 'px');

        if (settingsManager.classificationStr.slice(0, 12) === 'Unclassified') {
          $('#classification-container').css({ 'background-color': 'var(--classificationUnclassifiedBackgroundColor)', 'color': 'white' });
        }
        if (settingsManager.classificationStr.slice(0, 6) === 'Secret') {
          $('#classification-container').css({ 'background-color': 'var(--classificationSecretBackgroundColor)', 'color': 'white' });
        }
        if (settingsManager.classificationStr.slice(0, 10) === 'Top Secret') {
          $('#classification-container').css({ 'background-color': 'var(--classificationTopSecretBackgroundColor)', 'color': 'black' });
        }
        if (settingsManager.classificationStr.slice(0, 15) === 'Top Secret//SCI') {
          $('#classification-container').css({ 'background-color': 'var(--classificationTopSecretSCIBackgroundColor)', 'color': 'black' });
        }
      }
    },
  });
};
