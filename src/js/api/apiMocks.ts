export const defaultSat = {
  C: 'ISS',
  LS: 'TTMTR',
  LV: 'Proton-K',
  ON: 'ISS (ZARYA)',
  OT: 1,
  TLE1: '1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991',
  TLE2: '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053',
  R: '99.0524',
  URL: 'http://www.esa.int/export/esaHS/ESAI2X0VMOC_iss_0.html',
  O: 'National Aeronautics and Space Administration (NASA)/Multinational',
  U: 'Government',
  P: 'Space Science',
  LM: '',
  DM: '',
  Pw: '',
  Li: 30,
  Con: 'Boeing Satellite Systems (prime)/Multinational',
  M: 'Final size of a Boeing 747; first component.',
  S1: 'http://www.esa.int/export/esaHS/ESAI2X0VMOC_iss_0.html',
  S2: '',
  S3: 'http://www.boeing.com/defense-space/space/spacestation/overview/',
  S4: '',
  S5: '',
  S6: '',
  S7: '',
  inclination: 51.6423,
  longitude: 168.5744,
  perigee: 1475,
  apogee: 184.3976,
  period: 313.3642,
  meanMotion: 15.48839820294053,
  semimajorAxis: 21203.40407588,
  eccentricity: 0.00003453,
  raan: 0,
  argPe: 0,
  velocity: {
    total: 0,
    x: 0,
    y: 0,
    z: 0,
  },
  getTEARR: () => ({
    lon: 168.5744,
    lat: 51.6423,
    alt: 1475,
  }),
  getAltitude: () => 0,
  getDirection: () => 'N',
};

export const keepTrackApiStubs = {
  programs: {
    adviceManager: {
      adviceList: {
        satViewDisabled: jest.fn(),
        editSatDisabled: jest.fn(),
      },
    },
    cameraManager: {
      cameraType: {
        current: 1,
        satellite: 1,
        fixedToSat: 2,
      },
      camSnap: jest.fn(),
      changeZoom: jest.fn(),
      latToPitch: jest.fn(),
      longToYaw: jest.fn(),
    },
    ColorScheme: {
      reloadColors: jest.fn(),
    },
    dotsManager: {
      starIndex1: 0,
    },
    missileManager: {
      getMissileTEARR: jest.fn(),
    },
    objectManager: {
      selectedSat: -1,
      setSelectedSat: jest.fn(),
      staticSet: {
        id: 0,
      },
      analSatSet: {
        id: 0,
      },
      radarDataSet: {
        id: 0,
      },
      missileSet: {
        id: 0,
      },
      fieldOfViewSet: {
        id: 0,
      },
    },
    orbitManager: {
      updateOrbitBuffer: jest.fn(),
    },
    satellite: {
      currentTEARR: {
        az: 0,
        el: 0,
        rng: 0,
      },
      setobs: jest.fn(),
      setTEARR: jest.fn(),
      altitudeCheck: jest.fn(),
      degreesLong: (num: number) => num,
      degreesLat: (num: number) => num,
      currentEpoch: () => ['21', '150'],
      getOrbitByLatLon: () => ['1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991', '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053'],
    },
    satSet: {
      satCruncher: {
        postMessage: jest.fn(),
      },
      getIdFromObjNum: jest.fn(),
      getSatExtraOnly: () => defaultSat,
      getSat: () => defaultSat,
      initGsData: jest.fn(),
      setColorScheme: jest.fn(),
    },
    sensorFov: {
      enableFovView: jest.fn(),
    },
    sensorManager: {
      checkSensorSelected: () => false,
      currentSensor: {
        alt: 0,
        lat: 0,
        lon: 0,
      },
    },
    timeManager: {
      propOffset: 0,
      propRate: 0,
      selectedDate: 0,
      propTime: () => 0,
      getDayOfYear: () => 0,
    },
    uiManager: {
      hideSideMenus: jest.fn(),
      toast: jest.fn(),
      bottomIconPress: jest.fn(),
      legendColorsChange: jest.fn(),
    },
  },
};
