import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeepTrackEmbed } from '../embed-api';
import { EmbedRemote, type EmbedRemoteHost, REMOTE_BACKOFF_MAX_MS, type RemoteSocket, remoteBackoffMs } from '../embed-remote';
import { type EmbedConfig, type EmbedEventMap, type EmbedObject, RELAY_PROTOCOL_VERSION } from '../embed-types';
import { FakeEngine, GOOD_TLE1, GOOD_TLE2 } from './fake-engine';

class FakeSocket implements RemoteSocket {
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: Array<Record<string, unknown>> = [];
  closedWith: number | undefined;
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: { code: number; reason: string }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(code?: number): void {
    this.closedWith = code;
    this.readyState = 3;
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.({});
  }

  receive(message: unknown): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  drop(code: number, reason = ''): void {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
}

const last = () => FakeSocket.instances[FakeSocket.instances.length - 1];
const welcome = () => ({ type: 'welcome', protocol: RELAY_PROTOCOL_VERSION, session: 's', engineOnline: true });
const obj = (hostId: string): EmbedObject => ({ hostId, name: hostId, tle1: GOOD_TLE1, tle2: GOOD_TLE2 });

beforeEach(() => {
  FakeSocket.instances = [];
  vi.stubGlobal('__IS_PRO__', false);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function makeRemote(config: Partial<{ reconnect: boolean; url: string }> = {}) {
  const statuses: Array<EmbedEventMap['remoteStatus']> = [];
  const listeners = new Map<string, (p: unknown) => void>();
  const execute = vi.fn(async (c: { id?: string }) => ({ id: c.id, ok: true as const, result: 7 }));
  const host: EmbedRemoteHost = {
    execute: execute as never,
    on: ((event: string, l: (p: unknown) => void) => {
      listeners.set(event, l);

      return () => listeners.delete(event);
    }) as never,
    emitStatus: (s) => statuses.push(s),
    apiVersion: '1.0.0',
  };
  const remote = new EmbedRemote({ url: 'ws://relay', session: 's', token: 'tok', ...config }, host, {
    createSocket: (url) => new FakeSocket(url),
    random: () => 0.5,
  });

  return { remote, statuses, listeners, execute };
}

describe('EmbedRemote', () => {
  it('sends the engine hello with token, reports connected after welcome, and runs commands', async () => {
    const { remote, statuses, execute } = makeRemote();

    remote.start();
    expect(statuses).toEqual([{ state: 'connecting' }]);
    last().open();
    expect(last().sent[0]).toEqual({ type: 'hello', protocol: RELAY_PROTOCOL_VERSION, role: 'engine', session: 's', token: 'tok', apiVersion: '1.0.0' });
    last().receive(welcome());
    expect(statuses.at(-1)).toEqual({ state: 'connected' });
    last().receive({ type: 'command', command: { id: 'c1:1', cmd: 'getTime' } });
    await vi.advanceTimersByTimeAsync(0);
    expect(execute).toHaveBeenCalledWith({ id: 'c1:1', cmd: 'getTime' });
    expect(last().sent[1]).toEqual({ type: 'result', result: { id: 'c1:1', ok: true, result: 7 } });
  });

  it('ignores commands before welcome and malformed frames', async () => {
    const { remote, execute } = makeRemote();

    remote.start();
    last().open();
    last().receive({ type: 'command', command: { cmd: 'getTime' } });
    last().onmessage?.({ data: 'not json' });
    last().onmessage?.({ data: new ArrayBuffer(1) });
    await vi.advanceTimersByTimeAsync(0);
    expect(execute).not.toHaveBeenCalled();
  });

  it('forwards facade events once connected, but not remoteStatus', () => {
    const { remote, listeners } = makeRemote();

    remote.start();
    expect(listeners.has('remoteStatus')).toBe(false);
    listeners.get('selectionChanged')?.({ object: null, source: 'user' });
    last().open();
    last().receive(welcome());
    listeners.get('selectionChanged')?.({ object: null, source: 'user' });
    expect(last().sent.at(-1)).toEqual({ type: 'event', name: 'selectionChanged', payload: { object: null, source: 'user' } });
    expect(last().sent.filter((m) => m.type === 'event')).toHaveLength(1);
  });

  it('throttles hover with a trailing delivery', () => {
    const { remote, listeners } = makeRemote();

    remote.start();
    last().open();
    last().receive(welcome());
    vi.setSystemTime(1_000_000);
    const hover = listeners.get('hover');

    hover?.({ object: null });
    hover?.({ object: { id: 1 } });
    hover?.({ object: { id: 2 } });
    expect(last().sent.filter((m) => m.type === 'event')).toHaveLength(1);
    vi.advanceTimersByTime(150);
    const events = last().sent.filter((m) => m.type === 'event');

    expect(events).toHaveLength(2);
    expect(events[1].payload).toEqual({ object: { id: 2 } });
  });

  it('reconnects with capped exponential backoff and resets after welcome', () => {
    const { remote, statuses } = makeRemote();

    remote.start();
    last().open();
    last().drop(1006);
    expect(statuses.at(-1)?.state).toBe('disconnected');
    expect(FakeSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(999);
    expect(FakeSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(2);
    last().drop(1006);
    vi.advanceTimersByTime(2000);
    expect(FakeSocket.instances).toHaveLength(3);
    last().open();
    last().receive(welcome());
    last().drop(1006);
    vi.advanceTimersByTime(1000);
    expect(FakeSocket.instances).toHaveLength(4);
    expect(remoteBackoffMs(50, () => 0.5)).toBe(REMOTE_BACKOFF_MAX_MS);
  });

  it('does not retry after a 4401 rejection or when reconnect is false', () => {
    const a = makeRemote();

    a.remote.start();
    last().open();
    last().drop(4401, 'bad token');
    expect(a.statuses.at(-1)).toEqual({ state: 'rejected', detail: 'bad token' });
    vi.advanceTimersByTime(120_000);
    expect(FakeSocket.instances).toHaveLength(1);

    const b = makeRemote({ reconnect: false });

    b.remote.start();
    last().drop(1006);
    vi.advanceTimersByTime(120_000);
    expect(FakeSocket.instances).toHaveLength(2);
    expect(b.statuses.at(-1)?.state).toBe('disconnected');
  });

  it('does not retry when replaced by another engine (4409)', () => {
    const { remote } = makeRemote();

    remote.start();
    last().open();
    last().drop(4409);
    vi.advanceTimersByTime(120_000);
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('refuses a non-websocket url without dialing', () => {
    const { remote, statuses } = makeRemote({ url: 'http://relay' });

    remote.start();
    expect(FakeSocket.instances).toHaveLength(0);
    expect(statuses[0].state).toBe('disconnected');
  });
});

describe('facade integration', () => {
  function make(config: EmbedConfig) {
    const engine = new FakeEngine('scenario');
    const api = new KeepTrackEmbed(engine, { config, readyTarget: new EventTarget() });

    vi.stubGlobal('WebSocket', FakeSocket);
    api.start();

    return { api, engine };
  }

  it('does not dial without config.remote', () => {
    make({});
    expect(FakeSocket.instances).toHaveLength(0);
  });

  it('dials after ready, emits remoteStatus, and attributes remote commands as source remote', async () => {
    const { api } = make({ remote: { url: 'ws://relay', session: 's' } });
    const status: string[] = [];
    const sources: string[] = [];

    api.on('remoteStatus', (s) => status.push(s.state));
    api.on('selectionChanged', (e) => sources.push(e.source));
    api.upsertObjects([obj('a'), obj('b')]);
    expect(FakeSocket.instances).toHaveLength(1);
    last().open();
    last().receive(welcome());
    last().receive({ type: 'command', command: { id: '1', cmd: 'select', args: [{ hostId: 'a' }] } });
    await vi.advanceTimersByTimeAsync(0);
    expect(last().sent.find((m) => m.type === 'result')).toEqual({ type: 'result', result: { id: '1', ok: true, result: true } });
    await api.select({ hostId: 'b' });
    expect(sources).toEqual(['remote', 'host']);
  });

  it('remote commands obey host ownership', async () => {
    make({ remote: { url: 'ws://relay', session: 's' }, ownership: { time: 'keeptrack' } });

    last().open();
    last().receive(welcome());
    last().receive({ type: 'command', command: { id: '2', cmd: 'setRate', args: [5] } });
    await vi.advanceTimersByTimeAsync(0);
    const result = last().sent.find((m) => m.type === 'result') as { result: { ok: boolean; error?: { code: string } } };

    expect(result.result.ok).toBe(false);
    expect(result.result.error?.code).toBe('DOMAIN_NOT_OWNED');
  });
});
