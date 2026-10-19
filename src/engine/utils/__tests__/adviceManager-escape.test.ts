import { AdviceManager } from '@app/engine/utils/adviceManager';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/** Wires the help overlay DOM the way init() would, without the keyboard component. */
const mountHelp = (mgr: AdviceManager): HTMLElement => {
  document.body.insertAdjacentHTML('beforeend', '<div id="help-outer-container" style="display:none;"><span id="help-header"></span><span id="help-text"></span></div>');
  const internals = mgr as unknown as { helpOuterDOM: HTMLElement; helpHeaderDOM: HTMLElement; helpTextDOM: HTMLElement };

  internals.helpOuterDOM = document.getElementById('help-outer-container')!;
  internals.helpHeaderDOM = document.getElementById('help-header')!;
  internals.helpTextDOM = document.getElementById('help-text')!;

  return internals.helpOuterDOM;
};

describe('AdviceManager help overlay (Shift+F1)', () => {
  let mgr: AdviceManager;
  let outer: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<input id="search" />';
    mgr = new AdviceManager();
    outer = mountHelp(mgr);
  });

  afterEach(() => {
    mgr.closeAdvice();
    document.body.innerHTML = '';
  });

  it('closes on Escape and hands focus back to the element that had it', () => {
    const input = document.getElementById('search') as HTMLInputElement;

    input.focus();
    mgr.showAdvice('Find Satellite', 'body');
    expect(outer.style.display).toBe('block');

    const evt = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    document.dispatchEvent(evt);

    expect(outer.style.display).toBe('none');
    expect(evt.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('Escape after the help was closed leaves focus where the user put it', () => {
    mgr.showAdvice('Title', 'body');
    mgr.closeAdvice();
    const input = document.getElementById('search') as HTMLInputElement;

    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

    expect(outer.style.display).toBe('none');
    expect(document.activeElement).toBe(input);
  });

  it('still closes on a click of the overlay', () => {
    mgr.showAdvice('Title', 'body');
    outer.click();

    expect(outer.style.display).toBe('none');
  });
});
