import { setupStandardEnvironment } from '@test/environment/standard-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('draggabilly');

import { DraggableBox } from '../draggable-box';

class TestBox extends DraggableBox {
  protected getBoxContentHtml(): string {
    return '<div id="test-box-body">content</div>';
  }
}

const boxEl = (box: DraggableBox): HTMLElement => (box as unknown as { boxEl: HTMLElement }).boxEl;

describe('DraggableBox', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('z-index counter', () => {
    it('increases the shared max z-index monotonically', () => {
      const before = DraggableBox.getMaxZIndex();

      expect(DraggableBox.increaseMaxZIndex()).toBe(before + 1);
      expect(DraggableBox.getMaxZIndex()).toBe(before + 1);
    });
  });

  describe('construction defaults', () => {
    it('defaults width to 300px and isDockable to false', () => {
      const box = new TestBox('plain-box') as unknown as { width: string; isDockable: boolean; title: string };

      expect(box.width).toBe('300px');
      expect(box.isDockable).toBe(false);
      expect(box.title).toBe('');
    });

    it('honors provided options', () => {
      const box = new TestBox('opt-box', { width: '500px', title: 'Hello', isDockable: true }) as unknown as {
        width: string;
        isDockable: boolean;
        title: string;
      };

      expect(box.width).toBe('500px');
      expect(box.title).toBe('Hello');
      expect(box.isDockable).toBe(true);
    });
  });

  describe('open', () => {
    it('inserts the box into the canvas-holder and shows it', () => {
      const box = new TestBox('my-box', { title: 'My Box', width: '420px' });

      box.open();

      const el = document.getElementById('my-box')!;

      expect(el).not.toBeNull();
      expect(document.getElementById('test-box-body')).not.toBeNull();
      expect(el.style.width).toBe('420px');
      expect(boxEl(box).style.display).not.toBe('none');
      expect(el.querySelector('.draggable-box__title')!.textContent).toContain('My Box');
    });

    it('raises the z-index above the previous maximum', () => {
      const before = DraggableBox.getMaxZIndex();
      const box = new TestBox('z-box');

      box.open();

      expect(Number(document.getElementById('z-box')!.style.zIndex)).toBeGreaterThan(before);
    });

    it('invokes the open callback', () => {
      const box = new TestBox('cb-box');
      const cb = vi.fn();

      box.open(cb);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('does not re-insert the DOM when opened twice', () => {
      const box = new TestBox('twice-box');

      box.open();
      box.open();

      expect(document.querySelectorAll('#twice-box').length).toBe(1);
    });

    it('renders a dock button only when dockable', () => {
      const plain = new TestBox('nodock-box');

      plain.open();
      expect(document.getElementById('nodock-box-dock')).toBeNull();

      const dockable = new TestBox('dock-box', { isDockable: true });

      dockable.open();
      expect(document.getElementById('dock-box-dock')).not.toBeNull();
    });
  });

  describe('close / dock', () => {
    it('hides the box when the close button is clicked', () => {
      const box = new TestBox('close-box');

      box.open();
      (document.getElementById('close-box-close') as HTMLElement).click();

      expect(boxEl(box).style.display).toBe('none');
    });

    it('hides the box when the dock button is clicked', () => {
      const box = new TestBox('dockable-box', { isDockable: true });

      box.open();
      (document.getElementById('dockable-box-dock') as HTMLElement).click();

      expect(boxEl(box).style.display).toBe('none');
    });

    it('close() runs the supplied callback', () => {
      const box = new TestBox('closecb-box');
      const cb = vi.fn();

      box.open();
      box.close(cb);

      expect(cb).toHaveBeenCalledTimes(1);
      expect(boxEl(box).style.display).toBe('none');
    });

    it('dock() runs the supplied callback', () => {
      const box = new TestBox('dockcb-box', { isDockable: true });
      const cb = vi.fn();

      box.open();
      box.dock(cb);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('close() is a no-op before the box is opened', () => {
      const box = new TestBox('unopened-box');
      const cb = vi.fn();

      box.close(cb);

      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('right-click recentering', () => {
    it('recenters the box on a right mouse-button press', () => {
      const box = new TestBox('rc-box');

      box.open();
      const el = document.getElementById('rc-box')!;

      el.style.top = '999px';
      el.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));

      // jsdom reports 0 offsets, so centering resolves to a deterministic px value.
      expect(el.style.top).not.toBe('999px');
    });
  });
});
