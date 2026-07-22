import { DeepSpaceDesignators } from '@app/app/data/deep-space-designators';
import { DEEP_SPACE_SATELLITE_CONFIGS } from '@app/engine/rendering/draw-manager/celestial-bodies/deep-space-satellite-catalog';

describe('DeepSpaceDesignators', () => {
  afterEach(() => {
    DeepSpaceDesignators.reset();
  });

  it('seeds Voyager 1 from the probe configs', () => {
    const entry = DeepSpaceDesignators.lookupSccNum('10321');

    expect(entry).not.toBeNull();
    expect(entry?.kind).toBe('probe');
    expect(entry?.bodyName).toBe('Voyager 1');
  });

  it('seeds Voyager 2 from the probe configs', () => {
    const entry = DeepSpaceDesignators.lookupSccNum('10271');

    expect(entry?.kind).toBe('probe');
    expect(entry?.bodyName).toBe('Voyager 2');
  });

  it('seeds known objects without ephemeris (SATCAT-verified designators)', () => {
    // Parker and JWST stay knownObject until the pro missions plugin registers
    // its deferred loaders for them.
    expect(DeepSpaceDesignators.lookupSccNum('43592')?.displayName).toBe('Parker Solar Probe');
    expect(DeepSpaceDesignators.lookupSccNum('50463')?.displayName).toBe('JWST');
    expect(DeepSpaceDesignators.lookupSccNum('50463')?.kind).toBe('knownObject');
  });

  it('upgrades the Pioneer/New Horizons knownObject seeds to probe seeds', () => {
    expect(DeepSpaceDesignators.lookupSccNum('5860')?.kind).toBe('probe');
    expect(DeepSpaceDesignators.lookupSccNum('5860')?.bodyName).toBe('Pioneer 10');
    expect(DeepSpaceDesignators.lookupSccNum('6421')?.kind).toBe('probe');
    expect(DeepSpaceDesignators.lookupSccNum('6421')?.bodyName).toBe('Pioneer 11');
    expect(DeepSpaceDesignators.lookupSccNum('28928')?.kind).toBe('probe');
    expect(DeepSpaceDesignators.lookupSccNum('28928')?.bodyName).toBe('New Horizons');
  });

  it('upgrades a knownObject in place when a functional entry registers', () => {
    const focus = () => Promise.resolve(true);

    DeepSpaceDesignators.register({ kind: 'deferred', displayName: 'JWST OEM', sccNum: '50463', intlDes: '2021-130A', focus });

    expect(DeepSpaceDesignators.lookupSccNum('50463')?.kind).toBe('deferred');
    expect(DeepSpaceDesignators.lookupIntlDes('2021-130A')?.kind).toBe('deferred');

    // reset drops the runtime upgrade and restores the knownObject seed
    DeepSpaceDesignators.reset();
    expect(DeepSpaceDesignators.lookupSccNum('50463')?.kind).toBe('knownObject');
  });

  it('tolerates zero-padded catalog numbers', () => {
    expect(DeepSpaceDesignators.lookupSccNum('010321')?.bodyName).toBe('Voyager 1');
    expect(DeepSpaceDesignators.lookupSccNum(' 10321 ')?.bodyName).toBe('Voyager 1');
  });

  it('looks up international designators case-insensitively', () => {
    expect(DeepSpaceDesignators.lookupIntlDes('1977-084a')?.bodyName).toBe('Voyager 1');
    expect(DeepSpaceDesignators.lookupIntlDes('1977-084A')?.bodyName).toBe('Voyager 1');
  });

  it('returns null for unknown designators', () => {
    expect(DeepSpaceDesignators.lookupSccNum('99999')).toBeNull();
    expect(DeepSpaceDesignators.lookupIntlDes('1999-999Z')).toBeNull();
  });

  it('registers runtime entries and clears them on reset', () => {
    DeepSpaceDesignators.register({ kind: 'knownObject', displayName: 'Some Probe', sccNum: '99001' });
    expect(DeepSpaceDesignators.lookupSccNum('99001')?.displayName).toBe('Some Probe');

    DeepSpaceDesignators.reset();
    expect(DeepSpaceDesignators.lookupSccNum('99001')).toBeNull();
    // Seeds survive the reset
    expect(DeepSpaceDesignators.lookupSccNum('10321')).not.toBeNull();
  });

  it('rejects duplicate designators', () => {
    DeepSpaceDesignators.register({ kind: 'knownObject', displayName: 'Impostor', sccNum: '10321' });
    expect(DeepSpaceDesignators.lookupSccNum('10321')?.displayName).toBe('Voyager 1');
  });

  it('ignores entries without any designator', () => {
    expect(() => DeepSpaceDesignators.register({ kind: 'knownObject', displayName: 'Nothing' })).not.toThrow();
  });

  it('reverse-maps a scene body name to its catalog number', () => {
    expect(DeepSpaceDesignators.sccNumForBody('Voyager 1')).toBe('10321');
    expect(DeepSpaceDesignators.sccNumForBody('Nibiru')).toBeNull();
  });

  // Audit: every probe config that ships must be reachable from a URL.
  it('every deep-space probe config carries valid designators', () => {
    for (const config of DEEP_SPACE_SATELLITE_CONFIGS) {
      expect(config.sccNum, `${config.name} is missing sccNum`).toBeDefined();
      expect(config.intlDes, `${config.name} is missing intlDes`).toBeDefined();
      expect(config.sccNum).toMatch(/^\d{1,9}$/u);
      expect(config.intlDes).toMatch(/^\d{4}-\d{3}[A-Z]{1,3}$/u);
    }
  });
});
