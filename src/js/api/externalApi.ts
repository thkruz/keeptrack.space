interface keepTrackApiInterface {
  register: (params: { method: string; cbName: string; cb: () => void }) => void;
  unregister: (params: { method: string; cbName: string }) => void;
  callbacks: any;
  methods: any;
  programs: any;
}

const keepTrackApi: keepTrackApiInterface = {
  register: (params: { method: string; cbName: string; cb: () => void }) => {
    // If this is a valid callback
    if (typeof keepTrackApi.callbacks[params.method] !== 'undefined') {
      // Add the callback
      keepTrackApi.callbacks[params.method].push({ name: params.cbName, cb: params.cb });
    } else {
      throw new Error(`Invalid callback "${params.method}"!`);
    }
    return;
  },
  unregister: (params: { method: string; cbName: string }) => {
    // If this is a valid callback
    if (typeof keepTrackApi.callbacks[params.method] !== 'undefined') {
      for (let i = 0; i < keepTrackApi.callbacks[params.method].length; i++) {
        if (keepTrackApi.callbacks[params.method][i].name == params.cbName) {
          keepTrackApi.callbacks[params.method].splice(i, 1);
          return;
        }
      }
      // If we got this far, it means we couldn't find the callback
      throw new Error(`Callback "${params.cbName} not found"!`);
    } else {
      // Couldn't find the method
      throw new Error(`Invalid callback "${params.method}"!`);
    }
  },
  callbacks: {
    selectSatData: [],
    updateSelectBox: [],
  },
  methods: {
    selectSatData: (sat: any, satId: number) => {
      for (let i = 0; i < keepTrackApi.callbacks.selectSatData.length; i++) {
        keepTrackApi.callbacks.selectSatData[i].cb(sat, satId);
      }
    },
    updateSelectBox: (sat: any) => {
      for (let i = 0; i < keepTrackApi.callbacks.updateSelectBox.length; i++) {
        keepTrackApi.callbacks.updateSelectBox[i].cb(sat);
      }
    },
  },
  programs: {
    timeManager: {},
    settingsManager: {},
    ColorScheme: {},
    drawManager: {},
    missileManager: {},
    objectManager: {},
    orbitManager: {},
    photoManager: {},
    satSet: {},
    satellite: {},
    searchBox: {},
    sensorManager: {},
    starManager: {},
    sMM: {},
    uiManager: {},
    uiInput: {},
  },
};

(<any>window).keepTrackApi = keepTrackApi;
export { keepTrackApi };
