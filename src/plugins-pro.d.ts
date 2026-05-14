/**
 * Ambient fallback declaration for the optional `src/plugins-pro` submodule.
 *
 * OSS contributors lack SSH access to the private keeptrack-space-pro repo,
 * so the submodule is absent during their typecheck/lint. `plugin-manifest.ts`
 * has many dynamic imports of the form
 *     __IS_PRO__ ? () => import('../plugins-pro/<...>') : undefined
 * which tsc evaluates eagerly regardless of __IS_PRO__'s runtime value. This
 * wildcard supplies an any-shaped module so resolution succeeds.
 *
 * When plugins-pro IS checked out, concrete `.ts` files win over this ambient
 * wildcard via TypeScript's module-resolution precedence, so pro typings are
 * fully enforced for pro builds. Do NOT delete this file.
 */
declare module '*/plugins-pro/*' {
  const value: any;

  export default value;
}
