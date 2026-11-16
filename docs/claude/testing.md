# Tests and proof

The most common agent failure here is reporting work as done because the code compiles and a
test passes, while the feature does not work in the browser. Tests are necessary, not
sufficient.

## Writing tests

- Plugin tests go in `src/plugins/<plugin-name>/__tests__/`. Shared helpers stay in `test/`
  and are imported through `@test/`.
- Use `setupStandardEnvironment([Dependencies])` from `test/environment/standard-env.ts`
  instead of hand-written `vi.mock()` blocks.
- Emit `EventBusEvent.uiManagerInit` after `plugin.init()` so the plugin builds its DOM.
- Set `timeManager.isTimeChangingEnabled = true` before testing anything time-dependent.
- Create spies **before** `init()` when the handler you are testing is bound during init.
- A bug fix comes with a test that fails without the fix. Check that it does: revert the fix
  locally, watch the test fail, restore it.
- Don't weaken or delete an existing assertion to make a test pass. If the old expectation is
  wrong, say why in the pull request.

## Running checks

```bash
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run test:e2e:smoke
```

- Run the focused test file while working (`npx vitest run path/to/file.test.ts`), then the
  full suite before you open a pull request.
- Don't skip hooks (`--no-verify`) to get a commit through. Fix what the hook reports.

## Proving a change in the browser

- Run the app (`pnpm start`, then <http://localhost:5544>) and use the change the way a user
  would. For UI work, check a laptop viewport and a phone viewport.
- **UI changes need a screenshot** (before and after when it is a fix) in the pull request or
  the issue. Say what the screenshot shows and at what viewport size.
- Report what you did not check. "Unit tests pass; not tested on a phone" is useful.
  "Done" without evidence is not.
