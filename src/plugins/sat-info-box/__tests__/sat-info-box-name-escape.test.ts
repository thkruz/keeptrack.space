import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { EL } from '@app/plugins/sat-info-box/sat-info-box-html';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { CatalogSource, Satellite, SpaceObjectType, TleLine1, TleLine2 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const TLE1 = '1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991' as TleLine1;
const TLE2 = '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053' as TleLine2;
const payload = '<img src=x onerror="window.__ktXss=1">';

describe('SatInfoBox header escapes catalog strings', () => {
  let plugin: SatInfoBox;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    ServiceLocator.getTimeManager().simulationTimeObj = new Date(2023, 1, 1);
    plugin = PluginRegistry.getPlugin(SatInfoBox)!;
    // See sat-info-box-sccnum.test.ts: jsdom leaves isHtmlReady_ false, so set it to render synchronously.
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    // eslint-disable-next-line dot-notation
    plugin['isHtmlReady_'] = true;
  });

  it('renders a name and alt name from an external catalog as text, not markup', () => {
    const sat = new Satellite({
      id: 0,
      active: true,
      sccNum: '25544',
      intlDes: '1998-067A',
      country: 'USA',
      name: `EVIL ${payload}`,
      altName: `ALT ${payload}`,
      type: SpaceObjectType.PAYLOAD,
      tle1: TLE1,
      tle2: TLE2,
      source: CatalogSource.CELESTRAK,
    });

    // eslint-disable-next-line dot-notation
    plugin['updateHeaderData_'](sat);
    // setInnerHtml defers the DOM write via requestIdleCallback (polyfilled onto setTimeout).
    vi.runAllTimers();

    const nameEl = getEl(EL.NAME)!;
    const altNameEl = getEl(EL.ALT_NAME)!;

    expect(nameEl.querySelector('img')).toBeNull();
    expect(nameEl.textContent).toBe(`EVIL ${payload}`);
    expect(altNameEl.querySelector('img')).toBeNull();
    expect(altNameEl.textContent).toBe(`ALT ${payload}`);
  });
});
