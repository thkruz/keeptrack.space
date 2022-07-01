import { getEl } from '@app/js/lib/helpers';

export const loadStr = (str: string) => {
  if (str == '') {
    getEl('loader-text').innerHTML = '';
    return;
  }
  if (str == 'math') {
    getEl('loader-text').innerHTML = 'Attempting to Math...';
  }

  switch (str) {
    case 'science':
      getEl('loader-text').innerHTML = 'Locating Science...';
      break;
    case 'science2':
      getEl('loader-text').innerHTML = 'Found Science...';
      break;
    case 'dots':
      getEl('loader-text').innerHTML = 'Drawing Dots in Space...';
      break;
    case 'satIntel':
      getEl('loader-text').innerHTML = 'Integrating Satellite Intel...';
      break;
    case 'radarData':
      getEl('loader-text').innerHTML = 'Importing Radar Data...';
      break;
    case 'painting':
      getEl('loader-text').innerHTML = 'Painting the Earth...';
      break;
    case 'coloring':
      getEl('loader-text').innerHTML = 'Coloring Inside the Lines...';
      break;
    case 'elsets':
      getEl('loader-text').innerHTML = 'Locating ELSETs...';
      break;
    case 'models':
      getEl('loader-text').innerHTML = 'Loading 3D Models...';
      break;
    case 'easterEgg':
      getEl('loader-text').innerHTML = 'Llama Llama Llama Duck!';
  }
};
