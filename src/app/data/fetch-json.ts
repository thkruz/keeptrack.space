import { apiFetch } from './api-fetch';

/**
 * Error thrown by {@link fetchJson} when a response is reachable but is not JSON.
 * Carries the request URL, HTTP status, content-type, and a short body snippet so
 * the failure is actionable in telemetry instead of a bare, contextless
 * `SyntaxError: Unexpected token '<'`.
 */
export class JsonFetchError extends Error {
  readonly url: string;
  readonly status: number;
  readonly contentType: string | null;
  readonly bodySnippet: string;

  constructor(message: string, ctx: { url: string; status: number; contentType: string | null; bodySnippet: string }) {
    super(message);
    this.name = 'JsonFetchError';
    this.url = ctx.url;
    this.status = ctx.status;
    this.contentType = ctx.contentType;
    this.bodySnippet = ctx.bodySnippet;
  }
}

/** A valid JSON document never starts with `<`; HTML (and our SPA fallback) always does. */
const HTML_LEADING_ANGLE_BRACKET = /^\s*</u;

const snippetOf = (text: string): string => text.slice(0, 80).replace(/\s+/gu, ' ').trim();

const urlOf = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
};

/**
 * Fetch a URL and parse it as JSON, failing *loudly and actionably* when the
 * response is not JSON.
 *
 * KeepTrack is served as a single-page app with an `index.html` fallback, so a
 * request for a missing same-origin `.json` resource comes back as
 * `<!doctype html>...` with HTTP 200. Handing that straight to `response.json()`
 * throws the opaque `SyntaxError: Unexpected token '<', "<!doctype "... is not
 * valid JSON`, which names no URL and (when the rejection goes unhandled) carries
 * no useful stack. Routing JSON fetches through this helper turns that into an
 * error that identifies the file, status, and content-type.
 *
 * @throws {@link JsonFetchError} on a non-OK status, an HTML/non-JSON body, or malformed JSON.
 */
export async function fetchJson<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const url = urlOf(input);
  const response = await apiFetch(input, init);
  const contentType = response.headers.get('Content-Type');

  if (!response.ok) {
    throw new JsonFetchError(`Request for JSON from ${url} failed with HTTP ${response.status}`, {
      url,
      status: response.status,
      contentType,
      bodySnippet: '',
    });
  }

  const text = await response.text();
  const looksLikeHtml = (contentType?.includes('text/html') ?? false) || HTML_LEADING_ANGLE_BRACKET.test(text);

  if (looksLikeHtml) {
    const snippet = snippetOf(text);

    throw new JsonFetchError(
      `Expected JSON from ${url} but received ${contentType ?? 'non-JSON'} (HTTP ${response.status}). ` +
        `This usually means the file was missing and the SPA index.html was served instead. First bytes: "${snippet}"`,
      { url, status: response.status, contentType, bodySnippet: snippet }
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    const snippet = snippetOf(text);

    throw new JsonFetchError(`Malformed JSON from ${url} (HTTP ${response.status}): ${(e as Error).message}. First bytes: "${snippet}"`, {
      url,
      status: response.status,
      contentType,
      bodySnippet: snippet,
    });
  }
}
