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
});
