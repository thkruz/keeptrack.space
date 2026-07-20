import { ColorPick } from '@app/engine/utils/color-pick';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('ColorPick', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    document.body.innerHTML = '';
  });

  // The built-in default onColorSelected relies on a `this` binding the call sites don't
  // provide, so callers always pass their own; do the same here.
  const onColorSelected = vi.fn();
  const makeEl = (): HTMLElement => {
    const el = document.createElement('div');

    document.body.appendChild(el);

    return el;
  };

  it('initializes the color from options and uppercases it', () => {
    const cp = new ColorPick(makeEl(), { initialColor: '#abcdef', onColorSelected });

    expect(cp.color).toBe('#ABCDEF');
    expect(onColorSelected).toHaveBeenCalled();
  });

  it('lets data-initialcolor override the option', () => {
    const el = makeEl();

    el.dataset.initialcolor = '#123456';
    const cp = new ColorPick(el, { onColorSelected });

    expect(cp.color).toBe('#123456');
  });

  it('dedupes and uppercases the palette', () => {
    const cp = new ColorPick(makeEl(), { palette: ['#aaa', '#AAA', '#bbb'], onColorSelected });

    expect(cp.palette).toEqual(['#AAA', '#BBB']);
  });

  it('show() renders one palette button per color and a custom input when enabled', () => {
    const cp = new ColorPick(makeEl(), { palette: ['#111', '#222'], allowCustomColor: true, onColorSelected });

    cp.show(10, 20);

    const picker = document.getElementById('colorPick');

    expect(picker).not.toBeNull();
    expect(picker!.querySelectorAll('.colorPickButton').length).toBe(2);
    expect(picker!.querySelector('.customColorHash')).not.toBeNull();
  });

  it('handleCustomColorInput accepts valid hex and flags invalid input', () => {
    const cp = new ColorPick(makeEl(), { allowCustomColor: true, onColorSelected });
    const evtFor = (value: string): KeyboardEvent => {
      const input = document.createElement('input');

      input.value = value;

      return { target: input } as unknown as KeyboardEvent;
    };

    cp.handleCustomColorInput(evtFor('#ff0000'));
    expect(cp.color).toBe('#ff0000');

    const invalid = evtFor('zzz');

    cp.handleCustomColorInput(invalid);
    expect((invalid.target as HTMLInputElement).classList.contains('error')).toBe(true);
  });
});
