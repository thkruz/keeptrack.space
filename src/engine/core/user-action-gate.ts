/**
 * Registry of interceptors for user-initiated changes (clicks, keyboard, time-control UI).
 *
 * Programmatic callers (plugins, URL handling, the embed facade, engine-internal rate changes) never go
 * through the gate; only the user entry points call it. With no interceptor registered every request is
 * allowed, so the normal site behaves exactly as before. The embed registers interceptors for domains the
 * host owns: the interceptor reports the attempt and returns false to block it.
 */

export type UserSelectionRequest = { domain: 'selection'; satId: number };
export type UserTimeRequest = { domain: 'time'; timeMs?: number; rate?: number };
export type UserActionRequest = UserSelectionRequest | UserTimeRequest;
export type UserActionDomain = UserActionRequest['domain'];

/** Return false to block the user action. */
export type UserActionInterceptor<R extends UserActionRequest> = (request: R) => boolean;

type InterceptorMap = { [D in UserActionDomain]: Set<UserActionInterceptor<Extract<UserActionRequest, { domain: D }>>> };

export class UserActionGate {
  private readonly interceptors_: InterceptorMap = { selection: new Set(), time: new Set() };

  /** Register an interceptor for a domain. Returns an unregister function. */
  intercept<D extends UserActionDomain>(domain: D, interceptor: UserActionInterceptor<Extract<UserActionRequest, { domain: D }>>): () => void {
    const set = this.interceptors_[domain] as Set<typeof interceptor>;

    set.add(interceptor);

    return () => {
      set.delete(interceptor);
    };
  }

  /** True when the user action may proceed. A throwing interceptor never blocks the engine. */
  allow(request: UserActionRequest): boolean {
    const set = this.interceptors_[request.domain] as Set<UserActionInterceptor<UserActionRequest>>;
    let allowed = true;

    for (const interceptor of [...set]) {
      try {
        if (interceptor(request) === false) {
          allowed = false;
        }
      } catch {
        // an interceptor must never break the engine
      }
    }

    return allowed;
  }

  allowSelection(satId: number): boolean {
    return this.allow({ domain: 'selection', satId });
  }

  allowTime(change: { timeMs?: number; rate?: number }): boolean {
    return this.allow({ domain: 'time', ...change });
  }

  /** Remove every interceptor (tests). */
  clear(): void {
    this.interceptors_.selection.clear();
    this.interceptors_.time.clear();
  }
}

export const userActionGate = new UserActionGate();
