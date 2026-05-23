import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';

export type TextureLoadState = 'loading' | 'retrying' | 'loaded' | 'failed';

export interface TextureStatus {
  url: string;
  state: TextureLoadState;
  attempts: number;
  lastError?: string;
  updatedAt: number;
}

export interface FailureInjectionRule {
  /** Substring matched against the texture URL */
  pattern: string;
  /** HTTP status to simulate, or 'network' for a TypeError */
  status: number | 'network';
  /** Remaining synthetic failures; -1 means infinite */
  countRemaining: number;
}

const registry = new Map<string, TextureStatus>();
let injectionRules: FailureInjectionRule[] | null = null;
let injectionInitialized = false;

/** True when running on a local development host. Failure injection is only honored here. */
function isDevHost_(): boolean {
  if (typeof location === 'undefined') {
    return false;
  }
  const host = location.hostname;


  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]' || host === '';
}

/** Parse failure-injection rules from the URL query string. Returns empty array outside dev. */
function readInjectionRules_(): FailureInjectionRule[] {
  if (!isDevHost_()) {
    return [];
  }
  const params = new URLSearchParams(location.search);
  const patternsParam = params.get('debugFailTexture');

  if (!patternsParam) {
    return [];
  }
  const statusParam = params.get('debugFailStatus') ?? '503';
  const countParam = params.get('debugFailCount');
  const status: number | 'network' = statusParam === 'network' ? 'network' : Number.parseInt(statusParam, 10);

  if (status !== 'network' && Number.isNaN(status)) {
    return [];
  }
  const countRemaining = countParam ? Math.max(0, Number.parseInt(countParam, 10)) : -1;
  const patterns = patternsParam.split(',').map((s) => s.trim()).filter((s) => s.length > 0);


  return patterns.map((pattern) => ({ pattern, status, countRemaining }));
}

/**
 * If the given URL matches a dev-only failure-injection rule with remaining failures,
 * returns the synthetic failure descriptor and decrements the rule's remaining count.
 * Returns null otherwise (no rules, no match, count exhausted, or production host).
 */
export function getInjectedFailure(url: string): { status: number | 'network' } | null {
  if (!injectionInitialized) {
    injectionInitialized = true;
    injectionRules = readInjectionRules_();
  }
  if (!injectionRules || injectionRules.length === 0) {
    return null;
  }
  for (const rule of injectionRules) {
    if (url.includes(rule.pattern) && rule.countRemaining !== 0) {
      if (rule.countRemaining > 0) {
        rule.countRemaining -= 1;
      }


      return { status: rule.status };
    }
  }


  return null;
}

/** Record or update a texture's load status and emit a textureStatusChanged event. */
export function updateTextureStatus(url: string, patch: Partial<TextureStatus>): void {
  const existing = registry.get(url) ?? { url, state: 'loading' as TextureLoadState, attempts: 0, updatedAt: 0 };
  const next: TextureStatus = { ...existing, ...patch, url, updatedAt: Date.now() };

  registry.set(url, next);
  EventBus.getInstance().emit(EventBusEvent.textureStatusChanged, next);
}

/** Snapshot of every recorded texture status. Returned as a new array. */
export function getTextureStatuses(): TextureStatus[] {
  return [...registry.values()];
}

/** Test-only helper to reset module state between specs. */
export function resetTextureLoadRegistry(): void {
  registry.clear();
  injectionRules = null;
  injectionInitialized = false;
}
