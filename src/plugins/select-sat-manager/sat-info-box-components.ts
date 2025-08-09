import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import bookmarkAddPng from '@public/img/icons/bookmark-add.png';
import bookmarkRemovePng from '@public/img/icons/bookmark-remove.png';
import Draggabilly from 'draggabilly';
import { SatInfoBox } from './sat-info-box';
import { SAT_INFO_BOX_CONSTANTS as SIB } from './sat-info-box-constants';

export class SatInfoBoxComponents {
  static createContainer(): void {
    const plugin = keepTrackApi.getPlugin(SatInfoBox)!;

    plugin.addElement({ html: this.createHeader(), order: 0 });
    plugin.addElement({ html: this.createActionsSection(), order: 1 });
    plugin.addElement({ html: this.createLinksSection(), order: 2 });
    plugin.addElement({ html: this.createIdentifiersSection(), order: 3 });
    plugin.addElement({ html: this.createOrbitalSection(), order: 4 });
    plugin.addElement({ html: this.createSensorSection(), order: 5 });
    plugin.addElement({ html: this.createLaunchSection(), order: 6 });
    plugin.addElement({ html: this.createMissionSection(), order: 7 });
    plugin.addElement({ html: this.createSecondarySection(), order: 8 });

    const elements = plugin.getElements();

    getEl('ui-wrapper')?.insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
        <div id="${SIB.CONTAINER_ID}" class="text-select satinfo-fixed start-hidden">
          ${elements
          .toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((el) => el.html ?? '')
          .join('')}
        </div>
      `,
    );

    // Create a Sat Info Box Initializing Script
    SatInfoBoxComponents.initDraggabilly();
  }

  private static initDraggabilly() {
    if (!settingsManager.isMobileModeEnabled) {
      const draggie = new Draggabilly(getEl(SatInfoBox.containerId_), {
        containment: keepTrackApi.containerRoot,
      });

      draggie.on('dragStart', () => {
        const satInfoBoxElement = getEl(SatInfoBox.containerId_)!;

        satInfoBoxElement.style.height = 'fit-content';
        satInfoBoxElement.style.maxHeight = '80%';
        document.documentElement.style.setProperty('--search-box-bottom', '0px');
        satInfoBoxElement.classList.remove('satinfo-fixed');

        getEl('search-results')!.style.maxHeight = '80%';
      });
    }

    // If right click kill and reinit
    const satInfobox = getEl(SatInfoBox.containerId_)!;

    satInfobox.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 2) {
        SatInfoBox.initPosition(satInfobox);
        getEl('search-results')!.style.maxHeight = '';
      }
    });
  }

  private static createHeader(): string {
    return keepTrackApi.html`
      <div id="${SIB.EL.HEADER.CONTAINER}">
        <div id="${SIB.EL.HEADER.TITLE}" class="center-text sat-info-section-header">
          <img id="${SIB.EL.HEADER.ADD_WATCHLIST}" src="${bookmarkAddPng}"/>
          <img id="${SIB.EL.HEADER.REMOVE_WATCHLIST}" src="${bookmarkRemovePng}"/>
          <span id="${SIB.EL.HEADER.NAME}">This is a title</span>
          <span id="${SIB.EL.HEADER.FLAG}" class="fi"></span>
        </div>
      </div>
    `;
  }

  private static createActionsSection(): string {
    const hasSearch = getEl('search');

    return keepTrackApi.html`
      <div id="${SIB.SECTIONS.ACTIONS}" class="collapsed">
        <div class="sat-info-section-header">
          Actions
          <span id="${SIB.SECTIONS.ACTIONS}-collapse" class="section-collapse collapse-closed material-icons">expand_more</span>
        </div>
        ${hasSearch ? this.createSearchLinks() : ''}
        <div id="${SIB.EL.ACTIONS.DRAW_LINE_LINKS}">
          <div id="${SIB.EL.ACTIONS.SUN_ANGLE_LINK}" class="link sat-infobox-links menu-selectable">Draw sat to sun line...</div>
          <div id="${SIB.EL.ACTIONS.RIC_ANGLE_LINK}" class="link sat-infobox-links menu-selectable">Draw sat to RIC line...</div>
          <div id="${SIB.EL.ACTIONS.NADIR_ANGLE_LINK}" class="link sat-infobox-links menu-selectable">Draw sat to nadir line...</div>
          <div id="${SIB.EL.ACTIONS.SEC_ANGLE_LINK}" class="link sat-infobox-links menu-selectable">Draw sat to second sat line...</div>
        </div>
      </div>
    `;
  }

  private static createLinksSection(): string {
    return keepTrackApi.html`
      <div id="${SIB.SECTIONS.LINKS}" class="collapsed">
        <div class="sat-info-section-header">
          Links
          <span id="${SIB.SECTIONS.LINKS}-collapse" class="section-collapse collapse-closed material-icons">expand_more</span>
        </div>
        <div>
          <div id="${SIB.EL.LINKS.CELESTRAK}"
            class="link sat-infobox-links menu-selectable pointable">
            More info from CelesTrak
          </div>
          <div id="${SIB.EL.LINKS.KAYHAN}"
            class="link sat-infobox-links menu-selectable pointable">
            More info from Kayhan Space
          </div>
          <div id="${SIB.EL.LINKS.HEAVENS_ABOVE}"
            class="link sat-infobox-links menu-selectable pointable">
            More info from Heavens Above
          </div>
        </div>
      </div>
    `;
  }

  private static createSearchLinks(): string {
    return keepTrackApi.html`
      <div id="${SIB.EL.ACTIONS.SEARCH_LINKS}" class="link-section">
        <div id="${SIB.EL.ACTIONS.ALL_OBJECTS_LINK}" class="link sat-infobox-links menu-selectable sat-only-info" data-position="top" data-delay="50"
        data-tooltip="Find Related Objects">Find all objects from this launch...</div>
        <div id="${SIB.EL.ACTIONS.NEAR_ORBITS_LINK}" class="link sat-infobox-links menu-selectable sat-only-info" data-position="top" data-delay="50"
        data-tooltip="Find Objects in Orbital Plane">Find all objects near this orbit...</div>
        <div id="${SIB.EL.ACTIONS.NEAR_OBJECTS_LINK1}" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
        data-tooltip="Find Nearby Objects">Find all objects within 100km...</div>
        <div id="${SIB.EL.ACTIONS.NEAR_OBJECTS_LINK2}" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
        data-tooltip="Find Nearby Objects">Find all objects within 200km...</div>
        <div id="${SIB.EL.ACTIONS.NEAR_OBJECTS_LINK4}" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
        data-tooltip="Find Nearby Objects">Find all objects within 400km...</div>
      </div>
    `;
  }

  private static createIdentifiersSection(): string {
    return keepTrackApi.html`
      <div id="${SIB.SECTIONS.IDENTIFIERS}">
        <div class="sat-info-section-header">
          Identifiers
          <span id="${SIB.SECTIONS.IDENTIFIERS}-collapse" class="section-collapse material-icons">expand_less</span>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key">COSPAR</div>
          <div class="sat-info-value" id="${SIB.EL.IDENTIFIERS.INTL_DES}">xxxx-xxxA</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key">NORAD</div>
          <div class="sat-info-value" id="${SIB.EL.IDENTIFIERS.OBJNUM}">99999</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key">Alt Name</div>
          <div class="sat-info-value" id="${SIB.EL.IDENTIFIERS.ALT_NAME}">Alt Name</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key">Alt ID</div>
          <div class="sat-info-value" id="${SIB.EL.IDENTIFIERS.ALT_ID}">99999</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key">Source</div>
          <div class="sat-info-value" id="${SIB.EL.IDENTIFIERS.SOURCE}">USSF</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key">Confidence</div>
          <div class="sat-info-value" id="${SIB.EL.IDENTIFIERS.CONFIDENCE}">High</div>
        </div>
      </div>
    `;
  }

  private static createOrbitalSection(): string {
    return keepTrackApi.html`
      <div id="${SIB.SECTIONS.ORBITAL}">
        <div class="sat-info-section-header">
          Orbit Data
          <span id="${SIB.SECTIONS.ORBITAL}-collapse" class="section-collapse material-icons">expand_less</span>
        </div>
        <!-- Orbital data rows -->
        ${this.createOrbitalDataRows()}
      </div>
    `;
  }

  private static createOrbitalDataRows(): string {
    // Create all orbital data rows
    const rows = [
      { key: 'Apogee', id: SIB.EL.ORBITAL.APOGEE, tooltip: 'Highest Point in the Orbit', value: 'xxx km' },
      { key: 'Perigee', id: SIB.EL.ORBITAL.PERIGEE, tooltip: 'Lowest Point in the Orbit', value: 'xxx km' },
      { key: 'Inclination', id: SIB.EL.ORBITAL.INCLINATION, tooltip: 'Angle Measured from Equator on the Ascending Node', value: 'xxx.xx' },
      { key: 'Eccentricity', id: SIB.EL.ORBITAL.ECCENTRICITY, tooltip: 'How Circular the Orbit Is (0 is a Circle)', value: 'x.xx' },
      { key: 'Right Asc.', id: SIB.EL.ORBITAL.RAAN, tooltip: 'Where it Rises Above the Equator', value: 'x.xx' },
      { key: 'Arg of Perigee', id: SIB.EL.ORBITAL.ARG_PE, tooltip: 'Where the Lowest Part of the Orbit Is', value: 'x.xx' },
      { key: 'Latitude', id: SIB.EL.ORBITAL.LATITUDE, tooltip: 'Current Latitude Over Earth', value: 'x.xx' },
      { key: 'Longitude', id: SIB.EL.ORBITAL.LONGITUDE, tooltip: 'Current Longitude Over Earth', value: 'x.xx' },
      { key: 'Altitude', id: SIB.EL.ORBITAL.ALTITUDE, tooltip: 'Current Altitude Above Sea Level', value: 'xxx km' },
      { key: 'Period', id: SIB.EL.ORBITAL.PERIOD, tooltip: 'Time for One Complete Revolution Around Earth', value: 'xxx min' },
      { key: 'Velocity', id: SIB.EL.ORBITAL.VELOCITY, tooltip: 'Current Velocity of the Satellite (Higher the Closer to Earth it Is)', value: 'xxx km/s' },
      { key: 'Age of GP', id: SIB.EL.ORBITAL.ELSET_AGE, tooltip: 'Time Since Official Orbit Calculated (Older GPs are Less Accuarate Usually)', value: 'xxx.xxxx' },
      { key: 'Radial Sigma', id: SIB.EL.ORBITAL.UNCERTAINTY_RADIAL, tooltip: 'Radial Uncertainty (meters)', value: 'xxx.xxxx' },
      { key: 'In Track Sigma', id: SIB.EL.ORBITAL.UNCERTAINTY_INTRACK, tooltip: 'In Track Uncertainty (meters)', value: 'xxx.xxxx' },
      { key: 'Cross Track Sigma', id: SIB.EL.ORBITAL.UNCERTAINTY_CROSSTRACK, tooltip: 'Cross Track Uncertainty (meters)', value: 'xxx.xxxx' },
    ];

    return rows.map((row) => keepTrackApi.html`
      <div class="sat-info-row sat-only-info">
        <div class="sat-info-key" data-tooltip="${row.tooltip}">${row.key}</div>
        <div class="sat-info-value" id="${row.id}">${row.value}</div>
      </div>
    `).join('');
  }

  private static createSensorSection(): string {
    // Similar structure for sensor section
    const rows = [
      { key: 'Range', id: SIB.EL.SENSOR.RANGE, tooltip: 'Distance from the Sensor', value: 'xxxx km' },
      { key: 'Azimuth', id: SIB.EL.SENSOR.AZIMUTH, tooltip: 'Angle (Left/Right) from the Sensor', value: 'XX deg' },
      { key: 'Elevation', id: SIB.EL.SENSOR.ELEVATION, tooltip: 'Angle (Up/Down) from the Sensor', value: 'XX deg' },
      { key: 'Beam Width', id: SIB.EL.SENSOR.BEAMWIDTH, tooltip: 'Linear Width at Target\'s Range', value: 'xxxx km' },
      { key: 'Max Tmx Time', id: SIB.EL.SENSOR.MAX_TMX, tooltip: 'Time for RF/Light to Reach Target and Back', value: 'xxxx ms' },
      { key: 'Sun', id: SIB.EL.SENSOR.SUN, tooltip: 'Does the Sun Impact the Sensor', value: 'Sun Stuff' },
      { key: 'Vis Mag', id: SIB.EL.SENSOR.VMAG, tooltip: 'Visual Magnitude (Lower numbers are brighter)', value: 'xx.x' },
      { key: 'Next Pass', id: SIB.EL.SENSOR.NEXT_PASS, tooltip: 'Next Time in Coverage', value: '00:00:00z' },
    ];

    return keepTrackApi.html`
      <div id="${SIB.SECTIONS.SENSOR}">
      <div class="sat-info-section-header">
        Sensor Data
        <span id="${SIB.SECTIONS.SENSOR}-collapse" class="section-collapse material-icons">expand_less</span>
      </div>
      ${rows.map((row) => keepTrackApi.html`
        <div
          class="sat-info-row${row.id === SIB.EL.SENSOR.SUN || row.id === SIB.EL.SENSOR.VMAG || row.id === SIB.EL.SENSOR.NEXT_PASS ? ' sat-only-info' : ''}"
        >
        <div class="sat-info-key" data-position="top" data-delay="50"
          data-tooltip="${row.tooltip}"
        >
          ${row.key}
        </div>
        <div class="sat-info-value" id="${row.id}">${row.value}</div>
        </div>
      `).join('')}
      </div>
    `;
  }

  private static createLaunchSection(): string {
    // Launch section HTML
    return keepTrackApi.html`
      <div id="${SIB.SECTIONS.OBJECT}">
        <div class="sat-info-section-header">
          Object Data
          <span id="${SIB.SECTIONS.OBJECT}-collapse" class="section-collapse material-icons">expand_less</span>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Type of Object">Type</div>
          <div class="sat-info-value" id="${SIB.EL.OBJECT.TYPE}">PAYLOAD</div>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Type of Object">Status</div>
          <div class="sat-info-value" id="${SIB.EL.OBJECT.STATUS}">STATUS</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Country That Owns the Object">Country</div>
          <div class="sat-info-value" id="${SIB.EL.OBJECT.COUNTRY}">COUNTRY</div>
        </div>
        <div class="sat-info-row" id="${SIB.EL.OBJECT.SITE_ROW}">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Location Where Object Launched From">Launch Site</div>
          <div class="sat-info-value">
            <div id="${SIB.EL.OBJECT.LAUNCH_SITE}">LAUNCH SITE</div>
            <div id="${SIB.EL.OBJECT.LAUNCH_PAD}">LAUNCH PAD</div>
          </div>
          </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Space Lift Vehicle That Launched Object">Rocket</div>
          <div class="sat-info-value pointable" id="${SIB.EL.OBJECT.VEHICLE}">VEHICLE</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Configuration of the Rocket">
            Configuration
          </div>
          <div class="sat-info-value" id="${SIB.EL.OBJECT.CONFIGURATION}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Radar Cross Section - How reflective the object is to a radar">
            RCS
          </div>
          <div class="sat-info-value" data-position="top" data-delay="50" id="${SIB.EL.OBJECT.RCS}">NO DATA</div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Standard Magnitude - Smaller Numbers Are Brighter">
            Standard Mag
          </div>
          <div class="sat-info-value" id="${SIB.EL.OBJECT.STDMAG}">
            NO DATA
          </div>
        </div>
      </div>
    `;
  }

  private static createMissionSection(): string {
    // Mission section HTML
    return keepTrackApi.html`
      <div id="${SIB.SECTIONS.MISSION}">
        <div class="sat-info-section-header">
          Mission
          <span id="${SIB.SECTIONS.MISSION}-collapse" class="section-collapse material-icons">expand_less</span>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Overview of the Satellite's Mission">
            Mission
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.MISSION}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Primary User of the Satellite">
            User
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.USER}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Main Function of the Satellite">
            Purpose
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.PURPOSE}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Contractor Who Built the Satellite">
            Contractor
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.CONTRACTOR}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Mass at Lift Off">
            Lift Mass
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.LAUNCH_MASS}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50" data-tooltip="Unfueled Mass">
            Dry Mass
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.DRY_MASS}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="How Long the Satellite was Expected to be Operational">
            Life Expectancy
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.LIFETIME}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Satellite Bus">
            Bus
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.BUS}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Primary Payload">
            Payload
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.PAYLOAD}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Equipment on the Satellite">
            Equipment
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.EQUIPMENT}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Primary Motor">
            Motor
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.MOTOR}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Length in Meters">
            Length
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.LENGTH}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Diameter in Meters">
            Diameter
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.DIAMETER}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Span in Meters">
            Span
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.SPAN}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Description of Shape">
            Shape
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.SHAPE}">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Power of the Satellite">
            Power
          </div>
          <div class="sat-info-value" id="${SIB.EL.MISSION.POWER}">
            NO DATA
          </div>
        </div>
      </div>
    `;
  }

  private static createSecondarySection(): string {
    // Secondary satellite section HTML
    return keepTrackApi.html`
      <div id="${SIB.SECTIONS.SECONDARY}">
        <div class="sat-info-section-header">
          Secondary Satellite
          <span id="${SIB.SECTIONS.SECONDARY}-collapse" class="section-collapse material-icons">expand_less</span>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Linear Distance from Secondary Satellite">
            Linear
          </div>
          <div class="sat-info-value" id="${SIB.EL.SECONDARY.DIST}">xxxx km</div>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Radial Distance">
            Radial
          </div>
          <div class="sat-info-value" id="${SIB.EL.SECONDARY.RAD}">XX deg</div>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="In-Track Distance from Secondary Satellite">
            In-Track
          </div>
          <div class="sat-info-value" id="${SIB.EL.SECONDARY.INTRACK}">XX deg</div>
        </div>
        <div class="sat-info-row">
          <div class="sat-info-key" data-position="top" data-delay="50"
            data-tooltip="Cross-Track Distance from Secondary Satellite">
            Cross-Track
          </div>
          <div class="sat-info-value" id="${SIB.EL.SECONDARY.CROSSTRACK}">xxxx km</div>
        </div>
      </div>
    `;
  }
}
