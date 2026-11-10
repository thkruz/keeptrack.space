import { type ChangeSource, type DomainOwner, type EmbedDomain, EmbedError, type EmbedEventMap, type EmbedEventName } from './embed-types';

type Listener<E extends EmbedEventName> = (payload: EmbedEventMap[E]) => void;

/**
 * Shared state for the embed facade modules: ownership map, event emitter and the host-vs-user
 * source flag. Engine access goes through the EmbedEngine port, not through this class.
 */
export class EmbedContext {
  private readonly listeners_ = new Map<EmbedEventName, Set<Listener<EmbedEventName>>>();
  private hostDepth_ = 0;
  /** Origin applied to runAsHost() scopes: 'remote' while a relay command executes synchronously. */
  private callerOrigin_: 'host' | 'remote' = 'host';
  private activeOrigin_: 'host' | 'remote' = 'host';

  constructor(private readonly ownership_: Partial<Record<EmbedDomain, DomainOwner>> = {}) {}

  ownerOf(domain: EmbedDomain): DomainOwner {
    return this.ownership_[domain] ?? 'shared';
  }

  /** Host setters call this first: a domain owned by KeepTrack rejects host writes. */
  assertHostMaySet(domain: EmbedDomain): void {
    if (this.ownerOf(domain) === 'keeptrack') {
      throw new EmbedError('DOMAIN_NOT_OWNED', `The ${domain} domain is owned by KeepTrack; the host cannot change it.`);
    }
  }

  /** Runs fn marking every engine change it causes as source 'host' (or 'remote' inside runAsRemote). */
  runAsHost<T>(fn: () => T): T {
    return this.runAsOrigin_(this.callerOrigin_, fn);
  }

  /** Runs fn (the synchronous part of a relay command) so that runAsHost() scopes inside it report source 'remote'. */
  runAsRemote<T>(fn: () => T): T {
    const previous = this.callerOrigin_;

    this.callerOrigin_ = 'remote';
    try {
      return fn();
    } finally {
      this.callerOrigin_ = previous;
    }
  }

  /** Captures the current caller origin so later (async) runAsHost-style scopes keep it. */
  captureRunner(): <T>(fn: () => T) => T {
    const origin = this.callerOrigin_;

    return <T>(fn: () => T): T => this.runAsOrigin_(origin, fn);
  }

  private runAsOrigin_<T>(origin: 'host' | 'remote', fn: () => T): T {
    const previous = this.activeOrigin_;

    this.activeOrigin_ = origin;
    this.hostDepth_++;
    try {
      return fn();
    } finally {
      this.hostDepth_--;
      this.activeOrigin_ = previous;
    }
  }

  get source(): ChangeSource {
    return this.hostDepth_ > 0 ? this.activeOrigin_ : 'user';
  }

  on<E extends EmbedEventName>(event: E, listener: Listener<E>): () => void {
    let set = this.listeners_.get(event);

    if (!set) {
      set = new Set();
      this.listeners_.set(event, set);
    }
    set.add(listener as Listener<EmbedEventName>);

    return () => {
      set.delete(listener as Listener<EmbedEventName>);
    };
  }

  hasListeners(event: EmbedEventName): boolean {
    return (this.listeners_.get(event)?.size ?? 0) > 0;
  }

  emit<E extends EmbedEventName>(event: E, payload: EmbedEventMap[E]): void {
    for (const listener of [...(this.listeners_.get(event) ?? [])]) {
      try {
        listener(payload);
      } catch (e) {
        // A host listener must never break the engine
        // eslint-disable-next-line no-console
        console.error(`[keepTrackEmbed] listener for '${event}' threw`, e);
      }
    }
  }
}
