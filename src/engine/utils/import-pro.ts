/**
 * Dynamically imports a Pro-only module by a runtime-computed path string.
 *
 * The `@vite-ignore` pragma stops Vite's static import analyzer from attempting
 * to resolve `plugins-pro/*` paths during OSS builds and tests.
 *
 * Type-safety tradeoff: because the specifier is a `string` variable rather than
 * a literal, TypeScript cannot infer the module shape. Callers that destructure
 * (e.g. `const { Foo } = await importPro(...)`) lose compile-time validation of
 * `Foo` — typos surface only at runtime. This is a deliberate concession to
 * keep OSS builds from trying to resolve missing Pro paths. Keep the literal
 * path adjacent to the destructured class name so the pair stays reviewable.
 *
 * At runtime, callers must additionally gate calls on `__IS_PRO__` (or rely on
 * the plugin loader's own gate) so the dynamic import is never executed in OSS.
 */
export const importPro = (path: string): Promise<Record<string, unknown>> =>
  import(/* @vite-ignore */ path);
