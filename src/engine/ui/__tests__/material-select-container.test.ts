import { refreshMaterialSelect } from '@app/engine/ui/material-select';
import { FormSelect } from '@materializecss/materialize';
import { vi } from 'vitest';

describe('refreshMaterialSelect container option (#266)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('attaches the dropdown to body inside a data-select-container="body" ancestor', () => {
    document.body.innerHTML = '<table data-select-container="body"><tr><td><select id="s1"><option>a</option></select></td></tr></table>';
    const init = vi.spyOn(FormSelect, 'init').mockReturnValue(undefined as never);

    refreshMaterialSelect(document.getElementById('s1') as HTMLSelectElement);
    expect(init.mock.calls.at(-1)?.[1]?.dropdownOptions?.container).toBe(document.body);
  });

  it('leaves the container unset elsewhere', () => {
    document.body.innerHTML = '<div><select id="s2"><option>a</option></select></div>';
    const init = vi.spyOn(FormSelect, 'init').mockReturnValue(undefined as never);

    refreshMaterialSelect(document.getElementById('s2') as HTMLSelectElement);
    expect(init.mock.calls.at(-1)?.[1]?.dropdownOptions?.container).toBeUndefined();
  });
});
