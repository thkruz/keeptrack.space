import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { KeepTrack } from '@app/keeptrack';
import { t7e } from '@app/locales/keys';
import { getEl } from './get-el';
import { hideLoading, showLoading } from './showLoading';
import { slideInRight, slideOutLeft } from './slide';

interface ColorboxOptions {
  title?: string;
  image?: boolean;
  callback?: () => void;
  /**
   * Toast shown when an image fails to load, e.g. one that names the image's source. The URL is
   * still written to the console warning. Defaults to the generic "Failed to load image: {url}".
   */
  imageErrorMessage?: string;
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
    if (event.target === colorboxHeader || event.target === getEl('colorbox-hint', true)) {
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
      setupImageColorbox_(
        url,
        () => {
          slideInRight(getEl('colorbox-container'), 750);
          hideLoading();
        },
        options.imageErrorMessage
      );
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
    -200
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
    errorManagerInstance.warn(t7e('errorMsgs.Colorbox.containerRootNotFound'));

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
  openButton.setAttribute('aria-label', t7e('colorbox.openInNewTab'));
  openButton.innerHTML = `<i class="material-icons" alt="${t7e('colorbox.openInNewTab')}">open_in_new</i>`;
  openButton.onclick = () => {
    const iframe = <HTMLIFrameElement>getEl('colorbox-iframe');

    if (iframe?.src) {
      openInNewTab_(iframe.src);
    }
  };

  // External pages can refuse to be framed or fail to load, and a cross-origin iframe gives no reliable
  // error event, so external iframes show this hint next to the new-tab control (see setupIframeColorbox_).
  const hint = document.createElement('span');

  hint.id = 'colorbox-hint';
  hint.textContent = t7e('colorbox.blankPageHint');
  hint.style.display = 'none';
  hint.style.alignSelf = 'center';
  hint.style.whiteSpace = 'nowrap';
  hint.style.marginRight = '8px';
  hint.style.fontSize = '0.85rem';
  hint.style.opacity = '0.85';
  headerDiv.appendChild(hint);
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
    errorManagerInstance.warn(t7e('errorMsgs.Colorbox.containerNotFound'));

    return;
  }
  const colorboxIframe = <HTMLIFrameElement>getEl('colorbox-iframe');

  colorboxIframe.style.display = 'block';
  setHintVisible_(isExternalUrl_(url));
  const openButton = getEl('colorbox-open-button', true);

  if (openButton) {
    // An earlier image colorbox may have pointed the button at its image
    openButton.onclick = () => {
      if (colorboxIframe?.src) {
        openInNewTab_(colorboxIframe.src);
      }
    };
  }
  // Catch failures to load
  (<HTMLImageElement>getEl('colorbox-img')).onerror = () => {
    errorManagerInstance.warn(t7e('errorMsgs.Colorbox.loadFailed').replace('{url}', url));
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
const setupImageColorbox_ = (url: string, onLoadCb: () => void, errorMessage?: string) => {
  const colorboxContainerDom = getEl('colorbox-container');

  if (!colorboxContainerDom) {
    errorManagerInstance.warn(t7e('errorMsgs.Colorbox.containerNotFound'));

    return;
  }

  colorboxContainerDom.style.transform = 'translateX(-200%)';
  (<HTMLIFrameElement>getEl('colorbox-iframe')).style.display = 'none';
  setHintVisible_(false);
  const colorboxImage = <HTMLImageElement>getEl('colorbox-img');

  colorboxImage.style.display = 'block';
  colorboxImage.onload = () => {
    onLoadCb();
  };
  // Catch failures to load images
  colorboxImage.onerror = () => {
    if (errorMessage) {
      // The toast names the source; the URL only goes to the console for debugging.
      errorManagerInstance.warn(errorMessage, url);
    } else {
      errorManagerInstance.warn(t7e('errorMsgs.Colorbox.imageLoadFailed').replace('{url}', url));
    }
    closeColorbox();
    hideLoading();
  };
  colorboxImage.src = url;

  const openButton = getEl('colorbox-open-button', true) as HTMLButtonElement;

  if (openButton) {
    openButton.onclick = () => {
      if (colorboxImage?.src) {
        openInNewTab_(colorboxImage.src);
      }
    };
  }
};

/**
 * Opens a colorbox source in a new tab. noopener/noreferrer keep the (often external) page from reaching
 * back into KeepTrack through window.opener (reverse tabnabbing) and from receiving our URL as referrer.
 */
const openInNewTab_ = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/** True when the URL points at another origin than the app (a page KeepTrack does not control). */
const isExternalUrl_ = (url: string): boolean => {
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
};

const setHintVisible_ = (isVisible: boolean): void => {
  const hint = getEl('colorbox-hint', true);

  if (hint) {
    hint.style.display = isVisible ? 'inline' : 'none';
  }
};
