import { Pickable } from '@app/engine/core/interfaces';
import { SmallSatColorScheme } from '@app/engine/rendering/color-schemes/smallsat-color-scheme';
import { Satellite, SpaceObjectType } from '@ootk/src/main';

/*
 * SmallSatColorScheme highlights small payloads (RCS < 0.5 m²). update() reads
 * isSatellite()/rcs/type and the satSmall flag, so plain predicate stubs cover
 * every branch.
 */
describe('SmallSatColorScheme', () => {
  let scheme: SmallSatColorScheme;

  beforeEach(() => {
    scheme = new SmallSatColorScheme();
  });

  const sat = (over: Record<string, unknown>) =>
    ({
      isSatellite: () => true,
      type: SpaceObjectType.PAYLOAD,
      ...over,
    }) as unknown as Satellite;

  it('highlights a small payload (rcs < 0.5)', () => {
    const result = scheme.update(sat({ rcs: 0.3 }));

    expect(result.pickable).toBe(Pickable.Yes);
    expect(result.color).toEqual(scheme.colorTheme.satSmall);
  });

  it('makes a large payload transparent and unpickable', () => {
    const result = scheme.update(sat({ rcs: 5 }));

    expect(result.pickable).toBe(Pickable.No);
    expect(result.color).toEqual(scheme.colorTheme.transparent);
  });

  it('ignores a small object that is not a payload', () => {
    const result = scheme.update(sat({ rcs: 0.1, type: SpaceObjectType.DEBRIS }));

    expect(result.pickable).toBe(Pickable.No);
    expect(result.color).toEqual(scheme.colorTheme.transparent);
  });

  it('deselects a small payload when the satSmall flag is off', () => {
    scheme.objectTypeFlags.satSmall = false;
    const result = scheme.update(sat({ rcs: 0.3 }));

    expect(result.pickable).toBe(Pickable.No);
    expect(result.color).toEqual(scheme.colorTheme.deselected);
  });

  it('treats a non-satellite as transparent', () => {
    const result = scheme.update({ isSatellite: () => false } as unknown as Satellite);

    expect(result.pickable).toBe(Pickable.No);
    expect(result.color).toEqual(scheme.colorTheme.transparent);
  });
});
