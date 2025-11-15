/**
 * /////////////////////////////////////////////////////////////////////////////
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

import type {
  AtmosphereSettings, EarthBumpTextureQuality, EarthCloudTextureQuality, EarthDayTextureQuality, EarthNightTextureQuality,
  EarthPoliticalTextureQuality, EarthSpecTextureQuality, EarthTextureStyle,
} from '@app/engine/rendering/draw-manager/earth-quality-enums';
import type { MilkyWayTextureQuality } from '@app/engine/rendering/draw-manager/skybox-sphere';
import type { SunTextureQuality } from '@app/engine/rendering/draw-manager/sun';

/**
 * Graphics and rendering settings
 */
export class GraphicsSettings {
  // Earth Texture Quality Settings
  earthDayTextureQuality: EarthDayTextureQuality;
  earthNightTextureQuality: EarthNightTextureQuality;
  earthSpecTextureQuality: EarthSpecTextureQuality;
  earthBumpTextureQuality: EarthBumpTextureQuality;
  earthCloudTextureQuality: EarthCloudTextureQuality;
  earthPoliticalTextureQuality: EarthPoliticalTextureQuality;

  // Earth Texture Style
  earthTextureStyle: EarthTextureStyle;
  isEarthGrayScale = false;
  isEarthAmbientLighting = true;
  isDrawPoliticalMap = true;
  isDrawCloudsMap = true;

  // Earth Rendering
  /**
   * If true, hide the earth textures and make the globe black
   */
  isBlackEarth = false;
  /**
   * Determines whether or not to load the specularity map for the Earth.
   */
  isDrawSpecMap = true;
  /**
   * Determines whether or not to load the bump map for the Earth.
   */
  isDrawBumpMap = true;
  /**
   * The number of latitude segments used to render the Earth object.
   */
  earthNumLatSegs = 128;
  /**
   * The number of longitude segments used to render the Earth.
   */
  earthNumLonSegs = 128;

  // Atmosphere and Aurora
  /**
   * Determines whether the atmosphere should be drawn or not.
   * 0 = Off
   * 1 = On
   */
  isDrawAtmosphere: AtmosphereSettings = 1;
  /**
   * Determines whether or not to draw the Aurora effect.
   */
  isDrawAurora = true;

  // Sun Settings
  sunTextureQuality: SunTextureQuality;
  /**
   * Determines whether or not to draw the sun in the application.
   */
  isDrawSun = true;
  /**
   * The size of the sun in the simulation, represented as a scale factor.
   * A value of 0.9 indicates the sun is displayed at 90% of its default size.
   * A value of 1.1 indicates the sun is displayed at 110% of its default size.
   */
  sizeOfSun = 1.1;
  /**
   * Determines whether to use a sun texture.
   * When set to true, the application will render the sun with a custom texture.
   * When set to false, the application will use a default sun representation.
   * @default false
   */
  isUseSunTexture = false;
  isDrawNightAsDay = false;

  // Godrays (Sun illumination effects)
  /**
   * Disable drawing godrays (huge performance hit on mobile)
   */
  isDisableGodrays = false;
  /**
   * Determines how many draw commands are used for sun illumination
   * This should be a GodraySamples value (24, 36, 52, 80)
   * @default 24
   */
  godraysSamples = 24;
  /**
   * The decay factor for the godray effect.
   *
   * This value controls how fast the godray intensity decreases with distance.
   * Lower values result in shorter/less visible godrays, while higher values
   * create longer/more prominent godrays.
   *
   * @default 0.983
   */
  godraysDecay = 0.983;
  /**
   * The exposure level for the godrays effect.
   * Controls the brightness/intensity of the godray rendering.
   * Higher values make godrays more pronounced.
   * @default 0.75.
   */
  godraysExposure = 0.4;
  /**
   * The density of godrays effect.
   * Controls the intensity and thickness of the light scattering effect.
   * Higher values result in more pronounced godrays.
   * @default 1.8
   */
  godraysDensity = 1.8;
  /**
   * The weight factor for the godray effect.
   * Controls the intensity of the godray/light scattering effect.
   * Higher values increase the visibility of godrays.
   * @default 0.085
   */
  godraysWeight = 0.085;
  /**
   * Represents the rate at which the intensity of godrays (volumetric light scattering) diminishes
   * with distance from the light source.
   *
   * Higher values make the godrays fade more quickly as they extend away from the light source.
   * Lower values allow the godrays to extend further with less intensity reduction.
   *
   * @default 2.7
   */
  godraysIlluminationDecay = 2.7;

  // Skybox and Space
  /**
   * Determines whether the Milky Way should be drawn on the screen.
   */
  isDrawMilkyWay = true;
  /**
   * Default resolution for Milky Way texture
   */
  milkyWayTextureQuality: MilkyWayTextureQuality;
  /**
   * Use 16K textures for the Milky Way
   */
  hiresMilkWay = false;
  /**
   * Determines whether the background of the canvas should be gray or black.
   *
   * NOTE: This is only used when the Milky Way is not drawn.
   */
  isGraySkybox = false;
  isDisableSkybox = false;
  isDisablePlanets = false;

  // Stars and Constellations
  /**
   * TODO: Reimplement stars
   */
  isDisableStars = true;
  isDrawConstellationBoundaries: boolean | null = null;
  isDrawNasaConstellations: boolean | null = null;

  // Image Quality
  /**
   * Determines whether small images should be used.
   *
   * Use these to default smallest resolution maps
   * Really useful on small screens and for faster loading times
   */
  smallImages = false;

  // Satellite Shader Settings
  /**
   * The settings for the satellite shader.
   */
  satShader = {
    /**
     * The minimum zoom level at which large objects are displayed.
     */
    largeObjectMinZoom: 0.37,
    /**
     * The maximum zoom level at which large objects are displayed.
     */
    largeObjectMaxZoom: 0.58,
    /**
     * The minimum size of objects in the shader.
     */
    minSize: 5.5,
    /**
     * The maximum size of objects in the shader.
     */
    maxSize: 70.0,
    /**
     * The minimum size of objects in the shader when in planetarium mode.
     */
    minSizePlanetarium: 20.0,
    /**
     * The maximum size of objects in the shader when in planetarium mode.
     */
    maxSizePlanetarium: 20.0,
    /**
     * The maximum allowed size of objects in the shader.
     * This value is dynamically changed based on zoom level.
     */
    maxAllowedSize: 35.0,
    /**
     * Whether or not to use dynamic sizing for objects in the shader.
     */
    isUseDynamicSizing: false,
    /**
     * The scalar value used for dynamic sizing of objects in the shader.
     */
    dynamicSizeScalar: 1.0,
    /**
     * The size of stars and searched objects in the shader.
     */
    starSize: '20.0',
    /**
     * The distance at which objects start to grow in kilometers.
     * Must be a float as a string for the GPU to read.
     * This makes stars bigger than satellites.
     */
    distanceBeforeGrow: '14000.0',
    /**
     * The blur radius factor used for satellites.
     */
    blurFactor1: '0.53',
    /**
     * The blur alpha factor used for satellites.
     */
    blurFactor2: '0.5',
    /**
     * The blur radius factor used for stars.
     */
    blurFactor3: '0.43',
    /**
     * The blur alpha factor used for stars.
     */
    blurFactor4: '0.25',
  };

  /**
   * Size of the dot vertex shader
   */
  vertShadersSize = 12;
  /**
   * Size of the dot for picking purposes
   */
  pickingDotSize: string = '18.0';

  // WebGL Depth Settings
  /**
   * The maximum z-depth for the WebGL renderer.
   *
   * Increasing this causes z-fighting
   * Decreasing this causes clipping of stars and satellites
   */
  zFar = 149600000;
  /**
   * The minimum z-depth for the WebGL renderer.
   */
  zNear = 1.0;

  // Mesh Settings
  /**
   * Which mesh to use if meshOverride is set
   */
  meshOverride: string | null = null;
  /**
   * The rotation of the mesh if meshOverride is set
   */
  meshRotation = {
    x: 0,
    y: 0,
    z: 0,
  };
  /**
   * Add custom mesh list to force loading of specific meshes
   *
   * These can then be used in the mesh manager to force a specific mesh to be used
   */
  meshListOverride: string[] = [];
  /**
   * Override the default models on satellite view
   */
  modelsOnSatelliteViewOverride = false;
  noMeshManager = false;

  // Advanced Graphics
  isDisableAsyncReadPixels = false;
}

export const defaultGraphicsSettings = new GraphicsSettings();
