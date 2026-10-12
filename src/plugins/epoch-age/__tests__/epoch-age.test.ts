import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { t7e } from '@app/locales/keys';
import { EpochAge } from '@app/plugins/epoch-age/epoch-age';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

// Canonical Vallado SGP4 ISS test TLE. Epoch 08264.51782528 = 2008 day 264.51782528, i.e.
// 263.51782528 days after 2008-01-01T00:00Z (closed form, independent of ootk).
const TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927' as TleLine1;
const TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537' as TleLine2;
const EPOCH_MS = Date.UTC(2008, 0, 1) + 263.51782528 * 86400e3;
const DAY = 86400e3;

describe('EpochAge', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(EpochAge, 'EpochAge');
});

describe('EpochAge behavior', () => {
  let plugin: EpochAge;
  let selected: Satellite | null;
  let toastSpy: ReturnType<typeof vi.spyOn>;

  const setSimTime = (ms: number): void => {
    ServiceLocator.getTimeManager().simulationTimeObj = new Date(ms);
    EventBus.getInstance().emit(EventBusEvent.staticOffsetChange, 0);
  };
  const badge = (): HTMLElement => document.getElementById(EpochAge.BADGE_ID) as HTMLElement;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    settingsManager.isShowEpochAge = true;
    selected = new Satellite({ id: 0, tle1: TLE1, tle2: TLE2 });
    vi.spyOn(PluginRegistry, 'getPlugin').mockImplementation((() => ({ primarySatObj: selected })) as never);
    toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    plugin = new EpochAge();
    plugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
  });

  afterEach(() => {
    document.getElementById(EpochAge.BADGE_ID)?.remove();
    vi.restoreAllMocks();
  });

  it('shows the low badge 10 days after the epoch and hides it at the epoch', () => {
    ServiceLocator.getTimeManager().simulationTimeObj = new Date(EPOCH_MS + 10 * DAY);
    EventBus.getInstance().emit(EventBusEvent.selectSatData, selected as Satellite, 0);

    expect(badge().style.display).toBe('');
    expect(badge().dataset.level).toBe('low');
    expect(badge().textContent).toBe(t7e('plugins.EpochAge.badge.low').replace('{days}', '+10.0 d'));

    setSimTime(EPOCH_MS);

    expect(badge().style.display).toBe('none');
    expect(badge().dataset.level).toBeUndefined();
  });

  it('toasts once per satellite when the age crosses 14 days', () => {
    EventBus.getInstance().emit(EventBusEvent.selectSatData, selected as Satellite, 0);
    setSimTime(EPOCH_MS + 10 * DAY);
    expect(toastSpy).not.toHaveBeenCalled();

    setSimTime(EPOCH_MS + 15 * DAY);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledWith(t7e('plugins.EpochAge.toast.poor'), expect.anything(), true);
    expect(badge().dataset.level).toBe('poor');

    // Back under, then over again: no second toast for the same sccNum.
    setSimTime(EPOCH_MS + 10 * DAY);
    setSimTime(EPOCH_MS + 15 * DAY);
    expect(toastSpy).toHaveBeenCalledTimes(1);
  });

  it('treats time before the epoch symmetrically', () => {
    EventBus.getInstance().emit(EventBusEvent.selectSatData, selected as Satellite, 0);
    setSimTime(EPOCH_MS - 5 * DAY);

    expect(badge().dataset.level).toBe('caution');
    expect(badge().textContent).toContain('-5.0 d');
  });

  it('hides the badge when nothing is selected or the setting is off', () => {
    setSimTime(EPOCH_MS + 10 * DAY);
    expect(badge().dataset.level).toBe('low');

    settingsManager.isShowEpochAge = false;
    plugin.refresh();
    expect(badge().style.display).toBe('none');

    settingsManager.isShowEpochAge = true;
    selected = null;
    plugin.refresh();
    expect(badge().style.display).toBe('none');
  });
});
