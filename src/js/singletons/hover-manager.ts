import { keepTrackApi } from '@app/js/keepTrackApi';
import { getDayOfYear } from '@app/js/lib/transforms';
import { CameraType, mainCameraInstance } from '@app/js/singletons/camera';
import { keepTrackContainer } from '../container';
import { CatalogManager, RadarDataObject, SatObject, SensorManager, Singletons } from '../interfaces';
import { getEl } from '../lib/get-el';
import { SpaceObjectType } from '../lib/space-object-type';
import { spaceObjType2Str } from '../lib/spaceObjType2Str';
import { CoordinateTransforms } from '../static/coordinate-transforms';
import { SensorMath } from '../static/sensor-math';
import { StringExtractor } from '../static/string-extractor';
import { StandardColorSchemeManager } from './color-scheme-manager';
import { DrawManager } from './draw-manager';
import { errorManagerInstance } from './errorManager';
import { StandardOrbitManager } from './orbitManager';

export class HoverManager {
  /** The id of the object currently being hovered */
  private currentHoverId = -1;
  /** This is used to track how many orbit buffers have been updated this draw cycle */
  private satHoverBoxDOM: HTMLDivElement;
  private satHoverBoxNode1: HTMLDivElement;
  private satHoverBoxNode2: HTMLDivElement;
  private satHoverBoxNode3: HTMLDivElement;
  public hoveringSat = -1;
  public lasthoveringSat = -1;

  getHoverId() {
    return this.currentHoverId;
  }

  init() {
    // NOTE: Reusing these cached value causes the hover menu to get stuck on or off
    // when the user clicks on a satellite. You need to getElementById every time.
    this.satHoverBoxNode1 = <HTMLDivElement>(<unknown>getEl('sat-hoverbox1'));
    this.satHoverBoxNode2 = <HTMLDivElement>(<unknown>getEl('sat-hoverbox2'));
    this.satHoverBoxNode3 = <HTMLDivElement>(<unknown>getEl('sat-hoverbox3'));
    this.satHoverBoxDOM = <HTMLDivElement>(<unknown>getEl('sat-hoverbox'));
  }

  /**
   * Update orbits and overlays for the satellite being hovered over
   */
  setHoverId(id: number, mouseX?: number, mouseY?: number) {
    // If this isn't a thing or the context menu is open then don't do anything
    if (id === this.currentHoverId || keepTrackApi.getInputManager().isRmbMenuOpen) return;

    if (settingsManager.enableHoverOrbits) {
      this.updateHover_(id);
    }
    if (settingsManager.enableHoverOverlay) {
      this.showHoverDetails_(id, mouseX, mouseY);
    }
  }

  private controlFacility_(sat: SatObject) {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

    this.satHoverBoxNode1.textContent = sat.name;
    this.satHoverBoxNode2.innerHTML = sat.country + SensorMath.distanceString(sat, catalogManagerInstance.getSat(catalogManagerInstance.selectedSat)) + '';
    this.satHoverBoxNode3.textContent = '';
  }

  private hoverOverNothing_() {
    this.satHoverBoxDOM = <HTMLDivElement>(<unknown>getEl('sat-hoverbox'));
    if (this.satHoverBoxDOM.style.display === 'none' || !settingsManager.enableHoverOverlay) return false;
    const { starManager } = keepTrackApi.programs;
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);

    if (catalogManagerInstance.isStarManagerLoaded) {
      if (starManager.isConstellationVisible === true && !starManager.isAllConstellationVisible) starManager.clearConstellations();
    }

    this.satHoverBoxDOM.style.display = 'none';
    drawManagerInstance.setCursor('default');
    return true;
  }

  private hoverOverSomething_(id: number, screenX?: number, screenY?: number) {
    if (!mainCameraInstance.isDragging && settingsManager.enableHoverOverlay) {
      // NOTE: The radar mesurement logic breaks if you call it a SatObject

      const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
      const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);

      const sat = catalogManagerInstance.getSat(id);
      const satScreenPositionArray = drawManagerInstance.getScreenCoords(sat);

      if (
        satScreenPositionArray.error ||
        typeof satScreenPositionArray.x == 'undefined' ||
        typeof satScreenPositionArray.y == 'undefined' ||
        satScreenPositionArray.x > window.innerWidth ||
        satScreenPositionArray.y > window.innerHeight
      ) {
        // If the mouse moves off the screen there is an intermittent error finding the screen position
        this.satHoverBoxDOM.style.display = 'none';

        // This happens when we are zoomed in and can't see the object being hovered over in the search bar.
        // errorManagerInstance.debug('Issue drawing hover box, skipping');
        return;
      }

      this.init();

      if (sat.static || sat.type === SpaceObjectType.RADAR_MEASUREMENT) {
        this.staticObj_(sat);
      } else if (sat.missile) {
        this.missile_(sat);
      } else if (Number(sat.sccNum) > 0) {
        this.satObj_(sat);
      } else {
        this.staticObj_(sat);
      }

      screenX ??= satScreenPositionArray.x;
      screenY ??= satScreenPositionArray.y;

      const style = {
        display: 'block',
        left: `${screenX + 20}px`,
        top: `${screenY - 10}px`,
      };
      Object.assign(this.satHoverBoxDOM.style, style);

      drawManagerInstance.setCursor('pointer');
    }
  }

  private launchFacility_(sat: SatObject) {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

    let launchSite = StringExtractor.extractLaunchSite(sat.name);
    this.satHoverBoxNode1.textContent = launchSite.site + ', ' + launchSite.sitec;
    this.satHoverBoxNode2.innerHTML = spaceObjType2Str(sat.type) + SensorMath.distanceString(sat, catalogManagerInstance.getSat(catalogManagerInstance.selectedSat)) + '';
    this.satHoverBoxNode3.textContent = '';
  }

  private missile_(sat: SatObject) {
    this.satHoverBoxNode1.innerHTML = sat.name + '<br >' + sat.desc + '';
    this.satHoverBoxNode2.textContent = '';
    this.satHoverBoxNode3.textContent = '';
  }

  private planetariumView_(satId: number) {
    if (mainCameraInstance.cameraType === CameraType.PLANETARIUM && !settingsManager.isDemoModeOn) {
      this.satHoverBoxDOM.style.display = 'none';

      const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
      if (satId !== -1) {
        drawManagerInstance.setCursor('pointer');
      } else {
        drawManagerInstance.setCursor('default');
      }
      return true;
    }
    return false;
  }

  /** TODO: Implement a RadarDataObject to replace SatObject */
  private radarData_(sat: RadarDataObject) {
    const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);

    this.satHoverBoxNode1.innerHTML = 'Measurement: ' + sat.mId + '</br>Track: ' + sat.trackId + '</br>Object: ' + sat.objectId;
    if (sat.missileComplex !== -1) {
      this.satHoverBoxNode1.insertAdjacentHTML('beforeend', '</br>Missile Complex: ' + sat.missileComplex);
      this.satHoverBoxNode1.insertAdjacentHTML('beforeend', '</br>Missile Object: ' + sat.missileObject);
    }
    if (Number(sat.sccNum) !== -1) this.satHoverBoxNode1.insertAdjacentHTML('beforeend', '</br>Satellite: ' + sat.sccNum);
    if (typeof sat.rae == 'undefined' && sensorManagerInstance.currentSensors !== sensorManagerInstance.defaultSensor) {
      sat.rae = CoordinateTransforms.eci2rae(sat.t, sat.position, sensorManagerInstance.currentSensors[0]);
    }
    if (sensorManagerInstance.currentSensors !== sensorManagerInstance.defaultSensor) {
      let measurementDate = new Date(sat.t);
      this.satHoverBoxNode2.innerHTML =
        `JDAY: ${getDayOfYear(measurementDate)} - ${measurementDate.toLocaleString('en-GB', { timeZone: 'UTC' }).slice(-8)}` +
        '</br>' +
        'R: ' +
        sat.rae.range.toFixed(2) +
        ' A: ' +
        sat.rae.az.toFixed(2) +
        ' E: ' +
        sat.rae.el.toFixed(2);
    } else {
      let measurementDate = new Date(sat.t);
      this.satHoverBoxNode2.innerHTML = `JDAY: ${getDayOfYear(measurementDate)} - ${measurementDate.toLocaleString('en-GB', { timeZone: 'UTC' }).slice(-8)}`;
    }
    this.satHoverBoxNode3.innerHTML =
      'RCS: ' +
      parseFloat(sat.rcs).toFixed(2) +
      ' m^2 (' +
      (10 ** (parseFloat(sat.rcs) / 10)).toFixed(2) +
      ' dBsm)</br>Az Error: ' +
      sat.azError.toFixed(2) +
      '° El Error: ' +
      sat.elError.toFixed(2) +
      '°';
  }

  private satObj_(sat: SatObject) {
    if (!settingsManager.enableHoverOverlay) return;
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);

    // Use this as a default if no UI
    if (settingsManager.disableUI || settingsManager.isEPFL) {
      this.satHoverBoxNode1.textContent = sat.name;
      let year = sat.intlDes.split('-')[0] === 'none' ? 'Unknown' : sat.intlDes.split('-')[0];
      this.satHoverBoxNode2.textContent = settingsManager.isEPFL ? `Launched: ${year}` : sat.sccNum;
      let country = StringExtractor.extractCountry(sat.country);
      country = country.length > 0 ? country : 'Unknown';
      this.satHoverBoxNode3.textContent = country;
    } else {
      const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

      if (
        catalogManagerInstance.isSensorManagerLoaded &&
        sensorManagerInstance.currentSensors[0].lat != null &&
        settingsManager.isShowNextPass &&
        drawManagerInstance.isShowDistance
      ) {
        this.satHoverBoxNode1.textContent = sat.name;
        this.satHoverBoxNode2.textContent = sat.sccNum;
        if (catalogManagerInstance.selectedSat !== -1) {
          this.satHoverBoxNode3.innerHTML = SensorMath.nextpass(sat) + SensorMath.distanceString(sat, catalogManagerInstance.getSat(catalogManagerInstance.selectedSat)) + '';
        } else {
          this.satHoverBoxNode3.innerHTML = SensorMath.nextpass(sat);
        }
      } else if (drawManagerInstance.isShowDistance) {
        this.satHoverBoxNode1.textContent = sat.name;
        this.showRicOrEci_(sat);
      } else if (catalogManagerInstance.isSensorManagerLoaded && sensorManagerInstance.currentSensors[0].lat != null && settingsManager.isShowNextPass) {
        this.satHoverBoxNode1.textContent = sat.name;
        this.satHoverBoxNode2.textContent = sat.sccNum;
        this.satHoverBoxNode3.textContent = SensorMath.nextpass(sat);
      } else {
        this.satHoverBoxNode1.textContent = sat.name;
        this.satHoverBoxNode2.textContent = sat.sccNum;
        this.showEciVel_(sat);
      }
    }
  }

  private showEciDistAndVel_(sat: SatObject) {
    if (settingsManager.isEciOnHover) {
      this.satHoverBoxNode3.innerHTML =
        'X: ' +
        sat.position.x.toFixed(2) +
        ' km' +
        ' Y: ' +
        sat.position.y.toFixed(2) +
        ' km' +
        ' Z: ' +
        sat.position.z.toFixed(2) +
        ' km' +
        '</br>' +
        'XDot: ' +
        sat.velocity.x.toFixed(2) +
        ' km/s' +
        ' YDot: ' +
        sat.velocity.y.toFixed(2) +
        ' km/s' +
        ' ZDot: ' +
        sat.velocity.z.toFixed(2) +
        ' km/s';
    } else {
      this.satHoverBoxNode3.innerHTML = '';
    }
  }

  private showEciVel_(sat: SatObject) {
    if (settingsManager.isEciOnHover) {
      this.satHoverBoxNode3.innerHTML =
        'X: ' +
        sat.position.x.toFixed(2) +
        ' Y: ' +
        sat.position.y.toFixed(2) +
        ' Z: ' +
        sat.position.z.toFixed(2) +
        '</br>X: ' +
        sat.velocity.x.toFixed(2) +
        ' Y: ' +
        sat.velocity.y.toFixed(2) +
        ' Z: ' +
        sat.velocity.z.toFixed(2);
    } else {
      this.satHoverBoxNode3.innerHTML = '';
    }
  }

  private showHoverDetails_(id: number, satX?: number, satY?: number) {
    if (typeof this.satHoverBoxDOM === 'undefined' || this.satHoverBoxDOM === null) return;

    if (this.planetariumView_(id)) return;

    if (id === -1) {
      this.hoverOverNothing_();
    } else {
      this.hoverOverSomething_(id, satX, satY);
    }
  }

  private showRicDistAndVel_(ric: { position: import('gl-matrix').vec3; velocity: import('gl-matrix').vec3 }) {
    this.satHoverBoxNode3.innerHTML =
      `R: ${ric.position[0].toFixed(2)}km I: ${ric.position[1].toFixed(2)}km C: ${ric.position[2].toFixed(2)}km</br>` +
      `ΔR: ${ric.velocity[0].toFixed(2)}km/s ΔI: ${ric.velocity[1].toFixed(2)}km/s ΔC: ${ric.velocity[2].toFixed(2)}km/s</br>`;
  }

  private showRicOrEci_(sat: SatObject) {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);

    drawManagerInstance.sat2 = catalogManagerInstance.getSat(catalogManagerInstance.selectedSat);
    if (typeof drawManagerInstance.sat2 !== 'undefined' && drawManagerInstance.sat2 !== null && sat !== drawManagerInstance.sat2) {
      const ric = CoordinateTransforms.sat2ric(sat, drawManagerInstance.sat2);
      this.satHoverBoxNode2.innerHTML = `${sat.sccNum}`;
      this.showRicDistAndVel_(ric);
    } else {
      this.satHoverBoxNode2.innerHTML = `${sat.sccNum}${SensorMath.distanceString(sat, drawManagerInstance.sat2)}`;
      this.showEciDistAndVel_(sat);
    }
  }

  private star_(sat: SatObject) {
    const { starManager } = keepTrackApi.programs;
    const constellationName = starManager.findStarsConstellation(sat.name);
    if (constellationName !== null) {
      this.satHoverBoxNode1.innerHTML = sat.name + '</br>' + constellationName;
    } else {
      this.satHoverBoxNode1.textContent = sat.name;
    }
    this.satHoverBoxNode2.innerHTML = 'Star';
    this.satHoverBoxNode3.innerHTML = 'RA: ' + sat.ra.toFixed(3) + ' deg </br> DEC: ' + sat.dec.toFixed(3) + ' deg';

    if (this.lasthoveringSat !== sat.id && typeof sat !== 'undefined' && constellationName !== null) {
      starManager.drawConstellations(constellationName);
    }
  }

  private staticObj_(sat: SatObject | RadarDataObject) {
    if (sat.type === SpaceObjectType.LAUNCH_FACILITY) {
      this.launchFacility_(sat);
    } else if (sat.type === SpaceObjectType.RADAR_MEASUREMENT) {
      // TODO: This is a broken mess but only used offline
      this.radarData_(sat as RadarDataObject);
    } else if (sat.type === SpaceObjectType.CONTROL_FACILITY) {
      this.controlFacility_(sat);
    } else if (sat.type === SpaceObjectType.STAR) {
      this.star_(sat);
    } else {
      const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

      this.satHoverBoxNode1.textContent = sat.name;
      if (catalogManagerInstance.selectedSat !== -1) {
        this.satHoverBoxNode2.innerHTML =
          spaceObjType2Str(sat.type) + SensorMath.distanceString(sat as SatObject, catalogManagerInstance.getSat(catalogManagerInstance.selectedSat)) + '';
      } else {
        this.satHoverBoxNode2.innerHTML = spaceObjType2Str(sat.type) + '';
      }
      this.satHoverBoxNode3.textContent = '';
    }
  }

  /** The internal method that actually updates the hover.
   * TODO: Rename this */
  private updateHover_(id: number) {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const orbitManagerInstance = keepTrackContainer.get<StandardOrbitManager>(Singletons.OrbitManager);

    this.currentHoverId = id;
    if (id !== -1 && catalogManagerInstance.satData[id]?.type !== SpaceObjectType.STAR) {
      orbitManagerInstance.setHoverOrbit(id);
    } else {
      orbitManagerInstance.clearHoverOrbit();
    }
    this.setHover(id);
  }

  public setHover(i: number): void {
    if (!i) {
      errorManagerInstance.debug('setHover called with no id');
      return;
    }

    const colorSchemeManagerInstance = keepTrackContainer.get<StandardColorSchemeManager>(Singletons.ColorSchemeManager);
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const gl = keepTrackContainer.get<DrawManager>(Singletons.DrawManager).gl;

    this.hoveringSat = i;
    if (i === this.lasthoveringSat) return;
    if (i !== -1 && catalogManagerInstance.satData[i].type === SpaceObjectType.STAR) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManagerInstance.colorBuffer);
    // If Old Select Sat Picked Color it Correct Color
    if (this.lasthoveringSat !== -1 && this.lasthoveringSat !== catalogManagerInstance.selectedSat) {
      const newColor = colorSchemeManagerInstance.currentColorScheme(catalogManagerInstance.getSat(this.lasthoveringSat)).color;
      colorSchemeManagerInstance.colorData[this.lasthoveringSat * 4] = newColor[0]; // R
      colorSchemeManagerInstance.colorData[this.lasthoveringSat * 4 + 1] = newColor[1]; // G
      colorSchemeManagerInstance.colorData[this.lasthoveringSat * 4 + 2] = newColor[2]; // B
      colorSchemeManagerInstance.colorData[this.lasthoveringSat * 4 + 3] = newColor[3]; // A

      gl.bufferSubData(gl.ARRAY_BUFFER, this.lasthoveringSat * 4 * 4, new Float32Array(newColor));
    }
    // If New Hover Sat Picked Color it
    if (this.hoveringSat !== -1 && this.hoveringSat !== catalogManagerInstance.selectedSat) {
      gl.bufferSubData(gl.ARRAY_BUFFER, this.hoveringSat * 4 * 4, new Float32Array(settingsManager.hoverColor));
    }
    this.lasthoveringSat = this.hoveringSat;
  }
}

export const hoverManagerInstance = new HoverManager();
