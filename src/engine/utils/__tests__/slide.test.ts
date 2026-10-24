import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { slideInRight, slideOutLeft } from '../slide';

// Native Tab exclusion is additionally verified in production Chrome. JSDOM
// checks the real inert DOM contract and animation races, not a Tab simulation.
describe('side-menu slide interaction lifecycle', () => {
  let host: HTMLDivElement;
  const makeMenu = (name: string, hidden = false) => {
    const element = document.createElement('div');
    element.id = name;
    element.className = 'side-menu-parent start-hidden';
    element.style.display = hidden ? 'none' : 'block';
    element.innerHTML = '<button type="button">Close</button><input><input disabled>';
    host.append(element);
    return element;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement('div');
    document.body.append(host);
  });
  afterEach(() => {
    host.remove();
    vi.clearAllTimers();
  });

  it.each(['primary-menu', 'primary-menu-secondary'])('excludes an opened then closed %s and restores its controls on reopen', (id) => {
    const menu = makeMenu(id, true);
    const controls = Array.from(menu.querySelectorAll('input'));
    const originalTabIndexes = Array.from(menu.querySelectorAll('button,input')).map((element) => (element as HTMLElement).tabIndex);
    slideInRight(menu, 300);
    vi.advanceTimersByTime(20);
    slideOutLeft(menu, 300, null, id.endsWith('secondary') ? -300 : undefined);
    expect(menu.hasAttribute('inert')).toBe(true);
    expect(menu.style.transform).toBe(`translateX(${id.endsWith('secondary') ? -300 : -120}%)`);
    vi.advanceTimersByTime(350);
    expect(menu.hasAttribute('inert')).toBe(true);
    slideInRight(menu, 300);
    vi.advanceTimersByTime(350);
    expect(menu.hasAttribute('inert')).toBe(false);
    expect(menu.style.display).toBe('block');
    expect(menu.style.transform).toBe('translateX(0)');
    expect(controls.map((element) => element.disabled)).toEqual([false, true]);
    expect(Array.from(menu.querySelectorAll('button,input')).map((element) => (element as HTMLElement).tabIndex)).toEqual(originalTabIndexes);
  });

  it('keeps initially hidden menus hidden when asked to close', () => {
    const menu = makeMenu('never-opened', true);
    const callback = vi.fn();
    slideOutLeft(menu, 300, callback);
    vi.advanceTimersByTime(350);
    expect(menu.style.display).toBe('none');
    expect(callback).not.toHaveBeenCalled();
  });

  it('cancels the pending opening frame when closed before16ms', () => {
    const menu = makeMenu('quick-close', true);
    const opened = vi.fn();
    const closed = vi.fn();
    slideInRight(menu, 300, opened);
    vi.advanceTimersByTime(5);
    slideOutLeft(menu, 300, closed);
    vi.advanceTimersByTime(20);
    expect(menu.style.transform).toBe('translateX(-120%)');
    expect(menu.hasAttribute('inert')).toBe(true);
    vi.advanceTimersByTime(350);
    expect(opened).not.toHaveBeenCalled();
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('does not let an obsolete close callback hide the latest reopened menu', () => {
    const menu = makeMenu('reopened');
    const obsoleteClose = vi.fn(() => {
      menu.style.display = 'none';
    });
    const latestOpen = vi.fn();
    slideOutLeft(menu, 300, obsoleteClose);
    vi.advanceTimersByTime(100);
    slideInRight(menu, 300, latestOpen);
    vi.advanceTimersByTime(250);
    expect(menu.style.display).toBe('block');
    expect(menu.hasAttribute('inert')).toBe(false);
    expect(obsoleteClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(latestOpen).toHaveBeenCalledTimes(1);
  });

  it('does not run stale opening cleanup after a rapid open-close-open sequence', () => {
    const menu = makeMenu('latest-operation');
    const staleOpen = vi.fn(() => {
      menu.setAttribute('inert', '');
    });
    const staleClose = vi.fn(() => {
      menu.style.display = 'none';
    });
    const currentOpen = vi.fn();
    slideInRight(menu, 1000, staleOpen);
    vi.advanceTimersByTime(5);
    slideOutLeft(menu, 300, staleClose);
    vi.advanceTimersByTime(5);
    slideInRight(menu, 200, currentOpen);
    vi.advanceTimersByTime(1500);
    expect(staleOpen).not.toHaveBeenCalled();
    expect(staleClose).not.toHaveBeenCalled();
    expect(currentOpen).toHaveBeenCalledTimes(1);
    expect(menu.style.display).toBe('block');
    expect(menu.hasAttribute('inert')).toBe(false);
    expect(menu.style.transform).toBe('translateX(0)');
  });

  it('isolates secondary closure from its primary menu and the background', () => {
    const primary = makeMenu('independent-primary');
    const secondary = makeMenu('independent-primary-secondary');
    const external = document.createElement('button');
    host.append(external);
    external.focus();
    slideInRight(primary, 300);
    slideInRight(secondary, 300);
    vi.advanceTimersByTime(20);
    slideOutLeft(secondary, 300, null, -300);
    expect(secondary.hasAttribute('inert')).toBe(true);
    expect(primary.hasAttribute('inert')).toBe(false);
    expect(external.hasAttribute('inert')).toBe(false);
    expect(host.hasAttribute('inert')).toBe(false);
    expect(document.body.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(external);
    slideOutLeft(primary, 300);
    vi.advanceTimersByTime(350);
    expect(document.activeElement).toBe(external);
  });

  it('keeps independent pending callbacks for different menu roots', () => {
    const first = makeMenu('first');
    const second = makeMenu('second');
    const firstOpen = vi.fn();
    const secondOpen = vi.fn();
    slideInRight(first, 300, firstOpen);
    slideInRight(second, 300, secondOpen);
    slideOutLeft(first, 300);
    vi.advanceTimersByTime(350);
    expect(firstOpen).not.toHaveBeenCalled();
    expect(secondOpen).toHaveBeenCalledTimes(1);
    expect(first.hasAttribute('inert')).toBe(true);
    expect(second.hasAttribute('inert')).toBe(false);
  });

  it('does not finish a detached menu opening or run its completion callback', () => {
    const menu = makeMenu('destroyed-open', true);
    const callback = vi.fn();
    slideInRight(menu, 300, callback);
    menu.remove();
    const transformAtRemoval = menu.style.transform;
    vi.advanceTimersByTime(350);
    expect(menu.style.transform).toBe(transformAtRemoval);
    expect(callback).not.toHaveBeenCalled();
  });

  it('does not run a detached menu close callback that mutates the background', () => {
    const menu = makeMenu('destroyed-close');
    const callback = vi.fn(() => {
      host.textContent = 'stale cleanup';
    });
    slideOutLeft(menu, 300, callback);
    menu.remove();
    vi.advanceTimersByTime(350);
    expect(callback).not.toHaveBeenCalled();
    expect(host.textContent).not.toBe('stale cleanup');
  });

  it('preserves generic Colorbox timing and its outer-container hide callback', () => {
    const outer = document.createElement('div');
    const box = document.createElement('div');
    box.id = 'colorbox-container';
    outer.append(box);
    host.append(outer);
    outer.style.display = 'block';
    const opened = vi.fn();
    const closed = vi.fn(() => {
      outer.style.display = 'none';
    });
    slideInRight(box, 750, opened);
    vi.advanceTimersByTime(20);
    slideOutLeft(box, 750, closed, -200);
    expect(box.style.transform).toBe('translateX(-200%)');
    expect(box.hasAttribute('inert')).toBe(false);
    vi.advanceTimersByTime(749);
    expect(outer.style.display).toBe('block');
    expect(opened).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(closed).toHaveBeenCalledTimes(1);
    expect(outer.style.display).toBe('none');
  });

  it('preserves generic detached-element completion callbacks', () => {
    const generic = document.createElement('div');
    const callback = vi.fn();
    slideInRight(generic, 300, callback);
    vi.advanceTimersByTime(350);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(generic.style.transform).toBe('translateX(0)');
    expect(generic.hasAttribute('inert')).toBe(false);
  });
});
