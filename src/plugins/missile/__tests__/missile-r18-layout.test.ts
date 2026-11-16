import { MissileSimulatorPlugin } from '@app/plugins/missile/missile-simulator-plugin';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';

describe('MissileSimulatorPlugin R18 layout (#215)', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    websiteInit(new MissileSimulatorPlugin());
  });

  it('keeps attack type, launch and target in one card without section labels', () => {
    const card = document.getElementById('ms-type')!.closest('section')!;

    expect(card.contains(document.getElementById('ms-attacker'))).toBe(true);
    expect(card.contains(document.getElementById('ms-target'))).toBe(true);
    expect(card.querySelector('.kt-section-label')).toBeNull();
    expect(document.getElementById('ms-custom-opt')!.closest('section')).toBe(card);
  });
});
