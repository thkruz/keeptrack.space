const controlSiteManager = {
  controlSiteList: {},
};

controlSiteManager.controlSiteList.shriever = {
  name: 'Schriever AFB, Colorado',
  type: 'Control Facility',
  typeExt: 'Command and Control Center',
  lat: 38.809215,
  lon: -104.531847,
  alt: 1.912,
  linkAehf: true,
  linkWgs: true,
  linkGPS: true,
  linkGalileo: false,
  linkBeidou: false,
  linkGlonass: false,
};

controlSiteManager.controlSiteList.buckley = {
  name: 'Buckley AFB, Colorado',
  type: 'Control Facility',
  typeExt: 'Command and Control Center',
  lat: 39.71735471,
  lon: -104.77775931,
  alt: 1.684,
  linkAehf: true,
  linkWgs: true,
  linkGPS: true,
  linkGalileo: false,
  linkBeidou: false,
  linkGlonass: false,
};

controlSiteManager.controlSiteList.pentagon = {
  name: 'The Pentagon, Washington D.C.',
  type: 'Control Facility',
  typeExt: 'Administration Center',
  lat: 38.87100503,
  lon: -77.05596507,
  alt: 0.009,
  linkAehf: true,
  linkWgs: true,
  linkGPS: false,
  linkGalileo: false,
  linkBeidou: false,
  linkGlonass: false,
};

controlSiteManager.controlSiteList.ramstein = {
  name: 'Ramstein Air Base, Germany',
  type: 'Control Facility',
  typeExt: 'Air Operations Center',
  lat: 49.44072898,
  lon: 7.59974957,
  alt: 0.236,
  linkAehf: true,
  linkWgs: true,
  linkGPS: false,
  linkGalileo: false,
  linkBeidou: false,
  linkGlonass: false,
};

controlSiteManager.controlSiteList.osan = {
  name: 'Osan Air Base, South Korea',
  type: 'Control Facility',
  typeExt: 'Air Operations Center',
  lat: 37.08996594,
  lon: 127.03177929,
  alt: 0.009,
  linkAehf: true,
  linkWgs: true,
  linkGPS: false,
  linkGalileo: false,
  linkBeidou: false,
  linkGlonass: false,
};

controlSiteManager.controlSiteList.aludeid = {
  name: 'Al Udeid Air Base, Qatar',
  type: 'Control Facility',
  typeExt: 'Air Operations Center',
  lat: 25.1180877,
  lon: 51.32117271,
  alt: 0.036,
  linkAehf: true,
  linkWgs: true,
  linkGPS: false,
  linkGalileo: false,
  linkBeidou: false,
  linkGlonass: false,
};

// Starlink Gatways
// https://www.google.com/maps/d/viewer?mid=1H1x8jZs8vfjy60TvKgpbYs_grargieVw
{
  controlSiteManager.controlSiteList.conradMTGateway = {
    name: 'Conrad Gateway, Montana', // https://www.esa.int/Applications/Navigation/Galileo/Galileo_IOV_ground_stations_Fucino
    shortName: 'CMTG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 48.203306,
    lon: -111.945278,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.loringMEGateway = {
    name: 'Loring Gateway, Maine',
    shortName: 'LMEG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 46.91491700000001,
    lon: -67.91952799999999,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.redmondWAGateway = {
    name: 'Redmon Gateway, Washington',
    shortName: 'RWAG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 47.694194,
    lon: -122.032139,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.greenvillePAGateway = {
    name: 'Greenville Gateway, Pennsylvania',
    shortName: 'GPAG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 41.43355599999999,
    lon: -80.33322199999999,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.merrillanWIGateway = {
    name: 'Merrillan Gateway, Wisconsin', //https://fcc.report/IBFS/SES-LIC-20190906-01171
    shortName: 'GPAG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 41.43355599999999,
    lon: -80.33322199999999,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.kalamaWAGateway = {
    name: 'Kalama Gateway, Washington',
    shortName: 'KWAG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 46.03897220000004,
    lon: -122.8082222,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.hawthorneCAGateway = {
    name: 'Hawthorne Gateway, California',
    shortName: 'HCAG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 33.91750000000001,
    lon: -118.32811099999999,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.arbuckleCAGateway = {
    name: 'Arbuckle Gateway, California',
    shortName: 'ACAG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 39.05700000000001,
    lon: -122.06000000000002,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.beekmantownNYGateway = {
    name: 'Beekmantown Gateway, New York',
    shortName: 'BNYG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 42.14548281389402,
    lon: -75.14151331143981,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.charlestonORGateway = {
    name: 'Charleston Gateway, Oregon',
    shortName: 'CORG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 43.24841700000003,
    lon: -124.381194,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.coalvilleUTGateway = {
    name: 'Coalville Gateway, Utah',
    shortName: 'CUTG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 40.94305600000004,
    lon: -111.285,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.panacaNVGateway = {
    name: 'Panaca Gateway, Nevada',
    shortName: 'PNVG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 37.78363900000003,
    lon: -114.69269399999999,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.bocaChicaTXGateway = {
    name: 'Boca Chica Gateway, Texas',
    shortName: 'BTXG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 25.990694000000012,
    lon: -97.18274999999998,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.mcgregorTXGateway = {
    name: 'McGregor Gateway, Texas',
    shortName: 'MTXG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 31.404917000000008,
    lon: -97.438139,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.litchfieldCTGateway = {
    name: 'Litchfield Gateway, Connecticut',
    shortName: 'LCTG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 42.14548281389402,
    lon: -75.14151331143981,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.warrenMOGateway = {
    name: 'Warren Gateway, Missouri',
    shortName: 'WMOG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 38.63516700000001,
    lon: -91.11602799999999,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.nemahaNEGateway = {
    name: 'Nemaha Gateway, Nebraska',
    shortName: 'NNEG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 40.333667000000005,
    lon: -95.815278,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.manistiqueMIGateway = {
    name: 'Manistique Gateway, Michigan',
    shortName: 'MMIG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 45.908611,
    lon: -86.483583,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.slopeCountyNDGateway = {
    name: 'Slope County Gateway, North Dakota',
    shortName: 'SNDG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 46.40838900000001,
    lon: -103.114583,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.losAngelesCAGateway = {
    name: 'Los Angeles Gateway, California',
    shortName: 'LCAG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 34.604027999999985,
    lon: -117.45436100000003,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.cassCountyNDGateway = {
    name: 'Cass County Gateway, North Dakota',
    shortName: 'CNDG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 47.15169400000003,
    lon: -97.408889,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.prudhoeBayAKGateway = {
    name: 'Prudhoe Bay Gateway, Alaska',
    shortName: 'PAKG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 70.24655600000001,
    lon: -148.569,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.sandersonTXGateway = {
    name: 'Sanderson Gateway, Texas',
    shortName: 'STXG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 30.193999999999996,
    lon: -102.89000000000001,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.springerOKGateway = {
    name: 'Springer Gateway, Oklahoma',
    shortName: 'SOKG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 34.2685,
    lon: -97.213167,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.hitterdalMNGateway = {
    name: 'Hitterdal Gateway, Montana',
    shortName: 'HMNG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 46.978916999999996,
    lon: -96.25802800000001,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.tionestaCAGateway = {
    name: 'Tionesta Gateway, California',
    shortName: 'TCAG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 41.644,
    lon: -121.32997199999998,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.butteMTGateway = {
    name: 'Butte Gateway, Montana',
    shortName: 'BMTG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 45.92405600000001,
    lon: -112.513194,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.colburnIDGateway = {
    name: 'Colburn Gateway, Idaho',
    shortName: 'CIDG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 48.34524999999999,
    lon: -116.43933300000002,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.baxleyGAGateway = {
    name: 'Baxley Gateway, Georgia',
    shortName: 'BGAG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 31.68216700000003,
    lon: -82.26897199999999,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.robertsdaleALGateway = {
    name: 'Robertsdale Gateway, Alabama',
    shortName: 'RALG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 30.567000000000025,
    lon: -87.646,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.rollAZGateway = {
    name: 'Roll Gateway, Arizona',
    shortName: 'RAZG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 32.815500000000036,
    lon: -113.798056,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.prosserWAGateway = {
    name: 'Prosser Gateway, Washington',
    shortName: 'PWAG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 46.12727800000001,
    lon: -119.68430499999997,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.vernonUTGateway = {
    name: 'Vernon Gateway, Utah',
    shortName: 'VUTG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 40.07622200000002,
    lon: -112.35472200000001,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.inmanKSGateway = {
    name: 'Inman Gateway, Kansas',
    shortName: 'IKSG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 38.229000000000006,
    lon: -97.921972,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.evanstonWYGateway = {
    name: 'Evanston Gateway, Wyoming',
    shortName: 'EWYG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 41.0925,
    lon: -110.842611,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.puntaGordaFLGateway = {
    name: 'Punta Gorda Gateway, Florida',
    shortName: 'PFLG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 27.019667000000005,
    lon: -81.762028,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.tracyCityTNGateway = {
    name: 'Tracy City Gateway, Tennessee',
    shortName: 'TTNG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 35.19724999999999,
    lon: -85.666,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.kuparukAKGateway = {
    name: 'Kuparuk Gateway, Alaska',
    shortName: 'KAKG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 70.31766700000001,
    lon: -148.941194,
    alt: 0,
    linkStarlink: true,
  };
  controlSiteManager.controlSiteList.gaffneySCGateway = {
    name: 'Gaffney Gateway, South Carolina',
    shortName: 'GSCG',
    type: 'Control Facility',
    typeExt: 'Starlink Gateway',
    lat: 34.98530599999997,
    lon: -81.733083,
    alt: 0,
    linkStarlink: true,
  };
}

// Galileo Ground Station.
// https://gssc.esa.int/navipedia/images/5/5d/Galileo_s_Global_Ground_Segment.jpg
controlSiteManager.controlSiteList.GGS = {
  name: 'Galileo Ground Station, Fucino Italy', // https://www.esa.int/Applications/Navigation/Galileo/Galileo_IOV_ground_stations_Fucino
  shortName: 'GGS',
  type: 'Control Facility',
  lat: 41.978,
  lon: 13.604,
  alt: 0,
  linkAehf: false,
  linkWgs: false,
  linkGPS: false,
  linkGalileo: true,
  linkBeidou: false,
  linkGlonass: false,
};

export { controlSiteManager };
