import { keepTrackApi } from '@app/keepTrackApi';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { getEl } from './get-el';
import { showLoading } from './showLoading';
import { slideInRight, slideOutLeft } from './slide';

interface ColorboxOptions {
  image?: boolean;
  callback?: () => void;
}

let isColorBoxReady = false;

export const openColorbox = (url: string, options: ColorboxOptions = {}): void => {
  if (!isColorBoxReady) {
    createColorbox();
  }

  const colorboxDom = getEl('colorbox-div');
  const colorboxHeader = getEl('colorbox-header');

  if (!colorboxDom) {
    return;
  }

  const handleClick = (event: MouseEvent) => {
    if (event.target === colorboxHeader) {
      return;
    }

    closeColorbox();
    if (options.callback) {
      options.callback();
    }
    colorboxDom.removeEventListener('click', handleClick);
  };

  colorboxDom.addEventListener('click', handleClick);

  showLoading(() => {
    colorboxDom.style.display = 'block';
    if (options.image) {
      setupImageColorbox_(url);
    } else {
      setupIframeColorbox_(url);
    }
    slideInRight(getEl('colorbox-container'), 1000);
  }, 2000);
};

export const closeColorbox = (): void => {
  const colorboxDom = getEl('colorbox-div');

  if (!colorboxDom) {
    return;
  }
  if (colorboxDom.style.display !== 'block') {
    return;
  }

  slideOutLeft(
    getEl('colorbox-container'),
    1000,
    () => {
      colorboxDom.style.display = 'none';
    },
    -200,
  );
};

/**
 * Creates the HTML for the colorbox
 */
export const createColorbox = () => {
  const colorboxDiv = document.createElement('div');

  colorboxDiv.id = 'colorbox-div';

  if (!keepTrackApi.containerRoot) {
    errorManagerInstance.warn('Container root not found!');

    return;
  }

  keepTrackApi.containerRoot.appendChild(colorboxDiv);
  const colorboxContainer = document.createElement('div');

  colorboxContainer.id = 'colorbox-container';
  colorboxDiv.appendChild(colorboxContainer);

  const headerDiv = document.createElement('div');

  headerDiv.id = 'colorbox-header';
  const openButton = document.createElement('button');

  openButton.id = 'colorbox-open-button';
  openButton.innerHTML = '<i class="material-icons" alt="Open in new tab">open_in_new</i>';
  openButton.onclick = () => {
    const iframe = <HTMLIFrameElement>getEl('colorbox-iframe');

    if (iframe?.src) {
      window.open(iframe.src, '_blank');
    }
  };
  headerDiv.appendChild(openButton);
  colorboxContainer.appendChild(headerDiv);

  const colorboxIframe = document.createElement('iframe');

  colorboxIframe.id = 'colorbox-iframe';
  colorboxContainer.appendChild(colorboxIframe);

  const img = document.createElement('img');

  img.id = 'colorbox-img';
  img.style.objectFit = 'cover';
  getEl('colorbox-container')?.appendChild(img);
  isColorBoxReady = true;
};

/**
 * Sets the colorbox to display an iframe
 */
const setupIframeColorbox_ = (url: string) => {
  const colorboxContainerDom = getEl('colorbox-container');

  if (!colorboxContainerDom) {
    errorManagerInstance.warn('Colorbox container not found!');

    return;
  }
  (<HTMLIFrameElement>getEl('colorbox-iframe')).style.display = 'block';
  // Catch failures to load
  (<HTMLImageElement>getEl('colorbox-img')).onerror = () => {
    errorManagerInstance.warn(`Failed to load: ${url}`);
    closeColorbox();
  };
  (<HTMLIFrameElement>getEl('colorbox-iframe')).src = url;
  (<HTMLImageElement>getEl('colorbox-img')).style.display = 'none';
};

/**
 * Sets the colorbox to display an image
 */
const setupImageColorbox_ = (url: string) => {
  const colorboxContainerDom = getEl('colorbox-container');

  if (!colorboxContainerDom) {
    errorManagerInstance.warn('Colorbox container not found!');

    return;
  }

  colorboxContainerDom.style.transform = 'translateX(-200%)';
  (<HTMLIFrameElement>getEl('colorbox-iframe')).style.display = 'none';
  (<HTMLImageElement>getEl('colorbox-img')).style.display = 'block';
  // Catch failures to load images
  (<HTMLImageElement>getEl('colorbox-img')).onerror = () => {
    errorManagerInstance.warn(`Failed to load image: ${url}`);
    closeColorbox();
  };
  (<HTMLImageElement>getEl('colorbox-img')).src = url;
};
