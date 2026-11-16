import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { t7e } from '@app/locales/keys';
import { EditSat } from '@app/plugins/edit-sat/edit-sat';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('EditSat with an OEM (non-TLE) selection', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  it('rejects a non-Satellite selection and explains why', () => {
    const plugin = new EditSat();

    websiteInit(plugin);
    const oem = { isSatellite: () => true, id: 1 } as never;

    expect(plugin['isSelectionSupported_'](oem)).toBe(false);
    vi.spyOn(plugin['selectSatManager_'], 'getSelectedSat').mockReturnValue(oem);
    expect(plugin.getDisabledReason()).toBe(t7e('pluginDrawer.reasonSelectTleSatellite'));
  });

  it('keeps the icon disabled when an OEM object is selected', () => {
    const plugin = new EditSat();

    websiteInit(plugin);
    const enableSpy = vi.spyOn(plugin, 'setBottomIconToEnabled');
    const disableSpy = vi.spyOn(plugin, 'setBottomIconToDisabled');

    EventBus.getInstance().emit(EventBusEvent.selectSatData, { isSatellite: () => true, id: 1 } as never, 1);

    expect(disableSpy).toHaveBeenCalled();
    expect(enableSpy).not.toHaveBeenCalled();
  });
});
