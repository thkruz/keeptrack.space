/* eslint-disable max-classes-per-file */
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import type { PluginDescriptor } from '@app/plugins/plugin-descriptor';
import { PluginManager } from '@app/plugins/plugins';

/*
 * PluginManager.loadPlugins() short-circuits under Vitest because isThisNode()
 * is true in the Node test runtime, and the deep import graph means a vi.mock of
 * isThisNode does not reliably reach the already-evaluated plugins module (the
 * documented deep-module mock flake). Rather than fight that, we drive the two
 * private static workhorses - resolveModule_() and initPlugin_() - directly with
 * fully controlled descriptors. These contain all of the branchy logic (pro vs
 * oss resolution, fallback, missing class, login gating) and have no dependency
 * on isThisNode, so they execute deterministically.
 */

// Reach the private statics without `any`.
type PrivateStatics = {
  resolveModule_(descriptor: PluginDescriptor): Promise<{ mod: Record<string, unknown>; usedPro: boolean } | null>;
  initPlugin_(descriptor: PluginDescriptor, resolved: { mod: Record<string, unknown>; usedPro: boolean }): void;
  warnProImportFailed_(descriptor: PluginDescriptor, error: unknown): void;
};
const PM = PluginManager as unknown as PrivateStatics;

const makeDescriptor = (overrides: Partial<PluginDescriptor> = {}): PluginDescriptor => ({
  configKey: 'Test',
  defaultConfig: { enabled: true },
  ...overrides,
});

describe('PluginManager.resolveModule_', () => {
  it('uses the OSS import when no pro import exists (OSS test build)', async () => {
    const ossMod = { OssClass: class {} };
    const descriptor = makeDescriptor({
      ossImport: () => Promise.resolve(ossMod),
      ossClassName: 'OssClass',
    });

    const resolved = await PM.resolveModule_(descriptor);

    expect(resolved).not.toBeNull();
    expect(resolved!.usedPro).toBe(false);
    expect(resolved!.mod).toBe(ossMod);
  });

  it('returns null when there is neither an oss nor a usable pro import', async () => {
    // Pro-only descriptor: __IS_PRO__ is false in the OSS test build, so proImport
    // is undefined and there is no ossImport to fall back to.
    const descriptor = makeDescriptor({ proClassName: 'ProClass' });

    const resolved = await PM.resolveModule_(descriptor);

    expect(resolved).toBeNull();
  });

  it('propagates the rejection when the OSS import throws', async () => {
    const descriptor = makeDescriptor({
      ossImport: () => Promise.reject(new Error('download-failed')),
      ossClassName: 'Never',
    });

    await expect(PM.resolveModule_(descriptor)).rejects.toThrow('download-failed');
  });
});

describe('PluginManager.warnProImportFailed_', () => {
  /*
   * The catch in resolveModule_ that calls this is unreachable here (__IS_PRO__
   * is compile-time false in the OSS test build), so the warning logic is
   * exercised directly. Guards issue #1206: a failed Pro import must produce an
   * actionable message, not a silent fallback or a generic unavailable-feature
   * message.
   */
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('names the failed feature, the setup requirements, and the underlying reason', () => {
    const descriptor = makeDescriptor({
      configKey: 'Telemetry',
      ossImport: () => Promise.resolve({}),
    });

    PM.warnProImportFailed_(descriptor, new Error('license missing'));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const msg = warnSpy.mock.calls[0][0] as string;

    expect(msg).toContain('"Telemetry"');
    expect(msg).toContain('IS_PRO=true');
    expect(msg).toContain('src/plugins-pro');
    expect(msg).toContain('Reason: license missing');
  });

  it('says it fell back to the standard version when an OSS variant exists', () => {
    const descriptor = makeDescriptor({ ossImport: () => Promise.resolve({}) });

    PM.warnProImportFailed_(descriptor, new Error('boom'));

    expect(warnSpy.mock.calls[0][0]).toContain('Falling back to the standard version.');
  });

  it('says the feature is unavailable when there is no OSS variant', () => {
    const descriptor = makeDescriptor({ proClassName: 'ProOnly' });

    PM.warnProImportFailed_(descriptor, new Error('boom'));

    expect(warnSpy.mock.calls[0][0]).toContain('The feature will be unavailable.');
  });

  it('stringifies non-Error rejection reasons', () => {
    const descriptor = makeDescriptor({ ossImport: () => Promise.resolve({}) });

    PM.warnProImportFailed_(descriptor, 'plain string failure');

    expect(warnSpy.mock.calls[0][0]).toContain('Reason: plain string failure');
  });
});

describe('PluginManager.initPlugin_', () => {
  it('instantiates and initializes the OSS class', () => {
    const init = vi.fn();

    class OssClass {
      init = init;
    }
    const descriptor = makeDescriptor({ ossImport: () => Promise.resolve({}), ossClassName: 'OssClass' });

    PM.initPlugin_(descriptor, { mod: { OssClass }, usedPro: false });

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the resolved class name is missing', () => {
    // usedPro false and no ossClassName -> className undefined -> early return.
    const descriptor = makeDescriptor({});

    expect(() => PM.initPlugin_(descriptor, { mod: {}, usedPro: false })).not.toThrow();
  });

  it('prefers the pro class name when usedPro is true', () => {
    const proInit = vi.fn();
    const ossInit = vi.fn();

    class ProClass {
      init = proInit;
    }
    class OssClass {
      init = ossInit;
    }
    const descriptor = makeDescriptor({
      ossClassName: 'OssClass',
      proClassName: 'ProClass',
    });

    PM.initPlugin_(descriptor, { mod: { ProClass, OssClass }, usedPro: true });

    expect(proInit).toHaveBeenCalledTimes(1);
    expect(ossInit).not.toHaveBeenCalled();
  });

  it('falls back to the oss class name when usedPro is true but no proClassName is set', () => {
    const init = vi.fn();

    class SharedClass {
      init = init;
    }
    const descriptor = makeDescriptor({ ossClassName: 'SharedClass' });

    PM.initPlugin_(descriptor, { mod: { SharedClass }, usedPro: true });

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('sets isLoginRequired only when the pro variant was used', () => {
    const captured: boolean[] = [];

    class ProClass {
      isLoginRequired = false;
      init() {
        captured.push(this.isLoginRequired);
      }
    }
    const descriptor = makeDescriptor({
      ossClassName: 'ProClass',
      proClassName: 'ProClass',
      isLoginRequired: true,
    });

    PM.initPlugin_(descriptor, { mod: { ProClass }, usedPro: true });

    expect(captured).toEqual([true]);
  });

  it('does not set isLoginRequired when the OSS variant was used', () => {
    const captured: boolean[] = [];

    class OssClass {
      isLoginRequired = false;
      init() {
        captured.push(this.isLoginRequired);
      }
    }
    const descriptor = makeDescriptor({
      ossClassName: 'OssClass',
      isLoginRequired: true,
    });

    PM.initPlugin_(descriptor, { mod: { OssClass }, usedPro: false });

    expect(captured).toEqual([false]);
  });
});

describe('PluginManager.loadPlugins', () => {
  it('is a no-op (resolves without throwing) in the Node test runtime', async () => {
    const mgr = new PluginManager();

    await expect(mgr.loadPlugins({ SelectSatManager: { enabled: true } } as never)).resolves.toBeUndefined();
  });

  it('tolerates an undefined config object', async () => {
    const mgr = new PluginManager();

    await expect(mgr.loadPlugins(undefined as never)).resolves.toBeUndefined();
  });
});
