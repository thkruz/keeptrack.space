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
    // Stacking: while open it sits under <body>, outside #nav-wrapper's stacking context (the Pro timeline is z 10001 inside it).
    expect(vcr.parentElement).toBe(document.body);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(vcr.classList.contains('vcr-popover-open')).toBe(false);
    expect(vcr.parentElement?.id).toBe('nav-wrapper');
    status.click();
    document.body.click();
    expect(vcr.classList.contains('vcr-popover-open')).toBe(false);
  });

  it('opening the popover closes the date picker, and text taps leave it closed (#388)', () => {
    const onOpen = vi.fn();

    document.addEventListener('kt-vcr-popover-open', onOpen);
    document.body.click();
    expect(onOpen).not.toHaveBeenCalled();
    document.getElementById('datetime-status')!.click();
    expect(onOpen).toHaveBeenCalledTimes(1);
    document.removeEventListener('kt-vcr-popover-open', onOpen);
  });

  it('keeps VcrPlugin enabled on phones (#367)', async () => {
    const { MobileManager } = await import('@app/app/ui/mobileManager');

    expect(MobileManager.MOBILE_PLUGINS).toContain('VcrPlugin');
  });
});
