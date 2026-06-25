import { vi } from 'vitest';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment


import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { Operators } from '@app/app/data/catalogs/sensors';
import { RfSensor } from '@app/app/sensors/DetailedSensor';
import { PositionCruncherIncomingMsg, PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import { CatalogSource, CommLink, Degrees, Kilometers, Milliseconds, Satellite, SpaceObjectType, TleLine1, TleLine2, ZoomValue } from '@ootk/src/main';

const fakeTimeObj = new Date(2022, 0, 1);

fakeTimeObj.setUTCHours(0, 0, 0, 0);

export const defaultSat: Satellite = new Satellite({
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
        satViewDisabled: vi.fn(),
        editSatDisabled: vi.fn(),
        survFenceDisabled: vi.fn(),
        bubbleDisabled: vi.fn(),
        satFovDisabled: vi.fn(),
        planetariumDisabled: vi.fn(),
        mapDisabled: vi.fn(),
        breakupDisabled: vi.fn(),
        ssnLookanglesDisabled: vi.fn(),
        sensorInfoDisabled: vi.fn(),
        lookanglesDisabled: vi.fn(),
        satelliteSelected: vi.fn(),
        sensor: vi.fn(),
        cspocSensors: vi.fn(),
        mwSensors: vi.fn(),
      },
      adviceCount: {
        socrates: 0,
      },
      showAdvice: vi.fn(),
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
        set: vi.fn(),
      },
      camSnap: vi.fn(),
      changeCameraType: vi.fn(),
      changeZoom: vi.fn(),
      lat2pitch: vi.fn(),
      lon2yaw: vi.fn(),
      calculate: vi.fn(),
      update: vi.fn(),
      getCamDist: vi.fn(),
      lookAtPosition: vi.fn(),
      localRotateDif: {
        pitch: 0,
        yaw: 0,
      },
      zoomLevel: () => 0,
      zoomTarget: () => 0,
      autoRotate: vi.fn(),
      state: {
        isAutoRotate: false,
      },
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
      resetObjectTypeFlags: vi.fn(),
      reloadColors: vi.fn(),
      default: () => ({ color: [0, 0, 0, 0] }),
      currentColorScheme: () => ({ color: [0, 0, 0, 0] }),
      calculateColorBuffers: vi.fn(),
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
      resizeCanvas: vi.fn(),
      glInit: vi.fn(),
      gl: global.mocks.glMock,
      canvas: {
        style: {
          cursor: '',
        },
        width: 0,
        height: 0,
      },
      selectSatManager: {
        selectSat: vi.fn(),
      },
      postProcessingManager: {
        init: vi.fn(),
        curBuffer: null,
        programs: {
          occlusion: {
            attrSetup: vi.fn(),
            attrOff: vi.fn(),
            uniformSetup: vi.fn(),
          },
        },
      },
      sceneManager: {
        sun: {
          initGodrays: vi.fn(),
          drawPosition: [0, 0, 0],
          sunvar: {
            gmst: 0,
          },
          draw: vi.fn(),
          drawGodrays: vi.fn(),
          godrays: {
            frameBuffer: {},
          },
          now: fakeTimeObj,
        },
        earth: {
          init: vi.fn(),
          loadHiRes: vi.fn(),
          loadHiResNight: vi.fn(),
          lightDirection: [0, 0, 0],
          draw: vi.fn(),
          drawOcclusion: () => {
            // Do nothing
          },
        },
        moon: {
          draw: vi.fn(),
        },
        skybox: {
          draw: vi.fn(),
        },
        customMeshFactory: {
          creatRadarDome: vi.fn(),
        },
      },
      startWithOrbits: vi.fn(),
    },
    dotsManager: {
      inSunData: new Float32Array([1, 0, 0]),
      inViewData: new Float32Array([1, 0, 0]),
      init: vi.fn(),
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
      draw: vi.fn(),
      drawGpuPickingFrameBuffer: vi.fn(),
      updatePositionBuffer: vi.fn(),
      updateSizeBuffer: vi.fn(),
      updatePMvCamMatrix: vi.fn(),
      sizeBufferOneTime: null,
      sizeData: new Float32Array([1, 0, 0]),
      starIndex2: null,
      pickingColorData: null,
      pickingFrameBuffer: null,
      createPickingProgram: vi.fn(),
      sensorMarkerArray: ['0'],
    },
    groups: null,
    soundManager: {
      play: vi.fn(),
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
        updateOrbits: vi.fn(),
      },
      clearSelect: vi.fn(),
      createGroup: () => ({
        sats: [
          { satId: 1, sccNum: '25544' },
          { satId: 1, sccNum: '25544' },
        ],
        updateOrbits: vi.fn(),
      }),
      selectGroup: vi.fn(),
      selectedGroup: [1, 2, 3],
    },
    lineManager: {
      draw: vi.fn(),
      create: vi.fn(),
      clear: vi.fn(),
      removeStars: vi.fn(),
      getLineListLen: vi.fn(),
      drawWhenSelected: vi.fn(),
    },
    missileManager: {
      getMissileTEARR: vi.fn(),
    },
    meshManager: {
      draw: vi.fn(),
    },
    orbitManager: {
      orbitWorker: {
        postMessage: vi.fn(),
      },
      setSelectOrbit: vi.fn(),
      draw: vi.fn(),
      setHoverOrbit: vi.fn(),
      clearHoverOrbit: vi.fn(),
      clearSelectOrbit: vi.fn(),
      updateOrbitBuffer: vi.fn(),
      clearInViewOrbit: vi.fn(),
      removeInViewOrbit: vi.fn(),
      historyOfSatellitesPlay: vi.fn(),
      program: <WebGLProgram><unknown>null,
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
      setobs: vi.fn(),
      distance: vi.fn(),
      distanceString: vi.fn(),
      setTEARR: vi.fn(),
      eci2ll: () => ({ lat: 0, lon: 0 }),
      altitudeCheck: () => 10000,
      calculateVisMag: () => 6,
      calculateSensorPos: vi.fn(),
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
      getlookangles: vi.fn(),
      getlookanglesMultiSite: vi.fn(),
      findCloseObjects: () => '',
      createTle: () => ({ TLE1: '', TLE2: '' }),
      eci2Rae: vi.fn(),
      findBestPasses: () => vi.fn(),
      findNearbyObjectsByOrbit: () => vi.fn(),
      nextpass: () => '2021-09-21 20:00:00Z',
      getDops: () => ({
        HDOP: 0,
        VDOP: 0,
        TDOP: 0,
        GDOP: 0,
        PDOP: 0,
      }),
      updateDopsTable: vi.fn(),
      map: () => ({ lat: 0, lon: 0 }),
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
      lasthoveringSat: '0',
      lastSelectedSat: () => '1',
      extractCountry: () => 'India',
      setHoveringSat: vi.fn(),
      setLasthoveringSat: vi.fn(),
      extractLaunchSite: () => ({ site: 'test', sitec: 'test' }),
      extractLiftVehicle: vi.fn(),
      launchSiteManager: {
        launchSiteList: ['AFWTR'],
      },
      selectedSat: -1,
      secondarySat: -1,
      setSecondarySat: vi.fn(),
      setSelectedSat_: vi.fn(),
      staticSet: {
        id: '0',
      },
      analSatSet: [defaultSat],
      missileSet: {
        id: '0',
      },
      fieldOfViewSet: {
        id: '0',
      },
      satLinkManager: {
        idToSatnum: vi.fn(),
        showLinks: vi.fn(),
        aehf: [25544],
        dscs: [25544],
        wgs: [25544],
        starlink: [25544],
        sbirs: [25544],
      },
      satCruncherThread: {
        postMessage: vi.fn(),
        sendSatEdit: vi.fn(),
        sendSensorUpdate: vi.fn(),
        sendSunlightViewToggle: vi.fn(),
        sendSatelliteSelected: vi.fn(),
        sendMarkerUpdate: vi.fn(),
        worker: {
          addEventListener: vi.fn(),
          postMessage: vi.fn(),
          onmessage: vi.fn(),
        },
      },
      getIdFromEci: vi.fn(),
      selectSat: vi.fn(),
      satData: [
        { ...defaultSat, ...{ id: '0' } },
        defaultSat,
        { id: '2', type: SpaceObjectType.STAR, name: 'test' },
        { id: '3', type: SpaceObjectType.PHASED_ARRAY_RADAR, static: true, name: 'test' },
      ],
      convertIdArrayToSatnumArray: vi.fn(),
      getIdFromObjNum: () => '0',
      getSensorFromSensorName: () => '0',
      getSatExtraOnly: () => defaultSat,
      getSatFromObjNum: () => defaultSat,
      getSat: () => defaultSat,
      setSat: vi.fn(),
      getIdFromStarName: vi.fn(),
      initGsData: vi.fn(),
      setColorScheme: vi.fn(),
      getSatPosOnly: () => defaultSat,
      getSatInView: () => vi.fn(),
      getScreenCoords: () => ({
        error: false,
      }),
      getSatVel: () => vi.fn(),
      getSatInSun: () => vi.fn(),
      sunECI: { x: 0, y: 0, z: 0 },
      default: '',
      setHover: vi.fn(),
      insertNewAnalystSatellite: () => ({ sccNum: 25544 }),
      getIdFromIntlDes: vi.fn(),
      queryStr: 'search=25544&intldes=1998-A&sat=25544&misl=0,0,0&date=1234567&rate=1&hires=true',
      cosparIndex: { '1998-AB': 5 },
      numSats: 1,
      onCruncherReady: vi.fn(),
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
      hideResults: vi.fn(),
      fillResultBox: vi.fn(),
      doArraySearch: vi.fn(),
      doSearch: vi.fn(),
      getCurrentSearch: vi.fn(),
      getLastResultGroup: vi.fn(),
      isHovering: vi.fn(),
      setHoverSat: vi.fn(),
      isResultBoxOpen: vi.fn(),
    },
    sensorFov: {
      enableFovView: vi.fn(),
    },
    sensorManager: {
      checkSensorSelected: () => false,
      currentSensor: [defaultSensor],
      sensorListUS: [defaultSensor, defaultSensor],
      setCurrentSensor: vi.fn(),
      setSensor: vi.fn(),
      sensorList: { COD: defaultSensor },
    },
    starManager: {
      init: vi.fn(),
      findStarsConstellation: vi.fn(),
      drawConstellations: vi.fn(),
    },
    timeManager: {
      propOffset: 0,
      getPropOffset: () => 0,
      propTimeVar: fakeTimeObj,
      propRate: 0,
      selectedDate: 0,
      getDayOfYear: () => 0,
      updatePropTime: vi.fn(),
      jday: () => 0,
      simulationTimeObj: fakeTimeObj,
      dateFromDay: () => fakeTimeObj,
      setNow: vi.fn(),
      changePropRate: vi.fn(),
      changeStaticOffset: vi.fn(),
      calculateSimulationTime: () => fakeTimeObj,
      getOffsetTimeObj: () => fakeTimeObj,
      synchronize: vi.fn(),
    },
    uiManager: {
      hideSideMenus: vi.fn(),
      footerToggle: vi.fn(),
      toast: vi.fn(),
      colorSchemeChangeAlert: vi.fn(),
      bottomIconPress: vi.fn(),
      legendColorsChange: vi.fn(),
      doSearch: vi.fn(),
      loadStr: vi.fn(),
      searchToggle: vi.fn(),
      legendMenuChange: vi.fn(),
      clearRMBSubMenu: vi.fn(),
      updateURL: vi.fn(),
      keyHandler: vi.fn(),
      reloadLastSensor: vi.fn(),
      getsensorinfo: vi.fn(),
      hideLoadingScreen: vi.fn(),
      legendHoverMenuClick: vi.fn(),
      searchBox: {
        hideResults: vi.fn(),
        fillResultBox: vi.fn(),
        doArraySearch: vi.fn(),
        doSearch: vi.fn(),
        getCurrentSearch: vi.fn(),
        getLastResultGroup: vi.fn(),
        isHovering: vi.fn(),
        setHoverSat: vi.fn(),
        isResultBoxOpen: vi.fn(),
      },
      mobileManager: {
        fullscreenToggle: vi.fn(),
        checkMobileMode: vi.fn(),
      },
      uiInput: {
        getSatIdFromCoord: () => '0',
        mouseSat: '0',
      },
    },
    watchlist: {
      updateWatchlist: vi.fn(),
    },
  },
};

keepTrackApiStubs.programs.uiManager.searchBox = keepTrackApiStubs.programs.searchBox as unknown as typeof keepTrackApiStubs.programs.searchBox;

(keepTrackApiStubs.programs.groupsManager as Record<string, unknown>).Canada = keepTrackApiStubs.programs.groupsManager.SpaceStations;
(keepTrackApiStubs.programs.groupsManager as Record<string, unknown>).Japan = keepTrackApiStubs.programs.groupsManager.SpaceStations;
(keepTrackApiStubs.programs.groupsManager as Record<string, unknown>).France = keepTrackApiStubs.programs.groupsManager.SpaceStations;
(keepTrackApiStubs.programs.groupsManager as Record<string, unknown>).China = keepTrackApiStubs.programs.groupsManager.SpaceStations;
(keepTrackApiStubs.programs.groupsManager as Record<string, unknown>).India = keepTrackApiStubs.programs.groupsManager.SpaceStations;
(keepTrackApiStubs.programs.groupsManager as Record<string, unknown>).Israel = keepTrackApiStubs.programs.groupsManager.SpaceStations;
(keepTrackApiStubs.programs.groupsManager as Record<string, unknown>).Russia = keepTrackApiStubs.programs.groupsManager.SpaceStations;
(keepTrackApiStubs.programs.groupsManager as Record<string, unknown>).UnitedKingdom = keepTrackApiStubs.programs.groupsManager.SpaceStations;
(keepTrackApiStubs.programs.groupsManager as Record<string, unknown>).UnitedStates = keepTrackApiStubs.programs.groupsManager.SpaceStations;
(keepTrackApiStubs.programs as Record<string, unknown>).groups = keepTrackApiStubs.programs.groupsManager;
