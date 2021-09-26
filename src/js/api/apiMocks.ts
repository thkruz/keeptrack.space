import { satObject, sensorObject } from './keepTrack';

export const defaultSat: satObject = {
  active: true,
  SCC_NUM: '00005',
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
  inview: 1,
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

export const defaultSensor: sensorObject = {
  alt: 0.060966,
  beamwidth: 2,
  changeObjectInterval: 1000,
  country: 'United States',
  lat: 41.754785,
  linkAehf: true,
  linkWgs: true,
  lon: -70.539151,
  name: 'Cape Cod AFS, Massachusetts',
  observerGd: { lat: 0.7287584767123405, lon: -1.2311404365114507, alt: 0.060966 },
  obsmaxaz: 227,
  obsmaxel: 85,
  obsmaxrange: 5556,
  obsminaz: 347,
  obsminel: 3,
  obsminrange: 200,
  shortName: 'COD',
  staticNum: 0,
  sun: 'No Impact',
  type: 'Phased Array Radar',
  url: 'http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html',
  volume: false,
  zoom: 'leo',
};

export const useMockWorkers = () => {
  class Worker {
    url: any;
    onmessage: (msg: any) => void;
    constructor(stringUrl: any) {
      this.url = stringUrl;
      this.onmessage = () => {
        return {
          data: {}
        }
      };
    }

    postMessage(msg: any) {
      if (msg.dat) {
        this.onmessage({          
          data: {
            extraData: JSON.stringify([defaultSat, defaultSensor]),
            satPos: [0,0,0,0,0,0],
            satVel: [0,0,0,0,0,0],
          }
        });
      }
      this.onmessage({
        data: {
          satPos: [0,0,0,0,0,0],
          satVel: [0,0,0,0,0,0],
        }
      });
    }
  }

  (<any>window).Worker = Worker;
}

export const keepTrackApiStubs = {
  programs: {
    adviceManager: {
      adviceList: {
        satViewDisabled: jest.fn(),
        editSatDisabled: jest.fn(),
        survFenceDisabled: jest.fn(),
        bubbleDisabled: jest.fn(),
        satFOVDisabled: jest.fn(),
        planetariumDisabled: jest.fn(),
        mapDisabled: jest.fn(),
      },
      adviceCount: {
        socrates: 0,
      },
      showAdvice: jest.fn(),
      adviceArray: (<any[]>[]),
    },
    mainCamera: {
      cameraType: {
        current: 1,
        satellite: 1,
        fixedToSat: 2,
      },
      camSnap: jest.fn(),
      changeZoom: jest.fn(),
      latToPitch: jest.fn(),
      longToYaw: jest.fn(),
      autoRotate: jest.fn(),
    },
    ColorScheme: {
      reloadColors: jest.fn(),      
    },
    drawManager: {
      glInit: jest.fn(),
      gl: global.mocks.glMock,
      selectSatManager: {
        selectSat: jest.fn(),
      },
    },    
    dotsManager: {
      starIndex1: 0,
      pickReadPixelBuffer: [
        0,
        0,
        0,
      ],
    },    
    groups: null,
    groupsManager: {
      Canada: null,
      Japan: null,
      France: null,
      China: null,
      India: null,
      Israel: null,
      Russia: null,
      UnitedKingdom: null,
      UnitedStates: null,
      SpaceStations: {
        sats: [
          {satId: 1, SCC_NUM: '25544'},
          {satId: 1, SCC_NUM: '25544'},
        ],
        updateOrbits: jest.fn(),
      },
      clearSelect: jest.fn(),
      createGroup: () => ({
        updateOrbits: jest.fn(),
      }),
      selectGroup: jest.fn(),
    },    
    lineManager: {
      create: jest.fn(),
      removeStars: jest.fn(),
      getLineListLen: jest.fn(),
    },
    missileManager: {
      getMissileTEARR: jest.fn(),
    },
    objectManager: {
      isLaunchSiteManagerLoaded: true,
      launchSiteManager: {
        launchSiteList: [
          'AFWTR'
        ],
      },
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
      clearInViewOrbit: jest.fn(),
      removeInViewOrbit: jest.fn(),
      historyOfSatellitesPlay: jest.fn(),
    },
    satellite: {
      currentTEARR: {
        az: 0,
        el: 0,
        rng: 0,
      },
      sgp4: () => ([0,0,0]),
      setobs: jest.fn(),
      setTEARR: jest.fn(),
      altitudeCheck: jest.fn(),
      degreesLong: (num: number) => num,
      degreesLat: (num: number) => num,
      currentEpoch: () => ['21', '150'],
      getOrbitByLatLon: () => ['1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991', '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053'],
      nextpassList: () => [new Date().getTime(), new Date().getTime() + 1],
      twoline2satrec: () => ({ jdsatepoch: 2458000.5 }),
      getRae: () => [0, 0, 0],
      checkIsInFOV: () => true,
      findCloseObjects: () => '',
      findBestPasses: () => jest.fn(),
      nextpass: () => '2021-09-21 20:00:00Z',
      getDOPsTable: jest.fn(),
    },
    satSet: {
      satCruncher: {
        postMessage: jest.fn(),
      },
      satData: [
        defaultSat,
        defaultSat,
      ],
      getIdFromObjNum: jest.fn(),
      getSensorFromSensorName: () => 0,
      getSatExtraOnly: () => defaultSat,
      getSatFromObjNum : () => defaultSat,
      getSat: () => defaultSat,
      initGsData: jest.fn(),
      setColorScheme: jest.fn(),
      getSatInViewOnly: () => defaultSat,
      default: '',
      insertNewAnalystSatellite: jest.fn(),
    },
    searchBox: {
      hideResults: jest.fn(),
      fillResultBox: jest.fn(),
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
        shortName: 'COD',
      },
    },
    starManager: {
      init: jest.fn(),
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
      colorSchemeChangeAlert: jest.fn(),
      bottomIconPress: jest.fn(),
      legendColorsChange: jest.fn(),
      doSearch: jest.fn(),
      loadStr: jest.fn(),
      searchToggle: jest.fn(),
      legendMenuChange: jest.fn(),
      clearRMBSubMenu: jest.fn(),
      updateURL: jest.fn(),
    },
    watchlist: {
      updateWatchlist: jest.fn(),
    },
  },
};

keepTrackApiStubs.programs.groupsManager.Canada = keepTrackApiStubs.programs.groupsManager.SpaceStations;
keepTrackApiStubs.programs.groupsManager.Japan = keepTrackApiStubs.programs.groupsManager.SpaceStations;
keepTrackApiStubs.programs.groupsManager.France = keepTrackApiStubs.programs.groupsManager.SpaceStations;
keepTrackApiStubs.programs.groupsManager.China = keepTrackApiStubs.programs.groupsManager.SpaceStations;
keepTrackApiStubs.programs.groupsManager.India = keepTrackApiStubs.programs.groupsManager.SpaceStations;
keepTrackApiStubs.programs.groupsManager.Israel = keepTrackApiStubs.programs.groupsManager.SpaceStations;
keepTrackApiStubs.programs.groupsManager.Russia = keepTrackApiStubs.programs.groupsManager.SpaceStations;
keepTrackApiStubs.programs.groupsManager.UnitedKingdom = keepTrackApiStubs.programs.groupsManager.SpaceStations;
keepTrackApiStubs.programs.groupsManager.UnitedStates = keepTrackApiStubs.programs.groupsManager.SpaceStations;
keepTrackApiStubs.programs.groups = keepTrackApiStubs.programs.groupsManager;