/**
 * Zero-touch offline SonarQube analysis.
 *
 * Brings up the local SonarQube server (if needed), mints an analysis token via the
 * default `admin` API (so contributors never have to create an account or click around
 * the UI), runs the containerized scanner, and opens the dashboard.
 *
 * Subcommands:
 *   (none)            npm run sonar:scan  — set up + scan
 *   token             npm run sonar:token — print a SonarLint user token
 *   issues            npm run sonar:issues — export all server issues to SARIF for the Problems tab
 *
 * Overrides (rarely needed):
 *   SONAR_HOST_URL        default http://localhost:9000
 *   SONAR_ADMIN_PASSWORD  if you've changed admin's password from the default
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { openFile } from '../build/utils/open-file';

const COMPOSE_FILE = 'docker-compose.sonar.yml';
const SONAR_URL = process.env.SONAR_HOST_URL ?? 'http://localhost:9000';
const PROJECT_KEY = 'keeptrack';
const TOKEN_NAME = 'keeptrack-local-analysis';
const HEALTH_TIMEOUT_MS = 180_000;
const HEALTH_POLL_MS = 3_000;
const SARIF_OUTPUT = '.sonarqube/issues.sarif';
const ISSUE_PAGE_SIZE = 500;
const ISSUE_SEARCH_CAP = 10_000; // SonarQube caps the issues search API at 10k results.

// KeepTrack is math/astrodynamics + WebGL heavy, so a couple of default rules fit poorly.
// We apply these on a custom "KeepTrack way" quality profile (copied from "Sonar way").
const QUALITY_PROFILE_NAME = 'KeepTrack way';
const COGNITIVE_COMPLEXITY_THRESHOLD = process.env.SONAR_COMPLEXITY_THRESHOLD ?? '40';
// Per language: the Cognitive Complexity rule (S3776, threshold raised) and rules to disable.
// S7748 ("Don't use a zero fraction in the number") fires on the float literals (e.g. 1.0)
// that are ubiquitous and idiomatic in WebGL/shader/matrix math here.
const QUALITY_PROFILE_LANGUAGES: Array<{ lang: string; complexityRule: string; disabledRules: string[] }> = [
  { lang: 'ts', complexityRule: 'typescript:S3776', disabledRules: ['typescript:S7748'] },
  { lang: 'js', complexityRule: 'javascript:S3776', disabledRules: ['javascript:S7748'] },
];

const docker = (args: string[], env?: NodeJS.ProcessEnv): number => {
  // Pass the command as a single shell string (cross-platform `docker` resolution on
  // Windows) without an args array, which avoids the DEP0190 shell+args warning.
  const result = spawnSync(['docker', ...args].join(' '), {
    stdio: 'inherit',
    shell: true,
    env: env ?? process.env,
  });

  if (result.error) {
    throw new Error(`Failed to run docker (is Docker installed and running?): ${result.error.message}`);
  }

  return result.status ?? 1;
};

const basicHeader = (user: string, pass: string): string => {
  const encoded = Buffer.from(`${user}:${pass}`).toString('base64');

  return `Basic ${encoded}`;
};

const sleep = (ms: number) => new Promise((resolve) => { setTimeout(resolve, ms); });

const waitForHealthy = async (): Promise<void> => {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;

  process.stdout.write('Waiting for SonarQube to become operational');
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${SONAR_URL}/api/system/status`);

      if (res.ok) {
        const body = (await res.json()) as { status?: string };

        if (body.status === 'UP') {
          process.stdout.write(' done.\n');

          return;
        }
      }
    } catch {
      // Server not accepting connections yet during boot; keep polling.
    }
    process.stdout.write('.');
    await sleep(HEALTH_POLL_MS);
  }

  throw new Error(`\nSonarQube did not become healthy within ${HEALTH_TIMEOUT_MS / 1000}s. Check 'docker compose -f ${COMPOSE_FILE} logs sonarqube'.`);
};

interface AdminAccess {
  token: string;
  authHeader: string;
}

/** Best-effort authenticated POST with form params; failures are swallowed. */
const adminPost = async (authHeader: string, path: string, params: Record<string, string>): Promise<void> => {
  await fetch(`${SONAR_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  }).catch(() => undefined);
};

interface QualityProfile {
  key: string;
  name: string;
  language: string;
  isDefault: boolean;
  isBuiltIn: boolean;
}

/**
 * Apply KeepTrack's rule customizations on a custom "KeepTrack way" quality profile:
 * raise the Cognitive Complexity threshold (S3776) and disable rules that fight this
 * codebase (e.g. S7748 zero-fraction on WebGL/math float literals). Built-in "Sonar way"
 * profiles are read-only, so we copy them, adjust, and make the copy the default.
 * Fully idempotent; best-effort (a failure here must not abort the scan).
 */
const ensureQualityProfile = async (authHeader: string): Promise<void> => {
  for (const { lang, complexityRule, disabledRules } of QUALITY_PROFILE_LANGUAGES) {
    try {
      const search = await fetch(`${SONAR_URL}/api/qualityprofiles/search?language=${lang}`, {
        headers: { Authorization: authHeader },
      });
      const profiles = ((await search.json()) as { profiles?: QualityProfile[] }).profiles ?? [];

      let custom = profiles.find((p) => p.name === QUALITY_PROFILE_NAME);

      if (!custom) {
        const source = profiles.find((p) => p.isDefault) ?? profiles.find((p) => p.isBuiltIn) ?? profiles[0];

        if (!source) {
          continue;
        }
        const copyRes = await fetch(`${SONAR_URL}/api/qualityprofiles/copy`, {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ fromKey: source.key, toName: QUALITY_PROFILE_NAME }),
        });

        if (!copyRes.ok) {
          continue;
        }
        custom = (await copyRes.json()) as QualityProfile;
      }

      await adminPost(authHeader, '/api/qualityprofiles/activate_rule', {
        key: custom.key,
        rule: complexityRule,
        params: `threshold=${COGNITIVE_COMPLEXITY_THRESHOLD}`,
      });
      for (const rule of disabledRules) {
        await adminPost(authHeader, '/api/qualityprofiles/deactivate_rule', { key: custom.key, rule });
      }
      await adminPost(authHeader, '/api/qualityprofiles/set_default', {
        language: lang,
        qualityProfile: QUALITY_PROFILE_NAME,
      });
    } catch {
      // Best-effort: leave the built-in profile in place if the profile API misbehaves.
    }
  }
};

/**
 * Make the dashboard viewable with no login: disable forced authentication and mark the
 * project public. This is what lets contributors open the dashboard without an account.
 */
const enableAnonymousAccess = async (authHeader: string): Promise<void> => {
  await adminPost(authHeader, '/api/settings/set', { key: 'sonar.forceAuthentication', value: 'false' });
  await adminPost(authHeader, '/api/projects/update_default_visibility', { projectVisibility: 'public' });
  // The project may already exist as private from a prior run; force it public (no-op if already public).
  await adminPost(authHeader, '/api/projects/update_visibility', { project: PROJECT_KEY, visibility: 'public' });
};

/**
 * Try each admin credential pair until one can mint a token of the given type.
 * GLOBAL_ANALYSIS_TOKEN is for the scanner; USER_TOKEN is what the SonarLint IDE extension
 * needs for connected mode (it reads issues/rules APIs an analysis token can't).
 * Returns the token + the working auth header.
 */
const generateToken = async (name: string, type: 'GLOBAL_ANALYSIS_TOKEN' | 'USER_TOKEN'): Promise<AdminAccess> => {
  const candidates: Array<[string, string]> = [];

  if (process.env.SONAR_ADMIN_PASSWORD) {
    candidates.push(['admin', process.env.SONAR_ADMIN_PASSWORD]);
  }
  candidates.push(['admin', 'admin']);

  let lastError = '';

  for (const [user, pass] of candidates) {
    const authHeader = basicHeader(user, pass);

    // Revoke any prior token of the same name so generate() won't 400 on re-runs.
    await fetch(`${SONAR_URL}/api/user_tokens/revoke`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ name }),
    }).catch(() => undefined);

    const res = await fetch(`${SONAR_URL}/api/user_tokens/generate`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ name, type }),
    }).catch((err: Error) => {
      lastError = err.message;

      return null;
    });

    if (res?.ok) {
      const body = (await res.json()) as { token?: string };

      if (body.token) {
        return { token: body.token, authHeader };
      }
    } else if (res) {
      lastError = `HTTP ${res.status} ${await res.text()}`;
    }
  }

  throw new Error(
    `Could not mint a token. The default admin/admin credentials were rejected. ` +
    `If you changed admin's password, set SONAR_ADMIN_PASSWORD. Details: ${lastError}`,
  );
};

const mintToken = (): Promise<AdminAccess> => generateToken(TOKEN_NAME, 'GLOBAL_ANALYSIS_TOKEN');

/**
 * `sonar:token` subcommand — print a USER_TOKEN for the SonarLint IDE extension's
 * connected mode. Starts the server if needed, then emits just the token on stdout.
 */
const printUserToken = async (): Promise<void> => {
  if (docker(['compose', '-f', COMPOSE_FILE, 'up', '-d', 'sonarqube']) !== 0) {
    throw new Error('Failed to start the SonarQube container.');
  }
  await waitForHealthy();

  const { token } = await generateToken('sonarlint-vscode', 'USER_TOKEN');

  console.log(`\nSonarLint connected-mode token (paste into the SonarQube for IDE extension):\n\n  ${token}\n`);
  console.log(`Server: ${SONAR_URL}  |  Project key: ${PROJECT_KEY}`);
};

interface SonarIssue {
  rule: string;
  severity: string;
  component: string;
  line?: number;
  message: string;
  textRange?: { startLine: number; startOffset: number; endLine: number; endOffset: number };
}

/** Map a SonarQube severity to a SARIF level the Problems tab understands. */
const sarifLevel = (severity: string): 'error' | 'warning' | 'note' => {
  if (severity === 'BLOCKER' || severity === 'CRITICAL') {
    return 'error';
  }
  if (severity === 'MAJOR') {
    return 'warning';
  }

  return 'note';
};

/** Page through the issues API (admin auth) collecting every open issue for the project. */
const fetchAllIssues = async (): Promise<SonarIssue[]> => {
  const headers = process.env.SONAR_ADMIN_PASSWORD
    ? [basicHeader('admin', process.env.SONAR_ADMIN_PASSWORD), basicHeader('admin', 'admin')]
    : [basicHeader('admin', 'admin')];

  const issues: SonarIssue[] = [];
  let auth = headers[0];
  let page = 1;
  let total = Infinity;

  while ((page - 1) * ISSUE_PAGE_SIZE < Math.min(total, ISSUE_SEARCH_CAP)) {
    const url = `${SONAR_URL}/api/issues/search?components=${PROJECT_KEY}&resolved=false&ps=${ISSUE_PAGE_SIZE}&p=${page}`;
    let res = await fetch(url, { headers: { Authorization: auth } });

    // On the first page, fall back to the next candidate credential if needed.
    if (!res.ok && page === 1) {
      for (const header of headers.slice(1)) {
        res = await fetch(url, { headers: { Authorization: header } });
        if (res.ok) {
          auth = header;
          break;
        }
      }
    }
    if (!res.ok) {
      throw new Error(`Failed to read issues (HTTP ${res.status}). Run a scan first, or set SONAR_ADMIN_PASSWORD.`);
    }

    const data = (await res.json()) as { issues?: SonarIssue[]; total?: number; paging?: { total: number } };

    issues.push(...(data.issues ?? []));
    total = data.paging?.total ?? data.total ?? issues.length;
    if (!data.issues?.length) {
      break;
    }
    page++;
  }

  if (total > ISSUE_SEARCH_CAP) {
    console.warn(`Note: SonarQube caps the issues API at ${ISSUE_SEARCH_CAP}; exported ${issues.length} of ${total}.`);
  }

  return issues;
};

/** Convert SonarQube issues to a minimal SARIF 2.1.0 document. */
const toSarif = (issues: SonarIssue[]): string => {
  const results = issues.map((issue) => {
    // component is "<projectKey>:<relative/path>"; strip the project prefix for the URI.
    const sep = issue.component.indexOf(':');
    const uri = sep >= 0 ? issue.component.slice(sep + 1) : issue.component;
    const range = issue.textRange;
    const region = range
      ? { startLine: range.startLine, startColumn: range.startOffset + 1, endLine: range.endLine, endColumn: range.endOffset + 1 }
      : { startLine: issue.line ?? 1 };

    return {
      ruleId: issue.rule,
      level: sarifLevel(issue.severity),
      message: { text: issue.message },
      locations: [{ physicalLocation: { artifactLocation: { uri }, region } }],
    };
  });

  const sarif = {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{ tool: { driver: { name: 'SonarQube', informationUri: SONAR_URL } }, results }],
  };

  return JSON.stringify(sarif, null, 2);
};

/**
 * `sonar:issues` subcommand — export every server-side issue to a SARIF file. Open it with
 * the "SARIF Viewer" VS Code extension to populate the Problems tab with the whole project's
 * issues (SonarLint itself only analyzes open files).
 */
const exportIssues = async (): Promise<void> => {
  if (docker(['compose', '-f', COMPOSE_FILE, 'up', '-d', 'sonarqube']) !== 0) {
    throw new Error('Failed to start the SonarQube container.');
  }
  await waitForHealthy();

  console.log('Fetching all issues...');
  const issues = await fetchAllIssues();

  mkdirSync('.sonarqube', { recursive: true });
  writeFileSync(SARIF_OUTPUT, toSarif(issues));

  console.log(`\nExported ${issues.length} issues to ${SARIF_OUTPUT}`);
  console.log('Open it in VS Code with the "SARIF Viewer" extension (ms-sarifvscode.sarif-viewer)');
  console.log('to see them all in the Problems tab. Opening now...');
  openFile(SARIF_OUTPUT);
};

const main = async (): Promise<void> => {
  if (process.argv.includes('token')) {
    await printUserToken();

    return;
  }

  if (process.argv.includes('issues')) {
    await exportIssues();

    return;
  }

  // 1. Ensure the server is running (idempotent).
  console.log('Starting local SonarQube server...');
  if (docker(['compose', '-f', COMPOSE_FILE, 'up', '-d', 'sonarqube']) !== 0) {
    throw new Error('Failed to start the SonarQube container.');
  }

  // 2. Wait until it can serve API requests.
  await waitForHealthy();

  // 3. Mint an analysis token automatically (no account setup required).
  console.log('Minting analysis token...');
  const { token, authHeader } = await mintToken();

  // 4. Make the dashboard viewable with no login + apply rule customizations (idempotent).
  await enableAnonymousAccess(authHeader);
  await ensureQualityProfile(authHeader);

  // 5. Run the scanner. The compose file declares `SONAR_TOKEN=${SONAR_TOKEN}` for the
  //    scanner service, so passing it via the child env keeps the token off the command line.
  console.log('Running analysis...');
  const scanStatus = docker(
    ['compose', '-f', COMPOSE_FILE, 'run', '--rm', 'sonar-scanner'],
    { ...process.env, SONAR_TOKEN: token },
  );

  if (scanStatus !== 0) {
    throw new Error('Scanner exited with a non-zero status.');
  }

  // 6. Ensure the freshly (re)created project is public, then open the dashboard.
  await adminPost(authHeader, '/api/projects/update_visibility', { project: PROJECT_KEY, visibility: 'public' });

  const dashboard = `${SONAR_URL}/dashboard?id=${PROJECT_KEY}`;

  console.log(`\nAnalysis complete. Dashboard: ${dashboard}`);
  openFile(dashboard);
};

try {
  await main();
} catch (err) {
  console.error(`\n${(err as Error).message}`);
  process.exit(1);
}
