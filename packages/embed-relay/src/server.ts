import { timingSafeEqual } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';
import type { EmbedCommandResult, RelayCommand, RelayEngineStatus, RelayEvent, RelayHello, RelayResult, RelaySubscribe, RelayWelcome } from './contract.js';
import { RELAY_PROTOCOL_VERSION } from './contract.js';

/** Close codes the relay uses (4401 and 4409 are also understood by the engine side). */
export const CLOSE_MALFORMED = 4400;
export const CLOSE_UNAUTHORIZED = 4401;
export const CLOSE_HELLO_TIMEOUT = 4408;
export const CLOSE_REPLACED = 4409;
export const CLOSE_TOO_MANY = 4429;

export const DEFAULT_MAX_PAYLOAD = 8 * 1024 * 1024;
export const DEFAULT_HELLO_TIMEOUT_MS = 5000;

export interface RelayOptions {
  /** Shared secret every engine and client must present in its hello. Required. */
  token: string;
  /** 0 picks an ephemeral port. Default 8787. */
  port?: number;
  /** Default 127.0.0.1. Exposing the relay needs TLS (wss) in front of it. */
  host?: string;
  /** Largest accepted frame in bytes (screenshots travel as base64). Default 8 MiB. */
  maxPayload?: number;
  helloTimeoutMs?: number;
  /** Ping interval used to drop dead peers. 0 disables. Default 30 s. */
  heartbeatMs?: number;
  /** Max simultaneous clients per session. Default 64. */
  maxClientsPerSession?: number;
  log?: (message: string) => void;
}

export interface RunningRelay {
  readonly port: number;
  readonly host: string;
  close(): Promise<void>;
}

interface Peer {
  socket: WebSocket;
  alive: boolean;
}

interface ClientPeer extends Peer {
  tag: string;
  /** null = all events. */
  subscribed: Set<string> | null;
}

interface Pending {
  client: ClientPeer;
  originalId: string | undefined;
}

interface Session {
  name: string;
  engine: (Peer & { apiVersion?: string }) | null;
  clients: Set<ClientPeer>;
  pending: Map<string, Pending>;
}

function tokenOk(expected: string, given: unknown): boolean {
  if (typeof given !== 'string') {
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(given);

  return a.length === b.length && timingSafeEqual(a, b);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function send(socket: WebSocket, message: unknown): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

/** Starts the relay. Resolves once it is listening. */
export function startRelay(options: RelayOptions): Promise<RunningRelay> {
  if (!options.token) {
    throw new Error('A relay token is required');
  }
  const log = options.log ?? (() => undefined);
  const host = options.host ?? '127.0.0.1';
  const helloTimeoutMs = options.helloTimeoutMs ?? DEFAULT_HELLO_TIMEOUT_MS;
  const maxClients = options.maxClientsPerSession ?? 64;
  const sessions = new Map<string, Session>();
  let clientCounter = 0;
  let seq = 0;
  const wss = new WebSocketServer({ port: options.port ?? 8787, host, maxPayload: options.maxPayload ?? DEFAULT_MAX_PAYLOAD });

  const sessionOf = (name: string): Session => {
    let s = sessions.get(name);

    if (!s) {
      s = { name, engine: null, clients: new Set(), pending: new Map() };
      sessions.set(name, s);
    }

    return s;
  };
  const dropIfEmpty = (s: Session): void => {
    if (!s.engine && s.clients.size === 0) {
      sessions.delete(s.name);
    }
  };
  const broadcastEngineStatus = (s: Session): void => {
    const status: RelayEngineStatus = { type: 'engine-status', online: s.engine !== null, apiVersion: s.engine?.apiVersion };

    for (const c of s.clients) {
      send(c.socket, status);
    }
  };
  const failPending = (s: Session, message: string, only?: ClientPeer): void => {
    for (const [id, p] of s.pending) {
      if (only && p.client !== only) {
        continue;
      }
      s.pending.delete(id);
      if (!only) {
        const result: EmbedCommandResult = { id: p.originalId, ok: false, error: { code: 'INTERNAL', message } };

        send(p.client.socket, { type: 'result', result } satisfies RelayResult);
      }
    }
  };

  const attachEngine = (socket: WebSocket, hello: RelayHello): void => {
    const s = sessionOf(hello.session);
    const previous = s.engine;
    const peer = { socket, alive: true, apiVersion: hello.apiVersion };

    if (previous) {
      s.engine = null; // so the old socket's close handler does not announce an outage
      failPending(s, 'engine replaced by a newer connection');
      previous.socket.close(CLOSE_REPLACED, 'replaced by another engine for this session');
    }
    s.engine = peer;
    socket.on('pong', () => {
      peer.alive = true;
    });
    send(socket, { type: 'welcome', protocol: RELAY_PROTOCOL_VERSION, session: s.name, engineOnline: true, apiVersion: hello.apiVersion } satisfies RelayWelcome);
    broadcastEngineStatus(s);
    log(`engine connected: ${s.name}`);

    socket.on('message', (data, isBinary) => {
      const msg = isBinary ? null : parseFrame(data.toString());

      if (!msg) {
        socket.close(CLOSE_MALFORMED, 'malformed frame');

        return;
      }
      if (msg.type === 'result' && isRecord(msg.result)) {
        const taggedId = typeof msg.result.id === 'string' ? msg.result.id : undefined;
        const pending = taggedId === undefined ? undefined : s.pending.get(taggedId);

        if (pending && taggedId !== undefined) {
          s.pending.delete(taggedId);
          send(pending.client.socket, { type: 'result', result: { ...msg.result, id: pending.originalId } });
        }
      } else if (msg.type === 'event' && typeof msg.name === 'string') {
        const event: RelayEvent = { type: 'event', name: msg.name as RelayEvent['name'], payload: msg.payload };

        for (const c of s.clients) {
          if (c.subscribed === null || c.subscribed.has(msg.name)) {
            send(c.socket, event);
          }
        }
      } else {
        socket.close(CLOSE_MALFORMED, `unexpected '${String(msg.type)}' from engine`);
      }
    });
    socket.on('close', () => {
      if (s.engine !== peer) {
        return;
      }
      s.engine = null;
      failPending(s, 'engine disconnected');
      broadcastEngineStatus(s);
      dropIfEmpty(s);
      log(`engine disconnected: ${s.name}`);
    });
  };

  const attachClient = (socket: WebSocket, hello: RelayHello): void => {
    const s = sessionOf(hello.session);

    if (s.clients.size >= maxClients) {
      socket.close(CLOSE_TOO_MANY, 'too many clients for this session');
      dropIfEmpty(s);

      return;
    }
    const peer: ClientPeer = { socket, alive: true, tag: `c${++clientCounter}`, subscribed: null };

    s.clients.add(peer);
    socket.on('pong', () => {
      peer.alive = true;
    });
    send(socket, {
      type: 'welcome',
      protocol: RELAY_PROTOCOL_VERSION,
      session: s.name,
      engineOnline: s.engine !== null,
      apiVersion: s.engine?.apiVersion,
    } satisfies RelayWelcome);
    log(`client ${peer.tag} connected: ${s.name}`);

    socket.on('message', (data, isBinary) => {
      const msg = isBinary ? null : parseFrame(data.toString());

      if (!msg) {
        socket.close(CLOSE_MALFORMED, 'malformed frame');

        return;
      }
      if (msg.type === 'command' && isRecord(msg.command) && typeof msg.command.cmd === 'string') {
        const command = msg.command as unknown as RelayCommand['command'];
        const originalId = typeof command.id === 'string' ? command.id : undefined;

        if (!s.engine) {
          send(socket, { type: 'result', result: { id: originalId, ok: false, error: { code: 'NOT_READY', message: 'No engine is connected to this session.' } } });

          return;
        }
        const taggedId = `${peer.tag}:${++seq}`;

        s.pending.set(taggedId, { client: peer, originalId });
        send(s.engine.socket, { type: 'command', command: { ...command, id: taggedId } } satisfies RelayCommand);
      } else if (msg.type === 'subscribe' && (msg.events === '*' || (Array.isArray(msg.events) && msg.events.every((e) => typeof e === 'string')))) {
        const events = (msg as unknown as RelaySubscribe).events;

        peer.subscribed = events === '*' ? null : new Set(events);
      } else {
        socket.close(CLOSE_MALFORMED, `unexpected '${String(msg.type)}' from client`);
      }
    });
    socket.on('close', () => {
      s.clients.delete(peer);
      // Late results for a gone client are dropped by the pending lookup; clear its entries now
      failPending(s, '', peer);
      dropIfEmpty(s);
      log(`client ${peer.tag} disconnected: ${s.name}`);
    });
  };

  wss.on('connection', (socket) => {
    const timer = setTimeout(() => socket.close(CLOSE_HELLO_TIMEOUT, 'no hello within timeout'), helloTimeoutMs);

    socket.on('error', () => undefined);
    socket.once('close', () => clearTimeout(timer));
    socket.once('message', (data, isBinary) => {
      clearTimeout(timer);
      const hello = isBinary ? null : parseFrame(data.toString());

      if (!hello || hello.type !== 'hello' || typeof hello.session !== 'string' || hello.session === '' || (hello.role !== 'engine' && hello.role !== 'client')) {
        socket.close(CLOSE_MALFORMED, 'first frame must be a valid hello');

        return;
      }
      if (hello.protocol !== RELAY_PROTOCOL_VERSION) {
        socket.close(CLOSE_MALFORMED, `unsupported protocol ${String(hello.protocol)}; relay speaks ${RELAY_PROTOCOL_VERSION}`);

        return;
      }
      if (!tokenOk(options.token, hello.token)) {
        socket.close(CLOSE_UNAUTHORIZED, 'bad token');

        return;
      }
      const h = hello as unknown as RelayHello;

      if (h.role === 'engine') {
        attachEngine(socket, h);
      } else {
        attachClient(socket, h);
      }
    });
  });

  const heartbeat =
    (options.heartbeatMs ?? 30_000) > 0
      ? setInterval(() => {
          for (const s of sessions.values()) {
            for (const peer of [...(s.engine ? [s.engine] : []), ...s.clients]) {
              if (!peer.alive) {
                peer.socket.terminate();
              } else {
                peer.alive = false;
                peer.socket.ping();
              }
            }
          }
        }, options.heartbeatMs ?? 30_000)
      : null;

  return new Promise<RunningRelay>((resolve, reject) => {
    wss.once('error', reject);
    wss.once('listening', () => {
      const port = (wss.address() as AddressInfo).port;

      log(`relay listening on ${host}:${port}`);
      resolve({
        port,
        host,
        close: () =>
          new Promise<void>((done) => {
            if (heartbeat) {
              clearInterval(heartbeat);
            }
            for (const client of wss.clients) {
              client.terminate();
            }
            wss.close(() => done());
          }),
      });
    });
  });
}

function parseFrame(text: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(text);

    return isRecord(v) && typeof v.type === 'string' ? v : null;
  } catch {
    return null;
  }
}
