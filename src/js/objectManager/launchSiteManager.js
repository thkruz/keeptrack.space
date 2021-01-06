const launchSiteManager = {};
const launchSiteList = {};
launchSiteList.AFETR = {
  name: 'AFETR',
  lat: 28.46,
  lon: 279.45,
};
launchSiteList.AFWTR = {
  name: 'AFWTR',
  lat: 34.77,
  lon: 239.4,
};
launchSiteList.CAS = {
  name: 'CAS',
  lat: 28.1,
  lon: 344.6,
};
launchSiteList.ERAS = {
  name: 'ERAS',
  lat: 28.46,
  lon: 279.45,
};
launchSiteList.FRGUI = {
  name: 'FRGUI',
  lat: 5.23,
  lon: 307.24,
};
launchSiteList.HGSTR = {
  name: 'HGSTR',
  lat: 31.09,
  lon: 357.17,
};
launchSiteList.JSC = {
  name: 'JSC',
  lat: 41.11,
  lon: 100.46,
};
launchSiteList.KODAK = {
  name: 'KODAK',
  lat: 57.43,
  lon: 207.67,
};
launchSiteList.KSCUT = {
  name: 'KSCUT',
  lat: 31.25,
  lon: 131.07,
};
launchSiteList.KWAJ = {
  name: 'KWAJ',
  lat: 9.04,
  lon: 167.74,
};
launchSiteList.KYMTR = {
  name: 'KYMTR',
  lat: 48.57,
  lon: 46.25,
};
launchSiteList.NSC = {
  name: 'NSC',
  lat: 34.42,
  lon: 127.52,
};
launchSiteList.OREN = {
  name: 'OREN',
  lat: 51.2,
  lon: 59.85,
};
launchSiteList.PKMTR = {
  name: 'PKMTR',
  lat: 62.92,
  lon: 40.57,
};
launchSiteList.PMRF = {
  name: 'PMRF',
  lat: 22.02,
  lon: 200.22,
};
launchSiteList.RLLC = {
  name: 'RLLC',
  lat: -39.26,
  lon: 177.86,
};
launchSiteList.SADOL = {
  name: 'SADOL',
  lat: 75,
  lon: 40,
};
launchSiteList.SEAL = {
  name: 'SEAL',
  lat: 0,
  lon: 210,
};
launchSiteList.SEM = {
  name: 'SEM',
  lat: 35.23,
  lon: 53.92,
};
launchSiteList.SNMLP = {
  name: 'SNMLP',
  lat: 2.94,
  lon: 40.21,
};
launchSiteList.SRI = {
  name: 'SRI',
  lat: 13.73,
  lon: 80.23,
};
launchSiteList.TNSTA = {
  name: 'TNSTA',
  lat: 30.39,
  lon: 130.96,
};
launchSiteList.TSC = {
  name: 'TSC',
  lat: 39.14,
  lon: 111.96,
};
launchSiteList.TTMTR = {
  name: 'TTMTR',
  lat: 45.95,
  lon: 63.35,
};
launchSiteList.TNGH = {
  name: 'TNGH',
  lat: 40.85,
  lon: 129.66,
};
launchSiteList.VOSTO = {
  name: 'VOSTO',
  lat: 51.88,
  lon: 128.33,
};
launchSiteList.WLPIS = {
  name: 'WLPIS',
  lat: 37.84,
  lon: 284.53,
};
launchSiteList.WOMRA = {
  name: 'WOMRA',
  lat: -30.95,
  lon: 136.5,
};
launchSiteList.WRAS = {
  name: 'WRAS',
  lat: 34.77,
  lon: 239.4,
};
launchSiteList.WSC = {
  name: 'WSC',
  lat: 19.61,
  lon: 110.95,
};
launchSiteList.XSC = {
  name: 'XSC',
  lat: 28.24,
  lon: 102.02,
};
launchSiteList.YAVNE = {
  name: 'YAVNE',
  lat: 31.88,
  lon: 34.68,
};
launchSiteList.YUN = {
  name: 'YUN',
  lat: 39.66,
  lon: 124.7,
};

// Non-CSpOC

launchSiteList.AMH = {
  name: 'AMH',
  lat: 58.5107,
  lon: -4.5121,
};

launchSiteList.ALC = {
  name: 'ALC',
  lat: -2.373056,
  lon: -44.396389,
};

launchSiteManager.extractLaunchSite = function (LS) {
  var site;
  var sitec;
  if (LS === 'AMH') {
    site = "A' Mhòine";
    sitec = 'Scotland';
  }

  if (LS === 'ALC') {
    site = 'Alcântara Launch Center';
    sitec = 'Brazil';
  }
  return [site, sitec];
};

launchSiteManager.launchSiteList = launchSiteList;
export { launchSiteManager };
