import { getEl } from '@app/engine/utils/get-el';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SatInfoBoxObject } from '@app/plugins/sat-info-box-object/sat-info-box-object';
import { EL } from '@app/plugins/sat-info-box-object/sat-info-box-object-html';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SatInfoBoxObject secondary RIC convention', () => {
  let plugin: SatInfoBoxObject;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    plugin = new SatInfoBoxObject();
    websiteInit(plugin);
    document.body.insertAdjacentHTML('beforeend', (plugin as unknown as { createSecondarySection: () => string }).createSecondarySection());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('states the RIC sign convention once, above the Linear/Radial/In-Track/Cross-Track rows', () => {
    const section = getEl('secondary-sat-info')!;
    const convention = getEl(EL.RIC_CONVENTION)!;

    expect(convention.textContent).toBe("RIC = secondary minus primary, in the primary's RIC frame.");
    expect(section.querySelectorAll(`#${EL.RIC_CONVENTION}`)).toHaveLength(1);
    // It sits before the first value row so it is read before the numbers.
    expect(convention.compareDocumentPosition(getEl(EL.RAD)!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('matches the sign of Satellite.toRIC as the info box calls it (secondary.toRIC(primary))', () => {
    const date = new Date('2022-01-01T00:00:00Z');
    const primary = new Satellite({ ...defaultSat, id: 0 });
    const secondary = new Satellite({ ...defaultSat, id: 1 });
    const ric = secondary.toRIC(primary, date);
    const later = new Date(date.getTime() + 60_000);
    // A copy of the primary one minute ahead sits ahead of the primary in-track: positive I.
    const ahead = { toJ2000: () => primary.toJ2000(later) } as unknown as Satellite;
    const aheadRic = Satellite.prototype.toRIC.call(ahead, primary, date);

    expect(ric.range).toBeCloseTo(0, 6);
    expect(aheadRic.position.y).toBeGreaterThan(0);
  });
});
