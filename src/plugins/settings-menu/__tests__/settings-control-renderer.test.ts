import { SoundNames } from '@app/engine/audio/sounds';
import { Container } from '@app/engine/core/container';
import { Singletons } from '@app/engine/core/interfaces';
import {
  ISettingButtonControl,
  ISettingNumberControl,
  ISettingSelectControl,
  ISettingToggleControl,
  ISettingsContribution,
} from '@app/engine/plugins/core/plugin-capabilities';
import {
  attachSettingControlListeners,
  domIdForControl,
  renderSettingControl,
  renderSettingsSection,
} from '@app/plugins/settings-menu/settings-control-renderer';
import { vi } from 'vitest';

type SoundManagerStub = { play: (name: string) => void };

const installSoundManagerStub = (): SoundManagerStub => {
  const stub: SoundManagerStub = { play: vi.fn() };

  Container.getInstance().registerSingleton(Singletons.SoundManager, stub);

  return stub;
};

const mountHtml = (html: string): HTMLElement => {
  const host = document.createElement('div');

  host.innerHTML = html;
  document.body.appendChild(host);

  return host;
};

describe('domIdForControl', () => {
  it('joins section and control id with a setting- prefix', () => {
    expect(domIdForControl('TimeMachine', 'disableToasts')).toBe('setting-TimeMachine-disableToasts');
  });

  it('preserves hyphens and underscores', () => {
    expect(domIdForControl('my-section', 'opt_one')).toBe('setting-my-section-opt_one');
  });

  it('replaces selector-unsafe characters with underscores', () => {
    expect(domIdForControl('my.section', 'a b')).toBe('setting-my_section-a_b');
  });
});

describe('renderSettingControl - toggle', () => {
  it('renders an unchecked checkbox when get() returns false', () => {
    const ctrl: ISettingToggleControl = { type: 'toggle', id: 'x', label: 'X', get: () => false, set: vi.fn() };

    const host = mountHtml(renderSettingControl(ctrl, 'sec'));
    const input = host.querySelector('input') as HTMLInputElement;

    expect(input.checked).toBe(false);
    expect(input.id).toBe('setting-sec-x');
  });

  it('renders a checked checkbox when get() returns true', () => {
    const ctrl: ISettingToggleControl = { type: 'toggle', id: 'x', label: 'X', get: () => true, set: vi.fn() };

    const html = renderSettingControl(ctrl, 'sec');

    expect(html).toContain(' checked');
  });

  it('renders the label as text', () => {
    const ctrl: ISettingToggleControl = { type: 'toggle', id: 'x', label: 'Hello World', get: () => false, set: vi.fn() };

    expect(renderSettingControl(ctrl, 'sec')).toContain('Hello World');
  });

  it('escapes HTML in the label so plugin-supplied translations cannot inject markup', () => {
    const ctrl: ISettingToggleControl = {
      type: 'toggle', id: 'x', label: '<script>alert(1)</script>', get: () => false, set: vi.fn(),
    };

    const html = renderSettingControl(ctrl, 'sec');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes help text when used in a tooltip attribute', () => {
    const ctrl: ISettingToggleControl = {
      type: 'toggle', id: 'x', label: 'X', helpText: '"breakout" & <bad>', get: () => false, set: vi.fn(),
    };

    const html = renderSettingControl(ctrl, 'sec');

    expect(html).toContain('data-tooltip="&quot;breakout&quot; &amp; &lt;bad&gt;"');
  });

  it('omits tooltip attributes entirely when helpText is absent', () => {
    const ctrl: ISettingToggleControl = { type: 'toggle', id: 'x', label: 'X', get: () => false, set: vi.fn() };

    expect(renderSettingControl(ctrl, 'sec')).not.toContain('data-tooltip');
  });

  it('returns an empty string when isAvailable() is false', () => {
    const ctrl: ISettingToggleControl = {
      type: 'toggle', id: 'x', label: 'X', isAvailable: () => false, get: () => false, set: vi.fn(),
    };

    expect(renderSettingControl(ctrl, 'sec')).toBe('');
  });

  it('adds the disabled attribute when isDisabled() is true', () => {
    const ctrl: ISettingToggleControl = {
      type: 'toggle', id: 'x', label: 'X', isDisabled: () => true, get: () => false, set: vi.fn(),
    };

    expect(renderSettingControl(ctrl, 'sec')).toContain(' disabled');
  });
});

describe('renderSettingControl - number', () => {
  it('renders the current value, min/max/step, and a unit-suffixed label', () => {
    const ctrl: ISettingNumberControl = {
      type: 'number', id: 'fov', label: 'Field of View', unit: 'deg',
      min: 1, max: 180, step: 0.5,
      get: () => 30, set: vi.fn(),
    };

    const host = mountHtml(renderSettingControl(ctrl, 'sec'));
    const input = host.querySelector('input') as HTMLInputElement;

    expect(input.type).toBe('number');
    expect(input.value).toBe('30');
    expect(input.getAttribute('min')).toBe('1');
    expect(input.getAttribute('max')).toBe('180');
    expect(input.getAttribute('step')).toBe('0.5');
    expect(host.querySelector('label')?.textContent).toContain('Field of View');
    expect(host.querySelector('label')?.textContent).toContain('(deg)');
  });

  it('omits unit suffix when unit is not provided', () => {
    const ctrl: ISettingNumberControl = { type: 'number', id: 'n', label: 'N', get: () => 5, set: vi.fn() };

    expect(renderSettingControl(ctrl, 'sec')).not.toContain('(');
  });
});

describe('renderSettingControl - select', () => {
  it('renders all options and marks the current one selected', () => {
    const ctrl: ISettingSelectControl = {
      type: 'select', id: 'mode', label: 'Mode',
      options: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }],
      get: () => 'b', set: vi.fn(),
    };

    const host = mountHtml(renderSettingControl(ctrl, 'sec'));
    const opts = Array.from(host.querySelectorAll('option')) as HTMLOptionElement[];

    expect(opts).toHaveLength(2);
    expect(opts[0].value).toBe('a');
    expect(opts[0].selected).toBe(false);
    expect(opts[1].value).toBe('b');
    expect(opts[1].selected).toBe(true);
    expect(opts[1].textContent).toBe('Beta');
  });

  it('escapes both option values and option labels', () => {
    const ctrl: ISettingSelectControl = {
      type: 'select', id: 'm', label: 'M',
      options: [{ value: '"x"', label: '<b>bold</b>' }],
      get: () => '"x"', set: vi.fn(),
    };

    const html = renderSettingControl(ctrl, 'sec');

    expect(html).toContain('value="&quot;x&quot;"');
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(html).not.toContain('<b>bold</b>');
  });
});

describe('renderSettingControl - button', () => {
  it('renders a button with the supplied label and button text', () => {
    const ctrl: ISettingButtonControl = {
      type: 'button', id: 'reset', label: 'Reset to defaults', buttonLabel: 'Reset', onClick: vi.fn(),
    };

    const host = mountHtml(renderSettingControl(ctrl, 'sec'));
    const btn = host.querySelector('button') as HTMLButtonElement;

    expect(btn.id).toBe('setting-sec-reset');
    expect(btn.textContent?.trim()).toBe('Reset');
    expect(host.textContent).toContain('Reset to defaults');
  });
});

describe('renderSettingsSection', () => {
  const baseToggle = (overrides: Partial<ISettingToggleControl> = {}): ISettingToggleControl => ({
    type: 'toggle', id: 't', label: 'T', get: () => false, set: vi.fn(), ...overrides,
  });

  it('renders a header followed by each visible control', () => {
    const contribution: ISettingsContribution = {
      sectionId: 'TestPlugin', sectionLabel: 'Test Plugin',
      controls: [baseToggle({ id: 'a', label: 'A' }), baseToggle({ id: 'b', label: 'B' })],
    };

    const host = mountHtml(renderSettingsSection(contribution));

    expect(host.querySelector('h5')?.textContent?.trim()).toBe('Test Plugin');
    expect(host.querySelector('#setting-TestPlugin-a')).not.toBeNull();
    expect(host.querySelector('#setting-TestPlugin-b')).not.toBeNull();
  });

  it('returns an empty string when every control is hidden by isAvailable', () => {
    const contribution: ISettingsContribution = {
      sectionId: 'P', sectionLabel: 'P',
      controls: [baseToggle({ isAvailable: () => false }), baseToggle({ id: 'b', isAvailable: () => false })],
    };

    expect(renderSettingsSection(contribution)).toBe('');
  });

  it('skips hidden controls but still renders the rest of the section', () => {
    const contribution: ISettingsContribution = {
      sectionId: 'P', sectionLabel: 'P',
      controls: [
        baseToggle({ id: 'shown', label: 'Shown' }),
        baseToggle({ id: 'hidden', label: 'Hidden', isAvailable: () => false }),
      ],
    };

    const host = mountHtml(renderSettingsSection(contribution));

    expect(host.querySelector('#setting-P-shown')).not.toBeNull();
    expect(host.querySelector('#setting-P-hidden')).toBeNull();
  });

  it('escapes the section label', () => {
    const contribution: ISettingsContribution = {
      sectionId: 'P', sectionLabel: '<img src=x onerror=alert(1)>',
      controls: [baseToggle()],
    };

    const html = renderSettingsSection(contribution);

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('slugs unsafe characters out of the section wrapper id', () => {
    const contribution: ISettingsContribution = {
      sectionId: 'My.Plugin', sectionLabel: 'X',
      controls: [baseToggle()],
    };

    const host = mountHtml(renderSettingsSection(contribution));

    expect(host.querySelector('#settings-plugin-My_Plugin')).not.toBeNull();
  });
});

describe('attachSettingControlListeners - toggle', () => {
  let soundStub: SoundManagerStub;

  beforeEach(() => {
    document.body.innerHTML = '';
    soundStub = installSoundManagerStub();
  });

  it('calls set(true) and plays TOGGLE_ON when checked', () => {
    const set = vi.fn();
    const ctrl: ISettingToggleControl = { type: 'toggle', id: 't', label: 'T', get: () => false, set };

    mountHtml(renderSettingControl(ctrl, 's'));
    attachSettingControlListeners(ctrl, 's');

    const el = document.getElementById('setting-s-t') as HTMLInputElement;

    el.checked = true;
    el.dispatchEvent(new Event('change'));

    expect(set).toHaveBeenCalledWith(true);
    expect(soundStub.play).toHaveBeenCalledWith(SoundNames.TOGGLE_ON);
  });

  it('calls set(false) and plays TOGGLE_OFF when unchecked', () => {
    const set = vi.fn();
    const ctrl: ISettingToggleControl = { type: 'toggle', id: 't', label: 'T', get: () => true, set };

    mountHtml(renderSettingControl(ctrl, 's'));
    attachSettingControlListeners(ctrl, 's');

    const el = document.getElementById('setting-s-t') as HTMLInputElement;

    el.checked = false;
    el.dispatchEvent(new Event('change'));

    expect(set).toHaveBeenCalledWith(false);
    expect(soundStub.play).toHaveBeenCalledWith(SoundNames.TOGGLE_OFF);
  });

  it('does nothing when the underlying DOM element is missing', () => {
    const set = vi.fn();
    const ctrl: ISettingToggleControl = { type: 'toggle', id: 't', label: 'T', get: () => false, set };
    // intentionally NOT mounting the control's HTML

    expect(() => attachSettingControlListeners(ctrl, 's')).not.toThrow();
    expect(set).not.toHaveBeenCalled();
  });

  it('skips attachment when isAvailable() is false', () => {
    const set = vi.fn();
    const ctrl: ISettingToggleControl = {
      type: 'toggle', id: 't', label: 'T', isAvailable: () => false, get: () => false, set,
    };

    // The renderer returns '', so simulate that no DOM exists, then call attach — should be a no-op.
    attachSettingControlListeners(ctrl, 's');
    expect(set).not.toHaveBeenCalled();
  });
});

describe('attachSettingControlListeners - number', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    installSoundManagerStub();
  });

  it('calls set(parsed) for a valid numeric value', () => {
    const set = vi.fn();
    const ctrl: ISettingNumberControl = { type: 'number', id: 'n', label: 'N', get: () => 1, set };

    mountHtml(renderSettingControl(ctrl, 's'));
    attachSettingControlListeners(ctrl, 's');

    const el = document.getElementById('setting-s-n') as HTMLInputElement;

    el.value = '42.5';
    el.dispatchEvent(new Event('change'));

    expect(set).toHaveBeenCalledWith(42.5);
  });

  it('reverts the input and does not call set() when the value is not a number', () => {
    const set = vi.fn();
    const ctrl: ISettingNumberControl = { type: 'number', id: 'n', label: 'N', get: () => 7, set };

    mountHtml(renderSettingControl(ctrl, 's'));
    attachSettingControlListeners(ctrl, 's');

    const el = document.getElementById('setting-s-n') as HTMLInputElement;

    el.value = 'not-a-number';
    el.dispatchEvent(new Event('change'));

    expect(set).not.toHaveBeenCalled();
    expect(el.value).toBe('7');
  });
});

describe('attachSettingControlListeners - select', () => {
  let soundStub: SoundManagerStub;

  beforeEach(() => {
    document.body.innerHTML = '';
    soundStub = installSoundManagerStub();
  });

  it('calls set(value) with the chosen option and plays a click sound', () => {
    const set = vi.fn();
    const ctrl: ISettingSelectControl = {
      type: 'select', id: 'm', label: 'M',
      options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
      get: () => 'a', set,
    };

    mountHtml(renderSettingControl(ctrl, 's'));
    attachSettingControlListeners(ctrl, 's');

    const el = document.getElementById('setting-s-m') as HTMLSelectElement;

    el.value = 'b';
    el.dispatchEvent(new Event('change'));

    expect(set).toHaveBeenCalledWith('b');
    expect(soundStub.play).toHaveBeenCalledWith(SoundNames.CLICK);
  });
});

describe('attachSettingControlListeners - button', () => {
  let soundStub: SoundManagerStub;

  beforeEach(() => {
    document.body.innerHTML = '';
    soundStub = installSoundManagerStub();
  });

  it('calls onClick() and plays a button-click sound when clicked', () => {
    const onClick = vi.fn();
    const ctrl: ISettingButtonControl = {
      type: 'button', id: 'r', label: 'R', buttonLabel: 'R', onClick,
    };

    mountHtml(renderSettingControl(ctrl, 's'));
    attachSettingControlListeners(ctrl, 's');

    const el = document.getElementById('setting-s-r') as HTMLButtonElement;

    el.click();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(soundStub.play).toHaveBeenCalledWith(SoundNames.BUTTON_CLICK);
  });
});
