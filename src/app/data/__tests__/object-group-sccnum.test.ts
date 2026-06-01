import { vi } from 'vitest';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { GroupType, ObjectGroup } from '@app/app/data/object-group';

/*
 * GroupData[GroupType.SCC_NUM] was widened from number[] to (number | string)[]
 * so constellations can be built from mixed-form catalog-number lists. The
 * resolution path (object-group.ts) maps every entry through
 * catalogManager.sccNum2Id, which is form-agnostic (numeric5, alpha-5 "T0001",
 * numeric6, extended), and drops unresolved entries.
 *
 * These tests mock sccNum2Id so we exercise the ObjectGroup wiring in isolation
 * (no real catalog): the contract is that each entry reaches sccNum2Id verbatim
 * — never pre-parsed/stringified — and that nulls are filtered from .ids.
 */
describe('ObjectGroup_SCC_NUM_mixedFormResolution', () => {
  // Each input form maps to a distinct resolved internal id.
  const resolveTable: Record<string, number> = {
    25544: 10,
    T0001: 20,
    799500766: 30,
  };
  let sccNumSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sccNumSpy = vi.fn((scc: string | number) => {
      const key = typeof scc === 'number' ? scc.toString() : scc;

      return key in resolveTable ? resolveTable[key] : null;
    });

    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({
      objectCache: [],
      sccNum2Id: sccNumSpy,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it('passes a numeric entry through as a number (no caller-side stringify)', () => {
    // eslint-disable-next-line no-new
    new ObjectGroup(GroupType.SCC_NUM, [25544]);

    expect(sccNumSpy).toHaveBeenCalledWith(25544);
  });

  it('passes alpha-5 and extended string entries through verbatim', () => {
    // eslint-disable-next-line no-new
    new ObjectGroup(GroupType.SCC_NUM, ['T0001', '799500766']);

    expect(sccNumSpy).toHaveBeenCalledWith('T0001');
    expect(sccNumSpy).toHaveBeenCalledWith('799500766');
  });

  it('collects resolved ids and drops unresolved (null) entries, preserving order', () => {
    const group = new ObjectGroup(GroupType.SCC_NUM, [25544, 'T0001', 'ZZZZZ', '799500766']);

    // 25544 -> 10, T0001 -> 20, ZZZZZ -> null (dropped), 799500766 -> 30
    expect(group.ids).toEqual([10, 20, 30]);
  });
});
