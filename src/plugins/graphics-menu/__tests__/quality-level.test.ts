import { ISettingControl, ISettingSelectControl, ISettingToggleControl } from '@app/engine/plugins/core/plugin-capabilities';
import { applyQualityLevel, deriveQualityLevel, GRAPHICS_QUALITY_ORDER, targetValueFor } from '@app/plugins/graphics-menu/quality-level';
import { vi } from 'vitest';

type Level = 'low' | 'medium' | 'high' | 'ultra';
type FakeToggle = ISettingToggleControl & { value: boolean; set: ReturnType<typeof vi.fn> };
type FakeSelect = ISettingSelectControl & { value: string; set: ReturnType<typeof vi.fn> };

/** A toggle backed by a local variable, with a spy on set(). */
const toggle = (id: string, initial: boolean, minLevel?: Level): FakeToggle => {
  const c = {
    type: 'toggle' as const,
    id,
    label: id,
    value: initial,
    quality: minLevel ? { minLevel } : undefined,
    get: () => c.value,
    set: vi.fn((next: boolean) => {
      c.value = next;
    }),
  };

  return c;
};

/** A select backed by a local variable, with a spy on set(). */
const select = (id: string, initial: string, byLevel?: Record<Level, string>): FakeSelect => {
  const c = {
    type: 'select' as const,
    id,
    label: id,
    options: [],
    value: initial,
    quality: byLevel ? { byLevel } : undefined,
    get: () => c.value,
    set: vi.fn((next: string) => {
      c.value = next;
    }),
  };

  return c;
};

describe('GRAPHICS_QUALITY_ORDER', () => {
  it('lists the four levels lowest first', () => {
    expect(GRAPHICS_QUALITY_ORDER).toEqual(['low', 'medium', 'high', 'ultra']);
  });
});

describe('targetValueFor', () => {
  it('minLevel medium is off at low and on at medium and above', () => {
    // order: low=0, medium=1, high=2, ultra=3; on iff index(level) >= index(medium) = 1
    expect(targetValueFor({ minLevel: 'medium' }, 'low')).toBe(false);
    expect(targetValueFor({ minLevel: 'medium' }, 'medium')).toBe(true);
    expect(targetValueFor({ minLevel: 'medium' }, 'high')).toBe(true);
    expect(targetValueFor({ minLevel: 'medium' }, 'ultra')).toBe(true);
  });

  it('minLevel low is on at every level; minLevel ultra only at ultra', () => {
    expect(GRAPHICS_QUALITY_ORDER.map((l) => targetValueFor({ minLevel: 'low' }, l))).toEqual([true, true, true, true]);
    expect(GRAPHICS_QUALITY_ORDER.map((l) => targetValueFor({ minLevel: 'ultra' }, l))).toEqual([false, false, false, true]);
  });

  it('byLevel returns the declared value for each level', () => {
    const rule = { byLevel: { low: 'off', medium: '2k', high: '4k', ultra: 16 } };

    expect(targetValueFor(rule, 'low')).toBe('off');
    expect(targetValueFor(rule, 'medium')).toBe('2k');
    expect(targetValueFor(rule, 'high')).toBe('4k');
    expect(targetValueFor(rule, 'ultra')).toBe(16);
  });
});

describe('applyQualityLevel', () => {
  it('calls set() on exactly the controls that differ from their high target, in order', () => {
    // high targets: a (minLevel medium) -> true, b (minLevel ultra) -> false,
    // c (byLevel) -> '4k', d (minLevel low) -> true.
    const a = toggle('a', false, 'medium'); // differs -> set(true)
    const b = toggle('b', false, 'ultra'); // already false -> untouched
    const c = select('c', '2k', { low: '1k', medium: '2k', high: '4k', ultra: '16k' }); // differs -> set('4k')
    const d = toggle('d', true, 'low'); // already true -> untouched
    const calls: string[] = [];

    a.set.mockImplementation((v: boolean) => {
      calls.push('a');
      a.value = v;
    });
    c.set.mockImplementation((v: string) => {
      calls.push('c');
      c.value = v;
    });

    const changed = applyQualityLevel('high', [a, b, c, d]);

    expect(changed).toBe(2);
    expect(calls).toEqual(['a', 'c']);
    expect(a.set).toHaveBeenCalledWith(true);
    expect(c.set).toHaveBeenCalledWith('4k');
    expect(b.set).not.toHaveBeenCalled();
    expect(d.set).not.toHaveBeenCalled();
  });

  it('never touches controls without a rule, buttons, or unavailable controls', () => {
    const noRule = toggle('noRule', false);
    const hidden = { ...toggle('hidden', false, 'low'), isAvailable: () => false };
    const button: ISettingControl = { type: 'button', id: 'btn', label: 'b', buttonLabel: 'b', onClick: vi.fn(), quality: { minLevel: 'low' } };

    expect(applyQualityLevel('ultra', [noRule, hidden, button])).toBe(0);
    expect(noRule.set).not.toHaveBeenCalled();
    expect(hidden.set).not.toHaveBeenCalled();
  });
});

describe('deriveQualityLevel', () => {
  /*
   * Fixture: x (minLevel medium), y (minLevel high), z (byLevel low 1k / medium 2k / high 4k / ultra 16k).
   * Targets at high: x=true, y=true, z='4k'. At ultra: x=true, y=true, z='16k'.
   */
  const fixture = (): [FakeToggle, FakeToggle, FakeSelect] => [
    toggle('x', true, 'medium'),
    toggle('y', true, 'high'),
    select('z', '4k', { low: '1k', medium: '2k', high: '4k', ultra: '16k' }),
  ];

  it('reads high when every control sits at its high target', () => {
    expect(deriveQualityLevel(fixture())).toBe('high');
  });

  it('reads custom after one toggle is flipped away from every level', () => {
    const controls = fixture();

    // y=false with x=true and z='4k': low needs x=false, medium needs z='2k',
    // high needs y=true, ultra needs z='16k', so no level matches.
    controls[1].value = false;

    expect(deriveQualityLevel(controls)).toBe('custom');
  });

  it('picks the highest level when the high and ultra targets coincide', () => {
    // Both toggles are on at high and at ultra (minLevel medium/high), and the
    // select has the same value at high and ultra, so both levels match.
    const controls = [toggle('x', true, 'medium'), toggle('y', true, 'high'), select('z', '4k', { low: '1k', medium: '2k', high: '4k', ultra: '4k' })];

    expect(deriveQualityLevel(controls)).toBe('ultra');
  });

  it('reads custom when no control is quality-aware', () => {
    expect(deriveQualityLevel([toggle('plain', true)])).toBe('custom');
    expect(deriveQualityLevel([])).toBe('custom');
  });
});
