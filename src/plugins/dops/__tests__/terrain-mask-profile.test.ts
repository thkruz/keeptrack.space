import { ElevationMask } from '@app/engine/ootk/src/sensor/FieldOfView';
import { Degrees } from '@ootk/src/main';
import { createDefaultProfile, createDefaultStore, createElevationMaskFn, getEffectiveElevation, TerrainMaskProfile } from '../terrain-mask-profile';

const profileWith = (masks: ElevationMask[], base = 10): TerrainMaskProfile => ({
  id: 'p1',
  name: 'p1',
  baseElevationMask: base as Degrees,
  masks,
});

describe('terrain-mask-profile', () => {
  it('createDefaultStore returns an empty store with no active profile', () => {
    const store = createDefaultStore();

    expect(store.activeProfileId).toBeNull();
    expect(store.profiles).toEqual([]);
  });

  it('createDefaultProfile returns a named profile with a default elevation mask', () => {
    const profile = createDefaultProfile('Ridge');

    expect(profile.name).toBe('Ridge');
    expect(profile.baseElevationMask).toBe(15);
    expect(profile.masks).toEqual([]);
    expect(typeof profile.id).toBe('string');
  });

  it('getEffectiveElevation returns the base mask when no sector mask applies', () => {
    expect(getEffectiveElevation(90 as Degrees, profileWith([]))).toBe(10);
  });

  it('getEffectiveElevation raises the floor for a normal-range sector mask', () => {
    const profile = profileWith([{ startAz: 0, stopAz: 180, minEl: 20 } as ElevationMask]);

    expect(getEffectiveElevation(90 as Degrees, profile)).toBe(20);
  });

  it('getEffectiveElevation handles a wraparound sector mask', () => {
    const profile = profileWith([{ startAz: 350, stopAz: 10, minEl: 25 } as ElevationMask]);

    expect(getEffectiveElevation(5 as Degrees, profile)).toBe(25);
    expect(getEffectiveElevation(355 as Degrees, profile)).toBe(25);
    // Outside the wraparound window -> falls back to the base mask.
    expect(getEffectiveElevation(180 as Degrees, profile)).toBe(10);
  });

  it('createElevationMaskFn returns a function evaluating the profile', () => {
    const fn = createElevationMaskFn(profileWith([], 12));

    expect(fn(45 as Degrees)).toBe(12);
  });
});
