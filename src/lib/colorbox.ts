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

  const handleClick = () => {
    closeColorbox();
    if (options.callback) options.callback();
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
    slideInRight(getEl('colorbox-container'), 1000, null);
  }, 2000);
};

export const closeColorbox = (): void => {
  const colorboxDom = getEl('colorbox-div');

  if (!colorboxDom) return;
  if (colorboxDom.style.display !== 'block') return;

  slideOutLeft(
    getEl('colorbox-container'),
    1000,
    () => {
      colorboxDom.style.display = 'none';
    },
    -200
  );
};

/**
 * Creates the HTML for the colorbox
 */
export const createColorbox = () => {
  const colorboxDiv = document.createElement('div');
  colorboxDiv.id = 'colorbox-div';
  document.body.appendChild(colorboxDiv);
  const colorboxContainer = document.createElement('div');
  colorboxContainer.id = 'colorbox-container';
  colorboxDiv.appendChild(colorboxContainer);
  const colorboxIframe = document.createElement('iframe');
  colorboxIframe.id = 'colorbox-iframe';
  colorboxContainer.appendChild(colorboxIframe);
  const img = document.createElement('img');
  img.id = 'colorbox-img';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  getEl('colorbox-container').appendChild(img);
  isColorBoxReady = true;
};

/**
 * Sets the colorbox to display an iframe
 */
const setupIframeColorbox_ = (url: string) => {
  getEl('colorbox-container').style.width = '100%';
  (<HTMLIFrameElement>getEl('colorbox-iframe')).style.display = 'block';
  (<HTMLIFrameElement>getEl('colorbox-iframe')).src = url;
  (<HTMLImageElement>getEl('colorbox-img')).style.display = 'none';
};

/**
 * Sets the colorbox to display an image
 */
const setupImageColorbox_ = (url: string) => {
  getEl('colorbox-container').style.width = '45%';
  getEl('colorbox-container').style.transform = 'translateX(-200%)';
  (<HTMLIFrameElement>getEl('colorbox-iframe')).style.display = 'none';
  (<HTMLImageElement>getEl('colorbox-img')).style.display = 'block';
  (<HTMLImageElement>getEl('colorbox-img')).src = url;
};
