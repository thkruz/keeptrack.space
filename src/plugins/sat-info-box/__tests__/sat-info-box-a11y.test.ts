import { describe, expect, it } from 'vitest';
import { getClockMode } from '../../date-time-manager/date-time-manager';
import { buildInfoBoxText, buildSecondaryText } from '../sat-info-box';

describe('buildInfoBoxText', () => {
  it('lists name, UTC time and visible rows', () => {
    document.body.innerHTML = `<div id="b"><span id="sat-info-title-name">ISS</span>
      <div class="sat-info-row"><div class="sat-info-key">Altitude</div><div class="sat-info-value">437.45 km</div></div>
      <div class="sat-info-row"><div class="sat-info-key">Period</div><div class="sat-info-value">92.95 min</div></div></div>`;
    const text = buildInfoBoxText(document.getElementById('b'), new Date('2026-11-11T00:00:00Z'));

    expect(text).toBe('ISS (2026-11-11T00:00:00.000Z UTC)\nAltitude: 437.45 km\nPeriod: 92.95 min');
  });
  it('leaves the info-circle "i" out of copied values (#300)', () => {
    document.body.innerHTML = `<div id="b"><span id="sat-info-title-name">ISS</span>
      <div class="sat-info-row"><div class="sat-info-key">Regime</div><div class="sat-info-value">LEO<span class="sat-info-circle" kt-tooltip="x">i</span></div></div></div>`;
    const text = buildInfoBoxText(document.getElementById('b'), new Date('2026-11-11T00:00:00Z'));

    expect(text).toBe('ISS (2026-11-11T00:00:00.000Z UTC)\nRegime: LEO');
  });
  it('returns empty text without a box', () => {
    expect(buildInfoBoxText(null, new Date())).toBe('');
  });
});

describe('getClockMode', () => {
  it('classifies live, paused and simulated', () => {
    expect(getClockMode(1, 1000, 1500)).toBe('live');
    expect(getClockMode(0, 1000, 1000)).toBe('paused');
    expect(getClockMode(1, 1000, 100000)).toBe('simulated');
    expect(getClockMode(10, 1000, 1000)).toBe('simulated');
  });
});

describe('buildSecondaryText', () => {
  it('adds a headed block with identifiers and orbit values', () => {
    const text = buildSecondaryText({ name: 'HST', sccNum: '20580', intlDes: '1990-037B', inclination: 28.47, period: 95.4 } as never, 'Secondary object');

    expect(text).toBe('--- Secondary object ---\nHST\nNORAD: 20580\nCOSPAR: 1990-037B\nInclination: 28.47 deg\nPeriod: 95.40 min');
  });
  it('is empty without a secondary object', () => {
    expect(buildSecondaryText(null, 'x')).toBe('');
  });
});
