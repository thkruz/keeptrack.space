# External Plugins

This folder holds **third-party KeepTrack plugins** installed from a git URL. It
is managed entirely by the plugin CLI — do not add files here by hand.

```bash
# Install a plugin from a git repo (clones it here, wires it into the build)
npm run plugin -- add https://github.com/someone/keeptrack-plugin-foo

# List installed plugins and their compatibility
npm run plugin -- list

# Update / remove
npm run plugin -- update keeptrack-plugin-foo
npm run plugin -- remove keeptrack-plugin-foo

# Restore every plugin recorded in external-plugins.json (run on a fresh checkout)
npm run plugin -- restore
```

The individual plugin clones are **gitignored** (each is its own git repo). What
*is* committed is the reproducible record of your plugin set:

- [`external-plugins.json`](../../external-plugins.json) at the repo root — the
  lockfile of installed plugins, their URLs, and pinned commits.
- [`plugin-manifest.external.generated.ts`](../plugins/plugin-manifest.external.generated.ts) —
  the generated manifest wiring, spread onto the built-in plugin manifest.

A fresh checkout of a fork that committed those two files can restore its exact
plugin set with `npm run plugin -- restore` (also run automatically by
`prebuild`).

To **build a plugin**, see `npm run plugin -- create <name>` and the plugin
development guide in the docs.
