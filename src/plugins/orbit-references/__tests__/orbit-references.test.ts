import { AnalystSlotReservations } from '@app/app/data/analyst-slot-reservations';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import * as isThisNodeMod from '@app/engine/utils/isThisNode';
import { KeepTrack } from '@app/keeptrack';
import { OrbitReferences } from '@app/plugins/orbit-references/orbit-references';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { settingsManager } from '@app/settings/settings';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('OrbitReferences', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(OrbitReferences, 'OrbitReferences');
});

// Create a short test for the OrbitReferences plugin
describe('OrbitReferences', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });
  standardPluginSuite(OrbitReferences, 'OrbitReferences');

  it.skip('should_not_throw_error', () => {
    const orbitReferences = new OrbitReferences();

    expect(() => orbitReferences.init()).not.toThrow();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    expect(() => EventBus.getInstance().emit(EventBusEvent.selectSatData, defaultSat, 0)).not.toThrow();

    ServiceLocator.getCatalogManager().analSatSet = [defaultSat];
    PluginRegistry.getPlugin(SelectSatManager)!.selectSat(0);
    ServiceLocator.getCatalogManager().addAnalystSat = () => defaultSat;
    getEl('orbit-references-link')!.click();
  });
});

describe('OrbitReferences behavior', () => {
  let plugin: OrbitReferences;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    plugin = new OrbitReferences();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Capture the plugin's own selectSatData handler to invoke it in isolation from other listeners.
  const captureSelectSatHandler = (): ((obj?: unknown) => void) => {
    const onSpy = vi.spyOn(EventBus.getInstance(), 'on');

    plugin.addHtml();
    const call = onSpy.mock.calls.find(([evt]) => evt === EventBusEvent.selectSatData);

    return call![1] as (obj?: unknown) => void;
  };

  it('hides the link for a non-satellite selection', () => {
    const handler = captureSelectSatHandler();

    expect(() => handler(undefined)).not.toThrow();
  });

  it('creates the orbit-references link once for a satellite selection', () => {
    document.body.insertAdjacentHTML('beforeend', '<div id="actions-section"></div>');
    const handler = captureSelectSatHandler();

    handler(defaultSat);
    expect(getEl('orbit-references-link', true)).not.toBeNull();

    // Second selection: doOnce is already true, so it doesn't duplicate the link.
    expect(() => handler(defaultSat)).not.toThrow();
  });

  it('returns early when the actions section is missing', () => {
    // Browser branch so getEl returns null (instead of throwing) for the missing actions-section.
    vi.spyOn(isThisNodeMod, 'isThisNode').mockReturnValue(false);
    const handler = captureSelectSatHandler();

    expect(() => handler(defaultSat)).not.toThrow();
  });

  it('orbitReferencesLinkClick adds analyst satellites and runs a search', () => {
    const catalog = ServiceLocator.getCatalogManager();

    vi.spyOn(catalog, 'getSat').mockReturnValue(defaultSat);
    vi.spyOn(catalog, 'sccNum2Id').mockReturnValue(10000);
    vi.spyOn(catalog, 'addAnalystSat').mockReturnValue({ sccNum: '90000' } as never);
    const doSearch = vi.fn();

    ServiceLocator.getUiManager().doSearch = doSearch;

    plugin.orbitReferencesLinkClick();

    expect(doSearch).toHaveBeenCalled();
    expect(plugin.isReferenceSatsActive).toBe(true);
  });

  it('orbitReferencesLinkClick skips ids that do not resolve to a number', () => {
    const catalog = ServiceLocator.getCatalogManager();

    vi.spyOn(catalog, 'getSat').mockReturnValue(defaultSat);
    vi.spyOn(catalog, 'sccNum2Id').mockReturnValue(undefined as never);
    const doSearch = vi.fn();

    ServiceLocator.getUiManager().doSearch = doSearch;

    expect(() => plugin.orbitReferencesLinkClick()).not.toThrow();
    expect(doSearch).toHaveBeenCalled();
  });

  it('orbitReferencesLinkClick returns when the selection is not a satellite', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getSat').mockReturnValue(undefined as never);

    expect(() => plugin.orbitReferencesLinkClick()).not.toThrow();
  });

  describe('analyst slot ownership', () => {
    afterEach(() => {
      AnalystSlotReservations.clear();
    });

    it("skips reserved ids and other tools' active objects, and reuses its own references on a second click", () => {
      const catalog = ServiceLocator.getCatalogManager();
      const slots: { id: number; sccNum: string; active: boolean; name: string }[] = Array.from({ length: 6 }, (_, i) => ({
        id: i,
        sccNum: String(90000 + i),
        active: false,
        name: `Analyst Sat ${i}`,
      }));

      slots[1] = { ...slots[1], active: true, name: 'Created by Create Satellite' };
      const foreign = slots[1];

      catalog.objectCache = slots as never;
      settingsManager.maxAnalystSats = slots.length;
      AnalystSlotReservations.reserve('90000', 'new-launch');
      vi.spyOn(catalog, 'getSat').mockReturnValue(defaultSat);
      vi.spyOn(catalog, 'sccNum2Id').mockImplementation(((scc: string) => {
        const i = Number(scc) - 90000;

        return i >= 0 && i < slots.length ? i : null;
      }) as never);
      const add = vi.spyOn(catalog, 'addAnalystSat').mockImplementation(((_t1: string, _t2: string, id: number, sccNum: string) => {
        const ref = { id, sccNum, active: true, name: `Analyst Sat ${id}` };

        catalog.objectCache[id] = ref as never;

        return ref;
      }) as never);
      const doSearch = vi.fn();

      ServiceLocator.getUiManager().doSearch = doSearch;

      plugin.orbitReferencesLinkClick();

      const writtenIds = add.mock.calls.map((call) => call[2]);

      expect(writtenIds).not.toContain(0);
      expect(writtenIds).not.toContain(1);
      expect(writtenIds[0]).toBe(2);
      expect(catalog.objectCache[1]).toBe(foreign);
      // The parent and the first reference are separate search terms.
      expect(doSearch.mock.calls[0][0]).toMatch(/^\d{5},90002/u);

      // A second click rewrites the same (own) slots instead of being blocked by them.
      add.mockClear();
      plugin.orbitReferencesLinkClick();
      expect(add.mock.calls.map((call) => call[2])).toEqual(writtenIds);
    });
  });
});
