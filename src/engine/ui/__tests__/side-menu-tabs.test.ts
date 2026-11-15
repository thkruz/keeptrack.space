import { Tabs } from '@materializecss/materialize';
import { vi } from 'vitest';
import { updateSideMenuTabIndicator } from '../side-menu-tabs';

describe('updateSideMenuTabIndicator', () => {
  let tabsEl: HTMLElement;
  let width: number;
  let update: ReturnType<typeof vi.fn>;
  let frames: FrameRequestCallback[];

  const runFrames = () => {
    while (frames.length > 0) {
      frames.shift()!(0);
    }
  };

  beforeEach(() => {
    tabsEl = document.createElement('ul');
    tabsEl.id = 'tabs-under-test';
    document.body.appendChild(tabsEl);
    width = 300;
    vi.spyOn(tabsEl, 'getBoundingClientRect').mockImplementation(() => ({ width }) as DOMRect);
    update = vi.fn();
    vi.spyOn(Tabs, 'getInstance').mockReturnValue({ updateTabIndicator: update } as never);
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    tabsEl.remove();
  });

  it('does not measure synchronously, and coalesces repeated calls into one update', () => {
    updateSideMenuTabIndicator('tabs-under-test');
    updateSideMenuTabIndicator('tabs-under-test');

    expect(update).not.toHaveBeenCalled();
    expect(tabsEl.getBoundingClientRect).not.toHaveBeenCalled();
    runFrames();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('skips when the width is unchanged, updates when it changes, and skips while hidden', () => {
    updateSideMenuTabIndicator('tabs-under-test');
    runFrames();
    updateSideMenuTabIndicator('tabs-under-test');
    runFrames();
    expect(update).toHaveBeenCalledTimes(1);

    width = 0;
    updateSideMenuTabIndicator('tabs-under-test');
    runFrames();
    expect(update).toHaveBeenCalledTimes(1);

    width = 300;
    updateSideMenuTabIndicator('tabs-under-test');
    runFrames();
    expect(update).toHaveBeenCalledTimes(2);
  });
});
