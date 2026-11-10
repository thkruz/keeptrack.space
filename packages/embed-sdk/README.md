# @keeptrack/embed-sdk

MIT-licensed host SDK for embedding KeepTrack in your own page. Status: 0.1.0, not yet published.

KeepTrack runs in a same-origin iframe that you self-host. The SDK creates the iframe, waits for the
engine, and gives you a typed handle that forwards to the engine's `window.keepTrackEmbed` API. No runtime
dependencies. The API contract ships in this package (`src/contract.ts`, copied from
`src/embed/embed-types.ts`).

## Quick start

1. Serve a KeepTrack build under a path on **your own origin**, for example
   `https://host.example/keeptrack/index.html`. Cross-origin URLs are rejected, because the SDK calls the
   engine directly instead of using postMessage.
2. Create the embed:

```ts
import { createKeepTrackEmbed } from '@keeptrack/embed-sdk';

const embed = await createKeepTrackEmbed({
  container: document.getElementById('kt')!,   // give it a size; the iframe fills it
  src: '/keeptrack/index.html',
  config: {
    apiVersion: '1',
    catalog: { mode: 'scenario', objects: [/* EmbedObject[] */] },
    ownership: { selection: 'host' },
  },
  readyTimeoutMs: 60_000,                       // default
  onProgress: (msg) => console.log(msg),
});
```

### Selecting a satellite from your own UI

```ts
// Real catalog object
satelliteRow.addEventListener('click', () => embed.select({ norad: '25544' }));

// Fictional object you pushed with upsertObjects/config (no NORAD number)
fictionalRow.addEventListener('click', () => embed.select({ hostId: 'demo-1' }));

embed.on('selectionChanged', ({ object, source }) => console.log(object?.name, source));
embed.select(null); // deselect
```

### Handle

- Every `KeepTrackEmbedApi` method (`select`, `setTime`, `upsertObjects`, `getPosition`, `screenshot`, ...) is
  forwarded to the live `iframe.contentWindow.keepTrackEmbed`, looked up on each call. If it is missing, an
  `EmbedError` with code `NOT_READY` is thrown.
- `on(event, listener)` returns an unsubscribe function; listeners registered through the handle are removed
  by `destroy()`. If the iframe reloads (a new engine boots), the handle re-binds those listeners to the new
  `keepTrackEmbed` once it reports ready. Events fired between the reload and ready are not replayed, and state
  the host pushed to the old engine (objects, sensors, overlays, time) is not restored; re-send it after the
  reload.
- `embed.iframe`, `hide()` / `show()` (`display:none` stops the iframe's requestAnimationFrame, which parks
  the render loop), `destroy()`.
- `isWebGl2Available()` is exported if you want to show a fallback before calling `createKeepTrackEmbed`.

### Startup checks and errors

`createKeepTrackEmbed` throws `EmbedError` with one of these codes:

| Code | Cause |
| --- | --- |
| `WEBGL2_UNAVAILABLE` | the browser has no WebGL2 |
| `CROSS_ORIGIN` | `src` is on a different origin than the host page |
| `ASSETS_MISSING` | `src` could not be fetched, returned a non-2xx status, or is not a KeepTrack page |
| `BOOT_TIMEOUT` | the engine was not ready within `readyTimeoutMs` |

The page check looks for the
string `settingsOverride` or `keeptrack-root` in the HTML, which a host SPA fallback (index.html served for
unknown paths) does not contain. If the engine is not ready within `readyTimeoutMs`, the iframe is removed and
the promise rejects with code `BOOT_TIMEOUT`. Ready is detected by the `keeptrack-embed:ready` event on the
iframe, with a 100 ms poll of `keepTrackEmbed.isReady` as a fallback.

## Example host page

`example/` is a plain page with a satellite list (ISS by NORAD, a fictional object by hostId), a time slider,
and an event log.

```sh
cd packages/embed-sdk
npm run example                         # syncs the contract, compiles to example/sdk/
cp -r <path-to-keeptrack>/dist example/keeptrack   # a KeepTrack build; the page loads ./keeptrack/index.html
npx serve example                       # any static server; open the printed URL
```

`example/sdk/` and `example/keeptrack/` are gitignored.

## Development

```sh
node scripts/sync-contract.mjs           # regenerate src/contract.ts
node scripts/sync-contract.mjs --check   # fails if the copy is stale (use in CI)
npm run build                            # sync + tsc to dist/
npm test                                 # sync + vitest (jsdom)
```

`src/contract.ts` is generated and gitignored; do not edit it. Change `src/embed/embed-types.ts` instead.

## License

MIT, see LICENSE. The KeepTrack engine itself is licensed separately.
