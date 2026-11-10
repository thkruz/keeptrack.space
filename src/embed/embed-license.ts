/**
 * Offline license verification for the KeepTrack Embed API.
 *
 * Key format:
 *   kt1.<base64url(payloadJson)>.<base64url(signature)>
 * The signature is Ed25519 over the ASCII bytes of `kt1.<base64url(payloadJson)>`.
 *
 * Payload (JSON):
 *   v        1
 *   kid      key id, selects the public key in LICENSE_PUBLIC_KEYS
 *   sub      licensee name
 *   dom      exact hostnames or '*.example.com' wildcards (subdomains only, not the apex)
 *   iat/exp  ISO-8601 issue and expiry times
 *   ed       'pro'
 *   features optional feature list
 *
 * localhost, 127.0.0.1, ::1 and *.localhost always pass the domain check for an otherwise valid key.
 * Missing, invalid, expired or wrong-domain keys degrade to the open-core feature set; this module never
 * throws and never makes a network call. It has no engine imports so it can be unit-tested alone.
 */
import type { EmbedLicenseStatus } from './embed-types';
import { LICENSE_PUBLIC_KEYS } from './license-public-keys';

declare const __IS_PRO__: boolean | undefined;

export interface VerifyLicenseOptions {
  hostname: string;
  /** Epoch ms; defaults to Date.now(). */
  now?: number;
  /** kid -> base64url raw 32-byte Ed25519 public key. */
  publicKeys?: Record<string, string>;
  /** Defaults to the __IS_PRO__ build global. */
  isProBuild?: boolean;
}

export interface LicenseVerification extends EmbedLicenseStatus {
  /** Why the state is not 'valid'; undefined when valid or missing. */
  reason?: string;
}

interface LicensePayload {
  v: number;
  kid: string;
  sub: string;
  dom: string[];
  iat: string;
  exp: string;
  ed: string;
  features?: string[];
}

const PREFIX = 'kt1';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const b64urlToBytes_ = (s: string): Uint8Array<ArrayBuffer> => {
  if (!/^[A-Za-z0-9_-]*$/u.test(s)) {
    throw new Error('bad base64url');
  }
  const b64 = s.replace(/-/gu, '+').replace(/_/gu, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));

  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }

  return out;
};

const isLocalHost_ = (host: string): boolean => LOCAL_HOSTS.has(host) || host.endsWith('.localhost');

const domainMatches_ = (hostname: string, domains: string[]): boolean => {
  const host = hostname.trim().toLowerCase();

  if (isLocalHost_(host)) {
    return true;
  }

  return domains.some((raw) => {
    const d = String(raw).trim().toLowerCase();

    if (d.startsWith('*.')) {
      const suffix = d.slice(1); // '.example.com'

      return host.length > suffix.length && host.endsWith(suffix);
    }

    return host === d;
  });
};

const isValidPayload_ = (p: unknown): p is LicensePayload => {
  if (typeof p !== 'object' || p === null) {
    return false;
  }
  const o = p as Record<string, unknown>;

  return (
    o.v === 1 &&
    typeof o.kid === 'string' &&
    typeof o.sub === 'string' &&
    Array.isArray(o.dom) &&
    o.dom.every((d) => typeof d === 'string') &&
    typeof o.exp === 'string' &&
    o.ed === 'pro'
  );
};

const resolveProBuild_ = (explicit?: boolean): boolean => {
  if (explicit !== undefined) {
    return explicit;
  }

  return typeof __IS_PRO__ !== 'undefined' && __IS_PRO__ === true;
};

/** Verify a license key and report the reason when it is not valid. */
export async function verifyLicense(key: string | undefined, opts: VerifyLicenseOptions): Promise<LicenseVerification> {
  const fail = (state: 'missing' | 'invalid', reason: string): LicenseVerification => ({ state, edition: 'open', reason });

  if (typeof key !== 'string' || key.trim() === '') {
    return { state: 'missing', edition: 'open' };
  }

  const parts = key.trim().split('.');

  if (parts.length !== 3 || parts[0] !== PREFIX) {
    return fail('invalid', 'malformed license key');
  }

  let payload: unknown;
  let signature: Uint8Array<ArrayBuffer>;

  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes_(parts[1])));
    signature = b64urlToBytes_(parts[2]);
  } catch {
    return fail('invalid', 'malformed license key');
  }

  if (!isValidPayload_(payload)) {
    return fail('invalid', 'unsupported license payload');
  }

  const keys = opts.publicKeys ?? LICENSE_PUBLIC_KEYS;
  const pub = Object.hasOwn(keys, payload.kid) ? keys[payload.kid] : undefined;

  if (!pub) {
    return fail('invalid', `unknown license key id "${payload.kid}"`);
  }

  let verified = false;

  try {
    const cryptoKey = await crypto.subtle.importKey('raw', b64urlToBytes_(pub), { name: 'Ed25519' }, false, ['verify']);

    verified = await crypto.subtle.verify({ name: 'Ed25519' }, cryptoKey, signature, new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  } catch {
    return fail('invalid', 'Ed25519 is not supported by this browser (WebCrypto), license cannot be verified');
  }

  if (!verified) {
    return fail('invalid', 'license signature does not verify');
  }

  const base = { licensee: payload.sub, expiresAt: payload.exp };
  const expMs = Date.parse(payload.exp);
  const now = opts.now ?? Date.now();

  if (Number.isNaN(expMs)) {
    return { state: 'invalid', edition: 'open', ...base, reason: 'license expiry is not a valid date' };
  }
  if (now >= expMs) {
    return { state: 'expired', edition: 'open', ...base, reason: `license expired on ${payload.exp}` };
  }
  if (!domainMatches_(opts.hostname, payload.dom)) {
    return { state: 'wrong-domain', edition: 'open', ...base, reason: `license is not valid for host "${opts.hostname}"` };
  }

  return { state: 'valid', edition: resolveProBuild_(opts.isProBuild) ? 'pro' : 'open', ...base };
}

/** Verify a license key and return the public status shape. */
export async function verifyLicenseKey(key: string | undefined, opts: VerifyLicenseOptions): Promise<EmbedLicenseStatus> {
  const { reason: _reason, ...status } = await verifyLicense(key, opts);

  return status;
}

/** One-line console warning for a non-valid state, or null when valid. */
export function licenseWarning(status: EmbedLicenseStatus | LicenseVerification): string | null {
  const reason = (status as LicenseVerification).reason;

  switch (status.state) {
    case 'valid':
      return null;
    case 'missing':
      return 'KeepTrack Embed: no license key provided, running the open-core feature set.';
    case 'expired':
      return `KeepTrack Embed: license${status.licensee ? ` for ${status.licensee}` : ''} expired${status.expiresAt ? ` on ${status.expiresAt}` : ''}, running the open-core feature set.`;
    case 'wrong-domain':
      return 'KeepTrack Embed: license is not valid for this domain, running the open-core feature set.';
    default:
      return `KeepTrack Embed: license key is invalid${reason ? ` (${reason})` : ''}, running the open-core feature set.`;
  }
}
