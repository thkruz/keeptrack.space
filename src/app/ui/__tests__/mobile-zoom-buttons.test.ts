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
});
