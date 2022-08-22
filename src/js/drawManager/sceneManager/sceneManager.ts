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

// This file should contain all of the webgl code for generating non .obj meshes
import { EarthObject, earth } from './earth';
import { MoonObject, moon } from './moon';
import { SkyBoxSphere, skyboxSphere } from './skybox-sphere';
import { SunObject, sun } from './sun';

import { LineFactory } from './line-factory';

export interface SceneManager {
  earth: EarthObject;
  moon: MoonObject;
  sun: SunObject;
  skybox: SkyBoxSphere;
}

const sceneManager = {
  moon,
  earth,
  sun,
  skybox: skyboxSphere,
};

export { LineFactory, sceneManager };
