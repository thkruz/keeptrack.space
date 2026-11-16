// pnpm install hooks.
//
// TypeScript 7 is the native (Go) compiler and ships no JavaScript compiler
// API. `tsc`/`tsgo` type-checking uses TS 7, but tools that import the
// `typescript` module at runtime still need a 5.x/6.x package:
//   - typedoc: give it a private TypeScript 5.9 instead of the root TS 7 peer.
//   - our own scripts import the `typescript-api` alias (see package.json).
// Remove the typedoc entry once typedoc supports TypeScript 7.

const TS_API_RANGE = '^5.9.3';

function readPackage(pkg) {
  if (pkg.name === 'typedoc') {
    if (pkg.peerDependencies) {
      delete pkg.peerDependencies.typescript;
    }
    pkg.dependencies = { ...pkg.dependencies, typescript: TS_API_RANGE };
  }

  return pkg;
}

module.exports = { hooks: { readPackage } };
