import { IContextMenuConfig, RmbMenuContext } from '@app/engine/plugins/core/plugin-capabilities';
import { ColorMenu } from '@app/plugins/colors-menu/colors-menu';
import { DopsPlugin } from '@app/plugins/dops/dops';
import { DrawLinesPlugin } from '@app/plugins/draw-lines/draw-lines';
import { EarthPresetsPlugin } from '@app/plugins/earth-presets/earth-presets';
import { EditSat } from '@app/plugins/edit-sat/edit-sat';
import { Screenshot } from '@app/plugins/screenshot/screenshot';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { CustomSensorPlugin } from '@app/plugins/sensor/custom-sensor-plugin';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { ViewInfoRmbPlugin } from '@app/plugins/view-info-rmb/view-info-rmb';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';

/**
 * Keeps the right-click menu short (thkruz/keeptrack-space-pro#553): the top level
 * stays at 7 entries or fewer and every action that used to be at the top level is
 * still reachable, either there or one hover away inside a group submenu.
 *
 * Built-ins added by the InputManager: Reset Camera and Clear Screen stay at the top
 * level; Pause Clock moves into the "More" group, so "More" is always present.
 */
const BUILT_IN_TOP_LEVEL = ['reset-camera-rmb', 'clear-screen-rmb'];

/** Every OSS action that was a top-level entry before grouping. */
const FORMER_TOP_LEVEL = ['view-rmb', 'edit-rmb', 'watchlist-rmb', 'draw-rmb', 'create-rmb', 'earth-rmb', 'save-rmb', 'colors-rmb', 'dops-rmb', 'use-sensor-rmb'];

const isVisible_ = (config: IContextMenuConfig, ctx: RmbMenuContext): boolean => {
  if (config.isVisible) {
    return config.isVisible(ctx);
  }
  if (config.isVisibleOnSatellite && ctx.target) {
    return true;
  }

  return ctx.surface === 'earth' ? !!config.isVisibleOnEarth : !!config.isVisibleOffEarth;
};

describe('right-click menu grouping', () => {
  let configs: IContextMenuConfig[];

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    configs = [
      new ViewInfoRmbPlugin(),
      new EditSat(),
      new WatchlistPlugin(),
      new DrawLinesPlugin(),
      new CustomSensorPlugin(),
      new EarthPresetsPlugin(),
      new Screenshot(),
      new ColorMenu(),
      new DopsPlugin(),
      new SensorListPlugin(),
    ].map((plugin) => (plugin as unknown as { getContextMenuConfig(): IContextMenuConfig }).getContextMenuConfig());
  });

  const topLevel = (ctx: RmbMenuContext): string[] => {
    const visible = configs.filter((config) => isVisible_(config, ctx));
    const groups = new Set(visible.filter((config) => config.group).map((config) => `group:${config.group}`));

    groups.add('group:more'); // Pause Clock

    return [...visible.filter((config) => !config.group).map((config) => config.level1ElementName), ...groups, ...BUILT_IN_TOP_LEVEL];
  };

  const contexts: Record<string, RmbMenuContext> = {
    'empty space': { surface: 'space', targetId: -1, target: null, hasPrimarySelection: false },
    earth: { surface: 'earth', targetId: -1, target: null, hasPrimarySelection: false },
    'satellite in space': { surface: 'space', targetId: 0, target: defaultSat, hasPrimarySelection: false },
    'satellite over earth': { surface: 'earth', targetId: 0, target: defaultSat, hasPrimarySelection: true },
  };

  it.each(Object.keys(contexts))('keeps the top level at 7 entries or fewer on %s', (name) => {
    expect(topLevel(contexts[name]).length).toBeLessThanOrEqual(7);
  });

  it('keeps every former top-level action registered', () => {
    const ids = configs.map((config) => config.level1ElementName);

    expect(ids).toEqual(expect.arrayContaining(FORMER_TOP_LEVEL));
  });

  it('puts the object actions under "Satellite" and the occasional ones under "More"', () => {
    const groupOf = (id: string) => configs.find((config) => config.level1ElementName === id)?.group;

    expect(['edit-rmb', 'watchlist-rmb'].map(groupOf)).toEqual(['object', 'object']);
    expect(['create-rmb', 'earth-rmb', 'save-rmb', 'dops-rmb'].map(groupOf)).toEqual(['more', 'more', 'more', 'more']);
    expect(['view-rmb', 'draw-rmb', 'colors-rmb', 'use-sensor-rmb'].map(groupOf)).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('shows the satellite group only when an object is clicked', () => {
    expect(topLevel(contexts.earth)).not.toContain('group:object');
    expect(topLevel(contexts['satellite over earth'])).toContain('group:object');
  });
});
