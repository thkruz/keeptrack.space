import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from './get-el';
import { hideLoading, showLoading } from './showLoading';
import { slideInRight, slideOutLeft } from './slide';
import { KeepTrack } from '@app/keeptrack';

interface ColorboxOptions {
  title?: string;
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
      setupImageColorbox_(url, () => {
        slideInRight(getEl('colorbox-container'), 750);
        hideLoading();
      });
    } else {
      setupIframeColorbox_(url, () => {
        slideInRight(getEl('colorbox-container'), 750);
        hideLoading();
      });
    }
  }, -1);

  if (options.title) {
    setColorboxTitle(options.title);
  }
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
    750,
    () => {
      colorboxDom.style.display = 'none';
    },
    -200,
  );

  clearColorboxTitle();
};

const setColorboxTitle = (title: string): void => {
  const titleSpan = getEl('colorbox-title');

  if (titleSpan) {
    titleSpan.textContent = title;
  }
};

const clearColorboxTitle = (): void => {
  const titleSpan = getEl('colorbox-title', true);

  if (titleSpan) {
    titleSpan.textContent = '';
  }
};

/**
 * Creates the HTML for the colorbox
 */
export const createColorbox = () => {
  const colorboxDiv = document.createElement('div');

  colorboxDiv.id = 'colorbox-div';

  if (!KeepTrack.getInstance().containerRoot) {
    errorManagerInstance.warn('Container root not found!');

    return;
  }

  KeepTrack.getInstance().containerRoot.appendChild(colorboxDiv);
  const colorboxContainer = document.createElement('div');

  colorboxContainer.id = 'colorbox-container';
  colorboxDiv.appendChild(colorboxContainer);

  const headerDiv = document.createElement('div');

  headerDiv.id = 'colorbox-header';

  // Add title element
  const titleSpan = document.createElement('span');

  titleSpan.id = 'colorbox-title';
  titleSpan.textContent = '';
  headerDiv.appendChild(titleSpan);

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
const setupIframeColorbox_ = (url: string, onLoadCb: () => void) => {
  const colorboxContainerDom = getEl('colorbox-container');

  if (!colorboxContainerDom) {
    errorManagerInstance.warn('Colorbox container not found!');

    return;
  }
  const colorboxIframe = <HTMLIFrameElement>getEl('colorbox-iframe');

  colorboxIframe.style.display = 'block';
  // Catch failures to load
  (<HTMLImageElement>getEl('colorbox-img')).onerror = () => {
    errorManagerInstance.warn(`Failed to load: ${url}`);
    closeColorbox();
    hideLoading();
  };
  colorboxIframe.src = url;
  colorboxIframe.onload = () => {
    onLoadCb();
  };

  (<HTMLImageElement>getEl('colorbox-img')).style.display = 'none';
};

/**
 * Sets the colorbox to display an image
 */
const setupImageColorbox_ = (url: string, onLoadCb: () => void) => {
  const colorboxContainerDom = getEl('colorbox-container');

  if (!colorboxContainerDom) {
    errorManagerInstance.warn('Colorbox container not found!');

    return;
  }

  colorboxContainerDom.style.transform = 'translateX(-200%)';
  (<HTMLIFrameElement>getEl('colorbox-iframe')).style.display = 'none';
  const colorboxImage = <HTMLImageElement>getEl('colorbox-img');

  colorboxImage.style.display = 'block';
  colorboxImage.onload = () => {
    onLoadCb();
  };
  // Catch failures to load images
  colorboxImage.onerror = () => {
    errorManagerInstance.warn(`Failed to load image: ${url}`);
    closeColorbox();
    hideLoading();
  };
  colorboxImage.src = url;

  const openButton = getEl('colorbox-open-button', true) as HTMLButtonElement;

  if (openButton) {
    openButton.onclick = () => {
      if (colorboxImage?.src) {
        window.open(colorboxImage.src, '_blank');
      }
    };
  }
};
