/**
 * Version of the `@keeptrack/plugin-api` facade contract.
 *
 * Kept in its own dependency-free module so the Node-side plugin CLI
 * (scripts/plugin) can read it without importing any browser code.
 *
 * Semver rules for this surface (see docs/plugin-api.md):
 * - MAJOR: an export is removed or renamed, or its signature/behaviour changes incompatibly.
 * - MINOR: a new export (or a new optional parameter/field) is added.
 * - PATCH: documentation or a bug fix with no contract change.
 */
export const PLUGIN_API_VERSION = '1.0.0';
