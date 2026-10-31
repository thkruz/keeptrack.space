import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { licenseWarning, verifyLicense, verifyLicenseKey } from '../embed-license';

const subtle = webcrypto.subtle;
const b64url = (b: ArrayBuffer | string): string => Buffer.from(typeof b === 'string' ? b : new Uint8Array(b)).toString('base64url');

let privateKey: CryptoKey;
let publicKeys: Record<string, string>;
let otherPublicKeys: Record<string, string>;

const NOW = Date.parse('2026-06-01T00:00:00Z');

const mint = async (over: Record<string, unknown> = {}): Promise<string> => {
  const payload = { v: 1, kid: 'k1', sub: 'Acme', dom: ['example.com', '*.acme.io'], iat: '2026-01-01T00:00:00Z', exp: '2027-01-01T00:00:00Z', ed: 'pro', ...over };
  const head = `kt1.${b64url(JSON.stringify(payload))}`;
  const sig = await subtle.sign('Ed25519', privateKey, new TextEncoder().encode(head));

  return `${head}.${b64url(sig)}`;
};

const opts = (hostname: string, extra: object = {}) => ({ hostname, now: NOW, publicKeys, isProBuild: true, ...extra });

beforeAll(async () => {
  const pair = (await subtle.generateKey('Ed25519', true, ['sign', 'verify'])) as CryptoKeyPair;

  privateKey = pair.privateKey;
  publicKeys = { k1: b64url(await subtle.exportKey('raw', pair.publicKey)) };
  const other = (await subtle.generateKey('Ed25519', true, ['sign', 'verify'])) as CryptoKeyPair;

  otherPublicKeys = { k1: b64url(await subtle.exportKey('raw', other.publicKey)) };
});

describe('verifyLicenseKey', () => {
  it('accepts a valid key', async () => {
    const s = await verifyLicenseKey(await mint(), opts('example.com'));

    expect(s).toEqual({ state: 'valid', edition: 'pro', licensee: 'Acme', expiresAt: '2027-01-01T00:00:00Z' });
    expect(licenseWarning(s)).toBeNull();
  });

  it('reports missing', async () => {
    expect((await verifyLicenseKey(undefined, opts('example.com'))).state).toBe('missing');
    expect((await verifyLicenseKey('  ', opts('example.com'))).state).toBe('missing');
  });

  it('reports malformed keys as invalid', async () => {
    const keys = ['garbage', 'kt1.abc', 'kt2.a.b', 'kt1.!!!.???', 'kt1.bm90anNvbg.AAAA'];
    const results = await Promise.all(keys.map((k) => verifyLicenseKey(k, opts('example.com'))));

    expect(results.map((r) => r.state)).toEqual(keys.map(() => 'invalid'));
  });

  it('rejects a tampered payload', async () => {
    const [h, p, s] = (await mint()).split('.');
    const evil = b64url(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), dom: ['evil.com'] }));
    const r = await verifyLicense(`${h}.${evil}.${s}`, opts('evil.com'));

    expect(r.state).toBe('invalid');
    expect(r.edition).toBe('open');
    expect(r.licensee).toBeUndefined();
  });

  it('rejects a signature from a different key', async () => {
    expect((await verifyLicenseKey(await mint(), opts('example.com', { publicKeys: otherPublicKeys }))).state).toBe('invalid');
  });

  it('rejects an unknown kid, and everything with the default empty key map', async () => {
    expect((await verifyLicenseKey(await mint({ kid: 'nope' }), opts('example.com'))).state).toBe('invalid');
    expect((await verifyLicenseKey(await mint(), { hostname: 'example.com', now: NOW, isProBuild: true })).state).toBe('invalid');
  });

  it('rejects wrong version or edition', async () => {
    expect((await verifyLicenseKey(await mint({ v: 2 }), opts('example.com'))).state).toBe('invalid');
    expect((await verifyLicenseKey(await mint({ ed: 'free' }), opts('example.com'))).state).toBe('invalid');
  });

  it('reports expired with licensee', async () => {
    const s = await verifyLicenseKey(await mint({ exp: '2026-05-01T00:00:00Z' }), opts('example.com'));

    expect(s).toMatchObject({ state: 'expired', edition: 'open', licensee: 'Acme' });
    expect(licenseWarning(s)).toContain('expired');
  });

  it('reports wrong-domain', async () => {
    const s = await verifyLicenseKey(await mint(), opts('other.com'));

    expect(s).toMatchObject({ state: 'wrong-domain', edition: 'open' });
    expect(licenseWarning(s)).toContain('domain');
  });

  it('matches wildcards on subdomains only', async () => {
    const key = await mint({ dom: ['*.example.com'] });

    expect((await verifyLicenseKey(key, opts('sub.example.com'))).state).toBe('valid');
    expect((await verifyLicenseKey(key, opts('a.b.example.com'))).state).toBe('valid');
    expect((await verifyLicenseKey(key, opts('example.com'))).state).toBe('wrong-domain');
    expect((await verifyLicenseKey(key, opts('badexample.com'))).state).toBe('wrong-domain');
  });

  it('passes local dev hosts', async () => {
    const key = await mint();

    const hosts = ['localhost', '127.0.0.1', '::1', 'app.localhost'];
    const results = await Promise.all(hosts.map((h) => verifyLicenseKey(key, opts(h))));

    expect(results.map((r) => r.state)).toEqual(hosts.map(() => 'valid'));
  });

  it('gives the open edition on an open build', async () => {
    const s = await verifyLicenseKey(await mint(), opts('example.com', { isProBuild: false }));

    expect(s).toMatchObject({ state: 'valid', edition: 'open' });
  });

  it('warns for invalid and missing keys', async () => {
    expect(licenseWarning(await verifyLicense('nope', opts('example.com')))).toContain('invalid');
    expect(licenseWarning({ state: 'missing', edition: 'open' })).toContain('no license key');
  });
});
