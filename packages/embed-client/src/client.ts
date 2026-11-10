import type {
  EmbedCommandName,
  EmbedCommandResult,
  EmbedErrorCode,
  EmbedEventMap,
  EmbedEventName,
  KeepTrackEmbedApi,
  RelayEngineStatus,
  RelayMessage,
} from './contract.js';
import { RELAY_PROTOCOL_VERSION } from './contract.js';

export const DEFAULT_COMMAND_TIMEOUT_MS = 30_000;
export const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;

/** Every command the engine accepts. The type check below fails to compile if the contract adds one. */
const COMMAND_NAMES = [
  'getLicense',
  'select',
  'getSelected',
  'setCamera',
  'getTime',
  'setTime',
  'setRate',
  'pause',
  'play',
  'upsertObjects',
  'removeObjects',
  'getObject',
  'listHostObjects',
  'upsertSensors',
  'removeSensors',
  'setActiveSensors',
  'addOverlay',
  'removeOverlay',
  'clearOverlays',
  'setGroundTracks',
  'setUi',
  'setObjectStyle',
  'setLayers',
  'setPositionStream',
  'getPosition',
  'getLookAngles',
  'getAccessWindows',
  'screenshot',
] as const satisfies readonly EmbedCommandName[];

type Missing = Exclude<EmbedCommandName, (typeof COMMAND_NAMES)[number]>;
const exhaustive: [Missing] extends [never] ? true : never = true;

void exhaustive;

/** Same names and arguments as KeepTrackEmbedApi; every call returns a Promise. screenshot() is a base64 PNG string. */
export type KeepTrackRemoteMethods = {
  [K in Exclude<EmbedCommandName, 'screenshot'>]: (...args: Parameters<KeepTrackEmbedApi[K]>) => Promise<Awaited<ReturnType<KeepTrackEmbedApi[K]>>>;
} & { screenshot(): Promise<string> };

export class KeepTrackRemoteError extends Error {
  constructor(
    readonly code: EmbedErrorCode | 'TIMEOUT' | 'CLOSED',
    message: string
  ) {
    super(message);
    this.name = 'KeepTrackRemoteError';
  }
}

export interface ConnectOptions {
  /** ws:// or wss:// URL of the relay. */
  url: string;
  session: string;
  token?: string;
  /** Per-command timeout. Default 30 s. */
  commandTimeoutMs?: number;
  /** Time allowed for the relay handshake. Default 10 s. */
  connectTimeoutMs?: number;
  /** Override the WebSocket constructor (defaults to the global one: Node >= 22 and browsers). */
  WebSocket?: typeof WebSocket;
}

export interface EngineStatus {
  online: boolean;
  apiVersion?: string;
}

export interface KeepTrackClientCore {
  /** True while the relay reports an engine for the session. */
  readonly engineOnline: boolean;
  readonly engineApiVersion: string | undefined;
  /** Raw command call (for commands the typed methods do not cover yet). */
  command(cmd: EmbedCommandName, args?: unknown[], options?: { timeoutMs?: number }): Promise<unknown>;
  /** Returns an unsubscribe function. */
  on<E extends EmbedEventName>(event: E, listener: (payload: EmbedEventMap[E]) => void): () => void;
  /** Limit which engine events the relay sends to this client. '*' = all (default), [] = none. */
  subscribe(events: EmbedEventName[] | '*'): void;
  onEngineStatus(listener: (status: EngineStatus) => void): () => void;
  /** Resolves when an engine is online for the session (immediately if it already is). */
  waitForEngine(timeoutMs?: number): Promise<void>;
  /** Screenshot as raw PNG bytes: a Buffer in Node, a Uint8Array in browsers. */
  screenshotBytes(): Promise<Uint8Array>;
  onClose(listener: (info: { code: number; reason: string }) => void): () => void;
  close(): void;
}

export type KeepTrackClient = KeepTrackClientCore & KeepTrackRemoteMethods;

interface PendingCall {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

function decodeBase64(b64: string): Uint8Array {
  const NodeBuffer = (globalThis as { Buffer?: { from(s: string, enc: string): Uint8Array } }).Buffer;

  if (NodeBuffer) {
    return NodeBuffer.from(b64, 'base64');
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);

  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }

  return out;
}

class ClientImpl implements KeepTrackClientCore {
  engineOnline = false;
  engineApiVersion: string | undefined;
  private readonly pending_ = new Map<string, PendingCall>();
  private readonly listeners_ = new Map<string, Set<(p: never) => void>>();
  private readonly statusListeners_ = new Set<(s: EngineStatus) => void>();
  private readonly closeListeners_ = new Set<(i: { code: number; reason: string }) => void>();
  private nextId_ = 0;
  private closed_ = false;

  constructor(
    private readonly socket_: WebSocket,
    private readonly commandTimeoutMs_: number
  ) {}

  /** Wires the post-handshake handlers. Called by connectKeepTrack once the welcome arrives. */
  attach(): void {
    this.socket_.onmessage = (ev) => this.onMessage_(ev.data);
    this.socket_.onclose = (ev) => this.onClose_(ev.code, ev.reason);
    if (this.socket_.readyState >= 2) {
      this.onClose_(1006, 'closed during connect');
    }
  }

  applyEngine(online: boolean, apiVersion: string | undefined): void {
    this.engineOnline = online;
    this.engineApiVersion = apiVersion;
  }

  private onMessage_(data: unknown): void {
    if (typeof data !== 'string') {
      return;
    }
    let msg: RelayMessage;

    try {
      msg = JSON.parse(data) as RelayMessage;
    } catch {
      return;
    }
    if (msg.type === 'result') {
      this.settle_(msg.result);
    } else if (msg.type === 'event') {
      for (const l of [...(this.listeners_.get(msg.name) ?? [])]) {
        (l as (p: unknown) => void)(msg.payload);
      }
    } else if (msg.type === 'engine-status') {
      this.onEngineStatus_(msg);
    }
  }

  private onEngineStatus_(msg: RelayEngineStatus): void {
    this.applyEngine(msg.online, msg.apiVersion);
    for (const l of [...this.statusListeners_]) {
      l({ online: msg.online, apiVersion: msg.apiVersion });
    }
  }

  private settle_(result: EmbedCommandResult): void {
    const id = result.id;
    const call = id === undefined ? undefined : this.pending_.get(id);

    if (!call || id === undefined) {
      return;
    }
    this.pending_.delete(id);
    clearTimeout(call.timer);
    if (result.ok) {
      call.resolve(result.result);
    } else {
      call.reject(new KeepTrackRemoteError(result.error.code, result.error.message));
    }
  }

  private onClose_(code: number, reason: string): void {
    if (this.closed_) {
      return;
    }
    this.closed_ = true;
    this.applyEngine(false, undefined);
    for (const [id, call] of this.pending_) {
      clearTimeout(call.timer);
      call.reject(new KeepTrackRemoteError('CLOSED', `Connection closed (${code}${reason ? `: ${reason}` : ''})`));
      this.pending_.delete(id);
    }
    for (const l of [...this.closeListeners_]) {
      l({ code, reason });
    }
  }

  command(cmd: EmbedCommandName, args: unknown[] = [], options: { timeoutMs?: number } = {}): Promise<unknown> {
    if (this.closed_) {
      return Promise.reject(new KeepTrackRemoteError('CLOSED', 'The connection is closed.'));
    }
    const id = String(++this.nextId_);
    const timeoutMs = options.timeoutMs ?? this.commandTimeoutMs_;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending_.delete(id);
        reject(new KeepTrackRemoteError('TIMEOUT', `${cmd} timed out after ${timeoutMs} ms`));
      }, timeoutMs);

      this.pending_.set(id, { resolve, reject, timer });
      this.socket_.send(JSON.stringify({ type: 'command', command: { id, cmd, args } }));
    });
  }

  on<E extends EmbedEventName>(event: E, listener: (payload: EmbedEventMap[E]) => void): () => void {
    let set = this.listeners_.get(event);

    if (!set) {
      set = new Set();
      this.listeners_.set(event, set);
    }
    set.add(listener as (p: never) => void);

    return () => {
      set.delete(listener as (p: never) => void);
    };
  }

  subscribe(events: EmbedEventName[] | '*'): void {
    this.socket_.send(JSON.stringify({ type: 'subscribe', events }));
  }

  onEngineStatus(listener: (status: EngineStatus) => void): () => void {
    this.statusListeners_.add(listener);

    return () => {
      this.statusListeners_.delete(listener);
    };
  }

  waitForEngine(timeoutMs = DEFAULT_CONNECT_TIMEOUT_MS): Promise<void> {
    if (this.engineOnline) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const off = this.onEngineStatus((s) => {
        if (s.online) {
          clearTimeout(timer);
          off();
          resolve();
        }
      });
      const timer = setTimeout(() => {
        off();
        reject(new KeepTrackRemoteError('TIMEOUT', `No engine came online within ${timeoutMs} ms`));
      }, timeoutMs);
    });
  }

  async screenshotBytes(): Promise<Uint8Array> {
    return decodeBase64((await this.command('screenshot')) as string);
  }

  onClose(listener: (info: { code: number; reason: string }) => void): () => void {
    this.closeListeners_.add(listener);

    return () => {
      this.closeListeners_.delete(listener);
    };
  }

  close(): void {
    this.socket_.close(1000, 'client closed');
  }
}

/**
 * Connects to a relay and returns a client for the session's engine. Resolves once the relay accepted the
 * hello; the engine itself may still be offline (see waitForEngine / onEngineStatus).
 * Rejects with KeepTrackRemoteError('CLOSED') when the relay refuses (close code 4401 = bad token).
 */
export function connectKeepTrack(options: ConnectOptions): Promise<KeepTrackClient> {
  const Ctor = options.WebSocket ?? globalThis.WebSocket;

  if (!Ctor) {
    return Promise.reject(new Error('No global WebSocket: use Node >= 22 or pass options.WebSocket.'));
  }

  return new Promise((resolve, reject) => {
    const socket = new Ctor(options.url);
    const impl = new ClientImpl(socket, options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS);
    const timer = setTimeout(() => {
      socket.close();
      reject(new KeepTrackRemoteError('TIMEOUT', 'Relay handshake timed out'));
    }, options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'hello', protocol: RELAY_PROTOCOL_VERSION, role: 'client', session: options.session, token: options.token }));
    };
    socket.onmessage = (ev) => {
      let msg: RelayMessage | null = null;

      try {
        msg = JSON.parse(String(ev.data)) as RelayMessage;
      } catch {
        // fall through to the close handler
      }
      if (msg?.type !== 'welcome') {
        return;
      }
      clearTimeout(timer);
      impl.applyEngine(msg.engineOnline, msg.apiVersion);
      impl.attach();
      const client = impl as unknown as Record<string, unknown>;

      for (const name of COMMAND_NAMES) {
        client[name] = (...args: unknown[]) => impl.command(name, args);
      }
      resolve(impl as unknown as KeepTrackClient);
    };
    socket.onclose = (ev) => {
      clearTimeout(timer);
      reject(new KeepTrackRemoteError('CLOSED', `Relay closed the connection (${ev.code}${ev.reason ? `: ${ev.reason}` : ''})`));
    };
    socket.onerror = () => {
      // onclose follows
    };
  });
}
