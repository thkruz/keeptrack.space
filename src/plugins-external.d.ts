/**
 * Ambient fallback declaration for optional third-party plugins under
 * `src/plugins-external`.
 *
 * External plugins are installed via `npm run plugin -- add <git-url>`, which
 * clones them into `src/plugins-external/<name>` (gitignored) and regenerates
 * the committed `plugin-manifest.external.generated.ts` with dynamic imports of
 * the form `() => import('@plugins-external/<name>/<entry>')`. The generated
 * file is committed so a fresh checkout typechecks, but the clones themselves
 * are not — a fork that commits its lockfile restores them with
 * `npm run plugin -- restore`.
 *
 * In that window (generated file present, clone not yet restored) the
 * `@plugins-external/*` alias resolution fails and tsc falls back to this
 * ambient wildcard, which supplies an any-shaped module. When a clone IS
 * present, its concrete `.ts` files win over this ambient wildcard via
 * TypeScript's module-resolution precedence, so the plugin's real types are
 * enforced during the host build. Mirrors `src/plugins-pro.d.ts`. Do NOT delete.
 */
declare module '@plugins-external/*' {
  const value: any;

  export default value;
}
