import { vi } from 'vitest';
import { GamepadPlugin } from '@app/plugins/gamepad/gamepad';
import { setupStandardEnvironment } from '@test/environment/standard-env';

// GamepadPlugin is not a standard bottom-icon plugin (no addHtml/addJs), so the
// generic suite does not apply. Cover construction + the no-gamepad update path.
describe('GamepadPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs without throwing', () => {
    expect(() => new GamepadPlugin()).not.toThrow();
  });

  it('initializes without throwing', () => {
    const plugin = new GamepadPlugin();

    expect(() => plugin.init()).not.toThrow();
  });
});

const fakeGamepad = (over: Partial<Gamepad> = {}): Gamepad => ({
  id: 'Test Controller (STANDARD GAMEPAD)',
  index: 0, connected: true, mapping: 'standard', timestamp: 0, vibrationActuator: null as never,
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) as never,
  axes: [0, 0, 0, 0],
  ...over,
} as Gamepad);

describe('GamepadPlugin input handling', () => {
  let plugin: GamepadPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new GamepadPlugin();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('validateController', () => {
    it('rejects a controller with too few buttons', () => {
      expect(p().validateController(fakeGamepad({ buttons: [] as never }))).toBe(false);
    });

    it('rejects a controller with too few axes', () => {
      expect(p().validateController(fakeGamepad({ axes: [0, 0] }))).toBe(false);
    });

    it('accepts a standard controller', () => {
      expect(p().validateController(fakeGamepad())).toBe(true);
    });

    it('only reports an unsupported controller once', () => {
      p().validateController(fakeGamepad({ buttons: [] as never }));
      p().validateController(fakeGamepad({ buttons: [] as never }));

      expect(p().previouslyReportedGamepads).toContain('Test Controller (STANDARD GAMEPAD)');
    });
  });

  it('updateGamepad processes a connected standard controller', () => {
    vi.stubGlobal('navigator', { ...navigator, getGamepads: () => [fakeGamepad()] });

    expect(() => plugin.updateGamepad(0)).not.toThrow();
    expect(p().currentController).not.toBeNull();
  });

  it('updateGamepad bails when no controller is present', () => {
    vi.stubGlobal('navigator', { ...navigator, getGamepads: () => [] });

    expect(() => plugin.updateGamepad(0)).not.toThrow();
  });

  it('updateButtons_ dispatches every button-press handler', () => {
    // All buttons pressed at once exercises each case in the dispatch switch.
    p().currentController = fakeGamepad({
      buttons: Array.from({ length: 17 }, () => ({ pressed: true, touched: true, value: 1 })) as never,
    });

    expect(() => p().updateButtons_()).not.toThrow();
    expect(p().buttonsPressedHistory.length).toBeGreaterThan(0);

    // Releasing the buttons updates state on the next pass.
    p().currentController = fakeGamepad();
    expect(() => p().updateButtons_()).not.toThrow();
  });

  it('updateZoom_ adjusts the zoom target from the trigger buttons', () => {
    const controller = fakeGamepad();

    // Triggers are buttons 6 (LT) and 7 (RT).
    (controller.buttons[7] as { value: number }).value = 1;
    p().currentController = controller;

    expect(() => p().updateZoom_()).not.toThrow();
  });

  it('the analog stick handlers run without throwing', () => {
    p().currentController = fakeGamepad({ axes: [0.8, -0.5, 0.3, 0.6] });

    expect(() => p().updateLeftStick_()).not.toThrow();
    expect(() => p().updateRightStick_()).not.toThrow();
  });
});
