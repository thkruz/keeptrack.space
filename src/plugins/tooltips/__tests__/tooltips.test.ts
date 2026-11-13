import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import * as isThisNodeMod from '@app/engine/utils/isThisNode';
import { TooltipsPlugin } from '@app/plugins/tooltips/tooltips';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('TooltipsPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(TooltipsPlugin, 'TooltipsPlugin');
});

describe('TooltipsPlugin behavior', () => {
  let plugin: TooltipsPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new TooltipsPlugin();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.getElementById('tooltip')?.remove();
  });

  it('creates the tooltip div on uiManagerInit and wires tagged elements on ready', () => {
    plugin.addHtml();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    expect(document.getElementById('tooltip')).not.toBeNull();

    // One element with a tooltip attribute (gets wired) and one without (logs a warning).
    document.body.insertAdjacentHTML('beforeend', '<div kt-tooltip="Hello" id="tt1"></div><div kt-tooltip="" id="tt2"></div>');
    EventBus.getInstance().emit(EventBusEvent.onKeepTrackReady);

    expect((document.getElementById('tt1') as HTMLElement).style.cursor).toBe('pointer');
  });

  it('shows on mouseenter (after delay) and hides on mouseleave', () => {
    plugin.addHtml();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

    document.body.insertAdjacentHTML('beforeend', '<div kt-tooltip="Howdy" id="tt-hover"></div>');
    const el = document.getElementById('tt-hover') as HTMLElement;

    plugin.createTooltip(el);

    el.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(200);
    expect(document.getElementById('tooltip')!.classList.contains('kt-tooltip-visible')).toBe(true);

    // A second mouseenter while already visible should bail out early.
    expect(() => el.dispatchEvent(new Event('mouseenter'))).not.toThrow();

    el.dispatchEvent(new Event('mouseleave'));
    expect(document.getElementById('tooltip')!.classList.contains('kt-tooltip-visible')).toBe(false);
  });

  it('ignores the emulated mouseenter on a touch-only device (#217)', () => {
    plugin.addHtml();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

    document.body.insertAdjacentHTML('beforeend', '<div kt-tooltip="Howdy" id="tt-touch"></div>');
    const el = document.getElementById('tt-touch') as HTMLElement;
    const original = window.matchMedia;

    window.matchMedia = ((query: string) => ({ matches: query === '(hover: none)', media: query })) as unknown as typeof window.matchMedia;
    try {
      plugin.createTooltip(el);
      el.dispatchEvent(new Event('mouseenter'));
      vi.advanceTimersByTime(500);
      expect(document.getElementById('tooltip')!.classList.contains('kt-tooltip-visible')).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });

  it('resolves a string id and warns when the element is missing', () => {
    // Browser branch so getEl returns null instead of throwing; warn would hit console.trace there.
    vi.spyOn(isThisNodeMod, 'isThisNode').mockReturnValue(false);
    vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

    document.body.insertAdjacentHTML('beforeend', '<div kt-tooltip="ById" id="tt-string"></div>');
    expect(() => plugin.createTooltip('tt-string')).not.toThrow();

    // Missing id resolves to null -> warn + return.
    expect(() => plugin.createTooltip('does-not-exist')).not.toThrow();
  });

  it('hideTooltip and showTooltip no-op safely when the tooltip div is absent', () => {
    document.getElementById('tooltip')?.remove();
    const el = document.createElement('div');

    expect(() => plugin.hideTooltip()).not.toThrow();
    expect(() => plugin.showTooltip(el, 'text')).not.toThrow();
  });

  it('showTooltip lazily creates the popup div when uiManagerInit never made it (phone boot)', () => {
    document.getElementById('tooltip')?.remove();
    const el = document.createElement('div');

    document.body.appendChild(el);
    plugin.showTooltip(el, 'lazy text');

    const popup = document.getElementById('tooltip');

    expect(popup).not.toBeNull();
    expect(popup!.innerHTML).toBe('lazy text');
  });

  it('tap toggles the tooltip on touch for kt-tooltip-tap targets only', () => {
    const div = document.createElement('div');

    div.id = 'tooltip';
    document.body.appendChild(div);
    const tap = document.createElement('span');
    const plain = document.createElement('span');

    tap.setAttribute('kt-tooltip', 'Explain');
    tap.setAttribute('kt-tooltip-tap', '');
    plain.setAttribute('kt-tooltip', 'Other');
    document.body.append(tap, plain);
    plugin.createTooltip(tap);
    plugin.createTooltip(plain);
    const touch = (el: HTMLElement) => {
      const down = new Event('pointerdown');

      Object.defineProperty(down, 'pointerType', { value: 'touch' });
      el.dispatchEvent(down);
      el.click();
    };

    touch(tap);
    expect(div.classList.contains('kt-tooltip-visible')).toBe(true);
    touch(tap);
    expect(div.classList.contains('kt-tooltip-visible')).toBe(false);
    touch(plain);
    expect(div.classList.contains('kt-tooltip-visible')).toBe(false);
  });

  it('wires a circle added after init on first pointer contact; mouse click toggles and tap elsewhere hides', () => {
    plugin.addHtml();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.onKeepTrackReady);
    const div = document.getElementById('tooltip') as HTMLElement;

    document.body.insertAdjacentHTML('beforeend', '<span id="late-circle" kt-tooltip="Late text" kt-tooltip-tap></span>');
    const circle = document.getElementById('late-circle') as HTMLElement;

    circle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    circle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    circle.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    circle.click();
    expect(div.classList.contains('kt-tooltip-visible')).toBe(true);
    expect(div.innerHTML).toBe('Late text');

    circle.click();
    expect(div.classList.contains('kt-tooltip-visible')).toBe(false);

    circle.click();
    expect(div.classList.contains('kt-tooltip-visible')).toBe(true);
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(div.classList.contains('kt-tooltip-visible')).toBe(false);
  });

  it('shows a late-added target on hover without prior wiring', () => {
    plugin.addHtml();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    const div = document.getElementById('tooltip') as HTMLElement;

    document.body.insertAdjacentHTML('beforeend', '<span id="late-hover" kt-tooltip="Hover text"></span>');
    const el = document.getElementById('late-hover') as HTMLElement;

    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(200);
    expect(div.classList.contains('kt-tooltip-visible')).toBe(true);
  });

  it('pointerup tap shows the tooltip once and the following click does not toggle it off', () => {
    const div = document.createElement('div');

    div.id = 'tooltip';
    document.body.appendChild(div);
    const tap = document.createElement('span');

    tap.setAttribute('kt-tooltip', 'Explain');
    tap.setAttribute('kt-tooltip-tap', '');
    document.body.appendChild(tap);
    plugin.createTooltip(tap);
    const fire = (type: string) => {
      const ev = new Event(type);

      Object.defineProperty(ev, 'pointerType', { value: 'touch' });
      tap.dispatchEvent(ev);
    };

    fire('pointerdown');
    fire('pointerup');
    tap.click();
    expect(div.classList.contains('kt-tooltip-visible')).toBe(true);
    fire('pointerdown');
    fire('pointerup');
    tap.click();
    expect(div.classList.contains('kt-tooltip-visible')).toBe(false);
  });

  it('a tap elsewhere hides a tap-shown tooltip', () => {
    const div = document.createElement('div');

    div.id = 'tooltip';
    document.body.appendChild(div);
    const tap = document.createElement('span');

    tap.setAttribute('kt-tooltip', 'Explain');
    tap.setAttribute('kt-tooltip-tap', '');
    document.body.appendChild(tap);
    plugin.createTooltip(tap);
    plugin.addHtml();
    const up = new Event('pointerup');

    Object.defineProperty(up, 'pointerType', { value: 'touch' });
    tap.dispatchEvent(up);
    expect(div.classList.contains('kt-tooltip-visible')).toBe(true);
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(div.classList.contains('kt-tooltip-visible')).toBe(false);
  });
  it('keeps a hovered tooltip past the watchdog interval and refreshes its text in place (#277, #274)', () => {
    // Watchdog intervals leaked from earlier tests would hide the shared popup div
    vi.clearAllTimers();
    plugin.addHtml();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    document.body.insertAdjacentHTML('beforeend', '<div kt-tooltip="Geostationary" id="tt-stale"></div>');
    const el = document.getElementById('tt-stale') as HTMLElement;

    plugin.createTooltip(el);
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ width: 10, height: 10, top: 0, left: 0, right: 10, bottom: 10, x: 0, y: 0, toJSON: () => '' });
    vi.spyOn(el, 'matches').mockImplementation((sel: string) => sel === ':hover');

    el.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(200);
    const div = document.getElementById('tooltip') as HTMLElement;

    expect(div.classList.contains('kt-tooltip-visible')).toBe(true);
    vi.advanceTimersByTime(1200);
    expect(div.classList.contains('kt-tooltip-visible')).toBe(true);

    el.setAttribute('kt-tooltip', 'Medium Earth orbit');
    plugin.refreshTooltip(el);
    expect(div.innerHTML).toBe('Medium Earth orbit');
    expect(div.classList.contains('kt-tooltip-visible')).toBe(true);
  });
});
