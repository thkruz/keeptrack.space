import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';

let hasShown401Warning_ = false;

export const resetApiKeyWarning = (): void => {
  hasShown401Warning_ = false;
};

/**
 * Wrapper around fetch() that injects the API key header for
 * requests to api.keeptrack.space when an apiKey is configured.
 *
 * Shows a one-time warning toast if the API responds with 401.
 */
export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let url: string;

  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.href;
  } else {
    url = input.url;
  }

  const apiKey = settingsManager?.apiKey;
  let response: Response;

  if (apiKey && url.includes('api.keeptrack.space')) {
    const headers = new Headers(init?.headers);

    headers.set('x-api-key', apiKey);
    response = await fetch(input, { ...init, headers });
  } else {
    response = await fetch(input, init);
  }

  if (!hasShown401Warning_ && response.status === 401 && url.includes('api.keeptrack.space')) {
    hasShown401Warning_ = true;
    errorManagerInstance.warnToast(t7e('errorMsgs.apiKeyRequired'));
  }

  return response;
};
