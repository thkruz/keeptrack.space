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
import { SatGroup } from './sat-group.js';
import { keepTrackApi } from '@app/js/api/externalApi.ts';

class GroupFactory {
  // Create Internal References to Other Modules
  #satSet = null;
  #ColorScheme = null;
  #settingsManager = null;

  constructor() {
    this.#satSet = keepTrackApi.programs.satSet;
    this.#ColorScheme = keepTrackApi.programs.ColorScheme;
    this.#settingsManager = keepTrackApi.programs.settingsManager;
    this.selectedGroup = null;
  }

  get selectedGroup() {
    return this._selectedGroup;
  }

  set selectedGroup(val) {
    this._selectedGroup = val;
  }

  createGroup(groupType, data) {
    return new SatGroup(groupType, data, this.#satSet);
  }

  selectGroup(group, orbitManager) {
    if (group === null || typeof group === 'undefined') {
      return;
    }
    this.updateIsInGroup(this.selectedGroup, group);
    this.selectedGroup = group;
    group.updateOrbits(orbitManager);
    this.#settingsManager.setCurrentColorScheme(this.#ColorScheme.group);
  }

  selectGroupNoOverlay(group) {
    if (group === null || typeof group === 'undefined') {
      return;
    }
    this.updateIsInGroup(this.selectedGroup, group);
    this.selectedGroup = group;
    this.#settingsManager.isGroupOverlayDisabled = true;
    this.#settingsManager.setCurrentColorScheme(this.#ColorScheme.group);
  }

  updateIsInGroup(oldgroup, newgroup) {
    var sat;
    let i;
    if (oldgroup !== null && typeof oldgroup !== 'undefined') {
      for (i = 0; i < oldgroup.sats.length; i++) {
        sat = this.#satSet.getSatExtraOnly(oldgroup.sats[i].satId);
        sat.isInGroup = false;
      }
    }

    if (newgroup === null || typeof newgroup === 'undefined') {
      return;
    }

    for (i = 0; i < newgroup.sats.length; i++) {
      sat = this.#satSet.getSatExtraOnly(newgroup.sats[i].satId);
      sat.isInGroup = true;
    }
  }

  clearSelect() {
    this.updateIsInGroup(this.selectedGroup, null);
    this.selectedGroup = null;
    this.#settingsManager.isGroupOverlayDisabled = false;
  }
}

export { GroupFactory };
