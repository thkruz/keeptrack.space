import { analystParentSccNum, covarianceSourceOf, covarianceTleFields, type SatelliteLookup, uncertaintyParentOf } from '@app/engine/conjunction/uncertainty-source';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';

const L8_TLE1 = '1 39084U 13008A   22221.78099992  .00000176  00000-0  49109-4 0  9999';
const L8_TLE2 = '2 39084  98.2198 291.4222 0001287  95.0667 265.0678 14.57105218504766';

const sat = (sccNum: string, name: string, derivedFromSccNum?: string): Satellite => {
  const s = new Satellite({ name, tle1: L8_TLE1 as TleLine1, tle2: L8_TLE2 as TleLine2 });

  s.sccNum = sccNum;
  if (derivedFromSccNum) {
    s.derivedFromSccNum = derivedFromSccNum;
  }

  return s;
};

const lookupOf =
  (...sats: Satellite[]): SatelliteLookup =>
  (scc) =>
    sats.find((s) => s.sccNum === scc) ?? null;

describe('uncertainty-source', () => {
  const root = sat('39084', 'LANDSAT 8');
  const clone = sat('T0001', 'LANDSAT 8 (burn 1)', '39084');
  const cloneOfClone = sat('T0002', 'LANDSAT 8 (burn 2)', 'T0001');

  it('reads the immediate parent from any lineage alias, ignoring a self reference', () => {
    expect(analystParentSccNum(clone)).toBe('39084');
    expect(analystParentSccNum({ sccNum: '1', parentSccNum: '2' })).toBe('2');
    expect(analystParentSccNum({ sccNum: '1', derivedFrom: '3' })).toBe('3');
    expect(analystParentSccNum({ sccNum: '1', derivedFromSccNum: '1' })).toBeNull();
    expect(analystParentSccNum(root)).toBeNull();
    expect(analystParentSccNum(null)).toBeNull();
  });

  it('a catalog object has no uncertainty parent and is its own covariance source', () => {
    const lookup = lookupOf(root, clone);

    expect(uncertaintyParentOf(root, lookup)).toBeNull();
    expect(covarianceSourceOf(root, lookup)).toBe(root);
    expect(covarianceTleFields(root, lookup)).toEqual({});
  });

  it('a clone resolves to its catalog parent', () => {
    const lookup = lookupOf(root, clone);

    expect(uncertaintyParentOf(clone, lookup)).toBe(root);
    expect(covarianceSourceOf(clone, lookup)).toBe(root);
    expect(covarianceTleFields(clone, lookup)).toEqual({ covarianceTle1: root.tle1, covarianceTle2: root.tle2 });
  });

  it('a clone of a clone resolves to the root catalog object', () => {
    expect(uncertaintyParentOf(cloneOfClone, lookupOf(root, clone, cloneOfClone))).toBe(root);
  });

  it('stops at the deepest ancestor found when one further up has left the catalog', () => {
    expect(uncertaintyParentOf(cloneOfClone, lookupOf(clone, cloneOfClone))).toBe(clone);
  });

  it('uses its own uncertainty when the parent is not in the catalog', () => {
    const lookup = lookupOf(clone);

    expect(uncertaintyParentOf(clone, lookup)).toBeNull();
    expect(covarianceSourceOf(clone, lookup)).toBe(clone);
  });

  it('does not loop on a lineage cycle', () => {
    const a = sat('T0010', 'A', 'T0011');
    const b = sat('T0011', 'B', 'T0010');

    expect(uncertaintyParentOf(a, lookupOf(a, b))).toBe(b);
  });
});
