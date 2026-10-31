import {
  type EmbedCommand,
  type EmbedCommandResult,
  type EmbedEventMap,
  type EmbedEventName,
  type EmbedRemoteConfig,
  RELAY_PROTOCOL_VERSION,
  type RelayEvent,
  type RelayHello,
  type RelayMessage,
  type RelayResult,
} from './embed-types';

/** Relay close code: bad or missing token. No retry. */
export const RELAY_CLOSE_UNAUTHORIZED = 4401;
/** Relay close code: another engine took over this session. No retry (the two engines would fight). */
export const RELAY_CLOSE_REPLACED = 4409;

export const REMOTE_BACKOFF_BASE_MS = 1000;
export const REMOTE_BACKOFF_MAX_MS = 30_000;
/** Minimum spacing of forwarded hover events (trailing edge is always delivered). */
export const REMOTE_HOVER_THROTTLE_MS = 100;

/** Events relayed to clients. remoteStatus is local plumbing and is not forwarded. */
const FORWARDED_EVENTS: readonly EmbedEventName[] = ['ready', 'selectionChanged', 'hover', 'timeChanged', 'changeRequested', 'error'];

/** The subset of the browser WebSocket the channel uses (so tests can fake it). */
export interface RemoteSocket {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code: number; reason: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

const SOCKET_OPEN = 1;

export interface EmbedRemoteHost {
  /** Runs a command with source 'remote'. Never rejects. */
  execute(command: EmbedCommand): Promise<EmbedCommandResult>;
  on<E extends EmbedEventName>(event: E, listener: (payload: EmbedEventMap[E]) => void): () => void;
  emitStatus(status: EmbedEventMap['remoteStatus']): void;
  apiVersion: string;
}

export interface EmbedRemoteDeps {
  createSocket?: (url: string) => RemoteSocket;
  /** 0..1, used for backoff jitter. Defaults to Math.random. */
  random?: () => number;
}

export function remoteBackoffMs(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(REMOTE_BACKOFF_MAX_MS, REMOTE_BACKOFF_BASE_MS * 2 ** attempt);

  return Math.round(base * (0.8 + 0.4 * random()));
}

/**
 * Remote control channel. Dials out to a relay, announces itself as the engine of a session, executes
 * the commands relay clients send and forwards facade events to them. Host-configured only.
 */
export class EmbedRemote {
  private socket_: RemoteSocket | null = null;
  private welcomed_ = false;
  private attempt_ = 0;
  private stopped_ = false;
  private retryTimer_: ReturnType<typeof setTimeout> | null = null;
  private hoverTimer_: ReturnType<typeof setTimeout> | null = null;
  private lastHoverAt_ = 0;
  private pendingHover_: EmbedEventMap['hover'] | null = null;
  private readonly unsubscribers_: Array<() => void> = [];

  constructor(
    private readonly config_: EmbedRemoteConfig,
    private readonly host_: EmbedRemoteHost,
    private readonly deps_: EmbedRemoteDeps = {}
  ) {}

  /** Begin connecting and start forwarding events. Idempotent. */
  start(): void {
    if (this.unsubscribers_.length > 0 || this.stopped_) {
      return;
    }
    for (const name of FORWARDED_EVENTS) {
      this.unsubscribers_.push(this.host_.on(name, (payload) => this.forwardEvent_(name, payload)));
    }
    this.connect_();
  }

  /** Permanently close the channel. */
  stop(): void {
    this.stopped_ = true;
    this.clearTimers_();
    for (const off of this.unsubscribers_.splice(0)) {
      off();
    }
    const socket = this.socket_;

    this.socket_ = null;
    this.welcomed_ = false;
    socket?.close(1000, 'stopped');
  }

  get isConnected(): boolean {
    return this.welcomed_;
  }

  private clearTimers_(): void {
    if (this.retryTimer_ !== null) {
      clearTimeout(this.retryTimer_);
      this.retryTimer_ = null;
    }
    if (this.hoverTimer_ !== null) {
      clearTimeout(this.hoverTimer_);
      this.hoverTimer_ = null;
    }
    this.pendingHover_ = null;
  }

  private connect_(): void {
    if (this.stopped_) {
      return;
    }
    if (!/^wss?:\/\//iu.test(this.config_.url ?? '')) {
      this.stopped_ = true;
      this.host_.emitStatus({ state: 'disconnected', detail: 'remote.url must start with ws:// or wss://' });

      return;
    }
    this.host_.emitStatus({ state: 'connecting' });
    let socket: RemoteSocket;

    try {
      socket = (this.deps_.createSocket ?? ((url: string) => new WebSocket(url) as unknown as RemoteSocket))(this.config_.url);
    } catch (e) {
      this.host_.emitStatus({ state: 'disconnected', detail: e instanceof Error ? e.message : String(e) });
      this.scheduleReconnect_();

      return;
    }
    this.socket_ = socket;
    this.welcomed_ = false;

    socket.onopen = () => {
      const hello: RelayHello = {
        type: 'hello',
        protocol: RELAY_PROTOCOL_VERSION,
        role: 'engine',
        session: this.config_.session,
        token: this.config_.token,
        apiVersion: this.host_.apiVersion,
      };

      this.send_(hello);
    };
    socket.onmessage = (ev) => {
      this.onMessage_(socket, ev.data);
    };
    socket.onerror = () => {
      // A close event always follows; status is reported there
    };
    socket.onclose = (ev) => {
      this.onClose_(socket, ev.code, ev.reason);
    };
  }

  private onClose_(socket: RemoteSocket, code: number, reason: string): void {
    if (socket !== this.socket_) {
      return;
    }
    this.socket_ = null;
    this.welcomed_ = false;
    if (this.stopped_) {
      return;
    }
    if (code === RELAY_CLOSE_UNAUTHORIZED) {
      this.stopped_ = true;
      this.host_.emitStatus({ state: 'rejected', detail: reason || 'relay rejected the token' });

      return;
    }
    if (code === RELAY_CLOSE_REPLACED) {
      this.stopped_ = true;
      this.host_.emitStatus({ state: 'disconnected', detail: reason || 'replaced by another engine for this session' });

      return;
    }
    this.host_.emitStatus({ state: 'disconnected', detail: reason || `closed (${code})` });
    this.scheduleReconnect_();
  }

  private scheduleReconnect_(): void {
    if (this.config_.reconnect === false || this.stopped_) {
      return;
    }
    const delay = remoteBackoffMs(this.attempt_, this.deps_.random);

    this.attempt_++;
    this.retryTimer_ = setTimeout(() => {
      this.retryTimer_ = null;
      this.connect_();
    }, delay);
  }

  private onMessage_(socket: RemoteSocket, data: unknown): void {
    if (typeof data !== 'string') {
      return;
    }
    let message: RelayMessage;

    try {
      message = JSON.parse(data) as RelayMessage;
    } catch {
      return;
    }
    if (message?.type === 'welcome') {
      this.welcomed_ = true;
      this.attempt_ = 0;
      this.host_.emitStatus({ state: 'connected' });
    } else if (message?.type === 'command' && this.welcomed_) {
      this.runCommand_(socket, message.command).catch(() => undefined);
    }
  }

  private async runCommand_(socket: RemoteSocket, command: EmbedCommand): Promise<void> {
    const result = await this.host_.execute(command);
    const frame: RelayResult = { type: 'result', result };

    // Reply on the socket the command came in on; if it dropped meanwhile the relay already failed it
    if (socket === this.socket_) {
      this.send_(frame);
    }
  }

  private forwardEvent_<E extends EmbedEventName>(name: E, payload: EmbedEventMap[E]): void {
    if (!this.welcomed_) {
      return;
    }
    if (name === 'hover') {
      this.forwardHover_(payload as EmbedEventMap['hover']);

      return;
    }
    this.sendEvent_(name, payload);
  }

  private forwardHover_(payload: EmbedEventMap['hover']): void {
    const wait = REMOTE_HOVER_THROTTLE_MS - (Date.now() - this.lastHoverAt_);

    if (wait <= 0 && this.hoverTimer_ === null) {
      this.lastHoverAt_ = Date.now();
      this.sendEvent_('hover', payload);

      return;
    }
    this.pendingHover_ = payload;
    if (this.hoverTimer_ === null) {
      this.hoverTimer_ = setTimeout(
        () => {
          this.hoverTimer_ = null;
          const pending = this.pendingHover_;

          this.pendingHover_ = null;
          if (pending && this.welcomed_) {
            this.lastHoverAt_ = Date.now();
            this.sendEvent_('hover', pending);
          }
        },
        Math.max(wait, 0)
      );
    }
  }

  private sendEvent_(name: EmbedEventName, payload: unknown): void {
    const frame: RelayEvent = { type: 'event', name, payload };

    this.send_(frame);
  }

  private send_(message: RelayMessage): void {
    const socket = this.socket_;

    if (!socket || socket.readyState !== SOCKET_OPEN) {
      return;
    }
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // The close handler takes care of reconnecting
    }
  }
}
