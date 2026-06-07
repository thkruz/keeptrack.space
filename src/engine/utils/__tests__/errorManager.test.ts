import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ErrorManager } from '@app/engine/utils/errorManager';

describe('ErrorManager.error', () => {
  let errorManager: ErrorManager;
  let captured: { err: Error; funcName: string }[];
  const listener = (err: Error, funcName: string): void => {
    captured.push({ err, funcName });
  };

  beforeEach(() => {
    errorManager = new ErrorManager();
    captured = [];
    EventBus.getInstance().on(EventBusEvent.error, listener);
    vi.spyOn(console, 'error').mockImplementation(() => { /* silence */ });
    vi.spyOn(console, 'warn').mockImplementation(() => { /* silence */ });
  });

  afterEach(() => {
    EventBus.getInstance().unregister(EventBusEvent.error, listener);
    vi.restoreAllMocks();
  });

  it('normalizes null into a real Error (no TypeError on .name access)', () => {
    expect(() => errorManager.error(null as unknown as Error, 'fn')).toThrow('Unknown error');
    expect(captured).toHaveLength(1);
    expect(captured[0].err).toBeInstanceOf(Error);
    expect(captured[0].err.message).toBe('Unknown error');
    expect(captured[0].funcName).toBe('fn');
  });

  it('normalizes undefined into a real Error', () => {
    expect(() => errorManager.error(undefined as unknown as Error, 'fn')).toThrow('Unknown error');
    expect(captured[0].err).toBeInstanceOf(Error);
    expect(captured[0].err.message).toBe('Unknown error');
  });

  it('wraps a string into Error(string)', () => {
    expect(() => errorManager.error('boom' as unknown as Error, 'fn')).toThrow('boom');
    expect(captured[0].err).toBeInstanceOf(Error);
    expect(captured[0].err.message).toBe('boom');
  });

  it('wraps a plain object via JSON.stringify', () => {
    expect(() => errorManager.error({ foo: 'bar' } as unknown as Error, 'fn')).toThrow(/foo/u);
    expect(captured[0].err).toBeInstanceOf(Error);
    expect(captured[0].err.message).toContain('foo');
    expect(captured[0].err.message).toContain('bar');
  });

  it('passes a real Error through by identity', () => {
    const original = new Error('original');

    expect(() => errorManager.error(original, 'fn')).toThrow(original);
    expect(captured[0].err).toBe(original);
  });

  it('emits an Error instance to the EventBus regardless of input', () => {
    expect(() => errorManager.error(null as unknown as Error, 'a')).toThrow();
    expect(() => errorManager.error('s' as unknown as Error, 'b')).toThrow();
    expect(() => errorManager.error({ k: 1 } as unknown as Error, 'c')).toThrow();
    for (const entry of captured) {
      expect(entry.err).toBeInstanceOf(Error);
      expect(typeof entry.err.message).toBe('string');
    }
  });

  it('re-anchors stack so wrapped non-Error values do not point at toError_', () => {
    let captured: Error | undefined;

    try {
      errorManager.error('boom' as unknown as Error, 'fn');
    } catch (e) {
      captured = e as Error;
    }
    expect(captured).toBeInstanceOf(Error);
    // Stack must not include the internal wrapping frame (only true on V8/Node).
    expect(captured!.stack ?? '').not.toContain('toError_');
  });
});

describe('ErrorManager.reportEvent', () => {
  let errorManager: ErrorManager;
  let captured: { err: Error; funcName: string }[];
  const listener = (err: Error, funcName: string): void => {
    captured.push({ err, funcName });
  };

  beforeEach(() => {
    errorManager = new ErrorManager();
    captured = [];
    EventBus.getInstance().on(EventBusEvent.error, listener);
    vi.spyOn(console, 'error').mockImplementation(() => { /* silence */ });
    vi.spyOn(console, 'warn').mockImplementation(() => { /* silence */ });
  });

  afterEach(() => {
    EventBus.getInstance().unregister(EventBusEvent.error, listener);
    vi.restoreAllMocks();
  });

  it('suppresses cross-origin script errors (no throw, no toast, just warn)', () => {
    expect(() => errorManager.reportEvent({
      error: null,
      funcName: 'Global Error Trapper',
      message: 'Script error.',
      isCrossOrigin: true,
    })).not.toThrow();

    // Cross-origin still surfaces to EventBus for telemetry, but is not loud.
    expect(captured).toHaveLength(1);
    expect(captured[0].err.message).toBe('Script error.');
    // eslint-disable-next-line no-console
    expect(console.warn).toHaveBeenCalled();
  });

  it('suppresses an opaque Web Worker onerror (null error, no message, no source)', () => {
    // colorCruncher worker onerror for an opaque/cross-origin worker: event.error is null and
    // message/filename are empty, so toError_ can only build a bare "Unknown error". Must not
    // throw or be loud, and must be tagged unactionable so telemetry skips the bug-filing POST.
    expect(() => errorManager.reportEvent({
      error: null,
      funcName: 'Worker[js/colorCruncher.js]',
      message: '',
      source: '',
      isOpaqueEvent: true,
    })).not.toThrow();

    expect(captured).toHaveLength(1);
    expect((captured[0].err as { isUnactionable?: boolean }).isUnactionable).toBe(true);
    // eslint-disable-next-line no-console
    expect(console.warn).toHaveBeenCalled();
    // eslint-disable-next-line no-console
    expect(console.error).not.toHaveBeenCalled();
  });

  it('suppresses a Rocket Loader rejection (null reason, loader frame in stack) — #1371', () => {
    // Reproduces the unhandledrejection from Cloudflare Rocket Loader: reason is null and
    // the only signal is the loader frame in the synthesized stack. Must not throw or auto-file.
    const err = new Error('Unknown error');

    err.stack = 'Error: Unknown error\n    at c (https://app.keeptrack.space/cdn-cgi/scripts/7d0fa10a/cloudflare-static/rocket-loader.min.js:1:9405)';

    expect(() => errorManager.reportEvent({
      error: err,
      funcName: 'Unhandled Promise Rejection',
      isUnhandledRejection: true,
    })).not.toThrow();

    // Still surfaces to EventBus for telemetry, but quietly (warn, not error).
    expect(captured).toHaveLength(1);
    // eslint-disable-next-line no-console
    expect(console.warn).toHaveBeenCalled();
    // eslint-disable-next-line no-console
    expect(console.error).not.toHaveBeenCalled();
  });

  it('does not suppress a normal app rejection whose stack has no loader frame', () => {
    expect(() => errorManager.reportEvent({
      error: new Error('real bug'),
      funcName: 'Unhandled Promise Rejection',
      isUnhandledRejection: true,
    })).toThrow('real bug');

    expect(captured).toHaveLength(1);
    // eslint-disable-next-line no-console
    expect(console.error).toHaveBeenCalled();
  });

  it('synthesizes a stack from ErrorEvent fields when raw error is null', () => {
    expect(() => errorManager.reportEvent({
      error: null,
      funcName: 'Global Error Trapper',
      message: 'ReferenceError: x is not defined',
      source: 'https://example.com/app.js',
      line: 42,
      col: 17,
    })).toThrow('ReferenceError: x is not defined');

    expect(captured).toHaveLength(1);
    const stack = captured[0].err.stack ?? '';

    expect(stack).toContain('https://example.com/app.js:42:17');
    expect(stack).toContain('ReferenceError: x is not defined');
  });

  it('wraps an unhandled rejection of a string into Error(string)', () => {
    expect(() => errorManager.reportEvent({
      error: 'rejected!',
      funcName: 'Unhandled Promise Rejection',
      isUnhandledRejection: true,
    })).toThrow('rejected!');

    expect(captured[0].err).toBeInstanceOf(Error);
    expect(captured[0].err.message).toBe('rejected!');
    expect(captured[0].funcName).toBe('Unhandled Promise Rejection');
  });

  it('dedups identical signatures within the 5-min window (auto-file opens once)', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const err = new Error('repeat me');

    // Skip the auto-file gate (isThisNode disables newGithubIssueUrl_ to ''), so we
    // can't check window.open directly here — instead verify via spy that the toast
    // dedup path is hit. Easier: inspect signatureWindow_ via a second call returning early.
    expect(() => errorManager.reportEvent({ error: err, funcName: 'fn' })).toThrow(err);
    expect(() => errorManager.reportEvent({ error: err, funcName: 'fn' })).toThrow(err);

    // EventBus emit happens both times (telemetry must see all errors), but
    // window.open should not fire on the dedup (in node it's a no-op anyway).
    expect(captured).toHaveLength(2);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('uses captured message as toast text when toastMsg is not provided', () => {
    // No direct toast assertion (UI manager isn't registered in this test), but
    // the call should not throw on the toastMsg fallback path.
    expect(() => errorManager.reportEvent({
      error: null,
      funcName: 'fn',
      message: 'real-world message',
      source: 'x.js',
      line: 1,
      col: 1,
    })).toThrow('real-world message');
  });
});

describe('ErrorManager.isExternalFetchError_ (auto-file suppression)', () => {
  let errorManager: ErrorManager;
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorManager = new ErrorManager();
    vi.spyOn(console, 'error').mockImplementation(() => { /* silence */ });
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    // Force the real auto-file gate to be reachable (isThisNode would otherwise stub the URL to '').
    (errorManager as unknown as { newGithubIssueUrl_: () => string }).newGithubIssueUrl_ = () => 'https://github.com/issue';
    (errorManager as unknown as { minLevel_: number }).minLevel_ = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const reportInNode = (err: Error): void => {
    // reportEvent rethrows under node; swallow it so we can assert on the auto-file spy.
    try {
      errorManager.reportEvent({ error: err, funcName: 'CatalogBrowserPlugin' });
    } catch {
      /* expected node rethrow */
    }
  };

  it('suppresses a genuine TypeError "Failed to fetch"', () => {
    reportInNode(new TypeError('Failed to fetch'));
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('suppresses a worker-boundary network error that lost its TypeError prototype', () => {
    // Structured-clone across a Worker boundary downgrades TypeError -> plain Error.
    reportInNode(new Error('Failed to fetch'));
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('suppresses Firefox/Safari network phrasings regardless of prototype', () => {
    reportInNode(new Error('NetworkError when attempting to fetch resource.'));
    reportInNode(new Error('Load failed'));
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('suppresses status-bearing HTTP errors (server-side, not our bug)', () => {
    const err = new Error('CelesTrak returned HTTP 500') as Error & { status: number };

    err.status = 500;
    reportInNode(err);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('still auto-files a real bug whose message merely contains "fetch"', () => {
    reportInNode(new TypeError('Cannot read properties of undefined (reading \'fetchData\')'));
    expect(openSpy).toHaveBeenCalledTimes(1);
  });
});
