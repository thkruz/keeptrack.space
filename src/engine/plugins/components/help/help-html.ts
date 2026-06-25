/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { t7e } from '@app/locales/keys';
import { IHelpConfig, IHelpImage, IHelpSection, IHelpShortcut } from '../../core/plugin-capabilities';

/**
 * Resolve a help-image path against the install directory unless it is
 * already absolute.
 */
const resolveImageSrc_ = (src: string): string => {
  if ((/^(?:https?:)?\//u).test(src)) {
    return src;
  }

  // settingsManager is a global that may not exist in test environments
  const installDirectory = typeof settingsManager !== 'undefined' ? settingsManager?.installDirectory ?? '' : '';

  return `${installDirectory}${src}`;
};

const buildImageHtml_ = (image: IHelpImage): string => {
  const caption = image.caption ? `<figcaption>${image.caption}</figcaption>` : '';

  return `<figure class="help-figure"><img src="${resolveImageSrc_(image.src)}" alt="${image.alt}" loading="lazy" />${caption}</figure>`;
};

const buildSectionHtml_ = (section: IHelpSection): string => {
  const heading = section.heading ? `<h3 class="help-section-heading">${section.heading}</h3>` : '';
  const image = section.image ? buildImageHtml_(section.image) : '';

  return `<section class="help-section">${heading}<div class="help-section-content">${section.content}</div>${image}</section>`;
};

const buildTipsHtml_ = (tips: string[]): string => {
  const items = tips.map((tip) => `<li>${tip}</li>`).join('');

  return (
    `<section class="help-section help-tips"><h3 class="help-section-heading">${t7e('help.tips')}</h3>` +
    `<ul class="help-tips-list">${items}</ul></section>`
  );
};

const buildShortcutsHtml_ = (shortcuts: IHelpShortcut[]): string => {
  const rows = shortcuts
    .map((shortcut) => {
      const keys = shortcut.keys.map((key) => `<kbd>${key}</kbd>`).join('<span class="help-kbd-plus">+</span>');

      return `<div class="help-shortcut-row"><span class="help-shortcut-keys">${keys}</span><span class="help-shortcut-desc">${shortcut.description}</span></div>`;
    })
    .join('');

  return (
    `<section class="help-section help-shortcuts"><h3 class="help-section-heading">${t7e('help.keyboardShortcuts')}</h3>` +
    `${rows}</section>`
  );
};

/**
 * Build the HTML for a help dialog from a structured help config.
 *
 * Legacy configs that only define `body` are passed through unchanged so
 * existing plugins keep rendering exactly as before.
 */
export const buildHelpHtml = (config: IHelpConfig): string => {
  if (!config.sections && !config.tips && !config.shortcuts) {
    return config.body ?? '';
  }

  const sections = (config.sections ?? []).map(buildSectionHtml_).join('');
  const tips = config.tips && config.tips.length > 0 ? buildTipsHtml_(config.tips) : '';
  const shortcuts = config.shortcuts && config.shortcuts.length > 0 ? buildShortcutsHtml_(config.shortcuts) : '';

  return `<div class="help-rich">${sections}${tips}${shortcuts}</div>`;
};
