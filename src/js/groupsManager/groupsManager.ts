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
import { keepTrackApi } from '@app/js/api/externalApi';
import { SatGroup } from './sat-group';

export class GroupFactory {
  _selectedGroup: SatGroup;
  ColorScheme: any;
  satSet: any;
  stopUpdatingInViewSoon: boolean;

  constructor() {
    this.satSet = keepTrackApi.programs.satSet;
    this.ColorScheme = keepTrackApi.programs.ColorScheme;
    this.selectedGroup = null;
    this.stopUpdatingInViewSoon = false;
  }

  get selectedGroup() {
    return this._selectedGroup;
  }

  set selectedGroup(val) {
    this._selectedGroup = val;
  }

  createGroup(groupType, data) {
    return new SatGroup(groupType, data, this.satSet);
  }

  selectGroup(group, orbitManager) {
    if (group === null || typeof group === 'undefined') {
      return;
    }

    this.updateIsInGroup(this.selectedGroup, group);
    this.selectedGroup = group;
    group.updateOrbits(orbitManager);
    settingsManager.setCurrentColorScheme(this.ColorScheme.group);

    this.stopUpdatingInViewSoon = false;
    // this.updateInViewSoon(this);
  }

  // eslint-disable-next-line class-methods-use-this
  // updateInViewSoon(self: any) {
  //   if (self.stopUpdatingInViewSoon) return;
  //   if (self._selectedGroup === null || typeof self._selectedGroup === 'undefined') {
  //     setTimeout(self.updateInViewSoon, 1000);
  //     return;
  //   }
  //   const { satellite, satSet, sensorManager, orbitManager } = keepTrackApi.programs;
  //   orbitManager.inViewSoon = [];
  //   self._selectedGroup.forEach((id) => {
  //     const nextPass = satellite.nextpass(satSet.getSat(id), sensorManager.currentSensor, 1 / 24 / 6, 10); // Search 10 minutes 10 seconds at a time
  //     if (nextPass !== 'No Passes in ' + 1 / 24 / 6 + ' Days') {
  //       orbitManager.inViewSoon.push(id);
  //     }
  //   });
  //   setTimeout(() => self.updateInViewSoon(self), 1000);
  // }

  selectGroupNoOverlay(group) {
    if (group === null || typeof group === 'undefined') {
      return;
    }
    this.updateIsInGroup(this.selectedGroup, group);
    this.selectedGroup = group;
    settingsManager.isGroupOverlayDisabled = true;
    settingsManager.setCurrentColorScheme(keepTrackApi.programs.ColorScheme.group);
  }

  updateIsInGroup(oldgroup, newgroup) {
    var sat;
    let i;
    if (oldgroup !== null && typeof oldgroup !== 'undefined') {
      for (i = 0; i < oldgroup.sats.length; i++) {
        sat = this.satSet.getSatExtraOnly(oldgroup.sats[i].satId);
        sat.isInGroup = false;
      }
    }

    if (newgroup === null || typeof newgroup === 'undefined') {
      return;
    }

    for (i = 0; i < newgroup.sats.length; i++) {
      sat = this.satSet.getSatExtraOnly(newgroup.sats[i].satId);
      sat.isInGroup = true;
    }
  }

  clearSelect() {
    this.updateIsInGroup(this.selectedGroup, null);
    this.selectedGroup = null;
    settingsManager.isGroupOverlayDisabled = false;
    this.stopUpdatingInViewSoon = true;
  }
}
