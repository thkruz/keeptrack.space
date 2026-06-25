import { SolarBody } from '@app/engine/core/interfaces';
import {
  ALL_BODIES,
  categoryOf,
  DWARF_PLANETS,
  isKnownBody,
  isPlanned,
  isSelectableBody,
  OTHER_CELESTIAL_BODIES,
  PLANETS,
  PLANNED_BODIES,
} from '@app/plugins/planets-menu/planets-bodies';

describe('planets-bodies', () => {
  it('covers every SolarBody exactly once across the three categories', () => {
    const all = [...PLANETS, ...DWARF_PLANETS, ...OTHER_CELESTIAL_BODIES];
    const enumValues = Object.values(SolarBody);

    expect(new Set(all).size).toBe(all.length); // no duplicates
    expect(new Set(all)).toEqual(new Set(enumValues)); // complete coverage
    expect(ALL_BODIES).toHaveLength(enumValues.length);
  });

  it('treats only the listed moons as planned', () => {
    for (const body of PLANNED_BODIES) {
      expect(isPlanned(body)).toBe(true);
      expect(isSelectableBody(body)).toBe(false);
    }
    expect(isPlanned(SolarBody.Mars)).toBe(false);
    expect(isPlanned(SolarBody.Moon)).toBe(false);
  });

  it('marks Moon and Sun as selectable other-bodies', () => {
    expect(isSelectableBody(SolarBody.Moon)).toBe(true);
    expect(isSelectableBody(SolarBody.Sun)).toBe(true);
    expect(isSelectableBody(SolarBody.Io)).toBe(false);
  });

  it('rejects unknown bodies', () => {
    expect(isKnownBody('Nibiru' as SolarBody)).toBe(false);
    expect(categoryOf('Nibiru' as SolarBody)).toBeNull();
  });

  it('classifies bodies into the correct category', () => {
    expect(categoryOf(SolarBody.Earth)).toBe('planets');
    expect(categoryOf(SolarBody.Pluto)).toBe('dwarfPlanets');
    expect(categoryOf(SolarBody.Moon)).toBe('otherCelestialBodies');
  });
});
