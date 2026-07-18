import { ScenarioManagementPlugin } from '@app/plugins/scenario-management/scenario-management';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('ScenarioManagementPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs without throwing', () => {
    expect(() => new ScenarioManagementPlugin()).not.toThrow();
  });

  // The scenario time window can be set, cleared back to endless mode, or left
  // alone. An explicit null clears; an absent key keeps the current value.
  describe('updateScenario time-bound semantics', () => {
    let plugin: ScenarioManagementPlugin;
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-02T00:00:00Z');

    beforeEach(() => {
      plugin = new ScenarioManagementPlugin();
    });

    it('sets both bounds together', () => {
      expect(plugin.updateScenario({ startTime: start, endTime: end })).toBe(true);
      expect(plugin.scenario.startTime).toBe(start);
      expect(plugin.scenario.endTime).toBe(end);
    });

    it('clears both bounds when passed explicit nulls (endless mode)', () => {
      plugin.updateScenario({ startTime: start, endTime: end });

      expect(plugin.updateScenario({ startTime: null, endTime: null })).toBe(true);
      expect(plugin.scenario.startTime).toBeNull();
      expect(plugin.scenario.endTime).toBeNull();
    });

    it('rejects clearing only one bound and leaves the window intact', () => {
      plugin.updateScenario({ startTime: start, endTime: end });

      expect(plugin.updateScenario({ startTime: null })).toBe(false);
      expect(plugin.scenario.startTime).toBe(start);
      expect(plugin.scenario.endTime).toBe(end);
    });

    it('updates the name without disturbing existing bounds', () => {
      plugin.updateScenario({ startTime: start, endTime: end });

      expect(plugin.updateScenario({ name: 'Renamed' })).toBe(true);
      expect(plugin.scenario.name).toBe('Renamed');
      expect(plugin.scenario.startTime).toBe(start);
      expect(plugin.scenario.endTime).toBe(end);
    });
  });

  standardPluginSuite(ScenarioManagementPlugin, 'ScenarioManagementPlugin');
});
