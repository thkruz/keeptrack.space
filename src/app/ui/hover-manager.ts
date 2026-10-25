import { country2flagIcon } from '@app/app/data/catalogs/countries';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { CameraType } from '@app/engine/camera/camera-type';
import { SolarBody } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { DotStatus } from '@app/engine/rendering/dots-shaders-base';
import { CelestialBody } from '@app/engine/rendering/draw-manager/celestial-bodies/celestial-body';
import { html } from '@app/engine/utils/development/formatter';
import { t7e } from '@app/locales/keys';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { KM_PER_AU, LandObject, Satellite, SpaceObjectType, Star, spaceObjType2Str } from '@ootk/src/main';
import i18next from 'i18next';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { getEl } from '../../engine/utils/get-el';
import { LaunchSite } from '../data/catalog-manager/LaunchFacility';
import { MissileObject } from '../data/catalog-manager/MissileObject';
import { isSyntheticVimpel } from '../data/synthetic-vimpel';
import { OemSatellite } from '../objects/oem-satellite';
import { Planet as PlanetDot } from '../objects/planet';
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
        this.setHoverId(ServiceLocator.getInputManager().mouse.mouseSat, ServiceLocator.getMainCamera().state.mouseX, ServiceLocator.getMainCamera().state.mouseY);
      }
    });
  }

  /**
   * Update orbits and overlays for the satellite being hovered over
   */
  setHoverId(id: number, mouseX?: number, mouseY?: number) {
    // If this isn't a thing or the context menu is open then don't do anything
    if (id === this.currentHoverId || ServiceLocator.getInputManager().isRmbMenuOpen) {
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

  private controlFacility_(obj: LandObject | LaunchSite) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    this.satHoverBoxNode1.textContent = obj.name;
    this.satHoverBoxNode2.innerHTML = `${obj.country + SensorMath.distanceString(obj, catalogManagerInstance.getObject(ServiceLocator.getSensorManager().currentSensors[0]?.id) as DetailedSensor)}`;
    this.satHoverBoxNode3.textContent = '';
    this.satHoverBoxNode3.style.display = 'none';
  }

  private planet_(planetDot: PlanetDot) {
    const planetEntity = ServiceLocator.getScene().getBodyById(planetDot.name as SolarBody);

    if (!planetEntity) {
      return;
    }

    const orbitInSeconds = planetEntity.orbitalPeriod;
    const orbitPeriodInEarthDays = orbitInSeconds / 86400;

    this.satHoverBoxNode1.textContent = `${planetDot.name} - (${planetEntity.typeToString()})`;
    this.satHoverBoxNode2.textContent = HoverManager.bodyDistanceText_(planetEntity);
    this.satHoverBoxNode2.style.display = this.satHoverBoxNode2.textContent ? 'block' : 'none';

    if (!Number.isFinite(orbitPeriodInEarthDays)) {
      this.satHoverBoxNode3.textContent = '';
      this.satHoverBoxNode3.style.display = 'none';
    } else if (orbitPeriodInEarthDays < 1_000) {
      this.satHoverBoxNode3.textContent = t7e('hoverManager.orbitPeriodDays').replace('{days}', orbitPeriodInEarthDays.toFixed(1));
    } else {
      this.satHoverBoxNode3.textContent = t7e('hoverManager.orbitPeriodYears').replace('{years}', (orbitPeriodInEarthDays / 365.25).toFixed(2));
    }
  }

  /**
   * How far the body sits from whatever it orbits.
   *
   * A moon has no `meanDistanceToSun` - it is not a useful number for one, and reading it
   * printed "Distance from Sun: NaN AU (NaN million km)" on every moon in the hover box - so
   * moons report their orbital radius about their parent instead. The finite guard covers any
   * body that ends up with neither, which is better than putting NaN on screen.
   */
  private static bodyDistanceText_(body: Pick<CelestialBody, 'meanDistanceToSun' | 'parentBody' | 'semiMajorAxisKm'>): string {
    const { parentBody, semiMajorAxisKm } = body;

    if (parentBody && Number.isFinite(semiMajorAxisKm)) {
      return t7e('hoverManager.distanceFromParent')
        .replace('{parent}', parentBody)
        .replace('{km}', Math.round(semiMajorAxisKm as number).toLocaleString());
    }

    const distanceFromSunInAU = body.meanDistanceToSun / KM_PER_AU;

    if (!Number.isFinite(distanceFromSunInAU)) {
      return '';
    }

    return t7e('hoverManager.distanceFromSun')
      .replace('{au}', distanceFromSunInAU.toFixed(2))
      .replace('{mkm}', (body.meanDistanceToSun / 1000000).toFixed(2));
  }

  private star_(star: Star): void {
    const name =
      star.pname ||
      (star.bayer && star.constellation ? `${star.bayer} ${star.constellation}` : '') ||
      (star.flamsteed && star.constellation ? `${star.flamsteed} ${star.constellation}` : '') ||
      (star.hr ? `HR ${star.hr}` : star.name);

    this.satHoverBoxNode1.textContent = name;
    this.satHoverBoxNode2.textContent = star.constellation ? `${star.constellation} · Mag ${star.vmag?.toFixed(2) ?? '?'}` : `Mag ${star.vmag?.toFixed(2) ?? '?'}`;
    this.satHoverBoxNode3.textContent = star.colorTemp ? `${star.colorTemp.toLocaleString()}K` : '';
  }

  private hoverOverNothing_() {
    this.satHoverBoxDOM = <HTMLDivElement>(<unknown>getEl('sat-hoverbox'));
    if (this.satHoverBoxDOM.style.display === 'none' || !settingsManager.enableHoverOverlay) {
      return false;
    }
    const renderer = ServiceLocator.getRenderer();

    this.satHoverBoxDOM.style.display = 'none';
    renderer.setCursor('default');

    return true;
  }

  private hoverOverSomething_(id: number, screenX?: number, screenY?: number) {
    if (!ServiceLocator.getMainCamera().state.isDragging && settingsManager.enableHoverOverlay) {
      // NOTE: The radar mesurement logic breaks if you call it a SatObject

      const catalogManagerInstance = ServiceLocator.getCatalogManager();
      const renderer = ServiceLocator.getRenderer();

      const obj = catalogManagerInstance.getObject(id);

      if (!obj) {
        errorManagerInstance.log('HoverManager: hoverOverSomething_ no object found');

        return;
      }

      // In polar view, getScreenCoords projects ECI positions which don't match
      // the shader-transformed polar positions — use the mouse position directly.
      const isPolarView = ServiceLocator.getMainCamera().cameraType === CameraType.POLAR_VIEW;

      if (!isPolarView || typeof screenX === 'undefined' || typeof screenY === 'undefined') {
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

        screenX ??= satScreenPositionArray.x;
        screenY ??= satScreenPositionArray.y;
      }

      this.init();

      if (obj.isMissile()) {
        this.missile_(obj as MissileObject);
      } else if (obj.isSatellite()) {
        this.satObj_(obj as Satellite);
      } else {
        this.staticObj_(obj as LandObject);
      }

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
    this.satHoverBoxNode1.textContent = launchSite.name ?? t7e('hoverManager.unknownLaunchSite');
    this.satHoverBoxNode2.textContent = launchSite.site ?? t7e('hoverManager.unknownSite');
    this.satHoverBoxNode3.textContent = launchSite.country ?? t7e('hoverManager.unknownCountry');
  }

  private launchFacility_(landObj: LandObject | LaunchSite) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    const launchSite = StringExtractor.extractLaunchSite(landObj.name);

    this.satHoverBoxNode1.textContent = `${launchSite.site}, ${launchSite.country}`;
    this.satHoverBoxNode2.innerHTML = `${
      spaceObjType2Str(landObj.type) +
      SensorMath.distanceString(landObj, catalogManagerInstance.getObject(ServiceLocator.getSensorManager().currentSensors[0]?.id) as DetailedSensor)
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

  private satObj_(sat: Satellite) {
    if (!settingsManager.enableHoverOverlay) {
      return;
    }
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    // Use this as a default if no UI
    if (settingsManager.disableUI || settingsManager.isEPFL) {
      this.updateSatObjMinimal_(sat);
    } else {
      let confidenceScoreString = '';
      let color: string = 'black';

      if (settingsManager.isShowConfidenceLevels) {
        const confidenceScore = Number.parseInt(sat.tle1.substring(64, 65)) || 0;

        if (confidenceScore >= 7) {
          color = 'green';
        } else if (confidenceScore >= 4) {
          color = 'orange';
        } else {
          color = 'red';
        }

        confidenceScoreString = ` (${confidenceScore.toString()})`;

        if (settingsManager.dataSources.externalTLEsOnly) {
          confidenceScoreString = ` (${t7e('hoverManager.external')})`;
          color = 'gray';
        }
      }

      this.satHoverBoxNode1.innerHTML = html`
        <span id="hoverbox-fi"></span>
        <span>${sat.name}</span>
        <span style='color:${color};'>${confidenceScoreString}</span>
      `;

      getEl('hoverbox-fi')!.classList.value = `fi ${country2flagIcon(sat.country)}`;

      // Synthetic JSC Vimpel objects carry a placeholder catalog number ("0").
      if (sat.sccNum && !isSyntheticVimpel(sat)) {
        this.satHoverBoxNode2.textContent = `NORAD: ${sat.sccNum}`;
      } else {
        this.satHoverBoxNode2.textContent = HoverManager.getLaunchYear(sat);
      }

      if (sensorManagerInstance.isSensorSelected() && settingsManager.isShowNextPass) {
        this.satHoverBoxNode3.textContent = SensorMath.nextpass(sat);
      } else if (settingsManager.isEciOnHover) {
        this.showEciVel_(sat);
      } else if (!isSyntheticVimpel(sat) && sat.sccNum) {
        // Without an sccNum, line 2 already shows the launch line; repeating it read "Launched: Planned" twice.
        this.satHoverBoxNode3.textContent = HoverManager.getLaunchYear(sat);
      } else {
        this.satHoverBoxNode3.textContent = '';
        this.satHoverBoxNode3.style.display = 'none';
      }
    }
  }

  private updateSatObjMinimal_(sat: Satellite) {
    this.satHoverBoxNode1.textContent = sat.name;
    this.satHoverBoxNode2.textContent = settingsManager.isEPFL ? HoverManager.getLaunchYear(sat) : sat.sccNum;
    let country = StringExtractor.extractCountry(sat.country);

    country = country.length > 0 ? country : t7e('Common.unknown');
    this.satHoverBoxNode3.textContent = country;

    this.satHoverBoxNode3.innerHTML = html`
        <span id="hoverbox-fi"></span>
        <span>${country}</span>
      `;

    getEl('hoverbox-fi')!.classList.value = `fi ${country2flagIcon(sat.country)}`;
  }

  private static getLaunchYear(sat: Satellite) {
    if (sat instanceof OemSatellite) {
      // OEM objects default to NOTIONAL, but they are flown or flying spacecraft (Lucy launched in 2021),
      // never "planned". Use a real international designator when the file carries one.
      const designatorYear = /^(?<year>\d{4})-\d{3}/u.exec(sat.intlDes)?.groups?.year;

      return designatorYear ? HoverManager.launchedText_(designatorYear) : t7e('hoverManager.launchedUnknown');
    }
    if (sat.type === SpaceObjectType.NOTIONAL) {
      return t7e('hoverManager.launchedPlanned');
    }
    // Synthetic JSC Vimpel objects have no COSPAR ID; real ones on a Vimpel elset keep theirs.
    if (isSyntheticVimpel(sat) || !sat.intlDes) {
      return t7e('hoverManager.launchedUnknown');
    }

    const launchYear = Number.parseInt(sat.intlDes.slice(2, 4));

    if (launchYear >= 0 && launchYear < 57) {
      return HoverManager.launchedText_(`20${launchYear.toString().padStart(2, '0')}`);
    } else if (launchYear >= 57 && launchYear < 100) {
      return HoverManager.launchedText_(`19${launchYear.toString().padStart(2, '0')}`);
    }

    return t7e('hoverManager.launchedUnknown');
  }

  /** "Launched: 2021" (Chinese runs the label into the year with no separator). */
  private static launchedText_(year: string): string {
    return i18next.language === 'zh' ? `${t7e('hoverManager.launched')}${year}` : `${t7e('hoverManager.launched')}: ${year}`;
  }

  private showEciVel_(sat: Satellite) {
    this.satHoverBoxNode3.innerHTML = `
      <div style="display: flex; gap: 32px;">
        <div>
          <strong>${t7e('hoverManager.position')}</strong>
          <ul style="margin:0; padding-left:16px;">
          <li>X: ${sat.position.x.toFixed(2)} km</li>
          <li>Y: ${sat.position.y.toFixed(2)} km</li>
          <li>Z: ${sat.position.z.toFixed(2)} km</li>
          </ul>
        </div>
        <div>
          <strong>${t7e('hoverManager.velocity')}</strong>
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

    if (id === -1) {
      this.hoverOverNothing_();
    } else {
      this.hoverOverSomething_(id, satX, satY);
    }
  }

  private staticObj_(obj: DetailedSensor | LandObject | LaunchSite | Star) {
    if (obj.type === SpaceObjectType.LAUNCH_SITE) {
      this.launchSite_(obj as LaunchSite);
    } else if (obj.type === SpaceObjectType.LAUNCH_FACILITY) {
      this.launchFacility_(obj as LaunchSite);
    } else if (obj.type === SpaceObjectType.CONTROL_FACILITY) {
      this.controlFacility_(obj as LaunchSite);
    } else if (
      obj.type === SpaceObjectType.TERRESTRIAL_PLANET ||
      obj.type === SpaceObjectType.GAS_GIANT ||
      obj.type === SpaceObjectType.ICE_GIANT ||
      obj.type === SpaceObjectType.DWARF_PLANET ||
      obj.type === SpaceObjectType.ASTEROID ||
      obj.type === SpaceObjectType.MOON
    ) {
      this.planet_(obj as unknown as PlanetDot);
    } else if (obj.type === SpaceObjectType.STAR) {
      this.star_(obj as Star);
    } else {
      // It is a Sensor at this point
      const sensor = obj as DetailedSensor;

      this.satHoverBoxNode1.textContent = sensor.name;
      const isTelescope = sensor.type === SpaceObjectType.OPTICAL;

      this.satHoverBoxNode2.textContent = sensor.country ?? t7e('Common.unknown');
      this.satHoverBoxNode3.innerHTML = !isTelescope && sensor.freqBand ? `${sensor.system} (${sensor.freqBand})` : (sensor.system ?? t7e('Common.unknown'));
    }
  }

  /**
   * The internal method that actually updates the hover.
   * TODO: Rename this
   */
  private updateHover_(id: number) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    this.currentHoverId = id;

    const obj = catalogManagerInstance.objectCache[id];

    if (id !== -1 && obj && obj.type !== SpaceObjectType.STAR) {
      orbitManagerInstance.setHoverOrbit(id);
    } else {
      orbitManagerInstance.clearHoverOrbit();
    }
    this.setHover(id);
  }

  setHover(i: number): void {
    if (typeof i === 'undefined' || i === null) {
      errorManagerInstance.debug('setHover called with no id');

      return;
    }

    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();
    const gl = ServiceLocator.getRenderer().gl;

    this.hoveringSat = i;
    if (i === this.lasthoveringSat) {
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManagerInstance.colorBuffer);

    const primarySatId = PluginRegistry.getPlugin(SelectSatManager)?.selectedSat;
    const isLastHoverNeedsUpdate = this.lasthoveringSat !== -1 && this.lasthoveringSat !== primarySatId;
    const isNewHHoverNeedsUpdate = this.hoveringSat !== -1 && this.hoveringSat !== primarySatId;

    this.setHoverDotColor_(gl, isLastHoverNeedsUpdate, isNewHHoverNeedsUpdate, colorSchemeManagerInstance);
    this.setHoverDotSize_(gl, isLastHoverNeedsUpdate, isNewHHoverNeedsUpdate);

    this.lasthoveringSat = this.hoveringSat;
  }

  private setHoverDotColor_(gl: WebGL2RenderingContext, isLastHoverNeedsUpdate: boolean, isNewHHoverNeedsUpdate: boolean, colorSchemeManagerInstance: ColorSchemeManager) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    // If Old Select Sat Picked Color it Correct Color
    if (isLastHoverNeedsUpdate) {
      const hoveredSatellite = catalogManagerInstance.getObject(this.lasthoveringSat);

      if (hoveredSatellite) {
        // Todo what if this is a group color scheme?
        const newColor =
          colorSchemeManagerInstance.currentColorScheme?.update(hoveredSatellite).color ?? colorSchemeManagerInstance.currentColorSchemeUpdate(hoveredSatellite).color;

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
    const dotsManagerInstance = ServiceLocator.getDotsManager();

    if (isLastHoverNeedsUpdate) {
      dotsManagerInstance.sizeData[this.lasthoveringSat] = dotsManagerInstance.getSize(this.lasthoveringSat);
      gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.buffers.size);
      gl.bufferSubData(gl.ARRAY_BUFFER, this.lasthoveringSat, new Int8Array([dotsManagerInstance.sizeData[this.lasthoveringSat]]));
    }

    if (isNewHHoverNeedsUpdate) {
      dotsManagerInstance.sizeData[this.hoveringSat] = DotStatus.Hover;
      gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.buffers.size);
      gl.bufferSubData(gl.ARRAY_BUFFER, this.hoveringSat, new Int8Array([DotStatus.Hover]));
    }
  }
}
