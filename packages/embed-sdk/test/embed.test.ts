import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMBED_CONFIG_PROPERTY, EMBED_READY_EVENT, EmbedError, createKeepTrackEmbed, isWebGl2Available } from '../src/index';

const KT_HTML = '<html><script src="settings/settingsOverride.js"></script></html>';

interface FakeFacade {
  isReady: boolean;
  version: string;
  select: ReturnType<typeof vi.fn>;
  suspend: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  offs: ReturnType<typeof vi.fn>[];
}

function makeFacade(isReady: boolean): FakeFacade {
  const offs: ReturnType<typeof vi.fn>[] = [];
  const facade: FakeFacade = {
    isReady,
    version: '1.0.0',
    select: vi.fn(async () => true),
    suspend: vi.fn(),
    resume: vi.fn(),
    on: vi.fn(() => {
      const off = vi.fn();

      offs.push(off);

      return off;
    }),
    offs,
  };

  return facade;
}

let currentWindow: { keepTrackEmbed?: FakeFacade } | null = null;
let srcOrder: string[] = [];

function stubFetch(body: string, ok = true): void {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, status: ok ? 200 : 404, text: async () => body })));
}

beforeEach(() => {
  vi.useFakeTimers();
  currentWindow = { keepTrackEmbed: undefined };
  srcOrder = [];
  stubFetch(KT_HTML);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((id: string) => (id === 'webgl2' ? {} : null)) as never);
  Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', { configurable: true, get: () => currentWindow });
  Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
    configurable: true,
    get() {
      return '';
    },
    set(this: HTMLIFrameElement) {
      srcOrder.push((this as unknown as Record<string, unknown>)[EMBED_CONFIG_PROPERTY] ? 'config-then-src' : 'src-without-config');
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (HTMLIFrameElement.prototype as unknown as Record<string, unknown>).contentWindow;
  delete (HTMLIFrameElement.prototype as unknown as Record<string, unknown>).src;
  document.body.innerHTML = '';
});

const src = `${window.location.origin}/keeptrack/index.html`;

describe('createKeepTrackEmbed', () => {
  it('reports WebGL2 availability', () => {
    expect(isWebGl2Available()).toBe(true);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(isWebGl2Available()).toBe(false);
  });

  it('rejects a cross-origin src with a self-hosting hint', async () => {
    await expect(createKeepTrackEmbed({ container: document.body, src: 'https://app.keeptrack.space/' })).rejects.toMatchObject({ code: 'CROSS_ORIGIN' });
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('rejects an SPA fallback page', async () => {
    stubFetch('<html><div id="app"></div></html>');
    await expect(createKeepTrackEmbed({ container: document.body, src })).rejects.toMatchObject({ code: 'ASSETS_MISSING', message: expect.stringMatching(/not a KeepTrack page/u) });
  });

  it('rejects when WebGL2 is missing', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await expect(createKeepTrackEmbed({ container: document.body, src })).rejects.toMatchObject({ code: 'WEBGL2_UNAVAILABLE' });
  });

  it('sets the config property before src and resolves on the ready event', async () => {
    const config = { catalog: 'scenario' } as never;
    const p = createKeepTrackEmbed({ container: document.body, src, config });

    await vi.advanceTimersByTimeAsync(0);
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;

    expect(srcOrder).toEqual(['config-then-src']);
    expect((iframe as unknown as Record<string, unknown>)[EMBED_CONFIG_PROPERTY]).toBe(config);
    expect(iframe.getAttribute('allow')).toBe('fullscreen');
    currentWindow!.keepTrackEmbed = makeFacade(true);
    iframe.dispatchEvent(new CustomEvent(EMBED_READY_EVENT));
    const embed = await p;

    expect(embed.iframe).toBe(iframe);
    expect(embed.isReady).toBe(true);
  });

  it('resolves via the poll fallback', async () => {
    const p = createKeepTrackEmbed({ container: document.body, src });

    await vi.advanceTimersByTimeAsync(500);
    currentWindow!.keepTrackEmbed = makeFacade(true);
    await vi.advanceTimersByTimeAsync(200);
    const embed = await p;

    expect(embed.version).toBe('1.0.0');
  });

  it('removes the iframe and rejects with BOOT_TIMEOUT on timeout', async () => {
    const p = createKeepTrackEmbed({ container: document.body, src, readyTimeoutMs: 1000 });
    const assertion = expect(p).rejects.toMatchObject({ code: 'BOOT_TIMEOUT' });

    await vi.advanceTimersByTimeAsync(1100);
    await assertion;
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('forwards calls to the live facade and throws NOT_READY when it is gone', async () => {
    const facade = makeFacade(true);

    currentWindow!.keepTrackEmbed = facade;
    const p = createKeepTrackEmbed({ container: document.body, src });

    await vi.advanceTimersByTimeAsync(200);
    const embed = await p;

    await expect(embed.select({ norad: '25544' })).resolves.toBe(true);
    expect(facade.select).toHaveBeenCalledWith({ norad: '25544' });

    const reloaded = makeFacade(true);

    currentWindow!.keepTrackEmbed = reloaded;
    await embed.select({ hostId: 'x' });
    expect(reloaded.select).toHaveBeenCalledWith({ hostId: 'x' });

    currentWindow = null;
    expect(() => embed.getTime()).toThrow(EmbedError);
    expect(() => embed.getTime()).toThrow(expect.objectContaining({ code: 'NOT_READY' }));
  });

  it('forwards the 1.4 group and bulk-style methods', async () => {
    const facade = makeFacade(true) as Record<string, unknown>;
    const names = ['defineGroups', 'setGroupStyle', 'assignToGroup', 'removeGroup', 'getGroups', 'setObjectStyles', 'setStyleForObjects', 'clearObjectStyles'];

    for (const n of names) {
      facade[n] = vi.fn(() => n);
    }
    currentWindow!.keepTrackEmbed = facade as unknown as FakeFacade;
    const p = createKeepTrackEmbed({ container: document.body, src });

    await vi.advanceTimersByTimeAsync(200);
    const embed = (await p) as unknown as Record<string, (...a: unknown[]) => unknown>;

    for (const n of names) {
      expect(embed[n]('x', 1)).toBe(n);
      expect(facade[n]).toHaveBeenCalledWith('x', 1);
    }
  });

  it('maps a missing build (HTTP 404) to ASSETS_MISSING', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('') }));
    await expect(createKeepTrackEmbed({ container: document.body, src })).rejects.toMatchObject({ code: 'ASSETS_MISSING' });
  });

  it('re-binds on() subscriptions when the iframe reloads into a new engine', async () => {
    const first = makeFacade(true);

    currentWindow!.keepTrackEmbed = first;
    const p = createKeepTrackEmbed({ container: document.body, src });

    await vi.advanceTimersByTimeAsync(200);
    const embed = await p;
    const listener = vi.fn();

    embed.on('selectionChanged', listener);
    expect(first.on).toHaveBeenCalledTimes(1);

    const second = makeFacade(false);

    currentWindow!.keepTrackEmbed = second;
    embed.iframe.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(300);
    expect(second.on).not.toHaveBeenCalled();
    (second as { isReady: boolean }).isReady = true;
    await vi.advanceTimersByTimeAsync(300);
    expect(second.on).toHaveBeenCalledWith('selectionChanged', listener);
    embed.destroy();
    expect(second.offs[0]).toHaveBeenCalledTimes(1);
  });

  it('destroy unsubscribes tracked listeners and removes the iframe', async () => {
    const facade = makeFacade(true);

    currentWindow!.keepTrackEmbed = facade;
    const p = createKeepTrackEmbed({ container: document.body, src });

    await vi.advanceTimersByTimeAsync(200);
    const embed = await p;

    embed.on('selectionChanged', () => undefined);
    const off2 = embed.on('timeChanged', () => undefined);

    off2();
    expect(facade.offs[1]).toHaveBeenCalledTimes(1);
    embed.hide();
    expect(embed.iframe.style.display).toBe('none');
    expect(facade.suspend).toHaveBeenCalledTimes(1);
    embed.show();
    expect(facade.resume).toHaveBeenCalledTimes(1);
    embed.destroy();
    embed.destroy();
    expect(facade.offs[0]).toHaveBeenCalledTimes(1);
    expect(facade.offs[1]).toHaveBeenCalledTimes(1);
    expect(document.querySelector('iframe')).toBeNull();
  });
});
