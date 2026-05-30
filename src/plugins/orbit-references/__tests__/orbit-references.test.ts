import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrack } from '@app/keeptrack';
import { OrbitReferences } from '@app/plugins/orbit-references/orbit-references';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { defaultSat } from '@test/environment/apiMocks';
import { getEl } from '@app/engine/utils/get-el';
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
