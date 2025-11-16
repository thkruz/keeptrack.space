import {
  DetailedSatellite,
  DetailedSatelliteParams,
  EciVec3,
  FormatTle,
  KilometersPerSecond,
  SatelliteRecord,
  Sgp4,
  StateVectorToKeplerian,
  Tle,
} from '@ootk/src/main';
import databasePng from '@public/img/icons/database.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';

import { SatMath } from '@app/app/analysis/sat-math';
import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { t7e } from '@app/locales/keys';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';

/**
 * Interface for parsed STK.e ephemeris data
 */
interface StkeEphemerisData {
  name: string;
  scc: string;
  epoch: Date;
  position: EciVec3;
  velocity: EciVec3<KilometersPerSecond>;
  referenceFrame?: string;
}

/**
 * STKe Reader Plugin for importing STK.e ephemeris files
 */
export class StkeReaderPlugin extends KeepTrackPlugin {
  readonly id = 'StkeReaderPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  isRequireSatelliteSelected = false;
  isIconDisabledOnLoad = false;
  isIconDisabled = false;

  bottomIconElementName = 'stke-reader-icon';
  bottomIconImg = databasePng;
  sideMenuElementName = 'stke-reader-menu';

  /**
   * HTML template for the side menu
   */
  sideMenuElementHtml = html`
    <div id="stke-reader-menu" class="side-menu-parent start-hidden text-select">
      <div id="stke-reader-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Import STK.e File</h5>
          <div class="row">
            <div class="col s12">
              <p>Upload an STK.e ephemeris file to automatically create a satellite object.</p>
              <p class="center-align">
                <button id="stke-reader-upload-btn" class="btn btn-ui waves-effect waves-light">
                  Select STK.e File &#9658;
                </button>
              </p>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="90000" id="stke-reader-scc" type="text" maxlength="5" />
              <label for="stke-reader-scc" class="active">Satellite NORAD ID (90000-99999)</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="New Satellite" id="stke-reader-name" type="text" maxlength="24" />
              <label for="stke-reader-name" class="active">Satellite Name</label>
            </div>
          </div>
          <div id="stke-reader-info" class="row" style="display: none;">
            <div class="col s12">
              <h6>File Information:</h6>
              <p id="stke-reader-info-text"></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  private parsedData_: StkeEphemerisData | null = null;

  /**
   * Add HTML and register events
   */
  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  /**
   * Initialize all event listeners for the UI
   */
  private uiManagerFinal_(): void {
    getEl('stke-reader-upload-btn')?.addEventListener('click', this.onUploadClick_.bind(this));
  }

  /**
   * Handle upload button click
   */
  private onUploadClick_(): void {
    if (isThisNode()) {
      return;
    }

    const input = document.createElement('input');

    input.type = 'file';
    input.accept = '.e,.txt';

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;

      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        const reader = new FileReader();

        reader.onload = (event: ProgressEvent<FileReader>) => {
          if (event.target && typeof event.target.result === 'string') {
            try {
              this.parsedData_ = this.parseStkeFile_(event.target.result);
              this.displayFileInfo_(this.parsedData_);
              this.createSatelliteFromStke_(this.parsedData_);
            } catch (error) {
              errorManagerInstance.error(error as Error, 'stke-reader.ts', 'Error parsing STK.e file');
              ServiceLocator.getUiManager().toast('Failed to parse STK.e file. Please check the file format.', ToastMsgType.error, true);
            }
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }

  /**
   * Parse STK.e file format
   * STK.e files contain ephemeris data with position and velocity vectors
   */
  private parseStkeFile_(content: string): StkeEphemerisData {
    const lines = content.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

    let referenceFrame = 'J2000';
    let epoch: Date | null = null;
    let position: EciVec3 | null = null;
    let velocity: EciVec3<KilometersPerSecond> | null = null;
    let name = 'Unknown Satellite';

    // Parse the file line by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for coordinate system definition
      if (line.includes('CoordinateSystem')) {
        const match = line.match(/CoordinateSystem\s+(\S+)/);

        if (match) {
          referenceFrame = match[1];
        }
      }

      // Look for epoch time (ISO format or custom format)
      if (line.match(/^\d{1,2}\s+\w{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\.\d+/)) {
        // Format: "1 Jan 2024 12:00:00.000"
        epoch = new Date(line);
      } else if (line.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        // ISO format
        epoch = new Date(line);
      }

      // Look for state vector data (position and velocity)
      // Typical format: epoch x y z vx vy vz
      const stateVectorMatch = line.match(/^([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)/);

      if (stateVectorMatch) {
        // First value is typically epoch seconds
        const [, , x, y, z, vx, vy, vz] = stateVectorMatch;

        position = {
          x: parseFloat(x),
          y: parseFloat(y),
          z: parseFloat(z),
        } as EciVec3;

        velocity = {
          x: parseFloat(vx),
          y: parseFloat(vy),
          z: parseFloat(vz),
        } as EciVec3<KilometersPerSecond>;
      }

      // Alternative format: separate lines for position and velocity
      if (line.toLowerCase().includes('ephemeristimedatapos')) {
        // Next line should have position data
        if (i + 1 < lines.length) {
          const posMatch = lines[i + 1].match(/([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)/);

          if (posMatch) {
            const [, epochSec, x, y, z] = posMatch;

            if (!epoch) {
              // Convert epoch seconds to date (assuming J2000 epoch)
              const j2000Epoch = new Date('2000-01-01T12:00:00Z');

              epoch = new Date(j2000Epoch.getTime() + parseFloat(epochSec) * 1000);
            }

            position = {
              x: parseFloat(x),
              y: parseFloat(y),
              z: parseFloat(z),
            } as EciVec3;
          }
        }
      }

      if (line.toLowerCase().includes('ephemeristimedatavel')) {
        // Next line should have velocity data
        if (i + 1 < lines.length) {
          const velMatch = lines[i + 1].match(/([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)/);

          if (velMatch) {
            const [, , vx, vy, vz] = velMatch;

            velocity = {
              x: parseFloat(vx),
              y: parseFloat(vy),
              z: parseFloat(vz),
            } as EciVec3<KilometersPerSecond>;
          }
        }
      }
    }

    // Validate that we have all required data
    if (!epoch || !position || !velocity) {
      throw new Error('Could not find required ephemeris data (epoch, position, velocity) in STK.e file');
    }

    // Get satellite name and SCC from UI
    const sccInput = getEl('stke-reader-scc') as HTMLInputElement;
    const nameInput = getEl('stke-reader-name') as HTMLInputElement;

    return {
      name: nameInput?.value || name,
      scc: sccInput?.value || '90000',
      epoch,
      position,
      velocity,
      referenceFrame,
    };
  }

  /**
   * Display file information in the UI
   */
  private displayFileInfo_(data: StkeEphemerisData): void {
    const infoDiv = getEl('stke-reader-info');
    const infoText = getEl('stke-reader-info-text');

    if (infoDiv && infoText) {
      infoText.innerHTML = `
        <strong>Epoch:</strong> ${data.epoch.toISOString()}<br>
        <strong>Position (km):</strong> [${data.position.x.toFixed(3)}, ${data.position.y.toFixed(3)}, ${data.position.z.toFixed(3)}]<br>
        <strong>Velocity (km/s):</strong> [${data.velocity.x.toFixed(6)}, ${data.velocity.y.toFixed(6)}, ${data.velocity.z.toFixed(6)}]<br>
        <strong>Reference Frame:</strong> ${data.referenceFrame || 'Unknown'}
      `;
      infoDiv.style.display = 'block';
    }
  }

  /**
   * Create a satellite from STK.e ephemeris data
   */
  private createSatelliteFromStke_(data: StkeEphemerisData): void {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    try {
      // Convert state vector to classical orbital elements
      const keplerianElements = StateVectorToKeplerian.fromStateVector(data.position, data.velocity);

      // Convert SCC to internal ID
      const satId = catalogManagerInstance.sccNum2Id(parseInt(data.scc)) ?? -1;
      const obj = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY);

      if (!obj?.isSatellite()) {
        ServiceLocator.getUiManager().toast('Invalid satellite object', ToastMsgType.error, true);

        return;
      }

      const sat = obj as DetailedSatellite;

      // Create epoch parameters for TLE
      const year = data.epoch.getFullYear();
      const epochyr = year.toString().slice(2, 4);
      const startOfYear = new Date(year, 0, 1);
      const diff = data.epoch.getTime() - startOfYear.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay) + 1;
      const timeOfDay = (diff % oneDay) / oneDay;
      const epochday = (dayOfYear + timeOfDay).toFixed(8).padStart(12, '0');

      // Convert orbital elements to TLE format
      const inc = keplerianElements.inclination.toFixed(4).padStart(8, '0');
      const rasc = keplerianElements.rightAscension.toFixed(4).padStart(8, '0');
      const ecen = (keplerianElements.eccentricity * 10000000).toFixed(0).padStart(7, '0');
      const argPe = keplerianElements.argOfPerigee.toFixed(4).padStart(8, '0');
      const meana = keplerianElements.trueAnomaly.toFixed(4).padStart(8, '0'); // Approximation
      const meanmo = keplerianElements.meanMotion.toFixed(5).padStart(8, '0');

      const intl = `${epochyr}69A`; // International designator
      const scc = data.scc.replace(/^0+/u, '');
      const convertedScc = Tle.convert6DigitToA5(scc);

      // Create TLE from parameters
      const { tle1, tle2 } = FormatTle.createTle({
        sat,
        inc,
        meanmo,
        rasc,
        argPe,
        meana,
        ecen,
        epochyr,
        epochday,
        intl,
        scc: convertedScc,
      });

      // Check if TLE generation failed
      if (tle1 === 'Error') {
        errorManagerInstance.warn('Error creating TLE from STK.e data');

        return;
      }

      // Create satellite record from TLE
      let satrec: SatelliteRecord;

      try {
        satrec = Sgp4.createSatrec(tle1, tle2);
      } catch (e) {
        errorManagerInstance.error(e as Error, 'stke-reader.ts', 'Error creating satellite record!');

        return;
      }

      // Validate altitude is reasonable
      if (SatMath.altitudeCheck(satrec, ServiceLocator.getTimeManager().simulationTimeObj) <= 1) {
        ServiceLocator.getUiManager().toast(
          'Failed to propagate satellite. The ephemeris data may be incompatible with TLE format.',
          ToastMsgType.caution,
          true,
        );

        return;
      }

      // Create new satellite object
      const info: DetailedSatelliteParams = {
        id: satId,
        type: 1, // Payload
        country: 'TBD',
        tle1,
        tle2,
        name: data.name,
      };

      const newSat = new DetailedSatellite({
        ...info,
        ...{
          position: data.position,
          velocity: data.velocity,
          source: 'STK.e Import',
        },
      });

      // Add to catalog
      catalogManagerInstance.objectCache[satId] = newSat;

      // Update satellite cruncher
      try {
        catalogManagerInstance.satCruncher.postMessage({
          typ: CruncerMessageTypes.SAT_EDIT,
          active: true,
          id: satId,
          tle1,
          tle2,
        });
      } catch (e) {
        errorManagerInstance.error(e as Error, 'stke-reader.ts', 'Sat Cruncher message failed');
      }

      // Update orbit buffer
      try {
        orbitManagerInstance.changeOrbitBufferData(satId, tle1, tle2);
      } catch (e) {
        errorManagerInstance.error(e as Error, 'stke-reader.ts', 'Changing orbit buffer data failed');
      }

      // Search for the new satellite
      ServiceLocator.getUiManager().doSearch(data.scc);

      // Show success message
      ServiceLocator.getUiManager().toast(
        `Satellite ${data.name} (${data.scc}) created successfully from STK.e file`,
        ToastMsgType.normal,
        true,
      );

    } catch (error) {
      errorManagerInstance.error(error as Error, 'stke-reader.ts', 'Failed to create satellite from STK.e data');
      ServiceLocator.getUiManager().toast(`Failed to create satellite: ${error.message}`, ToastMsgType.error, true);
    }
  }
}
