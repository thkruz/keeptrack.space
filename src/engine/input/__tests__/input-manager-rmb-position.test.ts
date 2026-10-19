import { ServiceLocator } from '@app/engine/core/service-locator';
import { InputManager } from '@app/engine/input/input-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

describe('InputManager.openRmbMenu positioning', () => {
  let inputManager: InputManager;
  let menu: HTMLElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let camera: any;

  beforeEach(() => {
    setupStandardEnvironment();
    document.getElementById('rmb-test-root')?.remove();
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="rmb-test-root">
        <canvas id="keeptrack-canvas"></canvas>
        <div id="sat-hoverbox"></div>
        <div id="right-btn-menu" class="right-btn-menu" style="display: none"><ul id="right-btn-menu-ul"><li id="reset-camera-rmb">Reset</li></ul></div>
      </div>`
    );
    menu = document.getElementById('right-btn-menu')!;
    settingsManager.isAllowRightClick = true;

    // A camera that has never seen a mousemove (the first right-click of a session).
    camera = { state: { mouseX: 0, mouseY: 0 } };
    vi.spyOn(ServiceLocator, 'getMainCamera').mockReturnValue(camera as never);
    vi.spyOn(ServiceLocator, 'getViewportManager').mockReturnValue({ getInputCamera: () => camera } as never);

    inputManager = new InputManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.getElementById('rmb-test-root')?.remove();
  });

  it('places the menu at the click point on the first open', () => {
    inputManager.openRmbMenu(-1, { x: 300, y: 200 });

    expect(menu.style.display).toBe('block');
    expect(menu.style.left).toBe('300px');
    expect(menu.style.top).toBe('200px');
  });

  it('falls back to the camera mouse position when no click point is passed', () => {
    camera.state.mouseX = 250;
    camera.state.mouseY = 150;

    inputManager.openRmbMenu(-1);

    expect(menu.style.left).toBe('250px');
    expect(menu.style.top).toBe('150px');
  });

  it('measures the displayed menu and flips it to stay inside the viewport', () => {
    let isMeasuredWhileVisible = false;

    vi.spyOn(menu, 'getBoundingClientRect').mockImplementation(() => {
      isMeasuredWhileVisible = menu.style.display === 'block';

      return rect(parseFloat(menu.style.left), parseFloat(menu.style.top), 200, 300);
    });

    inputManager.openRmbMenu(-1, { x: window.innerWidth - 50, y: window.innerHeight - 20 });

    expect(isMeasuredWhileVisible).toBe(true);
    expect(menu.style.left).toBe(`${window.innerWidth - 250}px`);
    expect(menu.style.top).toBe(`${window.innerHeight - 320}px`);
  });

  it('pushes the menu clear of an open left-docked side menu', () => {
    document.getElementById('rmb-test-root')!.insertAdjacentHTML('beforeend', '<div id="fake-side-menu" class="side-menu-parent"></div>');
    vi.spyOn(document.getElementById('fake-side-menu')!, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 400, 700));
    vi.spyOn(menu, 'getBoundingClientRect').mockImplementation(() => rect(parseFloat(menu.style.left), parseFloat(menu.style.top), 180, 100));

    inputManager.openRmbMenu(-1, { x: 300, y: 200 });

    expect(menu.style.left).toBe('400px');
    expect(menu.style.top).toBe('200px');
  });
});
