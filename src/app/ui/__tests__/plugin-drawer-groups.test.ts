import { describe, expect, it } from 'vitest';
import { defaultOpenGroupKeys, isGroupExpanded } from '../plugin-drawer-helpers';

describe('drawer group defaults (#48)', () => {
  it('opens recent and the first group, collapses the rest', () => {
    const open = defaultOpenGroupKeys(['mode-catalog', 'mode-sensors', 'about']);

    expect(isGroupExpanded('recent', {}, open)).toBe(true);
    expect(isGroupExpanded('mode-catalog', {}, open)).toBe(true);
    expect(isGroupExpanded('mode-sensors', {}, open)).toBe(false);
    expect(isGroupExpanded('about', {}, open)).toBe(false);
  });

  it('a stored user choice beats the default either way', () => {
    const open = defaultOpenGroupKeys(['mode-catalog', 'mode-sensors']);

    expect(isGroupExpanded('mode-catalog', { 'mode-catalog': false }, open)).toBe(false);
    expect(isGroupExpanded('mode-sensors', { 'mode-sensors': true }, open)).toBe(true);
  });

  it('explicit default-open groups (onboarding) replace the first-group default', () => {
    const open = defaultOpenGroupKeys(['mode-catalog', 'mode-sensors'], ['mode-sensors']);

    expect(isGroupExpanded('mode-sensors', {}, open)).toBe(true);
    expect(isGroupExpanded('mode-catalog', {}, open)).toBe(false);
  });
});
