import { SatGroup } from './sat-group';
import { SatGroupCollection } from '../api/keepTrackTypes';
/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
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
import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const createGroup = (groupType: string, data: any): SatGroup => new SatGroup(groupType, data, keepTrackApi.programs.satSet);
export const selectGroup = (group: SatGroup): void => {
  if (group === null || typeof group === 'undefined') return;
  const { orbitManager, satSet, colorSchemeManager } = keepTrackApi.programs;

  updateIsInGroup(groupsManager.selectedGroup, group);
  groupsManager.selectedGroup = group;
  group.updateOrbits(orbitManager);
  if (colorSchemeManager.currentColorScheme === colorSchemeManager.countries || colorSchemeManager.currentColorScheme === colorSchemeManager.groupCountries) {
    satSet.setColorScheme(colorSchemeManager.groupCountries);
  } else {
    satSet.setColorScheme(colorSchemeManager.group);
  }

  groupsManager.stopUpdatingInViewSoon = false;
};
export const selectGroupNoOverlay = (group: SatGroup): void => {
  const { satSet } = keepTrackApi.programs;
  updateIsInGroup(groupsManager.selectedGroup, group);
  groupsManager.selectedGroup = group;
  settingsManager.isGroupOverlayDisabled = true;
  satSet.setColorScheme(keepTrackApi.programs.colorSchemeManager.group);
};
export const updateIsInGroup = (oldgroup: SatGroup, newgroup: SatGroup): void => {
  const { satSet } = keepTrackApi.programs;
  if (oldgroup !== null && typeof oldgroup !== 'undefined') {
    oldgroup.sats.forEach((sat: SatGroupCollection) => {
      satSet.getSatExtraOnly(sat.satId).isInGroup = false;
    });
  }

  if (newgroup !== null && typeof newgroup !== 'undefined') {
    newgroup.sats.forEach((sat: SatGroupCollection) => {
      satSet.getSatExtraOnly(sat.satId).isInGroup = true;
    });
  }
};
export const clearSelect = (): void => {
  updateIsInGroup(groupsManager.selectedGroup, null);
  groupsManager.selectedGroup = null;
  settingsManager.isGroupOverlayDisabled = false;
  groupsManager.stopUpdatingInViewSoon = true;
};

export type GroupsManager = typeof groupsManager;
export const groupsManager = {
  selectedGroup: null,
  stopUpdatingInViewSoon: false,
  Canada: null,
  China: null,
  France: null,
  India: null,
  Israel: null,
  Japan: null,
  Russia: null,
  UnitedKingdom: null,
  UnitedStates: null,
  debris: null,
  GPSGroup: null,
  SpaceStations: null,
  GlonassGroup: null,
  GalileoGroup: null,
  AmatuerRadio: null,
  aehf: null,
  wgs: null,
  starlink: null,
  sbirs: null,
  createGroup,
  selectGroup,
  selectGroupNoOverlay,
  updateIsInGroup,
  clearSelect,
};
