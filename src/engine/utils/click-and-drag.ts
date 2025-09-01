import { ClickDragOptions } from '@app/engine/plugins/base-plugin';

export const clickAndDragWidth = (el: HTMLElement | null, options: ClickDragOptions = {
  isDraggable: true,
}): HTMLDivElement | null => {
  if (!el) {
    return null;
  }

  const minWidth = options.minWidth ?? 280;
  const maxWidth = options.maxWidth ?? 450;

  let width = el.style.width ? parseInt(el.style.width) : el.clientWidth;

  width = width < minWidth ? minWidth : width;
  width = width > maxWidth ? maxWidth : width;
  el.style.width = `${width}px`;
  el.style.display = 'block';

  settingsManager.isDragging = false;

  if (options.isDraggable) {
    // create new element on right edge
    const edgeEl = createElWidth_(el);

    addEventsWidth_(edgeEl, el, width, minWidth, maxWidth, options);

    return edgeEl;
  }

  return null;
};

export const clickAndDragHeight = (el: HTMLElement, maxHeight?: number, callback?: () => void): void => {
  if (!el) {
    return;
  }
  settingsManager.isDragging = false;

  // create new element on right edge
  const edgeEl = createElHeight_(el);

  addEventsHeight_(edgeEl, el, callback, maxHeight);
};

const addEventsWidth_ = (edgeEl: HTMLDivElement, el: HTMLElement, width: number, minWidth: number, maxWidth: number, options: ClickDragOptions) => {
  const { attachedElement, leftOffset } = options;
  let startX: number;
  let startWidth: number;

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

    if (options.callback) {
      options.callback();
    }
  });
  edgeEl.addEventListener('mousemove', (e: MouseEvent) => {
    if (settingsManager.isDragging) {
      requestAnimationFrame(() => {
        width = startWidth + e.clientX - startX;
        width = width < minWidth ? minWidth : width;
        width = width > maxWidth ? maxWidth : width;
        el.style.width = `${width}px`;

        if (attachedElement && !leftOffset) {
          attachedElement.style.left = `${el.getBoundingClientRect().right}px`;
        }
      });
    }
  });
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
  edgeEl.style.cursor = 'w-resize';

  el.appendChild(edgeEl);

  return edgeEl;
};

const addEventsHeight_ = (edgeEl: HTMLDivElement, el: HTMLElement, callback?: () => void, maxHeight?: number) => {
  let startY: number;
  let startHeight: number;
  let height: number;

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

    if (callback) {
      // eslint-disable-next-line callback-return
      callback();
    }
  });
  edgeEl.addEventListener('mousemove', (e: MouseEvent) => {
    if (settingsManager.isDragging) {
      requestAnimationFrame(() => {
        height = startHeight - (e.clientY - startY);
        height = maxHeight ? Math.min(height, maxHeight) : height;
        height = height < 0 ? 0 : height;
        el.style.height = `${height}px`;
      });
    }
  });
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
