import { LayersManager } from '@app/app/ui/layers-manager';
import { LayersPopupBox } from '@app/app/ui/layers-popup-box';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { KeepTrack } from '@app/keeptrack';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('LayersPopupBox', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    const root = KeepTrack.getInstance().containerRoot;

    root.insertAdjacentHTML('beforeend', '<div id="canvas-holder"></div><a><img id="layers-menu-icon" /></a>');
    ServiceLocator.getUiManager().layersManager = new LayersManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('places the legend in the top-right corner, clamped on screen', () => {
    expect(LayersPopupBox.getCornerPosition(325, 345, 1920, 1080)).toEqual({ top: 16, left: 1920 - 325 - 16 });
    // Tiny viewport: never off the left/top edge.
    expect(LayersPopupBox.getCornerPosition(325, 345, 300, 200)).toEqual({ top: 16, left: 16 });
  });

  it('sits below the top chrome (nav bar plus docked strips such as the access timeline)', () => {
    // Header ends at 117 px (nav + 45 px access timeline): the legend starts a margin below it.
    expect(LayersPopupBox.getCornerPosition(325, 345, 1920, 1080, 117).top).toBe(133);
    // Even on a short screen it never moves up under the header.
    expect(LayersPopupBox.getCornerPosition(325, 900, 1920, 600, 117).top).toBe(133);
  });

  it('docks left of a showing right-hand panel (#sat-infobox / #search-results) instead of covering it', () => {
    // Info box starts at x = 1560 on a 1920 px screen: the legend ends a margin before it.
    expect(LayersPopupBox.getCornerPosition(325, 345, 1920, 1080, 117, 1560).left).toBe(1560 - 325 - 16);
    // A panel reported past the viewport edge never pushes the legend off screen.
    expect(LayersPopupBox.getCornerPosition(325, 345, 1920, 1080, 117, 2400).left).toBe(1920 - 325 - 16);
  });

  it('caps its height so it ends above the bottom menu', () => {
    const top = 133;

    expect(LayersPopupBox.getMaxHeight(top, 1080)).toBe(1080 - 16 - top);
    expect(LayersPopupBox.getMaxHeight(top, 1080, 60)).toBe(1080 - 60 - 16 - top);
    // Never collapses on a tiny screen.
    expect(LayersPopupBox.getMaxHeight(top, 200)).toBe(120);
  });

  it('opens below the measured top chrome', () => {
    const nav = document.createElement('nav');
    const navWrapper = document.createElement('div');

    navWrapper.id = 'nav-wrapper';
    nav.appendChild(navWrapper);
    document.body.appendChild(nav);
    vi.spyOn(navWrapper, 'getBoundingClientRect').mockReturnValue({ bottom: 117, height: 117, width: 1920, top: 0, left: 0, right: 1920, x: 0, y: 0, toJSON: () => ({}) });

    const box = new LayersPopupBox();

    box.open();

    expect(getEl('layers-popup-box')!.style.top).toBe('133px');
    nav.remove();
  });

  it('does not open over the centre of the screen', () => {
    const box = new LayersPopupBox();

    box.open();

    const el = getEl('layers-popup-box')!;
    const centredLeft = (window.innerWidth - el.offsetWidth) / 2;

    expect(el.style.left).toBe(`${LayersPopupBox.getCornerPosition(el.offsetWidth, el.offsetHeight, window.innerWidth, window.innerHeight).left}px`);
    expect(el.style.left).not.toBe(`${centredLeft}px`);
  });

  it('has a labelled close button that closes the legend (click and keyboard)', () => {
    const box = new LayersPopupBox();

    box.open();

    const closeBtn = getEl('layers-popup-box-close')!;

    expect(closeBtn.getAttribute('aria-label')).toBeTruthy();
    expect(closeBtn.getAttribute('kt-tooltip')).toBe(closeBtn.getAttribute('aria-label'));
    expect(closeBtn.getAttribute('title')).toBeNull();
    expect(closeBtn.querySelector('.layers-popup-box__close-glyph')).not.toBeNull();

    ServiceLocator.getUiManager().layersManager.isLayersMenuOpen = true;
    closeBtn.click();
    expect(ServiceLocator.getUiManager().layersManager.isLayersMenuOpen).toBe(false);
    expect(getEl('layers-popup-box')!.style.display).toBe('none');

    box.open();
    closeBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(getEl('layers-popup-box')!.style.display).toBe('none');
  });

  it('reopens where the user left it', () => {
    const box = new LayersPopupBox();

    box.open();
    const el = getEl('layers-popup-box')!;

    el.style.top = '200px';
    el.style.left = '300px';
    box.close();
    box.open();

    expect(el.style.top).toBe('200px');
    expect(el.style.left).toBe('300px');
  });
});
