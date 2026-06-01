/**
 * Run the Playwright E2E suite locally and report the result to GitHub as a
 * commit status, so a develop -> main PR can require it as a merge gate.
 *
 * This is a LOCAL gate: it runs on your machine (your GPU, your speed) and
 * attests the result for the current HEAD commit. Because GitHub branch
 * protection evaluates required checks against the PR *head* SHA, you must
 * promote develop -> main through a PR (not a local merge + push to main).
 *
 * Flow:
 *   1. git rev-parse HEAD            -> the SHA the status attaches to
 *   2. post a `pending` status       -> PR shows "E2E running locally"
 *   3. npx playwright test           -> the actual suite (5-10 min)
 *   4. post `success` / `failure`    -> PR check goes green / red
 *
 * Usage:
 *   npm run test:e2e:gate                 # full suite
 *   npm run test:e2e:gate -- --grep smoke # forward any args to playwright
 *
 * Requirements:
 *   - `gh` CLI authenticated with a token that has `repo:status` scope
 *   - the current HEAD commit must be pushed to origin (the status attaches
 *     to a SHA GitHub already knows about)
 *
 * Env overrides:
 *   E2E_GATE_CONTEXT     status context name (default: "e2e/local")
 *   E2E_GATE_TARGET_URL  optional URL shown as the check's "Details" link
 */

import { spawnSync } from 'node:child_process';

const CONTEXT = process.env.E2E_GATE_CONTEXT ?? 'e2e/local';
const TARGET_URL = process.env.E2E_GATE_TARGET_URL;
const playwrightArgs = process.argv.slice(2);

type StatusState = 'pending' | 'success' | 'failure' | 'error';

/** Run a command, return its captured stdout (trimmed). Throws on non-zero exit. */
function capture(cmd: string, args: string[]): string {
  const res = spawnSync(cmd, args, { encoding: 'utf-8' });

  if (res.status !== 0) {
    const stderr = res.stderr?.trim() ?? '';

    throw new Error(`\`${cmd} ${args.join(' ')}\` failed (exit ${res.status}): ${stderr}`);
  }

  return (res.stdout ?? '').trim();
}

/** Post a commit status to the current repo's HEAD via the GitHub API. */
function postStatus(sha: string, state: StatusState, description: string): void {
  const args = [
    'api',
    '--method',
    'POST',
    // gh substitutes {owner}/{repo} from the current git repo.
    `repos/{owner}/{repo}/statuses/${sha}`,
    '-f',
    `state=${state}`,
    '-f',
    `context=${CONTEXT}`,
    '-f',
    `description=${description.slice(0, 140)}`,
  ];

  if (TARGET_URL) {
    args.push('-f', `target_url=${TARGET_URL}`);
  }

  const res = spawnSync('gh', args, { encoding: 'utf-8' });

  if (res.status !== 0) {
    const stderr = res.stderr?.trim() ?? '';

    // A 422 here almost always means the commit isn't on origin yet.
    console.error(`\nFailed to post "${state}" status to ${sha}:\n${stderr}`);
    console.error('Is HEAD pushed to origin, and does your gh token have `repo:status` scope?');

    return;
  }

  console.log(`Posted "${state}" status (${CONTEXT}) to ${sha.slice(0, 8)}.`);
}

async function main(): Promise<void> {
  // Confirm gh is authenticated before doing 5-10 minutes of work.
  const auth = spawnSync('gh', ['auth', 'status'], { encoding: 'utf-8' });

  if (auth.status !== 0) {
    throw new Error('gh is not authenticated. Run `gh auth login` first.');
  }

  const sha = capture('git', ['rev-parse', 'HEAD']);
  const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']);

  // Warn early if HEAD isn't on origin — the status would 422 otherwise.
  const onRemote = spawnSync('git', ['branch', '-r', '--contains', sha], { encoding: 'utf-8' });

  if ((onRemote.stdout ?? '').trim() === '') {
    console.warn(`\nWARNING: HEAD (${sha.slice(0, 8)}) is not on any remote branch yet.`);
    console.warn('Push it first (e.g. `git push`) or the commit status will fail to post.\n');
  }

  console.log(`Running E2E gate on ${branch} @ ${sha.slice(0, 8)}`);
  console.log(`Status context: ${CONTEXT}\n`);

  postStatus(sha, 'pending', 'E2E suite running locally');

  const run = spawnSync('npx', ['playwright', 'test', ...playwrightArgs], {
    stdio: 'inherit',
    shell: true,
  });

  const passed = run.status === 0;

  postStatus(
    sha,
    passed ? 'success' : 'failure',
    passed ? 'E2E suite passed locally' : 'E2E suite failed locally',
  );

  // Mirror Playwright's exit code so callers (and CI) see pass/fail.
  process.exitCode = run.status ?? 1;
}

await main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
