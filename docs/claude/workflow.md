# Commits, pull requests and issues

## Commits

- Format: `type(scope): :emoji: message`, for example
  `fix(timeline): :bug: keep playback state when jumping to a pass`.
  Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `style`, `perf`, `i18n`, `build`,
  `ci`, `revert`.
- **No AI attribution.** Never end a commit message with `Co-Authored-By: Claude ...`,
  "Generated with Claude Code", a link to Anthropic, or any similar line. The same applies to
  pull request descriptions and issue comments. End the message at its last real line.
  If your agent adds these by default, turn it off in its settings.
- One logical change per commit. Don't bundle unrelated formatting or refactors.
- Stage files by name. Don't `git add -A`: agents sweep up scratch files, screenshots and logs
  that way.
- Don't commit generated output (`dist/`, coverage, test reports, Playwright traces) or local
  files such as `CLAUDE.md`.
- Don't rewrite shared history: no force-pushes, no amending commits that are already pushed.

## Pull requests

- Target `develop`, not `main`. The maintainer promotes `develop` to `main` for releases.
- Describe what changed for the user, how you verified it (commands and their results), and
  what you did not verify. Include screenshots for anything visible.
- Keep the scope to the issue. If you notice a separate bug, open an issue for it instead of
  fixing it in the same pull request.
- Answer review comments, including automated ones, with either a fix or a reason it is not a
  problem. Don't resolve a thread silently.

## Issues

- **Closing an issue needs proof.** Close it only with a comment or a linked pull request that
  shows the fix working: a screenshot for anything visible, otherwise the test or command
  output. A commit hash alone is not proof.
- Comment on the issue when you start, when you are blocked, and when you finish, with commit
  hashes or the pull request link, so the next person does not need your chat history.
- Before opening a new issue, search open and closed issues for a duplicate.
- Bug reports need steps to reproduce, what happened, what you expected, and the browser and
  device. Mark anything you have not confirmed as unknown; don't guess.

## Things to leave alone

- Don't edit `src/engine/ootk` (separate repository) or `src/plugins-pro` (private) in a
  KeepTrack pull request.
- Don't change CI workflows, release scripts or dependency versions unless the issue asks for
  it.
- Don't add new top-level scripts to `package.json` for a one-off task; run the tool directly.
