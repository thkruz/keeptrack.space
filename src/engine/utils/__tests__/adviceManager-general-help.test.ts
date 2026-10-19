import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getGeneralHelpConfig } from '@app/engine/ui/help/general-help';
import { AdviceManager } from '@app/engine/utils/adviceManager';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/** Wires the help overlay DOM the way init() would, without the keyboard component. */
const mountHelp = (mgr: AdviceManager): { outer: HTMLElement; header: HTMLElement } => {
  document.body.insertAdjacentHTML('beforeend', '<div id="help-outer-container" style="display:none;"><span id="help-header"></span><span id="help-text"></span></div>');
  const internals = mgr as unknown as { helpOuterDOM: HTMLElement; helpHeaderDOM: HTMLElement; helpTextDOM: HTMLElement };

  internals.helpOuterDOM = document.getElementById('help-outer-container')!;
  internals.helpHeaderDOM = document.getElementById('help-header')!;
  internals.helpTextDOM = document.getElementById('help-text')!;

  return { outer: internals.helpOuterDOM, header: internals.helpHeaderDOM };
};

const pressHelpKey = (mgr: AdviceManager): void => (mgr as unknown as { onHelpKey_: () => void }).onHelpKey_();

describe('AdviceManager Shift+F1 fallback to the general help', () => {
  let mgr: AdviceManager;
  let outer: HTMLElement;
  let header: HTMLElement;
  let pluginAnswer: (() => void) | null;
  const listener = (): void => pluginAnswer?.();

  beforeEach(() => {
    document.body.innerHTML = '';
    mgr = new AdviceManager();
    ({ outer, header } = mountHelp(mgr));
    pluginAnswer = null;
    EventBus.getInstance().on(EventBusEvent.onHelpMenuClick, listener);
  });

  afterEach(() => {
    EventBus.getInstance().unregister(EventBusEvent.onHelpMenuClick, listener);
    mgr.closeAdvice();
    document.body.innerHTML = '';
  });

  it('shows the general KeepTrack help when no menu or view answers', () => {
    pressHelpKey(mgr);

    expect(outer.style.display).toBe('block');
    expect(header.innerHTML).toBe(getGeneralHelpConfig().title);
  });

  it('shows the answering plugin help instead of the general help', () => {
    pluginAnswer = () => mgr.showAdvice('Flat Map', 'flat map body');

    pressHelpKey(mgr);

    expect(header.innerHTML).toBe('Flat Map');
  });

  it('closes an open help instead of reopening it', () => {
    mgr.showAdvice('Flat Map', 'body');

    pressHelpKey(mgr);

    expect(outer.style.display).toBe('none');
  });
});
