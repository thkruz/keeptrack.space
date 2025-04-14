import { country2flagIcon } from '@app/catalogs/countries';
import { keepTrackApi } from '@app/keepTrackApi';
import { t7e } from '@app/locales/keys';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { CameraType } from '@app/singletons/camera';
import { CatalogSource, DetailedSatellite, DetailedSensor, LandObject, RIC, SpaceObjectType, Star, spaceObjType2Str } from 'ootk';
import { getEl } from '../lib/get-el';
import { SensorMath } from '../static/sensor-math';
import { StringExtractor } from '../static/string-extractor';
import { MissileObject } from './catalog-manager/MissileObject';
import { errorManagerInstance } from './errorManager';

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
    /*
     * NOTE: Reusing these cached value causes the hover menu to get stuck on or off
     * when the user clicks on a satellite. You need to getElementById every time.
     */
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
    if (id === this.currentHoverId || keepTrackApi.getInputManager().isRmbMenuOpen) {
      return;
    }

    if (settingsManager.enableHoverOrbits) {
      this.updateHover_(id);
    }
    if (settingsManager.enableHoverOverlay) {
      if (this.satHoverBoxNode2) {
        this.satHoverBoxNode2.style.display = 'block';
      }
      if (this.satHoverBoxNode3) {
        this.satHoverBoxNode3.style.display = 'block';
      }
      this.showHoverDetails_(id, mouseX, mouseY);
    }
  }

  private controlFacility_(obj: LandObject) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    this.satHoverBoxNode1.textContent = obj.name;
    this.satHoverBoxNode2.innerHTML =
      `${obj.country + SensorMath.distanceString(obj, catalogManagerInstance.getObject(keepTrackApi.getSensorManager().currentSensors[0]?.id) as DetailedSensor)}`;
    this.satHoverBoxNode3.textContent = '';
    this.satHoverBoxNode3.style.display = 'none';
  }

  private hoverOverNothing_() {
    this.satHoverBoxDOM = <HTMLDivElement>(<unknown>getEl('sat-hoverbox'));
    if (this.satHoverBoxDOM.style.display === 'none' || !settingsManager.enableHoverOverlay) {
      return false;
    }
    const renderer = keepTrackApi.getRenderer();

    this.satHoverBoxDOM.style.display = 'none';
    renderer.setCursor('default');

    return true;
  }

  private hoverOverSomething_(id: number, screenX?: number, screenY?: number) {
    if (!keepTrackApi.getMainCamera().isDragging && settingsManager.enableHoverOverlay) {
      // NOTE: The radar mesurement logic breaks if you call it a SatObject

      const catalogManagerInstance = keepTrackApi.getCatalogManager();
      const renderer = keepTrackApi.getRenderer();

      const obj = catalogManagerInstance.getObject(id);
      const satScreenPositionArray = renderer.getScreenCoords(obj);

      if (
        satScreenPositionArray.error ||
        typeof satScreenPositionArray.x === 'undefined' ||
        typeof satScreenPositionArray.y === 'undefined' ||
        satScreenPositionArray.x > window.innerWidth ||
        satScreenPositionArray.y > window.innerHeight
      ) {
        // If the mouse moves off the screen there is an intermittent error finding the screen position
        this.satHoverBoxDOM.style.display = 'none';

        /*
         * This happens when we are zoomed in and can't see the object being hovered over in the search bar.
         * errorManagerInstance.debug('Issue drawing hover box, skipping');
         */
        return;
      }

      this.init();

      if (obj.isMissile()) {
        this.missile_(obj as MissileObject);
      } else if (obj.isSatellite()) {
        this.satObj_(obj as DetailedSatellite);
      } else {
        this.staticObj_(obj as LandObject);
      }

      screenX ??= satScreenPositionArray.x;
      screenY ??= satScreenPositionArray.y;

      const style = {
        display: 'flex',
        left: `${screenX + 20}px`,
        top: `${screenY - 10}px`,
      };

      Object.assign(this.satHoverBoxDOM.style, style);

      renderer.setCursor('pointer');
    }
  }

  private launchFacility_(landObj: LandObject) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    const launchSite = StringExtractor.extractLaunchSite(landObj.name);

    this.satHoverBoxNode1.textContent = `${launchSite.site}, ${launchSite.country}`;
    this.satHoverBoxNode2.innerHTML =
      `${spaceObjType2Str(landObj.type) +
      SensorMath.distanceString(landObj, catalogManagerInstance.getObject(keepTrackApi.getSensorManager().currentSensors[0]?.id) as DetailedSensor)
      }`;
    this.satHoverBoxNode3.textContent = '';
    this.satHoverBoxNode3.style.display = 'none';
  }

  private missile_(missile: MissileObject) {
    this.satHoverBoxNode1.innerHTML = `<span>${missile.name}</span><span>${missile.desc}</span>`;
    this.satHoverBoxNode2.textContent = '';
    this.satHoverBoxNode2.style.display = 'none';
    this.satHoverBoxNode3.textContent = '';
    this.satHoverBoxNode3.style.display = 'none';
  }

  private planetariumView_(satId: number) {
    if (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM && !settingsManager.isDemoModeOn) {
      this.satHoverBoxDOM.style.display = 'none';

      const renderer = keepTrackApi.getRenderer();

      if (satId !== -1) {
        renderer.setCursor('pointer');
      } else {
        renderer.setCursor('default');
      }

      return true;
    }

    return false;
  }

  private satObj_(sat: DetailedSatellite) {
    if (!settingsManager.enableHoverOverlay) {
      return;
    }
    const renderer = keepTrackApi.getRenderer();
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    // Use this as a default if no UI
    if (settingsManager.disableUI || settingsManager.isEPFL) {
      this.satHoverBoxNode1.textContent = sat.name;
      this.satHoverBoxNode2.textContent = settingsManager.isEPFL ? HoverManager.getLaunchYear(sat) : sat.sccNum;
      let country = StringExtractor.extractCountry(sat.country);

      country = country.length > 0 ? country : 'Unknown';
      this.satHoverBoxNode3.textContent = country;
    } else {
      let confidenceScoreString = '';
      let color: string = 'black';

      if (settingsManager.isShowConfidenceLevels) {
        const confidenceScore = parseInt(sat.tle1.substring(64, 65)) || 0;

        if (confidenceScore >= 7) {
          color = 'green';
        } else if (confidenceScore >= 4) {
          color = 'orange';
        } else {
          color = 'red';
        }

        confidenceScoreString = ` (${confidenceScore.toString()})`;

        if (settingsManager.dataSources.externalTLEsOnly) {
          confidenceScoreString = ' (External)';
          color = 'gray';
        }
      }

      this.satHoverBoxNode1.innerHTML = keepTrackApi.html`
        <span id="hoverbox-fi"></span>
        <span>${sat.name}</span>
        <span style='color:${color};'>${confidenceScoreString}</span>
      `;

      getEl('hoverbox-fi').classList.value = `fi ${country2flagIcon(sat.country)}`;

      if (sat.sccNum) {
        this.satHoverBoxNode2.textContent = `NORAD: ${sat.sccNum}`;
      } else {
        this.satHoverBoxNode2.textContent = HoverManager.getLaunchYear(sat);
      }

      if (sensorManagerInstance.isSensorSelected() && settingsManager.isShowNextPass && renderer.isShowDistance) {
        if (keepTrackApi.getPlugin(SelectSatManager)?.selectedSat > -1) {
          this.satHoverBoxNode3.innerHTML =
            `${SensorMath.nextpass(sat) + SensorMath.distanceString(sat, keepTrackApi.getPlugin(SelectSatManager)?.getSelectedSat() as DetailedSatellite)}`;
        } else {
          this.satHoverBoxNode3.innerHTML = SensorMath.nextpass(sat);
        }
      } else if (renderer.isShowDistance) {
        this.showRicOrEci_(sat);
      } else if (sensorManagerInstance.isSensorSelected() && settingsManager.isShowNextPass) {
        this.satHoverBoxNode3.textContent = SensorMath.nextpass(sat);
      } else if (settingsManager.isEciOnHover) {
        this.showEciVel_(sat);
      } else if (sat.source !== CatalogSource.VIMPEL) {
        this.satHoverBoxNode3.textContent = HoverManager.getLaunchYear(sat);
      } else {
        this.satHoverBoxNode3.textContent = '';
        this.satHoverBoxNode3.style.display = 'none';
      }
    }
  }

  private static getLaunchYear(sat: DetailedSatellite) {
    if (sat.type === SpaceObjectType.NOTIONAL) {
      return t7e('hoverManager.launchedPlanned');
    }
    if (sat.source === CatalogSource.VIMPEL) {
      return t7e('hoverManager.launchedUnknown');
    }

    const launchYear = parseInt(sat.intlDes.slice(2, 4));

    if (launchYear < 57) {
      return `${t7e('hoverManager.launched')}: 20${launchYear.toString().padStart(2, '0')}`;
    } else if (launchYear >= 57 && launchYear < 100) {
      return `${t7e('hoverManager.launched')}: 19${launchYear.toString().padStart(2, '0')}`;
    }

    return t7e('hoverManager.launchedUnknown');

  }

  private showEciDistAndVel_(sat: DetailedSatellite) {
    if (settingsManager.isEciOnHover) {
      this.satHoverBoxNode3.innerHTML =
        `X: ${sat.position.x.toFixed(2)
        } km` +
        ` Y: ${sat.position.y.toFixed(2)
        } km` +
        ` Z: ${sat.position.z.toFixed(2)
        } km` +
        `XDot: ${sat.velocity.x.toFixed(2)
        } km/s` +
        ` YDot: ${sat.velocity.y.toFixed(2)
        } km/s` +
        ` ZDot: ${sat.velocity.z.toFixed(2)
        } km/s`;
    } else {
      this.satHoverBoxNode3.innerHTML = '';
      this.satHoverBoxNode3.style.display = 'none';
    }
  }

  private showEciVel_(sat: DetailedSatellite) {
    this.satHoverBoxNode3.innerHTML =
      `X: ${sat.position.x.toFixed(2)
      } Y: ${sat.position.y.toFixed(2)
      } Z: ${sat.position.z.toFixed(2)
      }X: ${sat.velocity.x.toFixed(2)
      } Y: ${sat.velocity.y.toFixed(2)
      } Z: ${sat.velocity.z.toFixed(2)}`;
  }

  private showHoverDetails_(id: number, satX?: number, satY?: number) {
    if (typeof this.satHoverBoxDOM === 'undefined' || this.satHoverBoxDOM === null) {
      return;
    }

    if (this.planetariumView_(id)) {
      return;
    }

    if (id === -1) {
      this.hoverOverNothing_();
    } else {
      this.hoverOverSomething_(id, satX, satY);
    }
  }

  private showRicDistAndVel_(ric: RIC) {
    this.satHoverBoxNode3.innerHTML =
      `R: ${ric.position[0].toFixed(2)}km I: ${ric.position[1].toFixed(2)}km C: ${ric.position[2].toFixed(2)}km` +
      `ΔR: ${ric.velocity[0].toFixed(2)}km/s ΔI: ${ric.velocity[1].toFixed(2)}km/s ΔC: ${ric.velocity[2].toFixed(2)}km/s`;
  }

  private showRicOrEci_(sat: DetailedSatellite) {
    const sat2 = keepTrackApi.getPlugin(SelectSatManager)?.secondarySatObj;

    if (typeof sat2 !== 'undefined' && sat2 !== null && sat !== sat2) {
      const ric = RIC.fromJ2000(sat2.toJ2000(keepTrackApi.getTimeManager().simulationTimeObj), sat.toJ2000(keepTrackApi.getTimeManager().simulationTimeObj));

      this.satHoverBoxNode2.innerHTML = `${sat.sccNum}`;
      this.showRicDistAndVel_(ric);
    } else {
      this.satHoverBoxNode2.innerHTML = `${sat.sccNum}${SensorMath.distanceString(sat, sat2)}`;
      this.showEciDistAndVel_(sat);
    }
  }

  private staticObj_(obj: DetailedSensor | LandObject | Star) {
    if (obj.type === SpaceObjectType.LAUNCH_FACILITY) {
      this.launchFacility_(obj as LandObject);
    } else if (obj.type === SpaceObjectType.CONTROL_FACILITY) {
      this.controlFacility_(obj as LandObject);
    } else if (obj.type === SpaceObjectType.STAR) {
      // Do nothing
    } else {
      // It is a Sensor at this point
      const sensor = obj as DetailedSensor;

      this.satHoverBoxNode1.textContent = sensor.name;
      const isTelescope = sensor.type === SpaceObjectType.OPTICAL;

      this.satHoverBoxNode2.textContent = sensor.country;
      this.satHoverBoxNode3.innerHTML = !isTelescope && sensor.freqBand ? `${sensor.system} (${sensor.freqBand})` : sensor.system;
    }
  }

  /**
   * The internal method that actually updates the hover.
   * TODO: Rename this
   */
  private updateHover_(id: number) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const orbitManagerInstance = keepTrackApi.getOrbitManager();

    this.currentHoverId = id;
    if (id !== -1 && catalogManagerInstance.objectCache[id]?.type !== SpaceObjectType.STAR) {
      orbitManagerInstance.setHoverOrbit(id);
    } else {
      orbitManagerInstance.clearHoverOrbit();
    }
    this.setHover(id);
  }

  public setHover(i: number): void {
    if (typeof i === 'undefined' || i === null || isNaN(i)) {
      errorManagerInstance.debug('setHover called with no id');

      return;
    }

    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const gl = keepTrackApi.getRenderer().gl;

    this.hoveringSat = i;
    if (i === this.lasthoveringSat) {
      return;
    }
    if (i !== -1 && catalogManagerInstance.objectCache[i].type === SpaceObjectType.STAR) {
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManagerInstance.colorBuffer);

    const primarySatId = keepTrackApi.getPlugin(SelectSatManager)?.selectedSat;
    // If Old Select Sat Picked Color it Correct Color

    if (this.lasthoveringSat !== -1 && this.lasthoveringSat !== primarySatId) {
      const hoveredSatellite = catalogManagerInstance.getObject(this.lasthoveringSat);

      if (hoveredSatellite) {
        // Todo what if this is a group color scheme?
        const newColor = colorSchemeManagerInstance.currentColorScheme?.update(hoveredSatellite).color ??
          colorSchemeManagerInstance.currentColorSchemeUpdate(hoveredSatellite).color;

        colorSchemeManagerInstance.colorData[this.lasthoveringSat * 4] = newColor[0]; // R
        colorSchemeManagerInstance.colorData[this.lasthoveringSat * 4 + 1] = newColor[1]; // G
        colorSchemeManagerInstance.colorData[this.lasthoveringSat * 4 + 2] = newColor[2]; // B
        colorSchemeManagerInstance.colorData[this.lasthoveringSat * 4 + 3] = newColor[3]; // A

        gl.bufferSubData(gl.ARRAY_BUFFER, this.lasthoveringSat * 4 * 4, new Float32Array(newColor));
      }
    }
    // If New Hover Sat Picked Color it
    if (this.hoveringSat !== -1 && this.hoveringSat !== primarySatId) {
      gl.bufferSubData(gl.ARRAY_BUFFER, this.hoveringSat * 4 * 4, new Float32Array(settingsManager.hoverColor));
    }
    this.lasthoveringSat = this.hoveringSat;
  }
}
