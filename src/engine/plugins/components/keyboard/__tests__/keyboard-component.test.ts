import { KeyboardShortcutRegistry } from '@app/engine/core/keyboard-shortcut-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeyboardComponent } from '@app/engine/plugins/components/keyboard/keyboard-component';
import { IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';
import { vi } from 'vitest';

const emitKey = (key: string, code = '', isRepeat = false, isShift = false, isCtrl = false) => {
  EventBus.getInstance().emit(EventBusEvent.KeyDown, key, code, isRepeat, isShift, isCtrl);
};

describe('KeyboardComponent', () => {
  beforeEach(() => {
    EventBus.getInstance().unregisterAllEvents();
    // Return whatever shortcuts are passed so registry conflicts don't drop them.
    vi.spyOn(KeyboardShortcutRegistry, 'register').mockImplementation(
      (_id: string, shortcuts: IKeyboardShortcut[]) => shortcuts,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes pluginId and starts uninitialized', () => {
    const comp = new KeyboardComponent('PluginA', []);

    expect(comp.pluginId).toBe('PluginA');
    expect(comp.isInitialized).toBe(false);
  });

  it('init() registers the handler once and marks initialized', () => {
    const comp = new KeyboardComponent('PluginA', []);

    comp.init();
    expect(comp.isInitialized).toBe(true);
    // Second init is a no-op (does not re-register)
    expect(() => comp.init()).not.toThrow();
  });

  it('invokes the matching shortcut callback on KeyDown', () => {
    const callback = vi.fn();
    const comp = new KeyboardComponent('PluginA', [{ key: 'a', callback }]);

    comp.init();
    emitKey('a');
    expect(callback).toHaveBeenCalled();
  });

  it('ignores repeat key events', () => {
    const callback = vi.fn();
    const comp = new KeyboardComponent('PluginA', [{ key: 'a', callback }]);

    comp.init();
    emitKey('a', '', true);
    expect(callback).not.toHaveBeenCalled();
  });

  it('matches by code and respects shift/ctrl modifiers', () => {
    const callback = vi.fn();
    const comp = new KeyboardComponent('PluginA', [{ key: '', code: 'KeyB', shift: true, callback }]);

    comp.init();

    // Wrong key and shift not pressed -> no match
    emitKey('x', 'KeyB', false, false, false);
    expect(callback).not.toHaveBeenCalled();

    // Code matches and shift pressed -> match
    emitKey('', 'KeyB', false, true, false);
    expect(callback).toHaveBeenCalled();
  });

  it('does nothing when no shortcut matches the key', () => {
    const callback = vi.fn();
    const comp = new KeyboardComponent('PluginA', [{ key: 'a', callback }]);

    comp.init();
    emitKey('z');
    expect(callback).not.toHaveBeenCalled();
  });

  it('respects the login gate: rejects then allows', () => {
    const callback = vi.fn();
    const onRejected = vi.fn();
    let allowed = false;
    const comp = new KeyboardComponent('PluginA', [{ key: 'a', callback }], () => allowed, onRejected);

    comp.init();

    emitKey('a');
    expect(onRejected).toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();

    allowed = true;
    emitKey('a');
    expect(callback).toHaveBeenCalled();
  });

  it('destroy() marks the component uninitialized', () => {
    const comp = new KeyboardComponent('PluginA', []);

    comp.init();
    comp.destroy();
    expect(comp.isInitialized).toBe(false);
  });
});
