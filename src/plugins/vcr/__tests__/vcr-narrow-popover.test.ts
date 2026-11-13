import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrack } from '@app/keeptrack';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { VcrPlugin } from '@app/plugins/vcr/vcr';
import { setupStandardEnvironment } from '../../../../test/environment/standard-env';

describe('VcrPlugin narrow-width popover (#367)', () => {
  beforeEach(() => {
    setupStandardEnvironment([TopMenu]);
    KeepTrack.getInstance().containerRoot.innerHTML += '<div id="nav-wrapper"><div id="datetime-status">LIVE</div><ul id="nav-top-right"></ul></div>';
    new VcrPlugin().init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
  });

  it('opens from the clock mode label, closes on Escape and outside click', () => {
    const vcr = document.getElementById('vcr-container')!;
    const status = document.getElementById('datetime-status')!;

    expect(status.getAttribute('role')).toBe('button');
    status.click();
    expect(vcr.classList.contains('vcr-popover-open')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(vcr.classList.contains('vcr-popover-open')).toBe(false);
    status.click();
    document.body.click();
    expect(vcr.classList.contains('vcr-popover-open')).toBe(false);
  });
});
