import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { startRelay, type RunningRelay } from '../../embed-relay/src/server.js';
import { connectKeepTrack, KeepTrackRemoteError } from '../src/index.js';
import { RELAY_PROTOCOL_VERSION } from '../src/contract.js';

const TOKEN = 'tok';
let relay: RunningRelay;
const engines: WebSocket[] = [];
const url = () => `ws://127.0.0.1:${relay.port}`;

beforeEach(async () => {
  relay = await startRelay({ token: TOKEN, port: 0, heartbeatMs: 0 });
});
afterEach(async () => {
  for (const e of engines.splice(0)) {
    e.terminate();
  }
  await relay.close();
});

/** Engine stub: answers commands from a handler and exposes event emission. */
function engineStub(handler: (cmd: string, args: unknown[]) => unknown | Promise<unknown>, session = 's') {
  return new Promise<{ emit: (name: string, payload: unknown) => void; ws: WebSocket; received: Array<{ cmd: string; args: unknown[] }> }>((resolve) => {
    const ws = new WebSocket(url());
    const received: Array<{ cmd: string; args: unknown[] }> = [];

    engines.push(ws);
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', protocol: RELAY_PROTOCOL_VERSION, role: 'engine', session, token: TOKEN, apiVersion: '1.0.0' })));
    ws.on('message', async (d) => {
      const m = JSON.parse(d.toString());

      if (m.type === 'welcome') {
        resolve({ ws, received, emit: (name, payload) => ws.send(JSON.stringify({ type: 'event', name, payload })) });
      } else if (m.type === 'command') {
        received.push({ cmd: m.command.cmd, args: m.command.args });
        try {
          const result = await handler(m.command.cmd, m.command.args ?? []);

          ws.send(JSON.stringify({ type: 'result', result: { id: m.command.id, ok: true, result: result ?? null } }));
        } catch (e) {
          ws.send(JSON.stringify({ type: 'result', result: { id: m.command.id, ok: false, error: { code: 'OBJECT_NOT_FOUND', message: String(e) } } }));
        }
      }
    });
  });
}

describe('connectKeepTrack', () => {
  it('rejects with CLOSED on a bad token', async () => {
    await expect(connectKeepTrack({ url: url(), session: 's', token: 'wrong' })).rejects.toMatchObject({ code: 'CLOSED' });
  });

  it('calls typed methods with positional args and resolves results', async () => {
    const eng = await engineStub((cmd, args) => (cmd === 'getTime' ? { timeMs: 5, rate: 1, paused: false } : { cmd, args }));
    const kt = await connectKeepTrack({ url: url(), session: 's', token: TOKEN });

    expect(kt.engineOnline).toBe(true);
    expect(kt.engineApiVersion).toBe('1.0.0');
    expect(await kt.getTime()).toEqual({ timeMs: 5, rate: 1, paused: false });
    expect(await kt.getPosition({ norad: '25544' }, 123)).toEqual({ cmd: 'getPosition', args: [{ norad: '25544' }, 123] });
    expect(eng.received.map((r) => r.cmd)).toEqual(['getTime', 'getPosition']);
    kt.close();
  });

  it('rejects with the engine error code', async () => {
    await engineStub(() => {
      throw new Error('nope');
    });
    const kt = await connectKeepTrack({ url: url(), session: 's', token: TOKEN });
    const err = await kt.select({ norad: '1' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(KeepTrackRemoteError);
    expect((err as KeepTrackRemoteError).code).toBe('OBJECT_NOT_FOUND');
    kt.close();
  });

  it('times out slow commands per call and by default option', async () => {
    await engineStub(() => new Promise(() => undefined));
    const kt = await connectKeepTrack({ url: url(), session: 's', token: TOKEN, commandTimeoutMs: 80 });

    await expect(kt.getTime()).rejects.toMatchObject({ code: 'TIMEOUT' });
    await expect(kt.command('getTime', [], { timeoutMs: 30 })).rejects.toMatchObject({ code: 'TIMEOUT' });
    kt.close();
  });

  it('fails with NOT_READY when no engine is online, and waitForEngine resolves when one connects', async () => {
    const kt = await connectKeepTrack({ url: url(), session: 's', token: TOKEN });

    expect(kt.engineOnline).toBe(false);
    await expect(kt.getTime()).rejects.toMatchObject({ code: 'NOT_READY' });
    const wait = kt.waitForEngine(2000);

    await engineStub(() => null);
    await wait;
    expect(kt.engineOnline).toBe(true);
    kt.close();
  });

  it('delivers events, honors subscribe, and reports engine status', async () => {
    const eng = await engineStub(() => null);
    const kt = await connectKeepTrack({ url: url(), session: 's', token: TOKEN });
    const seen: string[] = [];
    const statuses: boolean[] = [];

    kt.on('selectionChanged', (e) => seen.push(`sel:${e.source}`));
    kt.on('timeChanged', () => seen.push('time'));
    kt.onEngineStatus((s) => statuses.push(s.online));
    kt.subscribe(['selectionChanged']);
    await kt.getTime(); // round trip guarantees the subscribe frame was processed first
    eng.emit('timeChanged', { timeMs: 1, rate: 1, paused: false, source: 'user' });
    eng.emit('selectionChanged', { object: null, source: 'remote' });
    await new Promise((r) => setTimeout(r, 100));
    expect(seen).toEqual(['sel:remote']);
    eng.ws.close();
    await new Promise((r) => setTimeout(r, 100));
    expect(statuses).toEqual([false]);
    kt.close();
  });

  it('rejects pending calls and notifies onClose when the connection drops', async () => {
    await engineStub(() => new Promise(() => undefined));
    const kt = await connectKeepTrack({ url: url(), session: 's', token: TOKEN });
    const closed = new Promise<number>((r) => kt.onClose((i) => r(i.code)));
    const call = kt.getTime();

    await relay.close();
    await expect(call).rejects.toMatchObject({ code: 'CLOSED' });
    expect(typeof (await closed)).toBe('number');
    await expect(kt.getTime()).rejects.toMatchObject({ code: 'CLOSED' });
    relay = await startRelay({ token: TOKEN, port: 0, heartbeatMs: 0 });
  });

  it('screenshot returns base64; screenshotBytes decodes to bytes', async () => {
    const png = Buffer.from([137, 80, 78, 71]);

    await engineStub(() => png.toString('base64'));
    const kt = await connectKeepTrack({ url: url(), session: 's', token: TOKEN });

    expect(await kt.screenshot()).toBe(png.toString('base64'));
    expect([...(await kt.screenshotBytes())]).toEqual([137, 80, 78, 71]);
    kt.close();
  });
});
