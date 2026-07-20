import { t7e } from '@app/locales/keys';
import './a11y-error.css';

import logoPng from '@public/img/logo.png';

interface FatalErrorConfig {
  title: string;
  description: string;
  recommendations: string[];
  technicalDetail?: string;
}

/**
 * Replace the entire document body with an accessible error page.
 * Used for unrecoverable errors (missing canvas, no WebGL) that
 * prevent the application from rendering anything.
 */
export function showFatalError(config: FatalErrorConfig): never {
  const recItems = config.recommendations.map((r) => `<li>${r}</li>`).join('');

  const detailHtml = config.technicalDetail
    ? `<div class="a11y-error__detail">
        <span class="a11y-error__detail-label">Technical Detail</span>
        <code class="a11y-error__detail-value">${config.technicalDetail}</code>
      </div>`
    : '';

  document.body.className = 'a11y-error';
  document.body.setAttribute('role', 'alert');
  document.body.innerHTML = `
    <main class="a11y-error__card">
      <header class="a11y-error__header">
        <img src="${logoPng}" alt="KeepTrack" class="a11y-error__logo" />
      </header>
      <div class="a11y-error__icon" aria-hidden="true">&#x26A0;&#xFE0F;</div>
      <h1 class="a11y-error__title">${config.title}</h1>
      <p class="a11y-error__description">${config.description}</p>
      <h2 class="a11y-error__section-title">Recommendations</h2>
      <ul class="a11y-error__list">${recItems}</ul>
      ${detailHtml}
      <footer class="a11y-error__footer">
        <span class="a11y-error__version">v${__VERSION__}-${__COMMIT_HASH__}</span>
        <span class="a11y-error__copyright">
          ${settingsManager.isMobileModeEnabled ? t7e('copyright.noticeMobile') : t7e('copyright.notice')}
        </span>
        <span></span>
      </footer>
    </main>
  `;

  // Halt execution — caller should not continue after a fatal error
  throw new Error(config.title);
}
