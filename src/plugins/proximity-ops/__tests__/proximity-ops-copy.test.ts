import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { LEO_PLANE_TOLERANCE_DEG, ProximityOps } from '@app/plugins/proximity-ops/proximity-ops';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/*
 * I-3: RPO is a co-orbital search by design. The form, help, and empty state
 * must say so (and print the real plane tolerance) so a crossing that RPO never
 * screened is not read as "no close approach".
 */
describe('ProximityOps scope copy', () => {
  let plugin: ProximityOps;
  type Internals = { finalizeResults_: (events: unknown[]) => void; lastCandidateCount_: number | null };
  const internals = () => plugin as unknown as Internals;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new ProximityOps();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('notes on the form that only co-orbital objects are checked, with the real tolerance', () => {
    const note = getEl('proximity-ops-scope-note')!.textContent!;

    expect(note).toContain(`within ${LEO_PLANE_TOLERANCE_DEG} deg of the target's inclination and orbital plane`);
    expect(note).toContain('use Debris Screening');
  });

  it('help explains the plane gate and points crossings at Debris Screening', () => {
    const help = plugin.getHelpConfig();
    const overview = help.sections![0].content;
    const modes = help.sections![1].content;

    expect(overview).toContain('slow, co-orbital approaches');
    expect(overview).toContain(`RAAN within ${LEO_PLANE_TOLERANCE_DEG} deg in LEO`);
    expect(overview).not.toContain('{deg}');
    expect(overview).not.toContain('returns every predicted encounter');
    expect(modes).toContain('against nearby objects in the same orbital plane');
  });

  it('empty single-satellite result names the co-orbital candidate count and Debris Screening', () => {
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

    internals().lastCandidateCount_ = 12;
    internals().finalizeResults_([]);

    const expected = 'No RPOs found among 12 co-orbital objects. Crossing traffic is not screened here; try Debris Screening.';

    expect(toast).toHaveBeenCalledWith(expected, expect.anything(), true);
    expect(getEl('proximity-ops-count')?.textContent).toBe(expected);
  });

  it('empty all-vs-all survey keeps the plain message', () => {
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

    internals().lastCandidateCount_ = null;
    internals().finalizeResults_([]);

    expect(toast).toHaveBeenCalledWith('No RPOs found!', expect.anything(), true);
  });
});
