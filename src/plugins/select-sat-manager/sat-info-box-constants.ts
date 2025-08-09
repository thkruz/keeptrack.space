export const SAT_INFO_BOX_CONSTANTS = {
  CONTAINER_ID: 'sat-infobox',

  // Section IDs
  SECTIONS: {
    ACTIONS: 'actions-section',
    IDENTIFIERS: 'sat-identifier-data',
    LINKS: 'links-section',
    ORBITAL: 'orbital-section',
    SECONDARY: 'secondary-sat-info',
    SENSOR: 'sensor-sat-info',
    OBJECT: 'object-section',
    MISSION: 'sat-mission-data',
  },

  // Default collapsed states
  DEFAULT_COLLAPSED: {
    actions: true,
    identifiers: false,
    orbital: false,
    secondary: false,
    sensor: false,
    object: false,
    mission: false,
  },

  // DOM element IDs organized by section
  EL: {
    // Header elements
    HEADER: {
      CONTAINER: 'sat-info-header',
      TITLE: 'sat-info-title',
      NAME: 'sat-info-title-name',
      FLAG: 'sat-infobox-fi',
      ADD_WATCHLIST: 'sat-add-watchlist',
      REMOVE_WATCHLIST: 'sat-remove-watchlist',
    },

    // Action elements
    ACTIONS: {
      SEARCH_LINKS: 'search-links',
      DRAW_LINE_LINKS: 'draw-line-links',
      SUN_ANGLE_LINK: 'sun-angle-link',
      RIC_ANGLE_LINK: 'ric-angle-link',
      NADIR_ANGLE_LINK: 'nadir-angle-link',
      SEC_ANGLE_LINK: 'sec-angle-link',
      ALL_OBJECTS_LINK: 'all-objects-link',
      NEAR_ORBITS_LINK: 'near-orbits-link',
      NEAR_OBJECTS_LINK1: 'near-objects-link1',
      NEAR_OBJECTS_LINK2: 'near-objects-link2',
      NEAR_OBJECTS_LINK4: 'near-objects-link4',
    },

    LINKS: {
      KAYHAN: 'kayhan-link',
      HEAVENS_ABOVE: 'heavens-above-link',
      CELESTRAK: 'celestrak-link',
    },

    // Identifier elements
    IDENTIFIERS: {
      INTL_DES: 'sat-intl-des',
      OBJNUM: 'sat-objnum',
      ALT_NAME: 'sat-alt-name',
      ALT_ID: 'sat-alt-id',
      SOURCE: 'sat-source',
      CONFIDENCE: 'sat-confidence',
    },

    // Orbital elements
    ORBITAL: {
      LATITUDE: 'sat-latitude',
      LONGITUDE: 'sat-longitude',
      ALTITUDE: 'sat-altitude',
      PERIOD: 'sat-period',
      VELOCITY: 'sat-velocity',
      INCLINATION: 'sat-inclination',
      ECCENTRICITY: 'sat-eccentricity',
      RAAN: 'sat-raan',
      ARG_PE: 'sat-argPe',
      MEAN_ANOMALY: 'sat-meanAnomaly',
      APOGEE: 'sat-apogee',
      PERIGEE: 'sat-perigee',
      ELSET_AGE: 'sat-elset-age',
      UNCERTAINTY_RADIAL: 'sat-uncertainty-radial',
      UNCERTAINTY_INTRACK: 'sat-uncertainty-intrack',
      UNCERTAINTY_CROSSTRACK: 'sat-uncertainty-crosstrack',
    },

    // Sensor elements
    SENSOR: {
      RANGE: 'sat-range',
      AZIMUTH: 'sat-azimuth',
      ELEVATION: 'sat-elevation',
      BEAMWIDTH: 'sat-beamwidth',
      MAX_TMX: 'sat-maxTmx',
      SUN: 'sat-sun',
      VMAG: 'sat-vmag',
      NEXT_PASS: 'sat-nextpass',
    },

    // Launch elements
    OBJECT: {
      TYPE: 'sat-type',
      STATUS: 'sat-status',
      COUNTRY: 'sat-country',
      SITE_ROW: 'sat-site-row',
      LAUNCH_SITE: 'sat-launchSite',
      LAUNCH_PAD: 'sat-launchPad',
      VEHICLE: 'sat-vehicle',
      CONFIGURATION: 'sat-configuration',
      RCS: 'sat-rcs',
      STDMAG: 'sat-stdmag',
    },

    // Secondary satellite elements
    SECONDARY: {
      DIST: 'sat-sec-dist',
      RAD: 'sat-sec-rad',
      INTRACK: 'sat-sec-intrack',
      CROSSTRACK: 'sat-sec-crosstrack',
    },

    // Mission elements
    MISSION: {
      MISSION: 'sat-mission',
      USER: 'sat-mission-user',
      PURPOSE: 'sat-purpose',
      CONTRACTOR: 'sat-contractor',
      LAUNCH_MASS: 'sat-launchMass',
      DRY_MASS: 'sat-dryMass',
      LIFETIME: 'sat-lifetime',
      POWER: 'sat-power',
      BUS: 'sat-bus',
      PAYLOAD: 'sat-payload',
      EQUIPMENT: 'sat-equipment',
      MOTOR: 'sat-motor',
      LENGTH: 'sat-length',
      DIAMETER: 'sat-diameter',
      SPAN: 'sat-span',
      SHAPE: 'sat-shape',
    },
  },
};
