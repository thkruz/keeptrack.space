/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * launch-schedule.ts is a plugin for viewing the KeepTrack launch schedule (keeptrack.space/launches).
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

import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { openColorbox } from '@app/engine/utils/colorbox';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import calendarPng from '@public/img/icons/calendar.png';

/** The KeepTrack launch schedule page for one calendar year. */
export const launchScheduleUrl = (year: number): string => `https://keeptrack.space/launches/${year}`;

export class LaunchSchedulePlugin extends KeepTrackPlugin {
  readonly id = 'LaunchSchedulePlugin';
  dependencies_ = [];
  requiresInternet = true;
  isForceHideSideMenus = true;

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'launch-schedule-bottom-icon',
      label: t7e('plugins.LaunchSchedulePlugin.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: calendarPng,
      menuMode: [MenuMode.EVENTS, MenuMode.ALL],
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.LaunchSchedulePlugin.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.LaunchSchedulePlugin.help.overview'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.LaunchSchedulePlugin.help.howToUse'),
        },
      ],
      tips: [t7e('plugins.LaunchSchedulePlugin.help.tip1'), t7e('plugins.LaunchSchedulePlugin.help.tip2')],
    };
  }

  // Bridge to onBottomIconClick until base class wires up component callbacks
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  onBottomIconClick(): void {
    if (this.isMenuButtonActive) {
      settingsManager.isPreventColorboxClose = true;
      setTimeout(() => {
        settingsManager.isPreventColorboxClose = false;
      }, 2000);
      // The year on the simulation clock (UTC), so a user looking at a past or future date sees that year's launches.
      const year = ServiceLocator.getTimeManager().simulationTimeObj.getUTCFullYear();

      openColorbox(launchScheduleUrl(year), {
        callback: this.closeColorbox_.bind(this),
      });
    }
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'LaunchSchedulePlugin.open',
        label: t7e('plugins.LaunchSchedulePlugin.commands.open' as Parameters<typeof t7e>[0]),
        category: 'Plugins',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  private closeColorbox_() {
    if (this.isMenuButtonActive) {
      this.isMenuButtonActive = false;
      getEl(this.bottomIconElementName)?.classList.remove('bmenu-item-selected');
    }
  }
}
