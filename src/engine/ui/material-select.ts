import { FormSelect } from '@materializecss/materialize';

/**
 * (Re)initialize the Materialize styled dropdown for a single `<select>`.
 *
 * Destroys any existing instance first — Materialize v2's FormSelect has no
 * double-init guard, so a bare `FormSelect.init()` on an already-initialized
 * select stacks a second wrapper in the DOM. Call this after changing a
 * select's options or value programmatically so the styled trigger reflects
 * the new state.
 */
export function refreshMaterialSelect(select: HTMLSelectElement): void {
  FormSelect.getInstance(select)?.destroy();
  FormSelect.init(select);
}

/**
 * (Re)initialize every Materialize `<select>` inside `root`.
 *
 * Targeted replacement for Materialize's `AutoInit()`, which scans the whole
 * document for all twenty component types and re-wraps every select on the
 * page. Scope `root` to the menu or dialog that actually changed.
 */
export function initMaterialSelects(root: ParentNode = document.body): void {
  root.querySelectorAll<HTMLSelectElement>('select:not(.browser-default):not(.no-autoinit)').forEach((select) => {
    refreshMaterialSelect(select);
  });
}
