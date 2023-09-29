interface clickDragOptions {
  minWidth?: number;
  maxWidth?: number;
}

export const clickAndDragWidth = (el: HTMLElement, options: clickDragOptions = {}): void => {
  if (!el) return;

  const minWidth = options.minWidth || 280;
  const maxWidth = options.maxWidth || 450;

  let width = el.style.width ? parseInt(el.style.width) : el.clientWidth;
  width = width < minWidth ? minWidth : width;
  width = width > maxWidth ? maxWidth : width;
  el.style.width = `${width}px`;

  let lastUpdate = Date.now();

  let startX: number;
  let startWidth: number;
  settingsManager.isDragging = false;

  // create new element on right edge
  const edgeEl = createElWidth_(el);

  ({ startX, startWidth, width, lastUpdate } = addEventsWidth_(edgeEl, startX, startWidth, el, width, minWidth, maxWidth, lastUpdate));
};

export const clickAndDragHeight = (el: HTMLElement, maxHeight?: number, callback?: () => void): void => {
  let lastUpdate = Date.now();
  let startY: number;
  let startHeight: number;
  let height: number;
  settingsManager.isDragging = false;

  // create new element on right edge
  const edgeEl = createElHeight_(el);

  ({ startY, startHeight, height, lastUpdate } = addEventsHeight_(edgeEl, startY, startHeight, el, callback, height, maxHeight, lastUpdate));
};

const addEventsWidth_ = (edgeEl: HTMLDivElement, startX: number, startWidth: number, el: HTMLElement, width: number, minWidth: number, maxWidth: number, lastUpdate: number) => {
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
    if (settingsManager.isDragging) {
      requestAnimationFrame(() => {
        width = startWidth + e.clientX - startX;
        width = width < minWidth ? minWidth : width;
        width = width > maxWidth ? maxWidth : width;
        el.style.width = `${width}px`;
        lastUpdate = Date.now();
      });
    }
  });
  return { startX, startWidth, width, lastUpdate };
};

const createElWidth_ = (el: HTMLElement) => {
  const edgeEl = document.createElement('div');
  edgeEl.style.position = 'relative';
  edgeEl.style.height = '100%';
  edgeEl.style.width = '8px';
  edgeEl.style.right = '0px';
  edgeEl.style.cursor = 'w-resize';
  edgeEl.style.zIndex = '9999';
  edgeEl.style.marginLeft = 'auto';
  el.appendChild(edgeEl);
  return edgeEl;
};

const addEventsHeight_ = (
  edgeEl: HTMLDivElement,
  startY: number,
  startHeight: number,
  el: HTMLElement,
  callback: () => void,
  height: number,
  maxHeight: number,
  lastUpdate: number
) => {
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
    if (settingsManager.isDragging) {
      requestAnimationFrame(() => {
        height = startHeight - (e.clientY - startY);
        height = maxHeight ? Math.min(height, maxHeight) : height;
        height = height < 0 ? 0 : height;
        el.style.height = `${height}px`;
        lastUpdate = Date.now();
      });
    }
  });
  return { startY, startHeight, height, lastUpdate };
};

const createElHeight_ = (el: HTMLElement) => {
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
  return edgeEl;
};
