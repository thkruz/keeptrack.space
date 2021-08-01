interface keepTrackApiInterface {
  html: (strings: TemplateStringsArray, ...placeholders: any[]) => string;
  register: (params: { method: string; cbName: string; cb: any }) => void;
  unregister: (params: { method: string; cbName: string }) => void;
  callbacks: any;
  methods: any;
  programs: any;
}

const keepTrackApi: keepTrackApiInterface = {
  html: (strings: TemplateStringsArray, ...placeholders: any[]) => {
    for (const placeholder of placeholders) {
      if (typeof placeholder !== 'string') {
        throw Error('Invalid input');
      }
    }
    return String.raw(strings, ...placeholders);
  },
  register: (params: { method: string; cbName: string; cb: any }) => {
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
    onCruncherReady: [],
    onCruncherMessage: [],
    uiManagerInit: [],
    uiManagerOnReady: [],
    bottomMenuClick: [],
    hideSideMenus: [],
    nightToggle: [],
    orbitManagerInit: [],
    adviceReady: [],
    drawManagerLoadScene: [],
    drawOptionalScenery: [],
    updateLoop: [],
    rmbMenuActions: [],
    rightBtnMenuAdd: [],
    updateDateTime: [],
    uiManagerFinal: [],
  },
  methods: {
    selectSatData: (sat: any, satId: number) => {
      keepTrackApi.callbacks.selectSatData.forEach((cb: any) => cb.cb(sat, satId));
    },
    updateSelectBox: (sat: any) => {
      keepTrackApi.callbacks.updateSelectBox.forEach((cb: any) => cb.cb(sat));
    },
    onCruncherReady: () => {
      keepTrackApi.callbacks.onCruncherReady.forEach((cb: any) => cb.cb());
    },
    onCruncherMessage: () => {
      keepTrackApi.callbacks.onCruncherMessage.forEach((cb: any) => cb.cb());
    },
    uiManagerInit: () => {
      keepTrackApi.callbacks.uiManagerInit.forEach((cb: any) => cb.cb());
    },
    uiManagerOnReady: () => {
      keepTrackApi.callbacks.uiManagerOnReady.forEach((cb: any) => cb.cb());
    },
    bottomMenuClick: (iconName: string) => {
      keepTrackApi.callbacks.bottomMenuClick.forEach((cb: any) => cb.cb(iconName));
    },
    hideSideMenus: () => {
      keepTrackApi.callbacks.hideSideMenus.forEach((cb: any) => cb.cb());
    },
    nightToggle: (gl: any, nightTexture: any, texture: any) => {
      keepTrackApi.callbacks.nightToggle.forEach((cb: any) => cb.cb(gl, nightTexture, texture));
    },
    orbitManagerInit: () => {
      keepTrackApi.callbacks.orbitManagerInit.forEach((cb: any) => cb.cb());
    },
    adviceReady: () => {
      keepTrackApi.callbacks.adviceReady.forEach((cb: any) => cb.cb());
    },
    drawManagerLoadScene: () => {
      keepTrackApi.callbacks.drawManagerLoadScene.forEach((cb: any) => cb.cb());
    },
    drawOptionalScenery: () => {
      keepTrackApi.callbacks.drawOptionalScenery.forEach((cb: any) => cb.cb());
    },
    updateLoop: () => {
      keepTrackApi.callbacks.updateLoop.forEach((cb: any) => cb.cb());
    },
    rmbMenuActions: (menuName: string) => {
      keepTrackApi.callbacks.rmbMenuActions.forEach((cb: any) => cb.cb(menuName));
    },
    rightBtnMenuAdd: () => {
      keepTrackApi.callbacks.rightBtnMenuAdd.forEach((cb: any) => cb.cb());
    },
    updateDateTime: (date: Date) => {
      keepTrackApi.callbacks.updateDateTime.forEach((cb: any) => cb.cb(date));
    },
    uiManagerFinal: () => {
      keepTrackApi.callbacks.uiManagerFinal.forEach((cb: any) => cb.cb());
    },
  },
  programs: {
    timeManager: {},
    settingsManager: {},
    ColorScheme: {},
    drawManager: {},
    mapManager: {},
    missileManager: {},
    objectManager: {},
    orbitManager: {},
    photoManager: {},
    satSet: {},
    satellite: {},
    searchBox: {},
    sensorManager: {},
    starManager: {},
    uiManager: {},
    uiInput: {},    
  },
};

(<any>window).keepTrackApi = keepTrackApi;
export { keepTrackApi };
