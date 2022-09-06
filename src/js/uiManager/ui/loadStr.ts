import { getEl } from '@app/js/lib/helpers';

export const loadStr = (str: string) => {
  const LoaderText = getEl('loader-text');
  if (!LoaderText) return; // If the element is not found, do nothing

  if (str == '') {
    LoaderText.innerHTML = '';
    return;
  }
  if (str == 'math') {
    LoaderText.innerHTML = 'Attempting to Math...';
  }

  switch (str) {
    case 'science':
      LoaderText.innerHTML = 'Locating Science...';
      break;
    case 'science2':
      LoaderText.innerHTML = 'Found Science...';
      break;
    case 'dots':
      LoaderText.innerHTML = 'Drawing Dots in Space...';
      break;
    case 'satIntel':
      LoaderText.innerHTML = 'Integrating Satellite Intel...';
      break;
    case 'radarData':
      LoaderText.innerHTML = 'Importing Radar Data...';
      break;
    case 'painting':
      LoaderText.innerHTML = 'Painting the Earth...';
      break;
    case 'coloring':
      LoaderText.innerHTML = 'Coloring Inside the Lines...';
      break;
    case 'elsets':
      LoaderText.innerHTML = 'Locating ELSETs...';
      break;
    case 'models':
      LoaderText.innerHTML = 'Loading 3D Models...';
      break;
    case 'easterEgg':
      LoaderText.innerHTML = 'Llama Llama Llama Duck!';
  }
};
