/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * settings-contributions.ts collects plugin-contributed settings sections for
 * one menu. Shared by the Settings menu (`'general'`) and the Graphics menu
 * (`'graphics'`) so both apply the same ordering and error isolation.
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

import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { hasSettingsContribution, hasSettingsContributions, ISettingsContribution, SettingsMenuTarget } from '@app/engine/plugins/core/plugin-capabilities';

interface CollectedContribution_ {
  contribution: ISettingsContribution;
  manifestOrder: number;
  /** Position within the plugin's own list, so a multi-section plugin keeps its order. */
  localOrder: number;
}

interface NamedPlugin_ {
  id: string;
}

/** Call one contributor method, logging and swallowing a throw so siblings still render. */
const safeCollect_ = (plugin: NamedPlugin_, method: string, fn: () => ISettingsContribution[]): ISettingsContribution[] => {
  try {
    return fn();
  } catch (err) {
    // A misbehaving plugin must not break the menu.
    // eslint-disable-next-line no-console
    console.error(`SettingsMenuPlugin: ${plugin.id}.${method}() threw`, err);

    return [];
  }
};

/**
 * Every settings section routed to `target`, from every registered plugin.
 *
 * A plugin may implement `getSettingsContribution()`, `getSettingsContributions()`,
 * or both; the singular section comes first. Sections without `target` belong to
 * `'general'`. Ordering: ascending `order` (sections without one go last), then
 * plugin manifest order, then the plugin's own declaration order.
 */
export const collectSettingsContributions = (target: SettingsMenuTarget, plugins: readonly unknown[] = PluginRegistry.plugins): ISettingsContribution[] => {
  const collected: CollectedContribution_[] = [];

  plugins.forEach((plugin, manifestOrder) => {
    const own: ISettingsContribution[] = [];

    if (hasSettingsContribution(plugin)) {
      own.push(...safeCollect_(plugin as unknown as NamedPlugin_, 'getSettingsContribution', () => [plugin.getSettingsContribution()]));
    }
    if (hasSettingsContributions(plugin)) {
      own.push(...safeCollect_(plugin as unknown as NamedPlugin_, 'getSettingsContributions', () => plugin.getSettingsContributions()));
    }

    own.forEach((contribution, localOrder) => {
      if ((contribution.target ?? 'general') === target) {
        collected.push({ contribution, manifestOrder, localOrder });
      }
    });
  });

  return collected
    .sort((a, b) => {
      const orderA = a.contribution.order ?? Number.POSITIVE_INFINITY;
      const orderB = b.contribution.order ?? Number.POSITIVE_INFINITY;

      if (orderA !== orderB) {
        return orderA - orderB;
      }
      if (a.manifestOrder !== b.manifestOrder) {
        return a.manifestOrder - b.manifestOrder;
      }

      return a.localOrder - b.localOrder;
    })
    .map(({ contribution }) => contribution);
};
