import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { RELAY_PROTOCOL_VERSION } from '../src/contract.js';
import { type RunningRelay, startRelay } from '../src/server.js';

const TOKEN = 'secret';
let relay: RunningRelay;
const sockets: WebSocket[] = [];

beforeEach(async () => {
  relay = await startRelay({ token: TOKEN, port: 0, helloTimeoutMs: 300, heartbeatMs: 0, maxPayload: 4096 });
});
afterEach(async () => {
  for (const s of sockets.splice(0)) {
    s.terminate();
  }
  await relay.close();
});

interface Peer {
  ws: WebSocket;
  frames: Array<Record<string, any>>;
  closed: Promise<{ code: number; reason: string }>;
  next(type: string): Promise<Record<string, any>>;
  send(m: unknown): void;
}

function connect(role: 'engine' | 'client', opts: { session?: string; token?: string; hello?: boolean } = {}): Promise<Peer> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${relay.port}`);
    const frames: Array<Record<string, any>> = [];
    const waiters: Array<{ type: string; resolve: (m: Record<string, any>) => void }> = [];
    const closed = new Promise<{ code: number; reason: string }>((r) => ws.on('close', (code, reason) => r({ code, reason: reason.toString() })));

    sockets.push(ws);
    ws.on('message', (d) => {
      const m = JSON.parse(d.toString());
      const w = waiters.findIndex((x) => x.type === m.type);

      if (w >= 0) {
        waiters.splice(w, 1)[0].resolve(m);
      } else {
        frames.push(m);
      }
    });
    const peer: Peer = {
      ws,
      frames,
      closed,
      send: (m) => ws.send(JSON.stringify(m)),
      next: (type) => {
        const i = frames.findIndex((f) => f.type === type);

        if (i >= 0) {
          return Promise.resolve(frames.splice(i, 1)[0]);
        }

        return new Promise((r) => waiters.push({ type, resolve: r }));
      },
    };

    ws.on('open', () => {
      if (opts.hello !== false) {
        peer.send({ type: 'hello', protocol: RELAY_PROTOCOL_VERSION, role, session: opts.session ?? 's', token: opts.token ?? TOKEN, apiVersion: role === 'engine' ? '1.0.0' : undefined });
      }
      resolve(peer);
    });
  });
}

async function ready(role: 'engine' | 'client', session = 's'): Promise<Peer> {
  const p = await connect(role, { session });

  await p.next('welcome');

  return p;
}

describe('auth and framing', () => {
  it('closes 4401 on a bad token', async () => {
    const p = await connect('client', { token: 'nope' });

    expect((await p.closed).code).toBe(4401);
  });

  it('closes 4400 on malformed JSON, a non-hello first frame, and binary frames', async () => {
    const a = await connect('client', { hello: false });

    a.ws.send('{not json');
    expect((await a.closed).code).toBe(4400);
    const b = await connect('client', { hello: false });

    b.send({ type: 'command', command: { cmd: 'getTime' } });
    expect((await b.closed).code).toBe(4400);
    const c = await ready('client');

    c.ws.send(Buffer.from([1, 2, 3]));
    expect((await c.closed).code).toBe(4400);
    const d = await ready('client');

    d.send({ type: 'bogus' });
    expect((await d.closed).code).toBe(4400);
  });

  it('closes 4400 on a protocol mismatch', async () => {
    const p = await connect('client', { hello: false });

    p.send({ type: 'hello', protocol: 99, role: 'client', session: 's', token: TOKEN });
    expect((await p.closed).code).toBe(4400);
  });

  it('closes when no hello arrives in time', async () => {
    const p = await connect('client', { hello: false });

    expect((await p.closed).code).toBe(4408);
  });

  it('closes 1009 on an oversized frame', async () => {
    const c = await ready('client');

    c.send({ type: 'command', command: { cmd: 'select', args: ['x'.repeat(8000)] } });
    expect((await c.closed).code).toBe(1009);
  });
});

describe('routing', () => {
  it('routes a command with a tagged id and restores the original id on the result', async () => {
    const engine = await ready('engine');
    const client = await ready('client');

    client.send({ type: 'command', command: { id: 'mine', cmd: 'getTime' } });
    const cmd = await engine.next('command');

    expect(cmd.command.cmd).toBe('getTime');
    expect(cmd.command.id).not.toBe('mine');
    expect(cmd.command.id).toMatch(/^c\d+:\d+$/u);
    engine.send({ type: 'result', result: { id: cmd.command.id, ok: true, result: 42 } });
    expect((await client.next('result')).result).toEqual({ id: 'mine', ok: true, result: 42 });
  });

  it('keeps colliding ids from different clients apart', async () => {
    const engine = await ready('engine');
    const a = await ready('client');
    const b = await ready('client');

    a.send({ type: 'command', command: { id: '1', cmd: 'getTime' } });
    b.send({ type: 'command', command: { id: '1', cmd: 'getSelected' } });
    const c1 = await engine.next('command');
    const c2 = await engine.next('command');

    expect(c1.command.id).not.toBe(c2.command.id);
    // answer in reverse order
    engine.send({ type: 'result', result: { id: c2.command.id, ok: true, result: 'B' } });
    engine.send({ type: 'result', result: { id: c1.command.id, ok: true, result: 'A' } });
    expect((await a.next('result')).result.result).toBe('A');
    expect((await b.next('result')).result.result).toBe('B');
    expect(a.frames.filter((f) => f.type === 'result')).toHaveLength(0);
  });

  it('answers NOT_READY when the session has no engine, and isolates sessions', async () => {
    await ready('engine', 'other');
    const client = await ready('client', 's');

    client.send({ type: 'command', command: { id: 'x', cmd: 'getTime' } });
    const r = await client.next('result');

    expect(r.result).toMatchObject({ id: 'x', ok: false, error: { code: 'NOT_READY' } });
  });

  it('tells clients about the engine on welcome and on connect/drop', async () => {
    const client = await connect('client');

    expect((await client.next('welcome')).engineOnline).toBe(false);
    const engine = await ready('engine');

    expect(await client.next('engine-status')).toMatchObject({ online: true, apiVersion: '1.0.0' });
    engine.ws.close();
    expect((await client.next('engine-status')).online).toBe(false);
    const late = await connect('client');

    expect((await late.next('welcome')).engineOnline).toBe(false);
  });

  it('fails pending commands with an error result when the engine drops', async () => {
    const engine = await ready('engine');
    const client = await ready('client');

    client.send({ type: 'command', command: { id: 'p', cmd: 'getTime' } });
    await engine.next('command');
    engine.ws.terminate();
    const r = await client.next('result');

    expect(r.result).toMatchObject({ id: 'p', ok: false, error: { code: 'INTERNAL' } });
    expect(r.result.error.message).toContain('engine disconnected');
  });
});

describe('engine replacement', () => {
  it('closes the first engine with 4409 and keeps clients online', async () => {
    const first = await ready('engine');
    const client = await ready('client');
    const second = await ready('engine');

    expect((await first.closed).code).toBe(4409);
    await client.next('engine-status');
    client.send({ type: 'command', command: { id: 'z', cmd: 'getTime' } });
    const cmd = await second.next('command');

    second.send({ type: 'result', result: { id: cmd.command.id, ok: true, result: 1 } });
    expect((await client.next('result')).result.ok).toBe(true);
    // no offline blip was sent for the replaced engine
    expect(client.frames.filter((f) => f.type === 'engine-status' && f.online === false)).toHaveLength(0);
  });

  it('fails commands pending on the replaced engine', async () => {
    const first = await ready('engine');
    const client = await ready('client');

    client.send({ type: 'command', command: { id: 'q', cmd: 'getTime' } });
    await first.next('command');
    await ready('engine');
    expect((await client.next('result')).result).toMatchObject({ id: 'q', ok: false });
  });
});

describe('events', () => {
  it('fans out to all clients by default and filters by subscription', async () => {
    const engine = await ready('engine');
    const all = await ready('client');
    const some = await ready('client');
    const none = await ready('client');

    some.send({ type: 'subscribe', events: ['timeChanged'] });
    none.send({ type: 'subscribe', events: [] });
    await new Promise((r) => setTimeout(r, 50));
    engine.send({ type: 'event', name: 'selectionChanged', payload: { object: null, source: 'remote' } });
    engine.send({ type: 'event', name: 'timeChanged', payload: { timeMs: 1, rate: 1, paused: false, source: 'user' } });
    const a1 = await all.next('event');
    const a2 = await all.next('event');

    expect([a1.name, a2.name]).toEqual(['selectionChanged', 'timeChanged']);
    expect(a1.payload.source).toBe('remote');
    expect((await some.next('event')).name).toBe('timeChanged');
    await new Promise((r) => setTimeout(r, 50));
    expect(some.frames.filter((f) => f.type === 'event')).toHaveLength(0);
    expect(none.frames.filter((f) => f.type === 'event')).toHaveLength(0);
    // '*' restores everything
    none.send({ type: 'subscribe', events: '*' });
    await new Promise((r) => setTimeout(r, 50));
    engine.send({ type: 'event', name: 'hover', payload: { object: null } });
    expect((await none.next('event')).name).toBe('hover');
  });

  it('does not let clients inject results or events', async () => {
    const engine = await ready('engine');
    const client = await ready('client');

    client.send({ type: 'event', name: 'ready', payload: {} });
    expect((await client.closed).code).toBe(4400);
    expect(engine.frames.filter((f) => f.type === 'event')).toHaveLength(0);
  });
});
