import { PayloadStatus, SpaceObjectType } from '@ootk/src/main';
import { describe, expect, it } from 'vitest';
import enSrc from '../locales/en.src.json';
import { classifyActivity, classifyMission, getObjectSummaryKey, getProvidedObjectSummary, registerObjectSummaryProvider } from '../object-summary';

const fakeObj = (type: SpaceObjectType, extra: Record<string, unknown> = {}) => ({ type, isMissile: () => false, ...extra }) as never;

describe('object summary', () => {
  it('classifies mission text', () => {
    expect(classifyMission('Weather')).toBe('weather');
    expect(classifyMission('astronomy observatory')).toBe('astronomy');
    expect(classifyMission('Military reconnaissance')).toBe('military');
    expect(classifyMission('Earth observation')).toBe('earthObservation');
    expect(classifyMission('technology demonstration')).toBe('technology');
    expect(classifyMission('')).toBe('other');
    expect(classifyMission(undefined)).toBe('other');
    expect(classifyMission('zzz')).toBe('other');
  });

  it('maps status to activity', () => {
    expect(classifyActivity(PayloadStatus.OPERATIONAL)).toBe('active');
    expect(classifyActivity(PayloadStatus.EXTENDED_MISSION)).toBe('active');
    expect(classifyActivity(PayloadStatus.NONOPERATIONAL)).toBe('inactive');
    expect(classifyActivity(PayloadStatus.DECAYED)).toBe('inactive');
    expect(classifyActivity(PayloadStatus.SPARE)).toBe('plain');
    expect(classifyActivity(undefined)).toBe('plain');
  });

  it('builds keys that exist in the English locale', () => {
    const summary = (enSrc as unknown as { SatInfoBoxObject: { Summary: Record<string, unknown> } }).SatInfoBoxObject.Summary;
    const lookup = (key: string) =>
      key
        .replace('SatInfoBoxObject.Summary.', '')
        .split('.')
        .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], summary);

    const cases = [
      fakeObj(SpaceObjectType.PAYLOAD, { status: PayloadStatus.NONOPERATIONAL, mission: 'Weather' }),
      fakeObj(SpaceObjectType.PAYLOAD, { status: PayloadStatus.OPERATIONAL, mission: 'astronomy' }),
      fakeObj(SpaceObjectType.PAYLOAD, { status: PayloadStatus.UNKNOWN, mission: '' }),
      fakeObj(SpaceObjectType.ROCKET_BODY),
      fakeObj(SpaceObjectType.DEBRIS),
      fakeObj(SpaceObjectType.SPECIAL),
      { type: SpaceObjectType.UNKNOWN, isMissile: () => true } as never,
    ];

    for (const c of cases) {
      const key = getObjectSummaryKey(c);

      expect(key).not.toBeNull();
      expect(typeof lookup(key!)).toBe('string');
    }
    expect(lookup(getObjectSummaryKey(cases[0])!)).toBe('Inactive weather satellite');
    expect(lookup(getObjectSummaryKey(cases[3])!)).toBe('Rocket body left in orbit');
  });

  it('returns null for no object or unknown type', () => {
    expect(getObjectSummaryKey(null)).toBeNull();
    expect(getObjectSummaryKey(fakeObj(SpaceObjectType.UNKNOWN))).toBeNull();
  });

  it('lets a registered provider override the line', () => {
    const obj = fakeObj(SpaceObjectType.PAYLOAD);

    expect(getProvidedObjectSummary(obj)).toBeNull();
    registerObjectSummaryProvider(() => 'AI text');
    expect(getProvidedObjectSummary(obj)).toBe('AI text');
  });
});
