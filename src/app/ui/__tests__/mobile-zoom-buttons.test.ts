import { ServiceLocator } from '@app/engine/core/service-locator';
import { MobileZoomButtons } from '../mobile-zoom-buttons';

vi.mock('@app/locales/keys', () => ({ t7e: (k: string) => k }));
vi.mock('../mobile-zoom-buttons.css', () => ({}));

describe('MobileZoomButtons', () => {
  const camera = { zoomIn: vi.fn(), zoomOut: vi.fn() };

  beforeEach(() => {
    document.body.innerHTML = '';
    camera.zoomIn.mockClear();
    camera.zoomOut.mockClear();
    vi.spyOn(ServiceLocator, 'getMainCamera').mockReturnValue(camera as never);
  });

  it('does nothing on desktop', () => {
    (globalThis as { settingsManager: unknown }).settingsManager = { isMobileModeEnabled: false };
    MobileZoomButtons.init();
    expect(document.getElementById('mobile-zoom-buttons')).toBeNull();
  });

  it('adds buttons on phones that call camera zoom, once', () => {
    (globalThis as { settingsManager: unknown }).settingsManager = { isMobileModeEnabled: true };
    MobileZoomButtons.init();
    MobileZoomButtons.init();
    expect(document.querySelectorAll('#mobile-zoom-buttons').length).toBe(1);
    document.getElementById('mobile-zoom-in')?.click();
    document.getElementById('mobile-zoom-out')?.click();
    expect(camera.zoomIn).toHaveBeenCalledTimes(1);
    expect(camera.zoomOut).toHaveBeenCalledTimes(1);
  });

  it('hides the buttons while a side menu is open and shows them after it closes', async () => {
    (globalThis as { settingsManager: unknown }).settingsManager = { isMobileModeEnabled: true };
    document.body.innerHTML = '<div id="best-pass-menu" class="side-menu-parent" style="display: none"></div>';
    MobileZoomButtons.init();
    const container = document.getElementById('mobile-zoom-buttons') as HTMLElement;
    const menu = document.getElementById('best-pass-menu') as HTMLElement;

    expect(container.classList.contains('mobile-zoom-hidden')).toBe(false);
    menu.style.display = 'block';
    await Promise.resolve();
    expect(container.classList.contains('mobile-zoom-hidden')).toBe(true);
    menu.style.display = 'none';
    await Promise.resolve();
    expect(container.classList.contains('mobile-zoom-hidden')).toBe(false);
  });
});
