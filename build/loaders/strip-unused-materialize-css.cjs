/**
 * Drops the `fieldset.form-field ... :has(...)` rules from materialize.css.
 *
 * The app never renders `fieldset.form-field` (the CSS-only floating label from Materialize 2.x), but the 46 `:has(input:not(:placeholder-shown))`
 * rules make Chrome re-run style matching for about 1000 elements after ANY DOM change (a text update, an inserted node), roughly 7 ms each time.
 * Removing them leaves every element the app does render untouched.
 */
module.exports = function stripUnusedMaterializeCss(source) {
  return String(source).replace(/[^{}]*fieldset\.form-field[^{}]*:has\([^{}]*\{[^{}]*\}/gu, '');
};
