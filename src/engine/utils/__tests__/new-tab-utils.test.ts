import { vi } from 'vitest';
import { NewTabUtils } from '@app/engine/utils/new-tab-utils';

describe('NewTabUtils.varToNewTab', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes a download link and formatted details to the opened tab', () => {
    const writes: string[] = [];
    const fakeWin = {
      document: { write: (s: string) => writes.push(s), title: '' },
      history: { replaceState: vi.fn() },
    };

    vi.spyOn(window, 'open').mockReturnValue(fakeWin as unknown as Window);

    NewTabUtils.varToNewTab({ alpha: 1, beta: 'x' }, 'My Vars');

    const written = writes.join('');

    expect(written).toContain('Download My Vars');
    expect(written).toContain('my-vars.txt');
    expect(written).toContain('alpha: 1');
    expect(written).toContain('<plaintext>');
    expect(fakeWin.document.title).toBe('My Vars');
    expect(fakeWin.history.replaceState).toHaveBeenCalledWith(null, 'My Vars', '/my-vars.txt');
  });

  it('does nothing (no throw) when the popup is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    expect(() => NewTabUtils.varToNewTab({ a: 1 })).not.toThrow();
  });
});
