#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { startRelay } from './server.js';

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '8787' },
    host: { type: 'string', default: '127.0.0.1' },
    'token-file': { type: 'string' },
    'max-payload-mb': { type: 'string', default: '8' },
    help: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log('Usage: keeptrack-relay [--port 8787] [--host 127.0.0.1] [--token-file <path>] [--max-payload-mb 8]\nThe token can also come from KT_RELAY_TOKEN.');
  process.exit(0);
}

/** A token file is a small regular file; refuse directories, devices, FIFOs and anything large. */
const MAX_TOKEN_FILE_BYTES = 4096;

const readTokenFile = (path: string): string => {
  const resolved = resolve(path);
  const info = statSync(resolved);

  if (!info.isFile() || info.size > MAX_TOKEN_FILE_BYTES) {
    console.error(`--token-file must be a regular file of at most ${MAX_TOKEN_FILE_BYTES} bytes.`);
    process.exit(2);
  }

  return readFileSync(resolved, 'utf8');
};

const token = (values['token-file'] ? readTokenFile(values['token-file']) : (process.env.KT_RELAY_TOKEN ?? '')).trim();

if (!token) {
  console.error('No token: pass --token-file <path> or set KT_RELAY_TOKEN.');
  process.exit(2);
}

const relay = await startRelay({
  token,
  port: Number(values.port),
  host: values.host,
  maxPayload: Number(values['max-payload-mb']) * 1024 * 1024,
  log: (m) => console.log(`[relay] ${m}`),
});

if (relay.host !== '127.0.0.1' && relay.host !== 'localhost' && relay.host !== '::1') {
  console.warn('[relay] bound to a non-loopback address over plain ws://. Put a TLS (wss) reverse proxy in front before exposing it.');
}

const shutdown = (): void => {
  void relay.close().then(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
