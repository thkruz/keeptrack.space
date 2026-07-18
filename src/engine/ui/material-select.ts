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
  FormSelect.init(select, {
    dropdownOptions: {
      /*
       * Promote the enclosing v13 section card to its own stacking context for as
       * long as this dropdown is open (open-START through close-fade END), so the
       * popup paints over later sibling cards. This replaces a CSS
       * `.kt-section:has(.dropdown-content[style*="display: block"])` rule: a
       * `:has()` matching on the `style` attribute forces Chrome to re-run a
       * full-document style recalc on EVERY style-attribute mutation anywhere on
       * the page - i.e. every animation frame, since the timeline playhead moves
       * each frame - which tanks the frame rate. Keying the promotion off these
       * open/close callbacks plus a plain class keeps invalidation scoped. See
       * `.kt-section.kt-dropdown-open` in menu-v13.css.
       */
      onOpenStart: () => select.closest('.kt-section')?.classList.add('kt-dropdown-open'),
      onCloseEnd: () => select.closest('.kt-section')?.classList.remove('kt-dropdown-open'),
    },
  });

  /*
   * v2 bug: for multi-selects, _toggleEntryFromArray updates the option, the li
   * class, and the trigger text on each click, but checkbox visuals are only
   * synced in _setSelectedStates(), which runs on open — so boxes don't reflect
   * toggles made while the dropdown is open. Re-sync after every change.
   */
  if (select.multiple && !select.dataset.ktMultiWired) {
    select.dataset.ktMultiWired = '1';
    select.addEventListener('change', () => syncMaterialSelect(select));
  }
}

/**
 * Sync a FormSelect's rendered UI (option checkboxes, selected classes, trigger
 * text) to the native select's state without rebuilding — unlike
 * {@link refreshMaterialSelect}, this keeps an open dropdown open. Uses the
 * instance's internal sync methods; falls back to a no-op if they disappear.
 */
export function syncMaterialSelect(select: HTMLSelectElement): void {
  const instance = FormSelect.getInstance(select) as unknown as
    | {
        _setSelectedStates?: () => void;
        _setValueToInput?: () => void;
      }
    | undefined;

  instance?._setSelectedStates?.();
  instance?._setValueToInput?.();
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
