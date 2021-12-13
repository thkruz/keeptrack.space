/*! /////////////////////////////////////////////////////////////////////////////

Copyright (C) 2016-2021 Theodore Kruczek
Copyright (C) 2020 Heather Kruczek

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

///////////////////////////////////////////////////////////////////////////// */
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { GroupsManager, SatGroupCollection } from '../api/keepTrackTypes';
import { SatGroup } from './sat-group';

export const createGroup = (groupType: string, data: any): SatGroup => new SatGroup(groupType, data, keepTrackApi.programs.satSet);
export const selectGroup = (group: SatGroup): void => {
  if (group === null || typeof group === 'undefined') return;
  const { orbitManager } = keepTrackApi.programs;

  updateIsInGroup(groupsManager.selectedGroup, group);
  groupsManager.selectedGroup = group;
  group.updateOrbits(orbitManager);
  settingsManager.setCurrentColorScheme(keepTrackApi.programs.colorSchemeManager.group);

  groupsManager.stopUpdatingInViewSoon = false;
};
export const selectGroupNoOverlay = (group: SatGroup): void => {
  updateIsInGroup(groupsManager.selectedGroup, group);
  groupsManager.selectedGroup = group;
  settingsManager.isGroupOverlayDisabled = true;
  settingsManager.setCurrentColorScheme(keepTrackApi.programs.colorSchemeManager.group);
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

export const groupsManager: GroupsManager = {
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
