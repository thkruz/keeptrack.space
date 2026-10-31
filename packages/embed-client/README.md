# @keeptrack/embed-client

TypeScript client (MIT, no runtime dependencies) that drives a KeepTrack embed through an
`@keeptrack/embed-relay`. Works in Node >= 24 and in browsers, using the global `WebSocket`.

```ts
import { connectKeepTrack } from '@keeptrack/embed-client';

const kt = await connectKeepTrack({ url: 'ws://127.0.0.1:8787', session: 'demo', token });
await kt.waitForEngine();
await kt.select({ norad: '25544' });
console.log(await kt.getPosition({ norad: '25544' }));
kt.on('selectionChanged', (e) => console.log(e.object?.name, e.source)); // source 'remote' for your own calls
kt.close();
```

- Methods mirror `KeepTrackEmbedApi` (every command-callable method) and return Promises. Errors reject with
  `KeepTrackRemoteError` (`code` is an `EmbedErrorCode`, or `TIMEOUT` / `CLOSED`).
- Per-command timeout defaults to 30 s (`commandTimeoutMs`, or `kt.command(cmd, args, { timeoutMs })`).
- `screenshot()` resolves to a base64 PNG string. `screenshotBytes()` returns the decoded PNG: a `Buffer` in
  Node, a `Uint8Array` in browsers.
- `on(event, cb)` returns an unsubscribe function; `subscribe(['timeChanged'])` limits what the relay sends
  (`'*'` = all, `[]` = none). `onEngineStatus(cb)` fires when the session's engine connects or drops.
- No auto-reconnect: `onClose(cb)` tells you the connection ended; call `connectKeepTrack` again.
- The embed must be configured with `remote: { url, session, token }` by its host page; the relay and the
  client use the same session name and token.

Example: `examples/drive.ts` (`npm run example`, see its header for the setup).
