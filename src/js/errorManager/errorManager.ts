import { isThisJest } from '@app/js/api/keepTrackApi';
import { toast } from '@app/js/uiManager/ui/toast';

let newGithubIssueUrl;
if (!isThisJest()) {
  import('new-github-issue-url')
    .then((mod) => {
      newGithubIssueUrl = mod.default;
    })
    .catch(() => {
      newGithubIssueUrl = () => {};
    });
}

export const createError = (e: Error, funcName: string, toastMsg?: string) => {
  toastMsg ??= e.message || 'Unknown error';
  if (!isThisJest()) {
    const url = newGithubIssueUrl({
      user: 'thkruz',
      repo: 'keeptrack.space',
      title: `${e.name} in ${funcName}`,
      labels: ['Problems : Bug'],
      body: `#### User Description
Type what you were trying to do here...\n\n\n
#### Error Title
${e.name}
#### Error Message
${e.message}
#### Stack
${e.stack}`,
    });

    window.open(url, '_blank');
  }
  toast(toastMsg, 'error', true);
};
