import { describe, expect, it } from 'vitest';
import { getClockMode } from '../../date-time-manager/date-time-manager';
import { buildInfoBoxText } from '../sat-info-box';

describe('buildInfoBoxText', () => {
  it('lists name, UTC time and visible rows', () => {
    document.body.innerHTML = `<div id="b"><span id="sat-info-title-name">ISS</span>
      <div class="sat-info-row"><div class="sat-info-key">Altitude</div><div class="sat-info-value">437.45 km</div></div>
      <div class="sat-info-row"><div class="sat-info-key">Period</div><div class="sat-info-value">92.95 min</div></div></div>`;
    const text = buildInfoBoxText(document.getElementById('b'), new Date('2026-11-11T00:00:00Z'));

    expect(text).toBe('ISS (2026-11-11T00:00:00.000Z UTC)\nAltitude: 437.45 km\nPeriod: 92.95 min');
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
