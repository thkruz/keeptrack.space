import { isThisJest } from '@app/js/api/keepTrackApi';
import { toast } from '@app/js/uiManager/ui/toast';
import newGithubIssueUrl from 'new-github-issue-url';

export const createError = (e: Error, funcName: string, toastMsg?: string) => {
  toastMsg ??= e.message;
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

  if (!isThisJest()) {
    window.open(url, '_blank');
  }
  toast(toastMsg, 'error', true);
};
