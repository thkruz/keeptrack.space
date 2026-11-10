import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeepTrackEmbed } from '../embed-api';
import { MAX_ACCESS_WINDOW_DAYS } from '../embed-data';
import type { EmbedSensor } from '../embed-types';
import { FakeEngine, GOOD_TLE1, GOOD_TLE2 } from './fake-engine';

const DAY = 86_400_000;
const s1: EmbedSensor = { hostId: 's1', name: 's1', lat: 0, lon: 0, altKm: 0, minAz: 0, maxAz: 360, minEl: 0, maxEl: 90, minRngKm: 0, maxRngKm: 3000 };

function make() {
  const engine = new FakeEngine('scenario');
  const api = new KeepTrackEmbed(engine, { config: {}, readyTarget: new EventTarget() });

  api.start();
  api.upsertObjects([{ hostId: 'a', name: 'A', tle1: GOOD_TLE1, tle2: GOOD_TLE2 }]);
  api.upsertSensors([s1]);

  return { api, engine };
}

beforeEach(() => {
  vi.stubGlobal('__IS_PRO__', false);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const A = { hostId: 'a' };

describe('data out', () => {
  it('returns a position, defaulting to engine time, and null for an unknown object', () => {
    const { api, engine } = make();

    expect(api.getPosition(A)?.timeMs).toBe(engine.timeMs);
    expect(api.getPosition(A, 123)?.timeMs).toBe(123);
    expect(api.getPosition({ hostId: 'missing' })).toBeNull();
  });

  it('rejects a non-finite time', () => {
    const { api } = make();

    expect(() => api.getPosition(A, Number.NaN)).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.getLookAngles('s1', A, 'x' as never)).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
  });

  it('look angles need a known sensor', () => {
    const { api } = make();

    expect(api.getLookAngles('s1', A)).toMatchObject({ azDeg: 10, elDeg: 20, inFov: true });
    expect(() => api.getLookAngles('zz', A)).toThrowError(expect.objectContaining({ code: 'SENSOR_NOT_FOUND' }));
    expect(api.getLookAngles('s1', { hostId: 'missing' })).toBeNull();
  });

  it('validates access window arguments and caps the span at 14 days', () => {
    const { api, engine } = make();
    const t0 = 1_700_000_000_000;

    expect(() => api.getAccessWindows('s1', A, t0, t0)).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.getAccessWindows('s1', A, Number.NaN, t0)).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.getAccessWindows('s1', A, t0, t0 + (MAX_ACCESS_WINDOW_DAYS + 1) * DAY)).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.getAccessWindows('zz', A, t0, t0 + DAY)).toThrowError(expect.objectContaining({ code: 'SENSOR_NOT_FOUND' }));
    expect(() => api.getAccessWindows('s1', { hostId: 'missing' }, t0, t0 + DAY)).toThrowError(expect.objectContaining({ code: 'OBJECT_NOT_FOUND' }));
    expect(engine.accessCalls).toHaveLength(0);
    expect(api.getAccessWindows('s1', A, t0, t0 + MAX_ACCESS_WINDOW_DAYS * DAY)).toHaveLength(1);
  });

  it('screenshot resolves a PNG blob, and execute() returns it as base64', async () => {
    const { api } = make();

    expect((await api.screenshot()).type).toBe('image/png');
    const res = await api.execute({ cmd: 'screenshot' });

    expect(res.ok).toBe(true);
  });
});

describe('setUi', () => {
  it('forwards runtime flags to the engine and never throws on junk', () => {
    const { api, engine } = make();

    api.setUi({ keyboard: false, toasts: false, contextMenu: true });
    expect(engine.runtimeUi.at(-1)).toMatchObject({ keyboard: false, toasts: false, contextMenu: true });
    expect(() => api.setUi(null as never)).not.toThrow();
    expect(() => api.setUi({ keyboard: 'yes' } as never)).not.toThrow();
  });

  it('keeps timeControls off while the host owns time', () => {
    const engine = new FakeEngine('scenario');
    const api = new KeepTrackEmbed(engine, { config: { ownership: { time: 'host' } }, readyTarget: new EventTarget() });

    api.start();
    api.setUi({ timeControls: true });
    expect(document.getElementById('keeptrack-embed-ui')?.textContent).toContain('#datetime-text');
    api.setUi({ topMenu: false });
    expect(document.getElementById('keeptrack-embed-ui')?.textContent).toContain('#datetime-text');
  });
});
