import { ISettingsContribution } from '@app/engine/plugins/core/plugin-capabilities';
import { collectSettingsContributions } from '@app/plugins/settings-menu/settings-contributions';
import { vi } from 'vitest';

/*
 * The shared collector feeds both the Settings menu ('general') and the Graphics
 * menu ('graphics'). Plain objects stand in for plugins: the collector only
 * duck-types the two contributor methods and reads `id` for the error log.
 */
const section = (sectionId: string, target?: 'general' | 'graphics', order?: number): ISettingsContribution => ({
  sectionId,
  sectionLabel: sectionId,
  target,
  order,
  controls: [{ type: 'toggle', id: 'flag', label: 'Flag', get: () => false, set: vi.fn() }],
});

describe('collectSettingsContributions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Three fake plugins: one general-only, one graphics-only, one contributing to both.
  const generalOnly = { id: 'GeneralOnly', getSettingsContribution: () => section('generalOnly') };
  const graphicsOnly = { id: 'GraphicsOnly', getSettingsContribution: () => section('graphicsOnly', 'graphics') };
  const both = { id: 'Both', getSettingsContributions: () => [section('bothGeneral', 'general'), section('bothGraphics', 'graphics')] };

  it('returns only the general sections (target absent counts as general)', () => {
    const ids = collectSettingsContributions('general', [generalOnly, graphicsOnly, both]).map((c) => c.sectionId);

    expect(ids).toEqual(['generalOnly', 'bothGeneral']);
  });

  it('returns only the graphics sections', () => {
    const ids = collectSettingsContributions('graphics', [generalOnly, graphicsOnly, both]).map((c) => c.sectionId);

    expect(ids).toEqual(['graphicsOnly', 'bothGraphics']);
  });

  it('orders by explicit order first, then manifest order, then the plugin declaration order', () => {
    const plugins = [
      { id: 'A', getSettingsContribution: () => section('a-noOrder', 'graphics') },
      { id: 'B', getSettingsContributions: () => [section('b-20', 'graphics', 20), section('b-noOrder-2', 'graphics'), section('b-noOrder-1', 'graphics')] },
      { id: 'C', getSettingsContribution: () => section('c-10', 'graphics', 10) },
    ];

    const ids = collectSettingsContributions('graphics', plugins).map((c) => c.sectionId);

    // 10 < 20 < (no order); unordered ties break by manifest index (A=0 before B=1),
    // then by B's own list position (b-noOrder-2 was declared before b-noOrder-1).
    expect(ids).toEqual(['c-10', 'b-20', 'a-noOrder', 'b-noOrder-2', 'b-noOrder-1']);
  });

  it('puts the singular section before the plural ones when a plugin implements both', () => {
    const plugin = {
      id: 'Dual',
      getSettingsContribution: () => section('single', 'graphics'),
      getSettingsContributions: () => [section('multi', 'graphics')],
    };

    expect(collectSettingsContributions('graphics', [plugin]).map((c) => c.sectionId)).toEqual(['single', 'multi']);
  });

  it('logs and skips a throwing contributor without breaking its siblings', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const broken = {
      id: 'Broken',
      getSettingsContribution: () => {
        throw new Error('boom');
      },
      getSettingsContributions: () => [section('brokenStillOk', 'graphics')],
    };

    const ids = collectSettingsContributions('graphics', [broken, graphicsOnly]).map((c) => c.sectionId);

    // Only the method that threw is dropped; the same plugin's other method still counts.
    expect(ids).toEqual(['brokenStillOk', 'graphicsOnly']);
    expect(errSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores values that implement neither method', () => {
    expect(collectSettingsContributions('general', [{ id: 'Plain' }, null, 7])).toEqual([]);
  });
});
