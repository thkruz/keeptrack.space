import { getEl } from './lib/helpers';
import { isThisJest } from './api/keepTrackApi';

export const showErrorCode = (error: Error & { lineNumber: number }): void => {
  let errorHtml = '';
  errorHtml += error?.message ? `${error.message}<br>` : '';
  errorHtml += error?.lineNumber ? `Line: ${error.lineNumber}<br>` : '';
  errorHtml += error?.stack ? `${error.stack}<br>` : '';
  const LoaderText = getEl('loader-text');
  if (LoaderText) {
    LoaderText.innerHTML = errorHtml;
    console.error(error);
  } else {
    console.error(error);
  }
  // istanbul ignore next
  if (!isThisJest()) console.warn(error);
};
