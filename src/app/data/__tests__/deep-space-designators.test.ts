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
    DeepSpaceDesignators.register({ kind: 'knownObject', displayName: 'Voyager 2', sccNum: '10271' });
    expect(DeepSpaceDesignators.lookupSccNum('10271')?.displayName).toBe('Voyager 2');

    DeepSpaceDesignators.reset();
    expect(DeepSpaceDesignators.lookupSccNum('10271')).toBeNull();
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
