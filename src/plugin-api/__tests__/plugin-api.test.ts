import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import {
  addSatInfoBoxSection,
  createPluginStorage,
  EventBus,
  EventBusEvent,
  findObjectIdByNorad,
  getSatByNorad,
  getSelectedSat,
  getSimTime,
  isCurrentSelection,
  jumpToTime,
  KeepTrackPlugin,
  PLUGIN_API_VERSION,
  pluginT7e,
  selectSat,
  selectSatByNorad,
  ToastMsgType,
  toast,
} from '@keeptrack/plugin-api';
import { setupStandardEnvironment } from '@keeptrack/plugin-api/testing';
import semver from 'semver';
import { vi } from 'vitest';
import { ALLOWED_SPECIFIER } from '../../../scripts/plugin/lib/import-policy';

describe('@keeptrack/plugin-api', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes a valid semver PLUGIN_API_VERSION and the real base class', () => {
    expect(semver.valid(PLUGIN_API_VERSION)).toBe(PLUGIN_API_VERSION);
    expect(typeof KeepTrackPlugin).toBe('function');
  });

  describe('selection helpers', () => {
    it('getSelectedSat is null when nothing is selected and returns the primary object otherwise', () => {
      const selectSatManager = PluginRegistry.getPlugin(SelectSatManager)!;

      expect(getSelectedSat()).toBeNull();

      selectSatManager.primarySatObj = ServiceLocator.getCatalogManager().getObject(0) as typeof selectSatManager.primarySatObj;
      expect(getSelectedSat()).toBe(selectSatManager.primarySatObj);
    });

    it('selectSat and selectSatByNorad delegate to SelectSatManager.selectSat', () => {
      const spy = vi.spyOn(PluginRegistry.getPlugin(SelectSatManager)!, 'selectSat').mockImplementation(() => undefined);
      const id = ServiceLocator.getCatalogManager().sccNum2Id(5);

      selectSat(3);
      expect(spy).toHaveBeenLastCalledWith(3);

      expect(selectSatByNorad(5)).toBe(true);
      expect(spy).toHaveBeenLastCalledWith(id);
    });

    it('returns null/false for a NORAD number that is not loaded', () => {
      const spy = vi.spyOn(PluginRegistry.getPlugin(SelectSatManager)!, 'selectSat');

      vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Id').mockReturnValue(null);
      expect(findObjectIdByNorad(99999)).toBeNull();
      expect(selectSatByNorad(99999)).toBe(false);
      expect(spy).not.toHaveBeenCalled();
    });

    it('getSatByNorad delegates to the catalog manager', () => {
      const spy = vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat');

      getSatByNorad(5);
      expect(spy).toHaveBeenCalledWith(5);
    });

    it('isCurrentSelection matches SatInfoBox.isCurrentSelection', () => {
      const obj = ServiceLocator.getCatalogManager().getObject(0)!;

      expect(isCurrentSelection(obj)).toBe(SatInfoBox.isCurrentSelection(obj));
      expect(isCurrentSelection()).toBe(SatInfoBox.isCurrentSelection());
    });
  });

  describe('time helpers', () => {
    it('getSimTime returns a copy of the simulation clock', () => {
      const timeManager = ServiceLocator.getTimeManager();

      timeManager.simulationTimeObj = new Date('2030-03-04T05:06:07Z');
      const t = getSimTime();

      expect(t.toISOString()).toBe('2030-03-04T05:06:07.000Z');
      t.setUTCFullYear(1999);
      expect(timeManager.simulationTimeObj.getUTCFullYear()).toBe(2030);
    });

    it('jumpToTime accepts a Date or epoch ms and uses changeSimulationTime', () => {
      const spy = vi.spyOn(ServiceLocator.getTimeManager(), 'changeSimulationTime').mockImplementation(() => undefined);
      const target = Date.UTC(2031, 0, 1);

      jumpToTime(target);
      jumpToTime(new Date(target));
      expect(spy).toHaveBeenNthCalledWith(1, target);
      expect(spy).toHaveBeenNthCalledWith(2, target);
    });
  });

  it('toast forwards to the UI manager with a normal default', () => {
    const spy = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

    toast('hello');
    toast('careful', ToastMsgType.caution, true);
    expect(spy).toHaveBeenNthCalledWith(1, 'hello', ToastMsgType.normal, false, undefined);
    expect(spy).toHaveBeenNthCalledWith(2, 'careful', ToastMsgType.caution, true, undefined);
  });

  it('addSatInfoBoxSection registers the section and runs onReady after the info box listeners', () => {
    const satInfoBox = { addElement: vi.fn(), addListenerToCollapseElement: vi.fn() } as unknown as SatInfoBox;

    vi.spyOn(PluginRegistry, 'getPlugin').mockImplementation(((cls: unknown) => (cls === SatInfoBox ? satInfoBox : null)) as typeof PluginRegistry.getPlugin);
    const onReady = vi.fn();
    const htmlFn = vi.fn(() => '<div id="my-section"></div>');

    addSatInfoBoxSection({ html: htmlFn, order: 7, collapsibleSectionId: 'my-section', onReady });
    expect(htmlFn).not.toHaveBeenCalled();

    EventBus.getInstance().emit(EventBusEvent.satInfoBoxInit);
    expect(satInfoBox.addElement).toHaveBeenCalledWith({ html: '<div id="my-section"></div>', order: 7 });

    EventBus.getInstance().emit(EventBusEvent.satInfoBoxAddListeners);
    expect(satInfoBox.addListenerToCollapseElement).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('pluginT7e prefixes keys with plugins.<configKey>', () => {
    const l = pluginT7e('MissingTestPlugin');

    // i18next returns the key itself when no translation exists.
    expect(l('title')).toBe('plugins.MissingTestPlugin.title');
  });

  describe('createPluginStorage', () => {
    beforeEach(() => {
      localStorage.clear();
      PersistenceManager.resetInstance();
    });

    it('namespaces values per configKey under one storage key', () => {
      const a = createPluginStorage('PluginA');
      const b = createPluginStorage('PluginB');

      a.setItem('filter', 'leo');
      b.setItem('filter', 'geo');
      a.setJson('range', { min: 1, max: 2 });

      expect(a.getItem('filter')).toBe('leo');
      expect(b.getItem('filter')).toBe('geo');
      expect(a.getJson('range', null)).toEqual({ min: 1, max: 2 });
      expect(a.keys().sort()).toEqual(['filter', 'range']);
      expect(JSON.parse(PersistenceManager.getInstance().getItem(StorageKey.PLUGIN_STORAGE)!)).toEqual({
        PluginA: { filter: 'leo', range: '{"min":1,"max":2}' },
        PluginB: { filter: 'geo' },
      });
    });

    it('removes keys, clears a namespace, and drops the storage key when empty', () => {
      const a = createPluginStorage('PluginA');

      a.setItem('x', '1');
      a.setItem('y', '2');
      a.removeItem('x');
      a.setItem('y', null);
      expect(a.getItem('y')).toBeNull();
      expect(PersistenceManager.getInstance().getItem(StorageKey.PLUGIN_STORAGE)).toBeNull();

      a.setItem('z', '3');
      a.clear();
      expect(a.keys()).toEqual([]);
      expect(a.getJson('missing', 'fallback')).toBe('fallback');
    });

    it('rejects an empty configKey', () => {
      expect(() => createPluginStorage('')).toThrow();
    });
  });
});

describe('plugin scaffold templates', () => {
  const templateRoot = resolve(__dirname, '../../../scripts/plugin');
  const listTemplates = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const abs = join(dir, name);

      if (statSync(abs).isDirectory()) {
        return listTemplates(abs);
      }

      return abs.endsWith('.ts.tmpl') ? [abs] : [];
    });

  it('import only from the plugin API facade, ootk, vitest, or relative paths', () => {
    const files = [...listTemplates(join(templateRoot, 'templates')), ...listTemplates(join(templateRoot, 'templates-overlay'))];

    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const file of files) {
      const specifiers = [...readFileSync(file, 'utf8').matchAll(/^(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|^import\s*['"]([^'"]+)['"]/gmu)].map((m) => m[1] ?? m[2]);

      expect(specifiers.length).toBeGreaterThan(0);
      for (const spec of specifiers) {
        expect({ file, spec, ok: ALLOWED_SPECIFIER.test(spec) }).toEqual({ file, spec, ok: true });
      }
    }
  });
});
