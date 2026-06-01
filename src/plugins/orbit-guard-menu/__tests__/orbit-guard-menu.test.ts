import { vi } from 'vitest';
import { OrbitGuardMenuPlugin } from '@app/plugins/orbit-guard-menu/orbit-guard-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';

// OrbitGuardMenuPlugin's init wires to DOM elements created by other plugins,
// so the standard init suite does not apply. Cover construction instead.
describe('OrbitGuardMenuPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs with the expected id', () => {
    const plugin = new OrbitGuardMenuPlugin();

    expect(plugin.id).toBe('OrbitGuardMenuPlugin');
  });
});
