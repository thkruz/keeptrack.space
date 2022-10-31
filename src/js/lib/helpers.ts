import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { createError } from '@app/js/errorManager/errorManager';
import { saveAs } from 'file-saver';
import { isThisJest } from './../api/keepTrackApi';

export { saveAs };

export const getUnique = (arr: Array<any>): Array<any> => [...new Set(arr)];

export const stringPad = {
  pad: (val: string, len?: number): string => {
    val = String(val);
    len ??= 2;
    while (val.length < len) val = '0' + val;
    return val;
  },
  padEmpty: (num: string, size: number): string => {
    const s = '   ' + num;
    return s.substr(s.length - size);
  },
  pad0: (str: string, max: number): string => (str.length < max ? stringPad.pad0('0' + str, max) : str),
  trail0: (str: string, max: number): string => (str.length < max ? stringPad.trail0(str + '0', max) : str),
};

export const saveVariable = (variable: any, filename?: string): void => {
  try {
    filename ??= 'variable.txt';
    variable = JSON.stringify(variable);
    const blob = new Blob([variable], { type: 'text/plain;charset=utf-8' });
    if (!saveAs) throw new Error('saveAs is unavailable!');
    saveAs(blob, filename);
  } catch (e) {
    createError(e, 'saveVariable');
  }
};

export const getEl = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (el) return el;
  if (isThisJest()) {
    // Create an empty DIV and send that back
    // TODO - This is a hack. Tests should provide the right environment.
    const _el = document.createElement('div');
    _el.id = id;
    document.body.appendChild(_el);
    return <HTMLElement>(<unknown>_el);
  }

  // Return an empty div to avoid errors
  return settingsManager.isUseNullForBadGetEl ? null : <HTMLElement>(<unknown>document.createElement('div'));
  // DEBUG: Use this code for finding bad requests
  // throw new Error(`Element with id ${id} not found!`);
};

export const waitForCruncher = (cruncher: Worker, cb: () => void, validationFunc: (data: any) => boolean): void => {
  cruncher.addEventListener(
    'message',
    (m) => {
      if (validationFunc(m.data)) {
        cb();
      } else {
        cruncher.addEventListener(
          'message',
          (m) => {
            if (validationFunc(m.data)) {
              cb();
            } else {
              console.error('Cruncher failed to meet requirement after two tries!');
            }
          },
          { once: true }
        );
      }
    },
    { once: true }
  );
};

export const triggerSubmit = (el: HTMLFormElement): void => {
  const event = new CustomEvent('submit', { cancelable: true });
  el.dispatchEvent(event);
};

export const getClass = (id: string): HTMLElement[] => {
  const els = <HTMLElement[]>Array.from(document.getElementsByClassName(id));
  if (els.length) return els;
  if (isThisJest()) {
    // Create an empty DIV and send that back
    // TODO - This is a hack. Tests should provide the right environment.
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
    return [<HTMLElement>(<unknown>el)];
  }
  return [];
  // DEBUG: Use this code for finding bad requests
  // throw new Error(`Element with class ${id} not found!`);
};

export const saveCsv = (items: Array<any>, name?: string): void => {
  try {
    const replacer: any = (value: never) => (value === null ? '' : value); // specify how you want to handle null values here
    const header = Object.keys(items[0]);
    let csv: string | string[] = items.map((row: any) => header.map((fieldName: string) => JSON.stringify(replacer(row[fieldName]))).join(','));
    csv.unshift(header.join(','));
    csv = csv.join('\r\n');

    const blob = new Blob([csv], { type: 'text/plain;charset=utf-8' });
    if (!saveAs) throw new Error('saveAs is unavailable!');
    name ??= 'data';
    saveAs(blob, `${name}.csv`);
  } catch (error) {
    // Intentionally Left Blank
  }
};

type rgbaType = [string | number, string | number, string | number, string | number];
export const parseRgba = (str: string): [number, number, number, number] => {
  // eslint-disable-next-line no-useless-escape
  let [r, g, b, a]: rgbaType = <rgbaType>str.match(/[\d\.]+/gu);
  r = parseInt(<string>r) / 255;
  g = parseInt(<string>g) / 255;
  b = parseInt(<string>b) / 255;
  a = parseFloat(<string>a);
  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
    return [1, 1, 1, 1];
  } else {
    return [r, g, b, a];
  }
};

export const hex2RgbA = (hex: string): rgbaType => {
  // eslint-disable-next-line prefer-named-capture-group
  if (/^#([A-Fa-f0-9]{3}){1,2}$/u.test(hex)) {
    let c: string[] | string = hex.substring(1).split('');
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    const r = ((parseInt(c) >> 16) & 255) / 255;
    const g = ((parseInt(c) >> 8) & 255) / 255;
    const b = (parseInt(c) & 255) / 255;
    return [r, g, b, 1];
  } else {
    return [1, 1, 1, 1];
  }
};

export const rgbCss = (values: [number, number, number, number]): string => `rgba(${values[0] * 255},${values[1] * 255},${values[2] * 255},${values[3]})`;

/**
 *
 * @param {string} str Input string
 * @param {number} num Maximum length of the string
 * @returns {string} Trunicated string
 */
export const truncateString = (str: string, num: number): string => {
  if (typeof str == 'undefined') return 'Unknown';

  // If the length of str is less than or equal to num
  // just return str--don't truncate it.
  if (str.length <= num) {
    return str;
  }
  // Return str truncated with '...' concatenated to the end of str.
  return str.slice(0, num) + '...';
};

export const slideOutLeft = (el: HTMLElement, duration: number, callback?: () => void, offset?: number): void => {
  // Avoid errors for now
  // TODO: Throw an error here
  if (el === null) return;

  if (el.style.display === 'none') return;
  el.style.transition = `transform ${duration / 1e3}s ease-in-out`;
  el.style.transform = `translateX(${offset || -100}%)`;
  setTimeout(() => {
    if (callback) callback();
  }, duration);
};

export const slideInRight = (el: HTMLElement, duration: number, callback?: () => void): void => {
  // Avoid errors for now
  // TODO: Throw an error here
  if (el === null) return;

  // Start off the screen
  el.style.display = 'block';
  el.style.transform = `translateX(-100%)`;
  el.style.transition = `transform 0s ease-in-out`;
  setTimeout(() => {
    el.style.display = 'block';
    el.style.transition = `transform ${duration / 1e3}s ease-in-out`;
    el.style.transform = 'translateX(0)';
  }, 50);
  setTimeout(() => {
    if (callback) callback();
  }, duration);
};

export const slideOutUp = (el: HTMLElement, duration: number, callback?: () => void): void => {
  // Avoid errors for now
  // TODO: Throw an error here
  if (el === null) return;

  if (el.style.display === 'none') return;
  el.style.transition = `transform ${duration / 1e3}s ease-in-out`;
  el.style.transform = `translateY(${-100}%)`;
  setTimeout(() => {
    if (callback) callback();
  }, duration);
};

export const slideInDown = (el: HTMLElement, duration: number, callback?: () => void): void => {
  // Avoid errors for now
  // TODO: Throw an error here
  if (el === null) return;

  el.style.transform = `translateY(-100%)`;
  el.style.transition = `transform 0s ease-in-out`;
  el.style.display = 'block';
  setTimeout(() => {
    el.style.display = 'block';
    el.style.transition = `transform ${duration / 1e3}s ease-in-out`;
    el.style.transform = 'translateY(0)';
    if (callback) callback();
  }, 50);
};

export const showLoading = (callback?: () => void, delay?: number): void => {
  const loading = document.getElementById('loading-screen');
  fadeIn(loading, 'flex', 500);
  setTimeout(() => {
    if (callback) callback();
    fadeOut(loading, 500);
  }, delay || 100);
};

export const showLoadingSticky = (): void => {
  const loading = document.getElementById('loading-screen');
  fadeIn(loading, 'flex', 500);
};

export const hideLoading = () => {
  const loading = document.getElementById('loading-screen');
  fadeOut(loading, 500);
};

export const fadeIn = (el: HTMLElement, type?: string, duration?: number, callback?: () => void): void => {
  // Avoid errors for now
  // TODO: Throw an error here
  if (el === null) return;

  type ??= 'block';
  if (el.style.display === type) return;
  duration = duration ?? 1000;
  el.style.transition = `all ${duration / 1e3}s ease-in-out`;
  el.style.display = type;
  setTimeout(() => {
    if (callback) callback();
  }, duration);
};

export const fadeOut = (el: HTMLElement, duration?: number, callback?: () => void): void => {
  // Avoid errors for now
  // TODO: Throw an error here
  if (el === null) return;

  if (el.style.display === 'none') return;
  duration = duration ?? 1000;
  el.style.transition = `all ${duration / 1e3}s ease-in-out`;
  el.style.display = 'none';
  setTimeout(() => {
    if (callback) callback();
  }, duration);
};

interface clickDragOptions {
  minWidth?: number;
  maxWidth?: number;
}

export const clickAndDragWidth = (el: HTMLElement, options: clickDragOptions = {}): void => {
  const minWidth = options.minWidth || 280;
  const maxWidth = options.maxWidth || 450;

  let lastUpdate = Date.now();

  let startX: number;
  let startWidth: number;
  let width: number;
  settingsManager.isDragging = false;

  // create new element on right edge
  const edgeEl = document.createElement('div');
  edgeEl.style.position = 'relative';
  edgeEl.style.height = '100%';
  edgeEl.style.width = '8px';
  edgeEl.style.right = '0px';
  edgeEl.style.cursor = 'w-resize';
  edgeEl.style.zIndex = '9999';
  edgeEl.style.marginLeft = 'auto';
  el.appendChild(edgeEl);

  edgeEl.addEventListener('mousedown', (e: MouseEvent) => {
    Object.assign(edgeEl.style, {
      width: '100vw',
      height: '100vh',
      position: 'fixed',
    } as CSSStyleDeclaration);
    edgeEl.style.right = '';

    startX = e.clientX;
    startWidth = el.clientWidth;
    settingsManager.isDragging = true;
  });
  edgeEl.addEventListener('mouseup', () => {
    settingsManager.isDragging = false;
    Object.assign(edgeEl.style, {
      height: '100%',
      width: '8px',
      right: '0px',
      position: 'absolute',
    } as CSSStyleDeclaration);
  });
  edgeEl.addEventListener('mousemove', (e: MouseEvent) => {
    // This can crush FPS so let's put a limit on it
    if (settingsManager.isDragging && lastUpdate + keepTrackApi.programs.drawManager.dt < Date.now()) {
      width = startWidth + e.clientX - startX;
      width = width < minWidth ? minWidth : width;
      width = width > maxWidth ? maxWidth : width;
      el.style.width = `${width}px`;
      lastUpdate = Date.now();
    }
  });
};

export const clickAndDragHeight = (el: HTMLElement, maxHeight?: number, callback?: () => void): void => {
  let lastUpdate = Date.now();
  let startY: number;
  let startHeight: number;
  let height: number;
  settingsManager.isDragging = false;

  // create new element on right edge
  const edgeEl = document.createElement('div');
  edgeEl.style.position = 'absolute';
  edgeEl.style.width = '100%';
  edgeEl.style.height = '8px';
  edgeEl.style.top = '0px';
  edgeEl.style.cursor = 'n-resize';
  edgeEl.style.zIndex = '9999';
  edgeEl.style.marginBottom = 'auto';
  edgeEl.style.marginLeft = 'auto';
  edgeEl.style.marginRight = 'auto';
  el.appendChild(edgeEl);

  edgeEl.addEventListener('mousedown', (e: MouseEvent) => {
    Object.assign(edgeEl.style, {
      width: '100vw',
      height: '100vh',
      position: 'fixed',
    } as CSSStyleDeclaration);

    startY = e.clientY;
    startHeight = el.clientHeight;
    settingsManager.isDragging = true;
  });
  edgeEl.addEventListener('mouseup', () => {
    settingsManager.isDragging = false;
    Object.assign(edgeEl.style, {
      width: '100%',
      height: '8px',
      position: 'absolute',
    } as CSSStyleDeclaration);

    if (callback) callback();
  });
  edgeEl.addEventListener('mousemove', (e: MouseEvent) => {
    // This can crush FPS so let's put a limit on it
    if (settingsManager.isDragging && lastUpdate + keepTrackApi.programs.drawManager.dt < Date.now()) {
      height = startHeight - (e.clientY - startY);
      height = maxHeight ? Math.min(height, maxHeight) : height;
      el.style.height = `${height}px`;
      lastUpdate = Date.now();
    }
  });
};

export const openColorbox = (url: string, options: any = {}): void => {
  // Check for coloroxDiv
  if (!getEl('colorbox-div')) {
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
    img.src = url;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.display = 'block';
    img.style.objectFit = 'cover';
    getEl('colorbox-container').appendChild(img);

    getEl('colorbox-div').addEventListener('click', () => {
      closeColorbox();
      if (options.callback) options.callback();
    });
  }

  showLoading(null, 2000);
  getEl('colorbox-div').style.display = 'block';

  if (options.image) {
    getEl('colorbox-container').style.width = '45%';
    getEl('colorbox-container').style.transform = 'translateX(-200%)';
    (<HTMLIFrameElement>getEl('colorbox-iframe')).style.display = 'none';
    (<HTMLImageElement>getEl('colorbox-img')).style.display = 'block';
    (<HTMLImageElement>getEl('colorbox-img')).src = url;
  } else {
    getEl('colorbox-container').style.width = '100%';
    (<HTMLIFrameElement>getEl('colorbox-iframe')).style.display = 'block';
    (<HTMLIFrameElement>getEl('colorbox-iframe')).src = url;
    (<HTMLImageElement>getEl('colorbox-img')).style.display = 'none';
  }

  setTimeout(() => {
    slideInRight(getEl('colorbox-container'), 1000, null);
  }, 2000);
};

export const closeColorbox = (): void => {
  if (!getEl('colorbox-div')) return;
  if (getEl('colorbox-div').style.display !== 'block') return;

  slideOutLeft(
    getEl('colorbox-container'),
    1000,
    () => {
      getEl('colorbox-div').style.display = 'none';
    },
    -200
  );
};

export const shake = (el: HTMLElement | HTMLDivElement, duration?: number, callback?: () => void): void => {
  // Avoid errors for now
  // TODO: Throw an error here
  if (el === null) return;

  if (el.classList.contains('shake')) return;

  duration ??= 500;
  el.classList.add('shake');
  setTimeout(() => {
    el.classList.remove('shake');
    if (callback) callback();
  }, duration);
};

(<any>window).getUnique = getUnique;
(<any>window).saveCsv = saveCsv;
