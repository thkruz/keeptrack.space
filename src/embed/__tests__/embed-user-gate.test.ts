import { userActionGate } from '@app/engine/core/user-action-gate';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PluginDescriptor } from '../../plugins/plugin-descriptor';
import { KeepTrackEmbedEngine } from '../embed-engine-impl';
import { prepareEmbed } from '../embed-install';
import type { LicenseVerification } from '../embed-license';
import type { EmbedConfig } from '../embed-types';

describe('embed ownership through the user-action gate', () => {
  afterEach(() => userActionGate.clear());

  it('host-owned selection and time: user attempts are reported and blocked', () => {
    const selection = vi.fn();
    const time = vi.fn();

    new KeepTrackEmbedEngine('scenario').installGuards({ selection, time });

    expect(userActionGate.allowSelection(42)).toBe(false);
    expect(userActionGate.allowSelection(-1)).toBe(false);
    expect(selection.mock.calls).toEqual([[42], [-1]]);

    expect(userActionGate.allowTime({ rate: 10 })).toBe(false);
    expect(userActionGate.allowTime({ timeMs: 5 })).toBe(false);
    expect(time.mock.calls).toEqual([[{ rate: 10 }], [{ timeMs: 5 }]]);
  });

  it('shared domains register nothing, so user actions pass', () => {
    new KeepTrackEmbedEngine('scenario').installGuards({});

    expect(userActionGate.allowSelection(1)).toBe(true);
    expect(userActionGate.allowTime({ rate: 2 })).toBe(true);
  });

  it('a guard only blocks its own domain', () => {
    new KeepTrackEmbedEngine('full').installGuards({ selection: vi.fn() });

    expect(userActionGate.allowSelection(1)).toBe(false);
    expect(userActionGate.allowTime({ rate: 2 })).toBe(true);
  });

  it('installs once', () => {
    const engine = new KeepTrackEmbedEngine('full');
    const first = vi.fn();

    engine.installGuards({ selection: first });
    engine.installGuards({ selection: vi.fn() });
    userActionGate.allowSelection(3);

    expect(first).toHaveBeenCalledTimes(1);
  });
});

describe('pro content gating conditions', () => {
  const config: EmbedConfig = { licenseKey: 'kt1.x.y' };
  const run = async (verify: LicenseVerification, isProBuild: boolean, cfg: EmbedConfig | null = config) => {
    const setProContent = vi.fn();
    const prepared = prepareEmbed(undefined, {
      readConfig: () => cfg,
      verify: vi.fn().mockResolvedValue(verify),
      manifest: [] as PluginDescriptor[],
      isProBuild,
      hostname: 'h.example.com',
      warn: vi.fn(),
      setProContent,
    });

    await prepared.resolveLicense();

    return setProContent;
  };

  it('open edition in a pro build switches the content packs off', async () => {
    const gate = await run({ state: 'invalid', edition: 'open', reason: 'bad' }, true);

    expect(gate).toHaveBeenCalledWith(false);
  });

  it('a valid pro license leaves them on', async () => {
    expect(await run({ state: 'valid', edition: 'pro' }, true)).not.toHaveBeenCalled();
  });

  it('an open build has nothing to gate', async () => {
    expect(await run({ state: 'missing', edition: 'open' }, false)).not.toHaveBeenCalled();
  });

  it('not embedded: untouched', async () => {
    expect(await run({ state: 'missing', edition: 'open' }, true, null)).not.toHaveBeenCalled();
  });
});
