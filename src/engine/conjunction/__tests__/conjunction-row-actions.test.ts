import { selectPair } from '@app/engine/conjunction/conjunction-row-actions';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { vi } from 'vitest';

describe('conjunction-row-actions: selectPair', () => {
  let selectSat: ReturnType<typeof vi.fn>;
  let setSecondarySat: ReturnType<typeof vi.fn>;
  let getPlugin: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    selectSat = vi.fn();
    setSecondarySat = vi.fn();
    getPlugin = vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ selectSat, setSecondarySat } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('selects the primary, then sets the secondary without a toast', () => {
    expect(selectPair(10, 20)).toBe(true);

    expect(getPlugin).toHaveBeenCalledWith(SelectSatManager);
    expect(selectSat).toHaveBeenCalledWith(10);
    expect(setSecondarySat).toHaveBeenCalledWith(20, true);
    expect(selectSat.mock.invocationCallOrder[0]).toBeLessThan(setSecondarySat.mock.invocationCallOrder[0]);
  });

  it('selects nothing when either id is unresolved or negative', () => {
    expect(selectPair(null, 20)).toBe(false);
    expect(selectPair(10, null)).toBe(false);
    expect(selectPair(-1, 20)).toBe(false);

    expect(selectSat).not.toHaveBeenCalled();
    expect(setSecondarySat).not.toHaveBeenCalled();
  });

  it('selects nothing for a pair of one object', () => {
    expect(selectPair(7, 7)).toBe(false);
    expect(selectSat).not.toHaveBeenCalled();
  });

  it('returns false when the selection manager is not loaded', () => {
    getPlugin.mockReturnValue(null as never);

    expect(selectPair(10, 20)).toBe(false);
  });
});
