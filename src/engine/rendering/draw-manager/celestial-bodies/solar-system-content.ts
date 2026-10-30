/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2026 Kruczek Labs LLC
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

import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';
import { registerMarsMoons } from './mars-moon-catalog';

/**
 * Registers every solar-system body this build ships, before anything can ask what it has.
 *
 * ## Why this runs where it does
 *
 * `src/keeptrack.ts` calls this *before* `pluginManager.loadPlugins()`, which is earlier than
 * it might look like it needs to be. The Planets menu builds its entire side-menu HTML inside
 * its own `init()`, during plugin loading - so content registered by a plugin would be a coin
 * flip on plugin order: register after the menu and the moons are missing from it, register
 * before and they are there. Doing it up front removes the ordering question entirely, which
 * is why the Solar System Pack is loaded as *content* here rather than as a plugin.
 *
 * By the time this resolves, {@link isBodyRegistered} is complete and every consumer -
 * the menu, `Scene.init()`, the search index - can trust it.
 */
export async function registerSolarSystemContent(): Promise<void> {
  // Built-in content, present in every build.
  registerMarsMoons();

  /*
   * The Solar System Pack: the outer moons, the big four asteroids and the procedural belt.
   *
   * Guarded by __IS_PRO__ rather than a try/catch alone so the bundler drops the import
   * outright in an OSS build - the same pattern plugin-manifest.ts uses for pro plugins. The
   * catch is for a pro build whose submodule is missing or failed to compile: the app should
   * come up with the free roster rather than not at all.
   */
  if (__IS_PRO__) {
    try {
      const pack = await import(/* @vite-ignore */ '@plugins-pro/solar-system-pack/solar-system-pack');

      pack.registerSolarSystemPack();
    } catch (error) {
      errorManagerInstance.warn(t7e('errorMsgs.Rendering.solarSystemPackUnavailable').replace('{error}', String(error)));
    }
  }
}
