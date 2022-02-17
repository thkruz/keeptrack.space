/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 * @Copyright (C) 2020 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

// This file should contain all of the webgl code for generating non .obj meshes
import { earth } from './earth';
import { LineFactory } from './line-factory';
import { moon } from './moon';
import { sun } from './sun';

const sceneManager = {
  moon: moon,
  earth: earth,
  sun: sun,
};

export { LineFactory, sceneManager };
