import { buildPassCaveatLine } from '../reports-core';

describe('pass caveat zone wording (#125)', () => {
  it('says Site-local times when the sensor has its own zone', () => {
    expect(buildPassCaveatLine({ timeZone: 'America/New_York' })).toContain('Site-local times use the America/New_York zone');
  });

  it('says Local times use the display zone when the sensor has no zone', () => {
    const text = buildPassCaveatLine({ timeZone: undefined });

    expect(text).toContain('Local times use the');
    expect(text).not.toContain('Site-local');
  });
});
