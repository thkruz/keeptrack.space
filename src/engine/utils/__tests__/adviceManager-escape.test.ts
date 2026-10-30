import { AdviceManager } from '@app/engine/utils/adviceManager';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('sets modal semantics and focuses an accessible close button', () => {
    mgr.showAdvice('Title', '<a href="#details">Details</a>');
    expect(outer.getAttribute('role')).toBe('dialog');
    expect(outer.getAttribute('aria-modal')).toBe('true');
    const close = outer.querySelector<HTMLButtonElement>('#help-close')!;

    expect(close.getAttribute('aria-label')).toBeTruthy();
    expect(document.activeElement).toBe(close);
    close.click();
    expect(outer.style.display).toBe('none');
  });

  it('wraps focus in both directions and redirects escaped focus', () => {
    mgr.showAdvice('Title', '<a href="#details">Details</a>');
    const close = outer.querySelector<HTMLButtonElement>('#help-close')!;
    const link = outer.querySelector<HTMLAnchorElement>('a')!;

    link.focus();
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(close);
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(link);
    document.getElementById('search')!.focus();
    expect(outer.contains(document.activeElement)).toBe(true);
  });

  it('keeps content clicks open and preserves links', () => {
    mgr.showAdvice('Title', '<a href="#details">Details</a>');
    const link = outer.querySelector<HTMLAnchorElement>('a')!;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(outer.style.display).toBe('block');
  });

  it('contains camera and drawer keys on keydown and keyup without cancelling scroll defaults', () => {
    mgr.showAdvice('Title', 'body');
    const leaked = vi.fn();

    window.addEventListener('keydown', leaked);
    window.addEventListener('keyup', leaked);
    const down = new KeyboardEvent('keydown', { key: '9', bubbles: true, cancelable: true });
    const scroll = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });

    outer.dispatchEvent(down);
    outer.dispatchEvent(new KeyboardEvent('keyup', { key: '9', bubbles: true }));
    outer.dispatchEvent(scroll);
    expect(leaked).not.toHaveBeenCalled();
    expect(scroll.defaultPrevented).toBe(false);
    window.removeEventListener('keydown', leaked);
    window.removeEventListener('keyup', leaked);
  });

  it('closes with Shift+F1 and preserves original focus across repeated help updates', () => {
    const input = document.getElementById('search')!;

    input.focus();
    mgr.showAdvice('First', 'body');
    mgr.showAdvice('Second', 'body');
    outer.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1', shiftKey: true, bubbles: true, cancelable: true }));
    expect(outer.style.display).toBe('none');
    expect(document.activeElement).toBe(input);
  });
});
