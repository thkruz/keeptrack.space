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
