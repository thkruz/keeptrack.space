import { country2flagIcon } from '@app/app/data/catalogs/countries';
import { CameraType } from '@app/engine/camera/camera';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { html } from '@app/engine/utils/development/formatter';
import { keepTrackApi } from '@app/keepTrackApi';
import { t7e } from '@app/locales/keys';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { CatalogSource, DetailedSatellite, DetailedSensor, KM_PER_AU, LandObject, SpaceObjectType, spaceObjType2Str, Star } from '@ootk/src/main';
import { Body } from 'astronomy-engine';
import i18next from 'i18next';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { getEl } from '../../engine/utils/get-el';
import { LaunchSite } from '../data/catalog-manager/LaunchFacility';
import { MissileObject } from '../data/catalog-manager/MissileObject';
import { Planet } from '../objects/planet';
import { SensorMath } from '../sensors/sensor-math';
import { StringExtractor } from './string-extractor';

export class HoverManager {
  /** The id of the object currently being hovered */
  private currentHoverId = -1;
  /** This is used to track how many orbit buffers have been updated this draw cycle */
  private satHoverBoxDOM: HTMLDivElement;
  private satHoverBoxNode1: HTMLDivElement;
  private satHoverBoxNode2: HTMLDivElement;
  private satHoverBoxNode3: HTMLDivElement;
  hoveringSat = -1;
  lasthoveringSat = -1;

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

    EventBus.getInstance().on(EventBusEvent.highPerformanceRender, () => {
      // Only update hover if we are not on mobile
      if (!settingsManager.isMobileModeEnabled) {
        this.setHoverId(keepTrackApi.getInputManager().mouse.mouseSat, keepTrackApi.getMainCamera().state.mouseX, keepTrackApi.getMainCamera().state.mouseY);
      }
    });
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

  private planet_(planet_: Planet) {
    const planet = ServiceLocator.getScene().getBodyById(planet_.name as Body);

    if (!planet) {
      return;
    }

    const orbitInSeconds = planet.orbitalPeriod;
    const distanceFromSunInAU = planet.meanDistanceToSun / KM_PER_AU;
    const distanceFromSunInMillionKm = planet.meanDistanceToSun / 1000000;
    const orbitPeriodInEarthDays = orbitInSeconds / 86400;

    this.satHoverBoxNode1.textContent = `${planet_.name} - (Planet)`;
    this.satHoverBoxNode2.textContent = `Distance from Sun: ${(distanceFromSunInAU).toFixed(2)} AU (${(distanceFromSunInMillionKm).toFixed(2)} million km)`;
    this.satHoverBoxNode3.textContent = `Orbit Period: ${(orbitPeriodInEarthDays).toFixed(1)} Earth Days`;
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
    if (!keepTrackApi.getMainCamera().state.isDragging && settingsManager.enableHoverOverlay) {
      // NOTE: The radar mesurement logic breaks if you call it a SatObject

      const catalogManagerInstance = keepTrackApi.getCatalogManager();
      const renderer = keepTrackApi.getRenderer();

      const obj = catalogManagerInstance.getObject(id);

      if (!obj) {
        errorManagerInstance.log('HoverManager: hoverOverSomething_ no object found');

        return;
      }

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

  private launchSite_(launchSite: LaunchSite) {
    this.satHoverBoxNode1.textContent = launchSite.name ?? 'Unknown Launch Site';
    this.satHoverBoxNode2.textContent = launchSite.site ?? 'Unknown Site';
    this.satHoverBoxNode3.textContent = launchSite.country ?? 'Unknown Country';
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
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    // Use this as a default if no UI
    if (settingsManager.disableUI || settingsManager.isEPFL) {
      this.updateSatObjMinimal_(sat);
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

      this.satHoverBoxNode1.innerHTML = html`
        <span id="hoverbox-fi"></span>
        <span>${sat.name}</span>
        <span style='color:${color};'>${confidenceScoreString}</span>
      `;

      getEl('hoverbox-fi')!.classList.value = `fi ${country2flagIcon(sat.country)}`;

      if (sat.sccNum) {
        this.satHoverBoxNode2.textContent = `NORAD: ${sat.sccNum}`;
      } else {
        this.satHoverBoxNode2.textContent = HoverManager.getLaunchYear(sat);
      }

      if (sensorManagerInstance.isSensorSelected() && settingsManager.isShowNextPass) {
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

  private updateSatObjMinimal_(sat: DetailedSatellite) {
    this.satHoverBoxNode1.textContent = sat.name;
    this.satHoverBoxNode2.textContent = settingsManager.isEPFL ? HoverManager.getLaunchYear(sat) : sat.sccNum;
    let country = StringExtractor.extractCountry(sat.country);

    country = country.length > 0 ? country : 'Unknown';
    this.satHoverBoxNode3.textContent = country;

    this.satHoverBoxNode3.innerHTML = html`
        <span id="hoverbox-fi"></span>
        <span>${country}</span>
      `;

    getEl('hoverbox-fi')!.classList.value = `fi ${country2flagIcon(sat.country)}`;
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
      if (i18next.language === 'zh') {
        return `${t7e('hoverManager.launched')}20${launchYear.toString().padStart(2, '0')}`;
      }

      return `${t7e('hoverManager.launched')}: 20${launchYear.toString().padStart(2, '0')}`;

    } else if (launchYear >= 57 && launchYear < 100) {
      if (i18next.language === 'zh') {
        return `${t7e('hoverManager.launched')}19${launchYear.toString().padStart(2, '0')}`;
      }

      return `${t7e('hoverManager.launched')}: 19${launchYear.toString().padStart(2, '0')}`;

    }

    return t7e('hoverManager.launchedUnknown');

  }

  private showEciVel_(sat: DetailedSatellite) {
    this.satHoverBoxNode3.innerHTML = `
      <div style="display: flex; gap: 32px;">
        <div>
          <strong>Position:</strong>
          <ul style="margin:0; padding-left:16px;">
          <li>X: ${sat.position.x.toFixed(2)} km</li>
          <li>Y: ${sat.position.y.toFixed(2)} km</li>
          <li>Z: ${sat.position.z.toFixed(2)} km</li>
          </ul>
        </div>
        <div>
          <strong>Velocity:</strong>
          <ul style="margin:0; padding-left:16px;">
          <li>Ẋ: ${sat.velocity.x.toFixed(2)} km/s</li>
          <li>Ẏ: ${sat.velocity.y.toFixed(2)} km/s</li>
          <li>Ż: ${sat.velocity.z.toFixed(2)} km/s</li>
          </ul>
        </div>
      </div>
    `;
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

  private staticObj_(obj: DetailedSensor | LandObject | Star) {
    if (obj.type === SpaceObjectType.LAUNCH_SITE) {
      this.launchSite_(obj as LandObject);
    } else if (obj.type === SpaceObjectType.LAUNCH_FACILITY) {
      this.launchFacility_(obj as LandObject);
    } else if (obj.type === SpaceObjectType.CONTROL_FACILITY) {
      this.controlFacility_(obj as LandObject);
    } else if (obj.type === 'Planet' as unknown as SpaceObjectType) {
      this.planet_(obj as unknown as Planet);
    } else if (obj.type === SpaceObjectType.STAR) {
      // Do nothing
    } else {
      // It is a Sensor at this point
      const sensor = obj as DetailedSensor;

      this.satHoverBoxNode1.textContent = sensor.name;
      const isTelescope = sensor.type === SpaceObjectType.OPTICAL;

      this.satHoverBoxNode2.textContent = sensor.country ?? 'Unknown';
      this.satHoverBoxNode3.innerHTML = (!isTelescope && sensor.freqBand) ? `${sensor.system} (${sensor.freqBand})` : sensor.system ?? 'Unknown';
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

  setHover(i: number): void {
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
    const isLastHoverNeedsUpdate = this.lasthoveringSat !== -1 && this.lasthoveringSat !== primarySatId;
    const isNewHHoverNeedsUpdate = this.hoveringSat !== -1 && this.hoveringSat !== primarySatId;

    this.setHoverDotColor_(gl, isLastHoverNeedsUpdate, isNewHHoverNeedsUpdate, colorSchemeManagerInstance);
    this.setHoverDotSize_(gl, isLastHoverNeedsUpdate, isNewHHoverNeedsUpdate);

    this.lasthoveringSat = this.hoveringSat;
  }

  private setHoverDotColor_(gl: WebGL2RenderingContext, isLastHoverNeedsUpdate: boolean, isNewHHoverNeedsUpdate: boolean, colorSchemeManagerInstance: ColorSchemeManager) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    // If Old Select Sat Picked Color it Correct Color
    if (isLastHoverNeedsUpdate) {
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
    if (isNewHHoverNeedsUpdate) {
      gl.bufferSubData(gl.ARRAY_BUFFER, this.hoveringSat * 4 * 4, new Float32Array(settingsManager.hoverColor));
    }
  }

  private setHoverDotSize_(gl: WebGL2RenderingContext, isLastHoverNeedsUpdate: boolean, isNewHHoverNeedsUpdate: boolean) {
    const dotsManagerInstance = keepTrackApi.getDotsManager();

    if (isLastHoverNeedsUpdate) {
      dotsManagerInstance.sizeData[this.lasthoveringSat] = dotsManagerInstance.getSize(this.lasthoveringSat);
      gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.buffers.size);
      gl.bufferSubData(gl.ARRAY_BUFFER, this.lasthoveringSat, new Int8Array([dotsManagerInstance.sizeData[this.lasthoveringSat]]));
    }

    if (isNewHHoverNeedsUpdate) {
      gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.buffers.size);
      gl.bufferSubData(gl.ARRAY_BUFFER, this.hoveringSat, new Int8Array([1.0]));
    }
  }
}
