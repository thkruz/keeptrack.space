# @keeptrack/embed-relay

Reference relay for the KeepTrack embed remote control channel (MIT). The embed (the "engine") dials out to
the relay; scripts and backends (clients, see `@keeptrack/embed-client`) connect to the same relay and drive
the engine with the JSON command channel. Protocol types live in `src/contract.ts` (generated from
`src/embed/embed-types.ts` by `npm run sync-contract`).

## Run

```
npm run build
node dist/cli.js --port 8787 --token-file ./relay-token.txt     # or KT_RELAY_TOKEN=... node dist/cli.js
```

Needs Node >= 24 and `ws` (`npm install` inside this package). It binds 127.0.0.1 by default.

**Exposing it beyond localhost requires TLS.** The token travels in the hello frame, so plain `ws://` over a
network leaks it. Terminate TLS (wss) in a reverse proxy (nginx, Caddy) and keep the relay on loopback.

## Behavior

- First frame must be a `hello` within 5 s. Bad token closes 4401, malformed frames 4400, no hello 4408,
  too many clients in a session 4429. Frames over 8 MiB (`--max-payload-mb`) close 1009.
- One engine per session. A second engine for the same session replaces the first; the first is closed with
  4409 (the engine does not reconnect after 4409 or 4401). Any number of clients per session.
- Client commands get their `id` replaced with a relay-unique tag (`c<client>:<n>`) on the way to the engine;
  the original id is restored on the result. Commands with no engine online fail with `NOT_READY`; pending
  commands fail with `INTERNAL` ("engine disconnected") if the engine drops.
- Engine events fan out to clients honoring `subscribe` (all events by default).
- `engine-status` is sent to clients when the engine connects or drops.
