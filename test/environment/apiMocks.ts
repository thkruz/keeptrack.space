// eslint-disable-next-line @typescript-eslint/ban-ts-comment


import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { Operators } from '@app/app/data/catalogs/sensors';
import { PositionCruncherIncomingMsg, PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import { CatalogSource, CommLink, Degrees, DetailedSatellite, Kilometers, Milliseconds, RfSensor, SpaceObjectType, TleLine1, TleLine2, ZoomValue } from '@ootk/src/main';

const fakeTimeObj = new Date(2022, 0, 1);

fakeTimeObj.setUTCHours(0, 0, 0, 0);

export const defaultSat: DetailedSatellite = new DetailedSatellite({
  id: 0,
  active: true,
  sccNum: '00005',
  intlDes: '1998-AEF',
  country: 'ISS',
  launchSite: 'TTMTR',
  launchVehicle: 'Proton-K',
  name: 'ISS (ZARYA)',
  type: SpaceObjectType.PAYLOAD,
  tle1: '1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991' as TleLine1,
  tle2: '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053' as TleLine2,
  rcs: 99.0524,
  owner: 'National Aeronautics and Space Administration (NASA)/Multinational',
  user: 'Government',
  purpose: 'Space Science',
  launchMass: '',
  dryMass: '',
  power: '',
  lifetime: 30,
  manufacturer: 'Boeing Satellite Systems (prime)/Multinational',
  mission: 'Final size of a Boeing 747; first component.',
  position: {
    x: 0 as Kilometers,
    y: 0 as Kilometers,
    z: 0 as Kilometers,
  },
  source: CatalogSource.CELESTRAK,
});

export const defaultMisl = new MissileObject({
  id: 1,
  desc: 'Fake (F101)',
  active: true,
  latList: [0 as Degrees],
  lonList: [0 as Degrees],
  altList: [0 as Kilometers],
  timeList: [0],
  startTime: 0,
  maxAlt: 0,
  country: 'USA',
  launchVehicle: 'Fake',
});

export const defaultSensor = new RfSensor({
  objName: 'CODSFS',
  shortName: 'COD',
  id: 3,
  name: 'Cape Cod SFS, Massachusetts',
  uiName: 'Cape Cod SFS',
  system: 'PAVE PAWS UEWR',
  freqBand: 'UHF',
  type: SpaceObjectType.PHASED_ARRAY_RADAR,
  lat: <Degrees>41.754785,
  lon: <Degrees>-70.539151,
  alt: <Kilometers>0.060966,
  minAz: <Degrees>347,
  maxAz: <Degrees>227,
  minEl: <Degrees>3,
  maxEl: <Degrees>85,
  minRng: <Kilometers>200,
  maxRng: <Kilometers>5556,
  boresightAz: [<Degrees>47, <Degrees>167],
  boresightEl: [<Degrees>20, <Degrees>20],
  changeObjectInterval: <Milliseconds>1000,
  beamwidth: <Degrees>2.0, // National Research Council 1979. Radiation Intensity of the PAVE PAWS Radar System. Washington, DC: The National Academies Press.
  commLinks: [
    CommLink.AEHF,
    CommLink.WGS,
  ],
  zoom: ZoomValue.LEO,
  url: 'https://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html',
  country: 'United States',
  operator: Operators.USSF,
  sensorId: 0, // For Testing Only
});

export const useMockWorkers = (): void => {
  class Worker {
    url: string;
    onmessage: (msg: { data: PositionCruncherOutgoingMsg }) => { data: object };
    constructor(stringUrl: string) {
      this.url = stringUrl;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      this.onmessage = () => ({
        data: {},
      });
    }

    postMessage(msg: { data: PositionCruncherIncomingMsg }) {
      if (msg.data) {
        this.onmessage({
          data: {
            satPos: [0, 0, 0, 0, 0, 0] as unknown as Float32Array,
            satVel: [0, 0, 0, 0, 0, 0] as unknown as Float32Array,
          },
        });
      }
      this.onmessage({
        data: {
          satPos: [0, 0, 0, 0, 0, 0] as unknown as Float32Array,
          satVel: [0, 0, 0, 0, 0, 0] as unknown as Float32Array,
        },
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Worker = Worker;
};

export const keepTrackApiStubs = {
  programs: {
    planetarium: {
      isPlanetariumView: false,
    },
    adviceManager: {
      adviceList: {
        satViewDisabled: jest.fn(),
        editSatDisabled: jest.fn(),
        survFenceDisabled: jest.fn(),
        bubbleDisabled: jest.fn(),
        satFovDisabled: jest.fn(),
        planetariumDisabled: jest.fn(),
        mapDisabled: jest.fn(),
        breakupDisabled: jest.fn(),
        ssnLookanglesDisabled: jest.fn(),
        sensorInfoDisabled: jest.fn(),
        lookanglesDisabled: jest.fn(),
        satelliteSelected: jest.fn(),
        sensor: jest.fn(),
        cspocSensors: jest.fn(),
        mwSensors: jest.fn(),
      },
      adviceCount: {
        socrates: 0,
      },
      showAdvice: jest.fn(),
      adviceArray: [],
    },
    mainCamera: {
      camMatrix: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      cameraType: {
        current: 1,
        Default: 0,
        Offset: 1,
        FixedToSat: 2,
        Fps: 3,
        Planetarium: 4,
        Satellite: 5,
        Astronomy: 6,
        set: jest.fn(),
      },
      camSnap: jest.fn(),
      changeCameraType: jest.fn(),
      changeZoom: jest.fn(),
      lat2pitch: jest.fn(),
      lon2yaw: jest.fn(),
      calculate: jest.fn(),
      update: jest.fn(),
      getCamDist: jest.fn(),
      lookAtPosition: jest.fn(),
      localRotateDif: {
        pitch: 0,
        yaw: 0,
      },
      zoomLevel: () => 0,
      zoomTarget: () => 0,
      autoRotate: jest.fn(),
      panCurrent: {
        x: 0,
        y: 0,
        z: 0,
      },
      getForwardVector: () => [0, 0, 0],
    },
    colorSchemeManager: {
      objectTypeFlags: {
        payload: true,
        rocketBody: true,
        debris: true,
        inFOV: true,
      },
      resetObjectTypeFlags: jest.fn(),
      reloadColors: jest.fn(),
      default: () => ({ color: [0, 0, 0, 0] }),
      currentColorScheme: () => ({ color: [0, 0, 0, 0] }),
      calculateColorBuffers: jest.fn(),
      colorData: [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1],
      group: () => ({ color: [0, 0, 0, 0] }),
      velocity: () => ({ color: [0, 0, 0, 0] }),
      sunlight: () => ({ color: [0, 0, 0, 0] }),
      countries: () => ({ color: [0, 0, 0, 0] }),
      groupCountries: () => ({ color: [0, 0, 0, 0] }),
      leo: () => ({ color: [0, 0, 0, 0] }),
      geo: () => ({ color: [0, 0, 0, 0] }),
      ageOfElset: () => ({ color: [0, 0, 0, 0] }),
      rcs: () => ({ color: [0, 0, 0, 0] }),
      smallsats: () => ({ color: [0, 0, 0, 0] }),
    },
    drawManager: {
      pMatrix: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      resizeCanvas: jest.fn(),
      glInit: jest.fn(),
      gl: global.mocks.glMock,
      canvas: {
        style: {
          cursor: '',
        },
        width: 0,
        height: 0,
      },
      selectSatManager: {
        selectSat: jest.fn(),
      },
      postProcessingManager: {
        init: jest.fn(),
        curBuffer: null,
        programs: {
          occlusion: {
            attrSetup: jest.fn(),
            attrOff: jest.fn(),
            uniformSetup: jest.fn(),
          },
        },
      },
      sceneManager: {
        sun: {
          initGodrays: jest.fn(),
          drawPosition: [0, 0, 0],
          sunvar: {
            gmst: 0,
          },
          draw: jest.fn(),
          drawGodrays: jest.fn(),
          godrays: {
            frameBuffer: {},
          },
          now: fakeTimeObj,
        },
        earth: {
          init: jest.fn(),
          loadHiRes: jest.fn(),
          loadHiResNight: jest.fn(),
          lightDirection: [0, 0, 0],
          draw: jest.fn(),
          drawOcclusion: () => {
            // Do nothing
          },
        },
        moon: {
          draw: jest.fn(),
        },
        skybox: {
          draw: jest.fn(),
        },
        customMeshFactory: {
          creatRadarDome: jest.fn(),
        },
      },
      startWithOrbits: jest.fn(),
    },
    dotsManager: {
      inSunData: new Float32Array([1, 0, 0]),
      inViewData: new Float32Array([1, 0, 0]),
      init: jest.fn(),
      starIndex1: 0,
      pickReadPixelBuffer: [0, 0, 0],
      pickingDotSize: '1.0',
      gl: null,
      emptyMat4: null,
      positionBuffer: null,
      sizeBuffer: null,
      loaded: true,
      pMvCamMatrix: null,
      drawProgram: null,
      positionBufferOneTime: null,
      positionData: new Float32Array([0, 0, 0]),
      pickingProgram: {
        aPos: null,
      },
      pickingColorBuffer: null,
      drawShaderCode: { frag: null, vert: null },
      pickingShaderCode: { vert: null, frag: null },
      pickingTexture: null,
      pickingRenderBuffer: null,
      velocityData: new Float32Array([0, 0, 0]),
      drawDivisor: null,
      satDataLenInDraw: null,
      satDataLenInDraw3: null,
      orbitalSats3: null,
      drawI: null,
      draw: jest.fn(),
      drawGpuPickingFrameBuffer: jest.fn(),
      updatePositionBuffer: jest.fn(),
      updateSizeBuffer: jest.fn(),
      updatePMvCamMatrix: jest.fn(),
      sizeBufferOneTime: null,
      sizeData: new Float32Array([1, 0, 0]),
      starIndex2: null,
      pickingColorData: null,
      pickingFrameBuffer: null,
      createPickingProgram: jest.fn(),
      sensorMarkerArray: new Float32Array([0, 0, 0]),
    },
    groups: null,
    soundManager: {
      play: jest.fn(),
    },
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
        group: {},
        sats: [
          { satId: 1, sccNum: '25544' },
          { satId: 1, sccNum: '25544' },
        ],
        updateOrbits: jest.fn(),
      },
      clearSelect: jest.fn(),
      createGroup: () => ({
        sats: [
          { satId: 1, sccNum: '25544' },
          { satId: 1, sccNum: '25544' },
        ],
        updateOrbits: jest.fn(),
      }),
      selectGroup: jest.fn(),
      selectedGroup: [1, 2, 3],
    },
    lineManager: {
      draw: jest.fn(),
      create: jest.fn(),
      clear: jest.fn(),
      removeStars: jest.fn(),
      getLineListLen: jest.fn(),
      drawWhenSelected: jest.fn(),
    },
    missileManager: {
      getMissileTEARR: jest.fn(),
    },
    meshManager: {
      draw: jest.fn(),
    },
    orbitManager: {
      orbitWorker: {
        postMessage: jest.fn(),
      },
      setSelectOrbit: jest.fn(),
      draw: jest.fn(),
      setHoverOrbit: jest.fn(),
      clearHoverOrbit: jest.fn(),
      clearSelectOrbit: jest.fn(),
      updateOrbitBuffer: jest.fn(),
      clearInViewOrbit: jest.fn(),
      removeInViewOrbit: jest.fn(),
      historyOfSatellitesPlay: jest.fn(),
      program: <WebGLProgram>null,
      attribs: {
        aPos: 0,
        uColor: [0, 0, 0, 0],
        uCamMatrix: [0, 0, 0, 0],
        uPMatrix: [0, 0, 0, 0],
        uMvMatrix: [0, 0, 0, 0],
      },
    },
    satellite: {
      currentTEARR: {
        az: 0,
        el: 0,
        rng: 0,
      },
      sgp4: () => [0, 0, 0],
      setobs: jest.fn(),
      distance: jest.fn(),
      distanceString: jest.fn(),
      setTEARR: jest.fn(),
      eci2ll: () => ({ lat: 0, lon: 0 }),
      altitudeCheck: () => 10000,
      calculateVisMag: () => 6,
      calculateSensorPos: jest.fn(),
      degreesLong: (num: number) => num,
      degreesLat: (num: number) => num,
      getEciOfCurrentOrbit: () => [{ x: 0, y: 0, z: 0 }],
      getEcfOfCurrentOrbit: () => [{ x: 0, y: 0, z: 0 }],
      getRicOfCurrentOrbit: () => [{ x: 0, y: 0, z: 0 }],
      getLlaOfCurrentOrbit: () => [{ lat: 0, lon: 0, alt: 0, time: new Date().getTime() }],
      currentEpoch: () => ['21', '150'],
      getOrbitByLatLon: () => ['1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991', '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053'],
      nextpassList: () => [new Date().getTime(), new Date().getTime() + 1],
      twoline2satrec: () => ({ jdsatepoch: 2458000.5, ecco: 1, nodeo: 1, argpo: 1, meana: 1, argPe: 1, argPeA: 1, radiusearthkm: 5557 }),
      getRae: () => [0, 0, 0],
      checkIsInView: () => true,
      getlookangles: jest.fn(),
      getlookanglesMultiSite: jest.fn(),
      findCloseObjects: () => '',
      createTle: () => ({ TLE1: '', TLE2: '' }),
      eci2Rae: jest.fn(),
      findBestPasses: () => jest.fn(),
      findNearbyObjectsByOrbit: () => jest.fn(),
      nextpass: () => '2021-09-21 20:00:00Z',
      getDops: () => ({
        HDOP: 0,
        VDOP: 0,
        TDOP: 0,
        GDOP: 0,
        PDOP: 0,
      }),
      updateDopsTable: jest.fn(),
      map: () => ({ lat: 0, lon: 0 }),
      sat2ric: () => ({ position: [0, 0, 0], velocity: [0, 0, 0] }),
      getTEARR: () => ({
        az: 0,
        el: 0,
        rng: 0,
        inView: true,
      }),
    },
    mapManager: {
      isMapMenuOpen: false,
    },
    controlSiteManager: {},
    catalogManager: {
      isLaunchSiteManagerLoaded: true,
      lasthoveringSat: 0,
      lastSelectedSat: () => 1,
      extractCountry: () => 'India',
      setHoveringSat: jest.fn(),
      setLasthoveringSat: jest.fn(),
      extractLaunchSite: () => ({ site: 'test', sitec: 'test' }),
      extractLiftVehicle: jest.fn(),
      launchSiteManager: {
        launchSiteList: ['AFWTR'],
      },
      selectedSat: -1,
      secondarySat: -1,
      setSecondarySat: jest.fn(),
      setSelectedSat_: jest.fn(),
      staticSet: {
        id: 0,
      },
      analSatSet: [defaultSat],
      missileSet: {
        id: 0,
      },
      fieldOfViewSet: {
        id: 0,
      },
      satLinkManager: {
        idToSatnum: jest.fn(),
        showLinks: jest.fn(),
        aehf: [25544],
        dscs: [25544],
        wgs: [25544],
        starlink: [25544],
        sbirs: [25544],
      },
      satCruncher: {
        addEventListener: jest.fn(),
        postMessage: jest.fn(),
        onmessage: jest.fn(),
      },
      getIdFromEci: jest.fn(),
      selectSat: jest.fn(),
      satData: [
        { ...defaultSat, ...{ id: 0 } },
        defaultSat,
        { id: 2, type: SpaceObjectType.STAR, name: 'test' },
        { id: 3, type: SpaceObjectType.PHASED_ARRAY_RADAR, static: true, name: 'test' },
      ],
      convertIdArrayToSatnumArray: jest.fn(),
      getIdFromObjNum: () => 0,
      getSensorFromSensorName: () => 0,
      getSatExtraOnly: () => defaultSat,
      getSatFromObjNum: () => defaultSat,
      getSat: () => defaultSat,
      setSat: jest.fn(),
      getIdFromStarName: jest.fn(),
      initGsData: jest.fn(),
      setColorScheme: jest.fn(),
      getSatPosOnly: () => defaultSat,
      getSatInView: () => jest.fn(),
      getScreenCoords: () => ({
        error: false,
      }),
      getSatVel: () => jest.fn(),
      getSatInSun: () => jest.fn(),
      sunECI: { x: 0, y: 0, z: 0 },
      default: '',
      setHover: jest.fn(),
      insertNewAnalystSatellite: () => ({ sccNum: 25544 }),
      getIdFromIntlDes: jest.fn(),
      queryStr: 'search=25544&intldes=1998-A&sat=25544&misl=0,0,0&date=1234567&rate=1&hires=true',
      cosparIndex: { '1998-AB': 5 },
      numSats: 1,
      onCruncherReady: jest.fn(),
      missileSats: 10000,
      orbitDensity: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
      ],
      orbitDensityMax: 1,
      search: {
        year: () => [defaultSat],
        yearOrLess: () => [defaultSat],
        name: () => [defaultSat],
        country: () => [defaultSat],
        shape: () => [defaultSat],
        bus: () => [defaultSat],
        type: () => [defaultSat],
      },
    },
    searchBox: {
      hideResults: jest.fn(),
      fillResultBox: jest.fn(),
      doArraySearch: jest.fn(),
      doSearch: jest.fn(),
      getCurrentSearch: jest.fn(),
      getLastResultGroup: jest.fn(),
      isHovering: jest.fn(),
      setHoverSat: jest.fn(),
      isResultBoxOpen: jest.fn(),
    },
    sensorFov: {
      enableFovView: jest.fn(),
    },
    sensorManager: {
      checkSensorSelected: () => false,
      currentSensor: [defaultSensor],
      sensorListUS: [defaultSensor, defaultSensor],
      setCurrentSensor: jest.fn(),
      setSensor: jest.fn(),
      sensorList: { COD: defaultSensor },
    },
    starManager: {
      init: jest.fn(),
      findStarsConstellation: jest.fn(),
      drawConstellations: jest.fn(),
    },
    timeManager: {
      propOffset: 0,
      getPropOffset: () => 0,
      propTimeVar: fakeTimeObj,
      propRate: 0,
      selectedDate: 0,
      getDayOfYear: () => 0,
      updatePropTime: jest.fn(),
      jday: () => 0,
      simulationTimeObj: fakeTimeObj,
      dateFromDay: () => fakeTimeObj,
      setNow: jest.fn(),
      changePropRate: jest.fn(),
      changeStaticOffset: jest.fn(),
      calculateSimulationTime: () => fakeTimeObj,
      getOffsetTimeObj: () => fakeTimeObj,
      synchronize: jest.fn(),
    },
    uiManager: {
      hideSideMenus: jest.fn(),
      footerToggle: jest.fn(),
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
      keyHandler: jest.fn(),
      reloadLastSensor: jest.fn(),
      getsensorinfo: jest.fn(),
      hideLoadingScreen: jest.fn(),
      legendHoverMenuClick: jest.fn(),
      searchBox: {
        hideResults: jest.fn(),
        fillResultBox: jest.fn(),
        doArraySearch: jest.fn(),
        doSearch: jest.fn(),
        getCurrentSearch: jest.fn(),
        getLastResultGroup: jest.fn(),
        isHovering: jest.fn(),
        setHoverSat: jest.fn(),
        isResultBoxOpen: jest.fn(),
      },
      mobileManager: {
        fullscreenToggle: jest.fn(),
        checkMobileMode: jest.fn(),
      },
      uiInput: {
        getSatIdFromCoord: () => 0,
        mouseSat: 0,
      },
    },
    watchlist: {
      updateWatchlist: jest.fn(),
    },
  },
};

keepTrackApiStubs.programs.uiManager.searchBox = keepTrackApiStubs.programs.searchBox as unknown as typeof keepTrackApiStubs.programs.searchBox;

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
