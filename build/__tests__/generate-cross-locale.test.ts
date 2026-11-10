import { describe, expect, it } from 'vitest';
import { bottomIconSlug as runtimeSlug } from '../../src/engine/plugins/bottom-icon-id';
import { bottomIconSlug, buildCrossLocaleTable } from '../utils/generate-cross-locale';

describe('buildCrossLocaleTable', () => {
  it('collects default sensor names and maps translated icon slugs to English ones', () => {
    const table = buildCrossLocaleTable({
      en: { sensorMath: { customSensorDefaultName: 'Custom Sensor' }, plugins: { SensorListPlugin: { bottomIconLabel: 'Sensors' }, Night: { bottomIconLabel: 'Night Mode' } } },
      de: { sensorMath: { customSensorDefaultName: 'Eigener Sensor' }, plugins: { SensorListPlugin: { bottomIconLabel: 'Sensoren' }, Night: { bottomIconLabel: 'Night Mode' } } },
    });

    expect(table.customSensorDefaultNames).toEqual(['Custom Sensor', 'Eigener Sensor']);
    // Unchanged translations already slug to a current English id and are skipped.
    expect(table.legacyBottomIconIds).toEqual({ 'sensoren-bottom-icon': 'sensors-bottom-icon' });
  });

  it('uses the same slug rule as the runtime', () => {
    for (const label of ['Sensors', 'Night Mode', 'Find Satellite Now']) {
      expect(bottomIconSlug(label)).toBe(runtimeSlug(label));
    }
  });
});
