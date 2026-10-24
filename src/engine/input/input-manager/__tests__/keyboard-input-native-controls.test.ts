import { PluginDrawer } from '@app/app/ui/plugin-drawer';
import { CameraInputHandler } from '@app/engine/camera/camera-input-handler';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeyboardInput } from '@app/engine/input/input-manager/keyboard-input';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import userEvent from '@testing-library/user-event';

// These tests exercise real bubbling, cancelable window events and browser-like activation.
// Standard environment can initialize more than one keyboard listener; preservation checks
// compare dispatched identities, while native ownership requires zero application events.
describe('native control keyboard ownership', () => {
  let keyboard: KeyboardInput;
  let down: ReturnType<typeof vi.fn>;
  let up: ReturnType<typeof vi.fn>;
  let listeners: [string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined][];
  let listenerScope: { active: boolean };
  let add: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    listeners = [];
    const scope = { active: true };
    listenerScope = scope;
    const original = window.addEventListener.bind(window);
    add = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      const scopedListener: EventListener = (event) => {
        if (!scope.active) return;
        if (typeof listener === 'function') listener.call(window, event);
        else listener.handleEvent(event);
      };
      listeners.push([type, scopedListener, options]);
      original(type, scopedListener, options);
    });
    setupStandardEnvironment();
    vi.stubGlobal('Element', window.Element);
    ServiceLocator.getUiManager().isCurrentlyTyping = false;
    settingsManager.disableUI = false;
    settingsManager.isDisableKeyboard = false;
    keyboard = ServiceLocator.getInputManager().keyboard;
    down = vi.fn();
    up = vi.fn();
    EventBus.getInstance().on(EventBusEvent.KeyDown, down);
    EventBus.getInstance().on(EventBusEvent.KeyUp, up);
    document.body.insertAdjacentHTML(
      'beforeend',
      '<button id="first">First<span>Nested</span></button><button id="second">Second</button><input id="edit"><canvas id="scene" tabindex="0"></canvas>'
    );
  });
  afterEach(() => {
    listenerScope.active = false;
    for (const [type, listener, options] of listeners) window.removeEventListener(type, listener, options);
    add.mockRestore();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  const key = (target: EventTarget, type: string, value: string, options: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true, ...options });
    target.dispatchEvent(event);
    return event;
  };
  it.each(['Tab', 'Enter', ' '])('preserves native %s defaults and suppresses background shortcuts on a button', (value) => {
    const button = document.querySelector('#first span')!;
    expect(key(button, 'keydown', value).defaultPrevented).toBe(false);
    expect(key(button, 'keyup', value).defaultPrevented).toBe(false);
    expect(down).not.toHaveBeenCalled();
    expect(up).not.toHaveBeenCalled();
  });
  it('allows actual forward/reverse Tab and Enter/Space button activation', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const first = document.getElementById('first')!;
    const second = document.getElementById('second')!;
    const click = vi.fn();
    first.addEventListener('click', click);
    first.focus();
    await user.tab();
    expect(document.activeElement).toBe(second);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(first);
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(click).toHaveBeenCalledTimes(2);
    expect(down.mock.calls.filter((call) => ['Tab', 'Enter', ' '].includes(call[0]))).toEqual([]);
    expect(up.mock.calls.filter((call) => ['Tab', 'Enter', ' '].includes(call[0]))).toEqual([]);
  });
  it.each(['a href="#example"', 'select', 'input type="checkbox"', 'textarea', 'summary', 'div role="button" tabindex="0"', 'button disabled'])(
    'preserves activation on %s',
    (tag) => {
      const name = tag.split(' ')[0];
      document.body.insertAdjacentHTML('beforeend', `<${tag} id="native"></${name}>`);
      for (const value of ['Enter', ' ']) {
        expect(key(document.getElementById('native')!, 'keydown', value).defaultPrevented).toBe(false);
        key(document.body, 'keyup', value);
      }
      expect(down).not.toHaveBeenCalled();
      expect(up).not.toHaveBeenCalled();
    }
  );
  it('retains release ownership after a stopped native down removes its control', () => {
    const button = document.getElementById('first')!;
    button.addEventListener('keydown', (event) => {
      event.stopPropagation();
      button.remove();
    });
    key(button, 'keydown', 'Enter', { code: 'Enter' });
    key(document.body, 'keyup', 'Enter', { code: 'Enter' });
    expect(up).not.toHaveBeenCalled();
    expect(keyboard.getKey('Enter')).not.toBe(true);
  });
  it('cleans held Shift during typing and priority releases without dispatching shortcuts', () => {
    key(document.body, 'keydown', 'Shift', { code: 'ShiftLeft', shiftKey: true });
    ServiceLocator.getUiManager().isCurrentlyTyping = true;
    key(document.getElementById('edit')!, 'keyup', 'Shift', { code: 'ShiftLeft' });
    expect(keyboard.getKey('Shift')).toBe(false);
    ServiceLocator.getUiManager().isCurrentlyTyping = false;
    key(document.body, 'keydown', 'Shift', { code: 'ShiftLeft', shiftKey: true });
    document.getElementById('edit')!.classList.add('keyboard-priority');
    key(document.getElementById('edit')!, 'keyup', 'Shift', { code: 'ShiftLeft' });
    expect(keyboard.getKey('Shift')).toBe(false);
    expect(new Set(up.mock.calls.map((call) => call[0]))).toEqual(new Set(['Shift']));
  });
  it('restores actual camera precision speed after ShiftTab reaches a typing input', () => {
    const camera = ServiceLocator.getMainCamera();
    const handler = new CameraInputHandler(camera);
    handler.init();
    key(document.body, 'keydown', 'Shift', { code: 'ShiftLeft', shiftKey: true });
    expect(camera.state.speedModifier).toBe(8);
    ServiceLocator.getUiManager().isCurrentlyTyping = true;
    key(document.getElementById('edit')!, 'keyup', 'Shift', { code: 'ShiftLeft' });
    expect(camera.state.speedModifier).toBe(1);
    expect(settingsManager.cameraMovementSpeed).toBe(0.003);
    expect(settingsManager.cameraMovementSpeedMin).toBe(0.005);
    expect(new Set(down.mock.calls.map((call) => call[0]))).toEqual(new Set(['Shift']));
  });
  it('retains unrelated focused-button shortcuts and canvas activation shortcuts', () => {
    key(document.getElementById('first')!, 'keydown', '9', { code: 'Digit9' });
    key(document.getElementById('scene')!, 'keydown', 'Enter', { code: 'Enter' });
    key(document.getElementById('scene')!, 'keydown', ' ', { code: 'Space' });
    expect(new Set(down.mock.calls.map((call) => call[0]))).toEqual(new Set(['9', 'Enter', ' ']));
  });
  it('keeps ownership for repeated activation after the native control is removed', () => {
    const button = document.getElementById('first')!;
    key(button, 'keydown', 'Enter', { code: 'Enter' });
    button.remove();
    expect(key(document.body, 'keydown', 'Enter', { code: 'Enter', repeat: true }).defaultPrevented).toBe(false);
    key(document.body, 'keyup', 'Enter', { code: 'Enter' });
    expect(down).not.toHaveBeenCalled();
    expect(up).not.toHaveBeenCalled();
  });
  it.each(['Shift', 'Control'])('preserves ordinary %s release flags', (value) => {
    key(document.body, 'keydown', value, { code: value + 'Left' });
    key(document.body, 'keyup', value, { code: value + 'Left' });
    expect(up.mock.calls[0][value === 'Shift' ? 3 : 4]).toBe(true);
  });
  it('blocked modifier cleanup emits no synthetic letter downs and ignores unowned modifier releases', () => {
    key(document.body, 'keydown', 'a', { code: 'KeyA' });
    key(document.body, 'keydown', 'Shift', { code: 'ShiftLeft', shiftKey: true });
    down.mockClear();
    up.mockClear();
    ServiceLocator.getUiManager().isCurrentlyTyping = true;
    key(document.getElementById('edit')!, 'keyup', 'Shift', { code: 'ShiftLeft' });
    key(document.getElementById('edit')!, 'keyup', 'Control', { code: 'ControlLeft' });
    expect(down).not.toHaveBeenCalled();
    expect(new Set(up.mock.calls.map((call) => call[0]))).toEqual(new Set(['Shift']));
  });
  it('new canvas down and blur clear stranded native ownership', () => {
    key(document.getElementById('first')!, 'keydown', 'Enter', { code: 'Enter' });
    key(document.body, 'keydown', 'Enter', { code: 'Enter' });
    key(document.body, 'keyup', 'Enter', { code: 'Enter' });
    expect(up).toHaveBeenCalled();
    expect(up.mock.calls.every((call) => call[0] === 'Enter')).toBe(true);
    up.mockClear();
    key(document.getElementById('first')!, 'keydown', ' ', { code: 'Space' });
    window.dispatchEvent(new Event('blur'));
    key(document.body, 'keyup', ' ', { code: 'Space' });
    expect(up).toHaveBeenCalled();
    expect(up.mock.calls.every((call) => call[0] === ' ')).toBe(true);
  });
  it('keeps typing/priority guards while preserving Tab default on the canvas', () => {
    ServiceLocator.getUiManager().isCurrentlyTyping = true;
    key(document.body, 'keydown', '9');
    ServiceLocator.getUiManager().isCurrentlyTyping = false;
    document.getElementById('first')!.classList.add('keyboard-priority');
    key(document.getElementById('first')!, 'keydown', '9');
    expect(key(document.getElementById('scene')!, 'keydown', 'Tab').defaultPrevented).toBe(false);
    expect(down).not.toHaveBeenCalled();
  });
  it('handles same-origin serialized embed keys without a DOM target or preventDefault method', () => {
    const parent = Object.getOwnPropertyDescriptor(window, 'parent')!;

    Object.defineProperty(window, 'parent', { configurable: true, value: {} });
    settingsManager.isEmbedMode = true;
    try {
      new KeyboardInput().init();
      document.getElementById('first')!.focus();
      const send = (keyValue: string, type: string, origin = window.origin) =>
        window.dispatchEvent(
          new window.MessageEvent('message', {
            origin,
            data: { type, event: { key: keyValue, code: keyValue, shiftKey: false, altKey: false } },
          })
        );

      send('Tab', 'keydown');
      send('Tab', 'keyup');
      expect(down).not.toHaveBeenCalled();
      expect(up).not.toHaveBeenCalled();
      send('Enter', 'keydown', 'https://untrusted.example');
      expect(down).not.toHaveBeenCalled();
      send('Enter', 'keydown');
      send('Enter', 'keyup');
      // The parent event has no DOM target; local button focus is not its ownership oracle.
      expect(down.mock.calls.map((call) => call[0])).toEqual(['Enter']);
      expect(up.mock.calls.map((call) => call[0])).toEqual(['Enter']);
    } finally {
      Object.defineProperty(window, 'parent', parent);
      settingsManager.isEmbedMode = false;
    }
  });
  it('drawer preserves native Tab, modified Tab, and another owner while retaining plain canvas Tab', () => {
    const drawer = new PluginDrawer();
    drawer.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    (drawer as unknown as { hasItems_: boolean }).hasItems_ = true;
    const toggle = vi.spyOn(drawer, 'toggle').mockImplementation(() => {});
    for (const selector of ['#first', '#edit']) {
      const element = document.querySelector(selector) as HTMLElement;
      element.focus();
      expect(key(element, 'keydown', 'Tab').defaultPrevented).toBe(false);
    }
    document.getElementById('scene')!.focus();
    for (const options of [{ shiftKey: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }])
      expect(key(document.activeElement!, 'keydown', 'Tab', options).defaultPrevented).toBe(false);
    const owned = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    owned.preventDefault();
    document.body.dispatchEvent(owned);
    expect(toggle).not.toHaveBeenCalled();
    expect(key(document.activeElement!, 'keydown', 'Tab').defaultPrevented).toBe(true);
    expect(toggle).toHaveBeenCalledTimes(1);
  });
});
