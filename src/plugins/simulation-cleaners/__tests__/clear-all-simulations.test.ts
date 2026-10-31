import { ServiceLocator } from '@app/engine/core/service-locator';
import { SimulationCleaners } from '@app/engine/simulation/simulation-cleaners';
import { ModalConfirm } from '@app/engine/ui/modal-confirm';
import { buildClearAllMessage, clearAllSimulations, confirmAndClearAllSimulations } from '@app/plugins/simulation-cleaners/clear-all-simulations';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('clear all simulations', () => {
  let toast: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupStandardEnvironment();
    SimulationCleaners.reset();
    toast = vi.fn();
    vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(toast as never);
    vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    SimulationCleaners.reset();
    vi.restoreAllMocks();
  });

  it('lists each non-empty category with its count in the confirmation message', () => {
    SimulationCleaners.register({ id: 'x', label: 'Foo', count: () => 2, clear: vi.fn() });
    SimulationCleaners.register({ id: 'y', label: 'Bar', count: () => 5, clear: vi.fn() });
    SimulationCleaners.register({ id: 'z', label: 'None', count: () => 0, clear: vi.fn() });

    const message = buildClearAllMessage();

    expect(message).toContain('Foo: 2');
    expect(message).toContain('Bar: 5');
    expect(message).not.toContain('None');
  });

  it('opens the confirm modal, and clears only after confirming', () => {
    const clear = vi.fn();
    const open = vi.spyOn(ModalConfirm.getInstance(), 'open').mockImplementation(() => undefined);

    SimulationCleaners.register({ id: 'x', label: 'Foo', count: () => 2, clear });
    confirmAndClearAllSimulations();

    expect(open).toHaveBeenCalledTimes(1);
    expect(clear).not.toHaveBeenCalled();

    (open.mock.calls[0][0] as () => void)();

    expect(clear).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('2'), expect.anything());
  });

  it('toasts instead of opening the modal when nothing is active', () => {
    const open = vi.spyOn(ModalConfirm.getInstance(), 'open').mockImplementation(() => undefined);

    vi.spyOn(SimulationCleaners, 'totalCount').mockReturnValue(0);
    confirmAndClearAllSimulations();

    expect(open).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalled();
  });

  it('clearAllSimulations returns the removed total', () => {
    vi.spyOn(SimulationCleaners, 'clearAll').mockReturnValue([{ id: 'x', label: 'Foo', count: 2 }]);

    expect(clearAllSimulations()).toBe(2);
  });
});
