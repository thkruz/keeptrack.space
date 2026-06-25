import { ATTACKER_SITES, CUSTOM_TARGET_ID, attackerDesc, getAttackerSite, targetLat, targetLon } from '@app/plugins/missile/missile-arsenal';

describe('missile-arsenal registry', () => {
  it('resolves Russian options to the correct site (regression for the dropdown<->data desync)', () => {
    // Before the registry, value 206 mapped to data index 6 (Kozel'sk) instead of
    // Krasnoyarsk, and every Russian option after it was off-by-N. Pin the cases
    // that used to be wrong.
    expect(attackerDesc(getAttackerSite(206)!)).toContain('Krasnoyarsk');
    expect(attackerDesc(getAttackerSite(207)!)).toContain('Nizhniy Tagil');
    expect(attackerDesc(getAttackerSite(213)!)).toContain('Borei');
    expect(attackerDesc(getAttackerSite(215)!)).toContain('Layner');
  });

  it('never resolves an exposed option to the skipped Kozel`sk record', () => {
    for (const site of ATTACKER_SITES) {
      expect(attackerDesc(site)).not.toContain('Kozel');
    }
  });

  it('flags exactly the submarine / mobile launch sites', () => {
    const subs = ATTACKER_SITES.filter((s) => s.isSub).map((s) => s.id).sort((a, b) => a - b);

    expect(subs).toEqual([100, 213, 214, 215, 321, 400, 500, 600]);
  });

  it('every option has a unique value', () => {
    const ids = ATTACKER_SITES.map((s) => s.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('preset targets resolve to coordinates and custom impact does not', () => {
    expect(targetLat(0)).toBeCloseTo(38.951, 2); // Washington DC
    expect(targetLon(0)).toBeCloseTo(-77.013, 2);
    expect(targetLat(CUSTOM_TARGET_ID)).toBeUndefined();
    expect(targetLon(CUSTOM_TARGET_ID)).toBeUndefined();
  });
});
