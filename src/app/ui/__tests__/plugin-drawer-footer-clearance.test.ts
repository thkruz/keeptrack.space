import { PluginDrawer } from '@app/app/ui/plugin-drawer';
import { setupStandardEnvironment } from '@test/environment/standard-env';

/** #513: the floating utility pill must not sit on top of a wide open side menu. */
describe('utility footer side menu clearance', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    document.body.innerHTML = '<div id="ui-wrapper"><div id="drawer-utility-footer"></div><div id="wide-menu" class="side-menu-parent"></div></div>';
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);

      return 1;
    });
  });

  afterEach(() => {
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

    expect(footerLeft_()).toBe('1083px');
  });

  it('keeps the pill centred when the menu is narrow', () => {
    setMenuRight_(300);
    Object.defineProperty(window, 'innerWidth', { value: 1366, configurable: true });
    (new PluginDrawer() as unknown as { observeSideMenuClearance_: () => void }).observeSideMenuClearance_();

    expect(footerLeft_()).toBe('683px');
  });
});
