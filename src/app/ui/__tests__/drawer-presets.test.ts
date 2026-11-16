import { MenuMode } from '@app/engine/core/interfaces';
import { describe, expect, it } from 'vitest';
import { DRAWER_PRESET_VERSION, getPresetOpenGroups } from '../drawer-presets';
import { defaultOpenGroupKeys, isGroupExpanded } from '../plugin-drawer-helpers';

describe('drawer role presets (#124)', () => {
  it('has a version number', () => {
    expect(DRAWER_PRESET_VERSION).toBeGreaterThanOrEqual(1);
  });

  it('explorer, unknown and missing roles use the app default (empty list)', () => {
    expect(getPresetOpenGroups('explorer')).toEqual([]);
    expect(getPresetOpenGroups('wizard')).toEqual([]);
    expect(getPresetOpenGroups('toString')).toEqual([]);
    expect(getPresetOpenGroups(null)).toEqual([]);
  });

  it('operator opens sensors and analysis groups', () => {
    const keys = getPresetOpenGroups('operator');

    expect(keys).toContain(`mode-${MenuMode.SENSORS}`);
    expect(keys).toContain(`mode-${MenuMode.ANALYSIS}`);
  });

  it('returns a copy, so callers cannot mutate the table', () => {
    getPresetOpenGroups('developer').push('x');
    expect(getPresetOpenGroups('developer')).not.toContain('x');
  });

  it('a preset never overrides a group the user collapsed or opened', () => {
    const sensors = `mode-${MenuMode.SENSORS}`;
    const open = defaultOpenGroupKeys([`mode-${MenuMode.CATALOG}`, sensors], getPresetOpenGroups('operator'));

    expect(isGroupExpanded(sensors, {}, open)).toBe(true);
    expect(isGroupExpanded(sensors, { [sensors]: false }, open)).toBe(false);
    expect(isGroupExpanded(`mode-${MenuMode.CATALOG}`, { [`mode-${MenuMode.CATALOG}`]: true }, defaultOpenGroupKeys([], ['x']))).toBe(true);
  });
});
