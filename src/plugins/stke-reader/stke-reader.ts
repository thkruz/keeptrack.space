import {
  DetailedSatellite,
  DetailedSatelliteParams,
  EciVec3,
  FormatTle,
  J2000,
  Kilometers,
  KilometersPerSecond,
  SatelliteRecord,
  Seconds,
  Sgp4,
  StateVectorToKeplerian,
  Tle,
} from '@ootk/src/main';
import databasePng from '@public/img/icons/database.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';

import { ParsedStke, StkeSatellite, StkeDataBlock, StkeHeader, StkeMetadata } from '@app/app/objects/stke-satellite';
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
 * Import mode for STK.e files
 */
enum ImportMode {
  TLE = 'tle',
  EPHEMERIS = 'ephemeris',
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
              <p>Upload an STK.e ephemeris file to create a satellite object.</p>
              <p class="center-align">
                <button id="stke-reader-upload-btn" class="btn btn-ui waves-effect waves-light">
                  Select STK.e File &#9658;
                </button>
              </p>
            </div>
          </div>
          <div class="row">
            <div class="col s12">
              <h6>Import Mode:</h6>
              <p>
                <label>
                  <input name="stke-import-mode" type="radio" id="stke-mode-ephemeris" value="ephemeris" checked />
                  <span>Ephemeris Mode (Preserves all ephemeris data, recommended)</span>
                </label>
              </p>
              <p>
                <label>
                  <input name="stke-import-mode" type="radio" id="stke-mode-tle" value="tle" />
                  <span>TLE Mode (Converts to orbital elements, may lose accuracy)</span>
                </label>
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

  private parsedData_: ParsedStke | null = null;

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
   * Parse STK.e file format and extract all ephemeris data
   * STK.e files contain ephemeris data with position and velocity vectors
   */
  private parseStkeFile_(content: string): ParsedStke {
    const lines = content.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

    // Initialize data structures
    let referenceFrame = 'J2000';
    let timeSystem = 'UTC';
    let centerName: 'EARTH' | 'MARS BARYCENTER' | 'MOON' = 'EARTH';
    let coordinateSystem = 'ICRF';
    let distanceUnit = 'km';
    let interpolationDegree = 7;
    let objectName = 'Unknown Satellite';
    const ephemerisPoints: J2000[] = [];
    const comments: string[] = [];
    let startTime: Date | null = null;
    let stopTime: Date | null = null;

    // Parse the file line by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for coordinate system definition
      if (line.toLowerCase().includes('coordinatesystem')) {
        const match = line.match(/CoordinateSystem[\s=]+(\S+)/i);

        if (match) {
          coordinateSystem = match[1];
          referenceFrame = match[1];
        }
      }

      // Look for central body
      if (line.toLowerCase().includes('centralbody')) {
        const match = line.match(/CentralBody[\s=]+(\S+)/i);

        if (match) {
          const body = match[1].toUpperCase();

          if (body === 'MARS') {
            centerName = 'MARS BARYCENTER';
          } else if (body === 'MOON') {
            centerName = 'MOON';
          } else {
            centerName = 'EARTH';
          }
        }
      }

      // Look for interpolation degree
      if (line.toLowerCase().includes('interpolationdegree')) {
        const match = line.match(/InterpolationDegree[\s=]+(\d+)/i);

        if (match) {
          interpolationDegree = parseInt(match[1], 10);
        }
      }

      // Look for distance unit
      if (line.toLowerCase().includes('distanceunit')) {
        const match = line.match(/DistanceUnit[\s=]+(\S+)/i);

        if (match) {
          distanceUnit = match[1].toLowerCase();
        }
      }

      // Look for comments
      if (line.toLowerCase().startsWith('comment')) {
        comments.push(line.substring(7).trim());
      }

      // Look for state vector data (position and velocity combined)
      // Format: epoch x y z vx vy vz
      const stateVectorMatch = line.match(/^([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)/);

      if (stateVectorMatch) {
        const [, epochSec, x, y, z, vx, vy, vz] = stateVectorMatch;

        // Parse epoch - assuming seconds from J2000
        const j2000Epoch = new Date('2000-01-01T12:00:00Z');
        const epoch = new Date(j2000Epoch.getTime() + parseFloat(epochSec) * 1000);

        // Convert to appropriate units if needed
        let posX = parseFloat(x);
        let posY = parseFloat(y);
        let posZ = parseFloat(z);

        if (distanceUnit === 'm' || distanceUnit === 'meters') {
          posX /= 1000;
          posY /= 1000;
          posZ /= 1000;
        }

        const stateVector = new J2000(
          epoch as unknown as Seconds,
          {
            x: posX as Kilometers,
            y: posY as Kilometers,
            z: posZ as Kilometers,
          },
          {
            x: parseFloat(vx) as KilometersPerSecond,
            y: parseFloat(vy) as KilometersPerSecond,
            z: parseFloat(vz) as KilometersPerSecond,
          },
        );

        ephemerisPoints.push(stateVector);

        if (!startTime || epoch < startTime) {
          startTime = epoch;
        }
        if (!stopTime || epoch > stopTime) {
          stopTime = epoch;
        }
      }

      // Alternative format: EphemerisTimePosVel blocks
      if (line.toLowerCase().includes('ephemeristimeposvel')) {
        // Next lines contain epoch x y z vx vy vz
        let j = i + 1;

        while (j < lines.length) {
          const dataLine = lines[j];
          const match = dataLine.match(/^([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)/);

          if (match) {
            const [, epochSec, x, y, z, vx, vy, vz] = match;
            const j2000Epoch = new Date('2000-01-01T12:00:00Z');
            const epoch = new Date(j2000Epoch.getTime() + parseFloat(epochSec) * 1000);

            let posX = parseFloat(x);
            let posY = parseFloat(y);
            let posZ = parseFloat(z);

            if (distanceUnit === 'm' || distanceUnit === 'meters') {
              posX /= 1000;
              posY /= 1000;
              posZ /= 1000;
            }

            const stateVector = new J2000(
              epoch as unknown as Seconds,
              {
                x: posX as Kilometers,
                y: posY as Kilometers,
                z: posZ as Kilometers,
              },
              {
                x: parseFloat(vx) as KilometersPerSecond,
                y: parseFloat(vy) as KilometersPerSecond,
                z: parseFloat(vz) as KilometersPerSecond,
              },
            );

            ephemerisPoints.push(stateVector);

            if (!startTime || epoch < startTime) {
              startTime = epoch;
            }
            if (!stopTime || epoch > stopTime) {
              stopTime = epoch;
            }

            j++;
          } else {
            break;
          }
        }
        i = j - 1;
      }
    }

    // Validate that we have ephemeris data
    if (ephemerisPoints.length === 0) {
      throw new Error('No ephemeris data found in STK.e file');
    }

    if (!startTime || !stopTime) {
      throw new Error('Could not determine start/stop times from ephemeris data');
    }

    // Get satellite name from UI
    const nameInput = getEl('stke-reader-name') as HTMLInputElement;

    if (nameInput?.value) {
      objectName = nameInput.value;
    }

    // Create header
    const header: StkeHeader = {
      START_TIME: startTime,
      STOP_TIME: stopTime,
      COMMENT: comments.length > 0 ? comments : undefined,
      COORDINATE_SYSTEM: coordinateSystem,
      DISTANCE_UNIT: distanceUnit,
    };

    // Create metadata
    const metadata: StkeMetadata = {
      OBJECT_NAME: objectName,
      CENTER_NAME: centerName,
      REF_FRAME: referenceFrame,
      TIME_SYSTEM: timeSystem,
      START_TIME: startTime.toISOString(),
      STOP_TIME: stopTime.toISOString(),
      INTERPOLATION_DEGREE: interpolationDegree,
      COMMENT: comments.length > 0 ? comments : undefined,
    };

    // Create data block
    const dataBlock: StkeDataBlock = {
      metadata,
      ephemeris: ephemerisPoints,
    };

    return {
      header,
      dataBlocks: [dataBlock],
    };
  }

  /**
   * Display file information in the UI
   */
  private displayFileInfo_(data: ParsedStke): void {
    const infoDiv = getEl('stke-reader-info');
    const infoText = getEl('stke-reader-info-text');

    if (infoDiv && infoText) {
      const totalPoints = data.dataBlocks.reduce((sum, block) => sum + block.ephemeris.length, 0);
      const firstBlock = data.dataBlocks[0];
      const firstPoint = firstBlock.ephemeris[0];
      const lastPoint = firstBlock.ephemeris[firstBlock.ephemeris.length - 1];

      infoText.innerHTML = `
        <strong>Object Name:</strong> ${firstBlock.metadata.OBJECT_NAME}<br>
        <strong>Reference Frame:</strong> ${firstBlock.metadata.REF_FRAME}<br>
        <strong>Center Body:</strong> ${firstBlock.metadata.CENTER_NAME}<br>
        <strong>Total Ephemeris Points:</strong> ${totalPoints}<br>
        <strong>Start Time:</strong> ${data.header.START_TIME.toISOString()}<br>
        <strong>Stop Time:</strong> ${data.header.STOP_TIME.toISOString()}<br>
        <strong>Duration:</strong> ${((data.header.STOP_TIME.getTime() - data.header.START_TIME.getTime()) / 3600000).toFixed(2)} hours<br>
        <strong>First Position (km):</strong> [${firstPoint.position.x.toFixed(3)}, ${firstPoint.position.y.toFixed(3)}, ${firstPoint.position.z.toFixed(3)}]<br>
        <strong>Last Position (km):</strong> [${lastPoint.position.x.toFixed(3)}, ${lastPoint.position.y.toFixed(3)}, ${lastPoint.position.z.toFixed(3)}]
      `;
      infoDiv.style.display = 'block';
    }
  }

  /**
   * Get the selected import mode from the UI
   */
  private getImportMode_(): ImportMode {
    const ephemerisRadio = getEl('stke-mode-ephemeris') as HTMLInputElement;

    return ephemerisRadio?.checked ? ImportMode.EPHEMERIS : ImportMode.TLE;
  }

  /**
   * Create a satellite from STK.e ephemeris data
   */
  private createSatelliteFromStke_(data: ParsedStke): void {
    const mode = this.getImportMode_();

    if (mode === ImportMode.EPHEMERIS) {
      this.createEphemerisSatellite_(data);
    } else {
      this.createTleSatellite_(data);
    }
  }

  /**
   * Create a StkeSatellite object that preserves all ephemeris data
   */
  private createEphemerisSatellite_(data: ParsedStke): void {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    try {
      // Get satellite configuration from UI
      const sccInput = getEl('stke-reader-scc') as HTMLInputElement;
      const scc = sccInput?.value || '90000';

      // Convert SCC to internal ID
      const satId = catalogManagerInstance.sccNum2Id(parseInt(scc)) ?? -1;

      // Create StkeSatellite object
      const stkeSat = new StkeSatellite(data);

      stkeSat.id = satId;
      stkeSat.sccNum = parseInt(scc);

      // Add to catalog
      catalogManagerInstance.objectCache[satId] = stkeSat;

      // Search for the new satellite
      ServiceLocator.getUiManager().doSearch(scc);

      // Show success message
      ServiceLocator.getUiManager().toast(
        `Satellite ${data.dataBlocks[0].metadata.OBJECT_NAME} (${scc}) created successfully with ${data.dataBlocks[0].ephemeris.length} ephemeris points`,
        ToastMsgType.normal,
        true,
      );

    } catch (error) {
      errorManagerInstance.error(error as Error, 'stke-reader.ts', 'Failed to create ephemeris satellite from STK.e data');
      ServiceLocator.getUiManager().toast(`Failed to create satellite: ${error.message}`, ToastMsgType.error, true);
    }
  }

  /**
   * Create a DetailedSatellite object by converting the first ephemeris point to TLE
   */
  private createTleSatellite_(data: ParsedStke): void {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    try {
      // Use the first ephemeris point for TLE conversion
      const firstPoint = data.dataBlocks[0].ephemeris[0];
      const position: EciVec3 = {
        x: firstPoint.position.x,
        y: firstPoint.position.y,
        z: firstPoint.position.z,
      } as EciVec3;
      const velocity: EciVec3<KilometersPerSecond> = {
        x: firstPoint.velocity.x,
        y: firstPoint.velocity.y,
        z: firstPoint.velocity.z,
      } as EciVec3<KilometersPerSecond>;

      // Convert state vector to classical orbital elements
      const keplerianElements = StateVectorToKeplerian.fromStateVector(position, velocity);

      // Get satellite configuration from UI
      const sccInput = getEl('stke-reader-scc') as HTMLInputElement;
      const scc = sccInput?.value || '90000';

      // Convert SCC to internal ID
      const satId = catalogManagerInstance.sccNum2Id(parseInt(scc)) ?? -1;
      const obj = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY);

      if (!obj?.isSatellite()) {
        ServiceLocator.getUiManager().toast('Invalid satellite object', ToastMsgType.error, true);

        return;
      }

      const sat = obj as DetailedSatellite;

      // Create epoch parameters for TLE
      const epoch = new Date(firstPoint.epoch.toDateTime());
      const year = epoch.getFullYear();
      const epochyr = year.toString().slice(2, 4);
      const startOfYear = new Date(year, 0, 1);
      const diff = epoch.getTime() - startOfYear.getTime();
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
      const sccStr = scc.replace(/^0+/u, '');
      const convertedScc = Tle.convert6DigitToA5(sccStr);

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
          'Failed to propagate satellite. The ephemeris data may be incompatible with TLE format. Try using Ephemeris Mode instead.',
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
        name: data.dataBlocks[0].metadata.OBJECT_NAME,
      };

      const newSat = new DetailedSatellite({
        ...info,
        ...{
          position,
          velocity,
          source: 'STK.e Import (TLE Mode)',
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
      ServiceLocator.getUiManager().doSearch(scc);

      // Show success message
      ServiceLocator.getUiManager().toast(
        `Satellite ${data.dataBlocks[0].metadata.OBJECT_NAME} (${scc}) created successfully from STK.e file (TLE mode)`,
        ToastMsgType.normal,
        true,
      );

    } catch (error) {
      errorManagerInstance.error(error as Error, 'stke-reader.ts', 'Failed to create TLE satellite from STK.e data');
      ServiceLocator.getUiManager().toast(`Failed to create satellite: ${error.message}`, ToastMsgType.error, true);
    }
  }
}
