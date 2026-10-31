import { describe, expect, it, vi } from 'vitest';
import type { PluginDescriptor } from '../../plugins/plugin-descriptor';
import { prepareEmbed, stripProPlugins } from '../embed-install';
import type { LicenseVerification } from '../embed-license';
import type { EmbedConfig } from '../embed-types';

const manifest = (): PluginDescriptor[] =>
  [
    { configKey: 'ossOnly', ossImport: () => Promise.resolve({}), ossClassName: 'A' },
    { configKey: 'dual', ossImport: () => Promise.resolve({}), ossClassName: 'B', proImport: () => Promise.resolve({}), proClassName: 'B2' },
    { configKey: 'proOnly', proImport: () => Promise.resolve({}), proClassName: 'C' },
  ] as unknown as PluginDescriptor[];

const config: EmbedConfig = { licenseKey: 'kt1.x.y' };

function prep(opts: { verify: LicenseVerification; isProBuild: boolean; cfg?: EmbedConfig | null }) {
  const m = manifest();
  const warn = vi.fn();
  const verify = vi.fn().mockResolvedValue(opts.verify);
  const prepared = prepareEmbed(undefined, {
    readConfig: () => (opts.cfg === undefined ? config : opts.cfg),
    verify,
    manifest: m,
    isProBuild: opts.isProBuild,
    hostname: 'host.example.com',
    warn,
  });

  return { m, warn, verify, prepared };
}

describe('stripProPlugins', () => {
  it('removes every proImport and reports their keys', () => {
    const m = manifest();

    expect(stripProPlugins(m)).toEqual(['dual', 'proOnly']);
    expect(m.some((d) => d.proImport)).toBe(false);
  });
});

describe('license wiring', () => {
  it('keeps Pro plugins for a valid license and passes the hostname to verification', async () => {
    const { m, warn, verify, prepared } = prep({ verify: { state: 'valid', edition: 'pro', licensee: 'Acme' }, isProBuild: true });
    const status = await prepared.resolveLicense();

    expect(status).toEqual({ state: 'valid', edition: 'pro', licensee: 'Acme' });
    expect(m.filter((d) => d.proImport)).toHaveLength(2);
    expect(warn).not.toHaveBeenCalled();
    expect(verify).toHaveBeenCalledWith('kt1.x.y', { hostname: 'host.example.com', isProBuild: true });
  });

  it.each(['invalid', 'missing', 'expired', 'wrong-domain'] as const)('strips Pro plugins in a Pro build when the license is %s', async (state) => {
    const { m, prepared } = prep({ verify: { state, edition: 'open', reason: 'no' }, isProBuild: true });
    const status = await prepared.resolveLicense();

    expect(status.edition).toBe('open');
    expect(status).not.toHaveProperty('reason');
    expect(m.filter((d) => d.proImport)).toHaveLength(0);
  });

  it('logs the license warning once and treats a verifier crash as invalid', async () => {
    const m = manifest();
    const warn = vi.fn();
    const prepared = prepareEmbed(undefined, {
      readConfig: () => config,
      verify: vi.fn().mockRejectedValue(new Error('boom')),
      manifest: m,
      isProBuild: true,
      hostname: 'h',
      warn,
    });

    const status = await prepared.resolveLicense();

    expect(status).toEqual({ state: 'invalid', edition: 'open' });
    expect(m.some((d) => d.proImport)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not touch the manifest in an open build', async () => {
    const { m, prepared } = prep({ verify: { state: 'missing', edition: 'open' }, isProBuild: false });

    await prepared.resolveLicense();
    expect(m.filter((d) => d.proImport)).toHaveLength(2);
  });

  it('is inert when not embedded', async () => {
    const { m, verify, prepared } = prep({ verify: { state: 'invalid', edition: 'open' }, isProBuild: true, cfg: null });

    expect(prepared.isEmbedded).toBe(false);
    await prepared.resolveLicense();
    expect(verify).not.toHaveBeenCalled();
    expect(m.filter((d) => d.proImport)).toHaveLength(2);
  });
});
