// Contorl Site Manager (controlSiteManager)
(function () {
  var controlSiteManager = {};
  var controlSiteList = {};
  controlSiteList.shriever = {
    name: 'Schriever AFB, Colorado',
    type: 'Control Facility',
    typeExt: 'Command and Control Center',
    lat: 38.809215,
    lon: -104.531847,
    alt: 1.912,
    linkAEHF: true,
    linkWGS: true,
    linkGPS: true,
    linkGalileo: false,
    linkBeidou: false,
    linkGlonass: false
  };

  controlSiteList.buckley = {
    name: 'Buckley AFB, Colorado',
    type: 'Control Facility',
    typeExt: 'Command and Control Center',
    lat: 39.71735471,
    lon: -104.77775931,
    alt: 1.684,
    linkAEHF: true,
    linkWGS: true,
    linkGPS: true,
    linkGalileo: false,
    linkBeidou: false,
    linkGlonass: false
  };

  controlSiteList.pentagon = {
    name: 'The Pentagon, Washington D.C.',
    type: 'Control Facility',
    typeExt: 'Administration Center',
    lat: 38.87100503,
    lon: -77.05596507,
    alt: 0.009,
    linkAEHF: true,
    linkWGS: true,
    linkGPS: false,
    linkGalileo: false,
    linkBeidou: false,
    linkGlonass: false
  };

  controlSiteList.ramstein = {
    name: 'Ramstein Air Base, Germany',
    type: 'Control Facility',
    typeExt: 'Air Operations Center',
    lat: 49.44072898,
    lon: 7.59974957,
    alt: 0.236,
    linkAEHF: true,
    linkWGS: true,
    linkGPS: false,
    linkGalileo: false,
    linkBeidou: false,
    linkGlonass: false
  };

  controlSiteList.osan = {
    name: 'Osan Air Base, South Korea',
    type: 'Control Facility',
    typeExt: 'Air Operations Center',
    lat: 37.08996594,
    lon: 127.03177929,
    alt: 0.009,
    linkAEHF: true,
    linkWGS: true,
    linkGPS: false,
    linkGalileo: false,
    linkBeidou: false,
    linkGlonass: false
  };

  controlSiteList.aludeid = {
    name: 'Al Udeid Air Base, Qatar',
    type: 'Control Facility',
    typeExt: 'Air Operations Center',
    lat: 25.1180877,
    lon: 51.32117271,
    alt: 0.036,
    linkAEHF: true,
    linkWGS: true,
    linkGPS: false,
    linkGalileo: false,
    linkBeidou: false,
    linkGlonass: false
  };

  controlSiteManager.controlSiteList = controlSiteList;
  window.controlSiteManager = controlSiteManager;
})();
