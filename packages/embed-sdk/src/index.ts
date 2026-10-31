import {
  EMBED_CONFIG_PROPERTY,
  EMBED_READY_EVENT,
  EmbedError,
  type EmbedConfig,
  type EmbedEventMap,
  type EmbedEventName,
  type KeepTrackEmbedApi,
} from './contract.js';

export * from './contract.js';

/**
 * A KeepTrack page is recognised by either of these strings in its HTML. A host SPA fallback
 * (index.html served for an unknown path) contains neither.
 */
export const KEEPTRACK_PAGE_MARKERS = ['settingsOverride', 'keeptrack-root'] as const;

export interface CreateKeepTrackEmbedOptions {
  container: HTMLElement;
  /** URL of the self-hosted KeepTrack index.html. Must be same-origin with the host page. */
  src: string;
  config?: EmbedConfig;
  /** Default 60000. */
  readyTimeoutMs?: number;
  /** Accessible iframe title. Default 'KeepTrack'. */
  title?: string;
  onProgress?: (msg: string) => void;
}

export type KeepTrackEmbed = Omit<KeepTrackEmbedApi, 'on'> & {
  readonly iframe: HTMLIFrameElement;
  /** Subscribe to an engine event. The listener is removed by destroy() if not unsubscribed earlier. */
  on<E extends EmbedEventName>(event: E, listener: (payload: EmbedEventMap[E]) => void): () => void;
  /** display:none; browsers stop requestAnimationFrame in hidden iframes, which parks the render loop. */
  hide(): void;
  show(): void;
  destroy(): void;
};

const READY_POLL_MS = 100;

const FORWARDED_METHODS = [
  'whenReady', 'getLicense', 'select', 'getSelected', 'setCamera', 'getTime', 'setTime', 'setRate',
  'pause', 'play', 'upsertObjects', 'removeObjects', 'getObject', 'listHostObjects', 'upsertSensors',
  'removeSensors', 'setActiveSensors', 'addOverlay', 'removeOverlay', 'clearOverlays', 'setGroundTracks', 'setUi',
  'setObjectStyle', 'setLayers', 'setPositionStream',
  'getPosition', 'getLookAngles', 'getAccessWindows', 'screenshot', 'execute',
] as const satisfies readonly (keyof KeepTrackEmbedApi)[];

/** WebGL2 is mandatory for the engine. */
export function isWebGl2Available(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null;
  } catch {
    return false;
  }
}

function facadeOf(iframe: HTMLIFrameElement): KeepTrackEmbedApi | null {
  try {
    const win = iframe.contentWindow as (Window & { keepTrackEmbed?: KeepTrackEmbedApi }) | null;

    return win?.keepTrackEmbed ?? null;
  } catch {
    return null;
  }
}

async function assertKeepTrackPage(url: string): Promise<void> {
  let text: string;

  try {
    const res = await fetch(url, { cache: 'no-cache' });

    if (!res.ok) {
      throw new EmbedError('ASSETS_MISSING', `KeepTrack not found at ${url} (HTTP ${res.status}). Copy the KeepTrack build there.`);
    }
    text = await res.text();
  } catch (e) {
    if (e instanceof EmbedError) {
      throw e;
    }
    throw new EmbedError('ASSETS_MISSING', `Could not fetch ${url}: ${(e as Error).message}`);
  }
  if (!KEEPTRACK_PAGE_MARKERS.some((m) => text.includes(m))) {
    throw new EmbedError(
      'ASSETS_MISSING',
      `${url} is not a KeepTrack page (likely an SPA fallback or wrong path). Check that the KeepTrack build is served there.`,
    );
  }
}

export async function createKeepTrackEmbed(options: CreateKeepTrackEmbedOptions): Promise<KeepTrackEmbed> {
  const { container, config, onProgress, title = 'KeepTrack', readyTimeoutMs = 60_000 } = options;

  if (!isWebGl2Available()) {
    throw new EmbedError('WEBGL2_UNAVAILABLE', 'WebGL2 is not available in this browser; KeepTrack cannot render.');
  }

  const url = new URL(options.src, window.location.href);

  if (url.origin !== window.location.origin) {
    throw new EmbedError(
      'CROSS_ORIGIN',
      `KeepTrack must be self-hosted on the host page's origin (${window.location.origin}), but src is ${url.origin}. ` +
        'Serve the KeepTrack build under a path on your own site and pass that path as src.',
    );
  }

  onProgress?.('Checking KeepTrack assets');
  await assertKeepTrackPage(url.href);

  const iframe = document.createElement('iframe');

  iframe.title = title;
  iframe.setAttribute('allow', 'fullscreen');
  iframe.style.cssText = 'width:100%;height:100%;border:0;display:block;';
  // The engine reads this through window.frameElement, so it must exist before navigation starts.
  (iframe as unknown as Record<string, unknown>)[EMBED_CONFIG_PROPERTY] = config ?? {};
  iframe.src = url.href;

  /** Every on() made through the handle; re-bound when the iframe reloads and a new engine boots. */
  interface Subscription {
    event: EmbedEventName;
    listener: (payload: never) => void;
    off: (() => void) | null;
  }
  const subscriptions = new Set<Subscription>();
  let reloadWatch: ReturnType<typeof setInterval> | undefined;
  let destroyed = false;
  let onReload: () => void = () => undefined;
  const destroy = (): void => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    clearInterval(reloadWatch);
    iframe.removeEventListener('load', onReload);
    for (const sub of [...subscriptions]) {
      sub.off?.();
    }
    subscriptions.clear();
    iframe.remove();
  };

  onProgress?.('Loading KeepTrack');
  await new Promise<void>((resolve, reject) => {
    let poll: ReturnType<typeof setInterval> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onReady = (): void => finish();
    const finish = (err?: EmbedError): void => {
      clearInterval(poll);
      clearTimeout(timer);
      iframe.removeEventListener(EMBED_READY_EVENT, onReady);
      if (err) {
        destroy();
        reject(err);
      } else {
        resolve();
      }
    };

    iframe.addEventListener(EMBED_READY_EVENT, onReady);
    poll = setInterval(() => {
      if (facadeOf(iframe)?.isReady === true) {
        finish();
      }
    }, READY_POLL_MS);
    timer = setTimeout(
      () => finish(new EmbedError('BOOT_TIMEOUT', `KeepTrack did not become ready within ${readyTimeoutMs} ms.`)),
      readyTimeoutMs,
    );
    container.appendChild(iframe);
  });

  const requireFacade = (): KeepTrackEmbedApi => {
    const api = facadeOf(iframe);

    if (!api) {
      throw new EmbedError('NOT_READY', 'KeepTrack embed API is not available (iframe not loaded or destroyed).');
    }

    return api;
  };

  const handle: Record<string, unknown> = {
    iframe,
    hide: () => {
      iframe.style.display = 'none';
    },
    show: () => {
      iframe.style.display = 'block';
    },
    destroy,
    on<E extends EmbedEventName>(event: E, listener: (payload: EmbedEventMap[E]) => void): () => void {
      const sub: Subscription = { event, listener: listener as (payload: never) => void, off: requireFacade().on(event, listener) };

      subscriptions.add(sub);

      return () => {
        if (subscriptions.delete(sub)) {
          sub.off?.();
        }
      };
    },
  };

  for (const name of FORWARDED_METHODS) {
    handle[name] = (...args: unknown[]) => (requireFacade()[name] as (...a: unknown[]) => unknown)(...args);
  }
  Object.defineProperty(handle, 'version', { enumerable: true, get: () => requireFacade().version });
  Object.defineProperty(handle, 'isReady', { enumerable: true, get: () => facadeOf(iframe)?.isReady === true });
  // The iframe can reload (host navigation, crash recovery). The old facade and its listeners are gone,
  // so once the new engine reports ready, re-bind every subscription made through this handle.
  onReload = (): void => {
    clearInterval(reloadWatch);
    for (const sub of subscriptions) {
      sub.off = null;
    }
    const startedAt = Date.now();

    reloadWatch = setInterval(() => {
      const api = facadeOf(iframe);

      if (api?.isReady === true) {
        clearInterval(reloadWatch);
        for (const sub of subscriptions) {
          sub.off = api.on(sub.event, sub.listener as never);
        }
      } else if (Date.now() - startedAt > readyTimeoutMs) {
        clearInterval(reloadWatch);
      }
    }, READY_POLL_MS);
  };
  iframe.addEventListener('load', onReload);
  onProgress?.('KeepTrack ready');

  return handle as unknown as KeepTrackEmbed;
}
