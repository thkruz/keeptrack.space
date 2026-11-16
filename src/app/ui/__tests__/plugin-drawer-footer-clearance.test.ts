import { PluginDrawer } from '@app/app/ui/plugin-drawer';
import { setupStandardEnvironment } from '@test/environment/standard-env';

/** #513: the floating utility pill must not sit on top of a wide open side menu. */
describe('utility footer side menu clearance', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="ui-wrapper"><div id="drawer-utility-footer"></div><div id="wide-menu" class="side-menu-parent"></div></div>';
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);

      return 1;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  const setMenuRight_ = (right: number) => {
    const menu = document.getElementById('wide-menu') as HTMLElement;

    menu.getBoundingClientRect = () => ({ left: 0, top: 0, right, bottom: 700, width: right, height: 700, x: 0, y: 0, toJSON: () => '' }) as DOMRect;
  };
  const footerLeft_ = () => (document.getElementById('drawer-utility-footer') as HTMLElement).style.getPropertyValue('--drawer-footer-left');

  it('centres the pill in the free space right of a menu that covers the viewport centre', () => {
    setMenuRight_(800);
    Object.defineProperty(window, 'innerWidth', { value: 1366, configurable: true });
    (new PluginDrawer() as unknown as { observeSideMenuClearance_: () => void }).observeSideMenuClearance_();
    vi.runAllTimers();

    expect(footerLeft_()).toBe('1083px');
  });

  it('keeps the pill centred when the menu is narrow', () => {
    setMenuRight_(300);
    Object.defineProperty(window, 'innerWidth', { value: 1366, configurable: true });
    (new PluginDrawer() as unknown as { observeSideMenuClearance_: () => void }).observeSideMenuClearance_();
    vi.runAllTimers();

    expect(footerLeft_()).toBe('683px');
  });

  it('reads layout in a macrotask after the frame, not inside the rAF callback', () => {
    setMenuRight_(800);
    Object.defineProperty(window, 'innerWidth', { value: 1366, configurable: true });
    (new PluginDrawer() as unknown as { observeSideMenuClearance_: () => void }).observeSideMenuClearance_();

    expect(footerLeft_()).toBe('');
    vi.runAllTimers();
    expect(footerLeft_()).toBe('1083px');
  });

  it('ignores attribute writes that left the value unchanged', async () => {
    setMenuRight_(800);
    Object.defineProperty(window, 'innerWidth', { value: 1366, configurable: true });
    const menu = document.getElementById('wide-menu') as HTMLElement;

    menu.className = 'side-menu-parent';
    (new PluginDrawer() as unknown as { observeSideMenuClearance_: () => void }).observeSideMenuClearance_();
    vi.runAllTimers();
    const spy = vi.spyOn(menu, 'getBoundingClientRect');

    menu.className = 'side-menu-parent';
    await Promise.resolve();
    vi.runAllTimers();
    expect(spy).not.toHaveBeenCalled();

    menu.className = 'side-menu-parent open';
    await Promise.resolve();
    vi.runAllTimers();
    expect(spy).toHaveBeenCalled();
  });

  it('measures through an IntersectionObserver without any synchronous style or rect read', () => {
    setMenuRight_(800);
    Object.defineProperty(window, 'innerWidth', { value: 1366, configurable: true });
    const menu = document.getElementById('wide-menu') as HTMLElement;
    const closed = document.createElement('div');

    closed.className = 'side-menu-parent';
    closed.style.display = 'none';
    document.body.appendChild(closed);

    const observed: Element[] = [];
    let deliver: () => void = () => undefined;

    class FakeIntersectionObserver {
      constructor(private readonly cb_: (entries: { target: Element; boundingClientRect: DOMRect }[]) => void) {}
      observe(el: Element) {
        observed.push(el);
        deliver = () => this.cb_(observed.map((target) => ({ target, boundingClientRect: { left: 0, top: 0, right: 800, bottom: 700, width: 800, height: 700 } as DOMRect })));
      }
      disconnect() {
        // Nothing to release in the fake.
      }
    }
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    const styleSpy = vi.spyOn(window, 'getComputedStyle');
    const rectSpy = vi.spyOn(menu, 'getBoundingClientRect');

    (new PluginDrawer() as unknown as { observeSideMenuClearance_: () => void }).observeSideMenuClearance_();
    vi.runAllTimers();

    expect(observed).toEqual([menu]);
    expect(footerLeft_()).toBe('');
    deliver();
    expect(footerLeft_()).toBe('1083px');
    expect(styleSpy).not.toHaveBeenCalled();
    expect(rectSpy).not.toHaveBeenCalled();
  });
});
