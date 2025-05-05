import { Doris } from '@app/doris/doris';
import { settingsManager } from '@app/settings/settings';
import { keepTrackApi } from '../keepTrackApi';
import { GroupData, GroupType, ObjectGroup } from './object-group';
import { KeepTrackApiEvents } from '@app/keeptrack/events/event-types';


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

export class GroupsManager {
  groupList: Record<string, ObjectGroup<GroupType>> = {};
  selectedGroup: ObjectGroup<GroupType> | null = null;
  stopUpdatingInViewSoon: boolean;

  private changeGroup_(group: ObjectGroup<GroupType> | null): ObjectGroup<GroupType> | null {
    this.selectedGroup = group;

    return this.selectedGroup;
  }

  selectGroup(group: ObjectGroup<GroupType>): void {
    this.changeGroup_(group);
    group.updateOrbits();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    colorSchemeManagerInstance.setToGroupColorScheme();

    this.stopUpdatingInViewSoon = false;
  }

  // eslint-disable-next-line class-methods-use-this
  selectGroupNoOverlay(): void {
    settingsManager.isGroupOverlayDisabled = true;

    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    colorSchemeManagerInstance.isUseGroupColorScheme = true;
    colorSchemeManagerInstance.calculateColorBuffers();
  }

  clearSelect(): void {
    this.changeGroup_(null);
    settingsManager.isGroupOverlayDisabled = false;
    this.stopUpdatingInViewSoon = true;
  }

  /**
   * Including the name parameter creates a cached version of the object
   *
   * Do not include a name if the group is temporary or will change
   */
  createGroup<T extends GroupType>(type: GroupType, data?: GroupData[T], name?: string): ObjectGroup<T> {
    // Seee if this group already exists and return it
    if (name) {
      if (this.groupList[name]) {
        return this.groupList[name];
      }
    }

    const group = new ObjectGroup(type, data);

    // If the group was named, add it to the cache
    if (name) {
      this.groupList[name] = group;
    }

    return group;
  }

  init() {
    this.selectedGroup = null;
    this.stopUpdatingInViewSoon = false;
    this.groupList = {};
    Doris.getInstance().on(KeepTrackApiEvents.onKeepTrackReady, this.startWithOrbits.bind(this));
  }

  startWithOrbits(): void {
    if (settingsManager.startWithOrbitsDisplayed) {
      const groupsManagerInstance = keepTrackApi.getGroupsManager();

      /*
       * All Orbits
       * settingsManager.maxOribtsDisplayedDesktopAll = 100000;
       * settingsManager.maxOribtsDisplayed = 100000;
       * settingsManager.searchLimit = 100000;
       * TODO: Maybe this should only be a preset and not a setting?
       */
      groupsManagerInstance.groupList.debris = groupsManagerInstance.createGroup(GroupType.ALL);
      groupsManagerInstance.selectGroup(groupsManagerInstance.groupList.debris);
      keepTrackApi.getColorSchemeManager().calculateColorBuffers(true); // force color recalc
      groupsManagerInstance.groupList.debris.updateOrbits();
      settingsManager.isOrbitOverlayVisible = true;
    }
  }
}
