import { describe, expect, it } from 'vitest';
import { ATTACKER_SITES, DEFAULT_SCENARIOS, getAttackerSite, getSessionDefaultScenario, resetSessionDefaultScenario, targetLat } from '../missile-arsenal';

describe('missile default scenarios', () => {
  it('lists 6-8 scenarios from Iran, China, Russia and North Korea', () => {
    expect(DEFAULT_SCENARIOS.length).toBeGreaterThanOrEqual(6);
    expect(DEFAULT_SCENARIOS.length).toBeLessThanOrEqual(8);
    const countries = new Set(DEFAULT_SCENARIOS.map((s) => getAttackerSite(s.attackerId)?.country));

    expect([...countries].sort()).toEqual(['China', 'Iran', 'North Korea', 'Russia']);
  });

  it('every scenario resolves to a real site and target', () => {
    for (const s of DEFAULT_SCENARIOS) {
      expect(ATTACKER_SITES.some((site) => site.id === s.attackerId && !site.isSub)).toBe(true);
      expect(targetLat(s.targetId)).toBeTypeOf('number');
    }
  });

  it('picks one scenario from the list and keeps it for the session', () => {
    resetSessionDefaultScenario();
    const first = getSessionDefaultScenario(() => 0.5);

    expect(DEFAULT_SCENARIOS).toContain(first);
    expect(getSessionDefaultScenario(() => 0.99)).toBe(first);
    expect(getSessionDefaultScenario()).toBe(first);
    resetSessionDefaultScenario();
  });
});
