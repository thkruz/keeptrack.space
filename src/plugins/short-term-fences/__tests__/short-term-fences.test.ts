import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { KeepTrack } from '@app/keeptrack';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { ShortTermFences } from '@app/plugins/short-term-fences/short-term-fences';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('ShortTermFences', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(ShortTermFences, 'ShortTermFences');
  standardPluginMenuButtonTests(ShortTermFences, 'ShortTermFences');
  standardClickTests(ShortTermFences);
  standardChangeTests(ShortTermFences);
});

/* eslint-disable dot-notation */

describe('ShortTermFences_class', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });

  standardPluginSuite(ShortTermFences, 'ShortTermFences');
  //   standardPluginMenuButtonTests(ShortTermFences, 'ShortTermFences');

  it('should be able to closeAndDisable', () => {
    const stf = new ShortTermFences();

    websiteInit(stf);
    expect(() => stf['closeAndDisable_']()).not.toThrow();
  });

  it('should be able to handle setSensor', () => {
    const stf = new ShortTermFences();

    websiteInit(stf);
    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, null, null)).not.toThrow();
    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, defaultSensor, 1)).not.toThrow();
  });

  // test stfFormOnSubmit static method
  describe('stfFormOnSubmit', () => {
    it('should call the stfFormOnSubmit method on the ShortTermFences instance', () => {
      const stf = new ShortTermFences();

      websiteInit(stf);
      expect(() => stf['onSubmit_']()).not.toThrow();

      ServiceLocator.getSensorManager().setCurrentSensor(null);
      expect(() => stf['onSubmit_']()).not.toThrow();
    });
  });

  // test stfOnObjectLinkClick method
  describe('stfOnObjectLinkClick', () => {
    it('should call the stfOnObjectLinkClick method on the ShortTermFences instance', () => {
      const stf = new ShortTermFences();

      websiteInit(stf);
      expect(() => stf['stfOnObjectLinkClick_']()).not.toThrow();

      ServiceLocator.getSensorManager().setCurrentSensor(null);
      expect(() => stf['stfOnObjectLinkClick_']()).not.toThrow();

      ServiceLocator.getCatalogManager().getObject = vi.fn().mockReturnValue(defaultSat);
      PluginRegistry.getPlugin(SelectSatManager)!.selectSat(0);
      expect(() => stf['stfOnObjectLinkClick_']()).not.toThrow();
    });
  });
});

describe('ShortTermFences behavior', () => {
  let stf: ShortTermFences;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => stf as any;

  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    stf = new ShortTermFences();
    websiteInit(stf);
    ServiceLocator.getSensorManager().currentSensors = [defaultSensor] as never;
    vi.spyOn(p(), 'verifySensorSelected').mockReturnValue(true);
    vi.spyOn(p(), 'verifySatelliteSelected').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('onSubmit_ adds an STF when it is within the sensor field of view', () => {
    vi.spyOn(defaultSensor, 'isRaeInFov').mockReturnValue(true);
    const addStf = vi.fn();

    ServiceLocator.getSensorManager().addStf = addStf;

    p().onSubmit_();

    expect(addStf).toHaveBeenCalled();
  });

  it('onSubmit_ warns when the STF is outside the sensor field of view', () => {
    vi.spyOn(defaultSensor, 'isRaeInFov').mockReturnValue(false);

    expect(() => p().onSubmit_()).not.toThrow();
  });

  it('the azExt and elExt blur handlers compute the extent in kilometres', () => {
    getEl('stf-azExt')!.dispatchEvent(new Event('blur'));
    getEl('stf-elExt')!.dispatchEvent(new Event('blur'));

    expect((getEl('stf-azExtKm') as HTMLInputElement).value).not.toBe('');
    expect((getEl('stf-elExtKm') as HTMLInputElement).value).not.toBe('');
  });

  it('the azExt and elExt blur handlers clamp an over-wide extent to 80 degrees', () => {
    (getEl('stf-azExt') as HTMLInputElement).value = '120';
    getEl('stf-azExt')!.dispatchEvent(new Event('blur'));
    expect((getEl('stf-azExt') as HTMLInputElement).value).toBe('80.0');

    (getEl('stf-elExt') as HTMLInputElement).value = '120';
    getEl('stf-elExt')!.dispatchEvent(new Event('blur'));
    expect((getEl('stf-elExt') as HTMLInputElement).value).toBe('80.0');
  });

  it('selectSatData wires the on-object STF link for a satellite', () => {
    const fresh = new ShortTermFences();
    const onSpy = vi.spyOn(EventBus.getInstance(), 'on');

    fresh.addHtml();
    const handler = onSpy.mock.calls.find(([evt]) => evt === EventBusEvent.selectSatData)![1] as (obj: unknown) => void;

    document.body.insertAdjacentHTML('beforeend', '<div id="actions-section"></div>');

    expect(() => handler(defaultSat)).not.toThrow();
    expect(getEl('stf-on-object-link', true)).not.toBeNull();
  });

  it('stfOnObjectLinkClick_ fills the form from the selected satellite RAE', () => {
    p().selectSatManager_.primarySatObj = defaultSat;
    vi.spyOn(stf, 'setBottomIconToSelected').mockImplementation(() => undefined);

    expect(() => p().stfOnObjectLinkClick_()).not.toThrow();
    expect((getEl('stf-az') as HTMLInputElement).value).not.toBe('');
  });

  it('stfOnObjectLinkClick_ returns when no satellite is selected', () => {
    (p().verifySatelliteSelected as ReturnType<typeof vi.fn>).mockReturnValue(false);

    expect(() => p().stfOnObjectLinkClick_()).not.toThrow();
  });

  it('stfOnObjectLinkClick_ warns when there is no select-sat manager', () => {
    p().selectSatManager_ = null;

    expect(() => p().stfOnObjectLinkClick_()).not.toThrow();
  });
});
