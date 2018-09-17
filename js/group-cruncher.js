  var groups = {};
  var satData = {};

  onmessage = function (m) {
    satData = JSON.parse(m.data.satData);
    init();
  };

  function getIdFromIntlDes (intlDes) {
    for (var i = 0; i < satData.length; i++) {
      if (satData[i].intlDes === intlDes) {
        return i;
      }
    }
    return null;
  }
  function searchNameRegex (regex) {
    var res = [];
    for (var i = 0; i < satData.length; i++) {
      if (regex.test(satData[i].ON)) {
        res.push(i);
      }
    }
    return res;
  }
  function searchCountryRegex (regex) {
    var res = [];
    for (var i = 0; i < satData.length; i++) {
      if (regex.test(satData[i].C)) {
        res.push(i);
      }
    }
    return res;
  }
  function getIdFromObjNum (objNum) {
    var scc;
    for (var i = 0; i < satData.length; i++) {
      if (satData[i].static || satData[i].missile) {
        continue;
      } else {
        scc = pad0(satData[i].TLE1.substr(2, 5).trim(), 5);
      }

      if (scc.indexOf(objNum) === 0) { // && satData[i].OBJECT_TYPE !== 'unknown') { // OPTIMIZATION: Determine if this code can be removed.
        return i;
      }
    }
    return null;
  }
  function pad0 (str, max) {
    return str.length < max ? pad0('0' + str, max) : str;
  }


  function SatGroup (groupType, data) {
    var satId;
    var i;
    this.sats = [];
    this.sats2 = [];
    if (groupType === 'intlDes') {
      for (i = 0; i < data.length; i++) {
        var theSatId = getIdFromIntlDes(data[i]);
        if (theSatId === null) continue;
        // TODO: Ugly Fix Later
        this.sats.push({
          satId: data[i],
          isIntlDes: true
        });
        this.sats2[theSatId] = {
          satId: data[i],
          isIntlDes: true
        };
      }
    } else if (groupType === 'nameRegex') {
      data = searchNameRegex(data);
      for (i = 0; i < data.length; i++) {
        // TODO: Ugly Fix Later
        this.sats.push({
          satId: data[i],
          isSCC_NUM: true //Forces Highlighting of Obj Num
        });
        this.sats2[data[i]] = {
          satId: data[i],
          isSCC_NUM: true //Forces Highlighting of Obj Num
        };
      }
    } else if (groupType === 'countryRegex') {
      data = searchCountryRegex(data);
      for (i = 0; i < data.length; i++) {
        // TODO: Ugly Fix Later
        this.sats.push({
          satId: data[i],
          isSCC_NUM: true //Forces Highlighting of Obj Num
        });
        this.sats2[data[i]] = {
          satId: data[i],
          isSCC_NUM: true //Forces Highlighting of Obj Num
        };
      }
    } else if (groupType === 'objNum') {
      for (i = 0; i < data.length; i++) {
        satId = getIdFromObjNum(data[i]);
        if (satId === null) continue;
        // TODO: Ugly Fix Later
        this.sats.push({
          satId: satId,
          isSCC_NUM: true //Forces Highlighting of Obj Num
        });
        this.sats2[satId] = {
          satId: satId,
          isSCC_NUM: true //Forces Highlighting of Obj Num
        };
      }
    } else if (groupType === 'idList') {
      for (i = 0; i < data.length; i++) {
        // TODO: Ugly Fix Later
        this.sats.push({
          satId: data[i],
          isSCC_NUM: true //Forces Highlighting of Obj Num
        });
        this.sats2[i] = {
          satId: data[i],
          isSCC_NUM: true //Forces Highlighting of Obj Num
        };
      }
    }
  }

  function init () {
    // COUNTRIES
    groups.Canada = new SatGroup('countryRegex', /CA/);
    groups.China = new SatGroup('countryRegex', /PRC/);
    groups.France = new SatGroup('countryRegex', /FR/);
    groups.India = new SatGroup('countryRegex', /IND/);
    groups.Israel = new SatGroup('countryRegex', /ISRA/);
    groups.Japan = new SatGroup('countryRegex', /JPN/);
    groups.Russia = new SatGroup('countryRegex', /CIS/);
    groups.UnitedKingdom = new SatGroup('countryRegex', /UK/);
    groups.UnitedStates = new SatGroup('countryRegex', /US/);

    // GROUPS
    groups.SpaceStations = new SatGroup('objNum', [25544, 41765]);
    groups.GlonassGroup = new SatGroup('nameRegex', /GLONASS/);
    groups.GalileoGroup = new SatGroup('nameRegex', /GALILEO/);
    groups.GPSGroup = new SatGroup('nameRegex', /NAVSTAR/);
    groups.AmatuerRadio = new SatGroup('objNum', [7530, 14781, 20442, 22826, 24278, 25338, 25397, 25544, 26931,
      27607, 27844, 27848, 28895, 32785, 32788, 32789, 32791, 33493, 33498, 33499, 35932, 35933, 35935, 37224,
      37839, 37841, 37855, 38760, 39090, 39134, 39136, 39161, 39417, 39430, 39436, 39439, 39440, 39444, 39469,
      39770, 40014, 40021, 40024, 40025, 40030, 40032, 40042, 40043, 40057, 40071, 40074, 40377, 40378, 40379,
      40380, 40654, 40719, 40900, 40903, 40906, 40907, 40908, 40910, 40911, 40912, 40926, 40927, 40928, 40931,
      40967, 40968, 41168, 41171, 41340, 41459, 41460, 41465, 41474, 41600, 41619, 41789, 41932, 41935, 42017]);
    // SCC#s based on Uninon of Concerned Scientists
    groups.MilitarySatellites = new SatGroup('objNum', [40420, 41394, 32783, 35943, 36582, 40353, 40555, 41032, 38010, 38008, 38007, 38009,
      37806, 41121, 41579, 39030, 39234, 28492, 36124, 39194, 36095, 40358, 40258, 37212,
      37398, 38995, 40296, 40900, 39650, 27434, 31601, 36608, 28380, 28521, 36519, 39177,
      40699, 34264, 36358, 39375, 38248, 34807, 28908, 32954, 32955, 32956, 35498, 35500,
      37152, 37154, 38733, 39057, 39058, 39059, 39483, 39484, 39485, 39761, 39762, 39763,
      40920, 40921, 40922, 39765, 29658, 31797, 32283, 32750, 33244, 39208, 26694, 40614,
      20776, 25639, 26695, 30794, 32294, 33055, 39034, 28946, 33751, 33752, 27056, 27057,
      27464, 27465, 27868, 27869, 28419, 28420, 28885, 29273, 32476, 31792, 36834, 37165,
      37875, 37941, 38257, 38354, 39011, 39012, 39013, 39239, 39240, 39241, 39363, 39410,
      40109, 40111, 40143, 40275, 40305, 40310, 40338, 40339, 40340, 40362, 40878, 41026,
      41038, 41473, 28470, 37804, 37234, 29398, 40110, 39209, 39210, 36596]);

      postMessage({
        Canada: groups.Canada,
        China: groups.China,
        France: groups.France,
        India: groups.India,
        Israel: groups.Israel,
        Japan: groups.Japan,
        Russia: groups.Russia,
        UnitedKingdom: groups.UnitedKingdom,
        UnitedStates: groups.UnitedStates,
        SpaceStations: groups.SpaceStations,
        GlonassGroup: groups.GlonassGroup,
        GalileoGroup: groups.GalileoGroup,
        GPSGroup: groups.GPSGroup,
        AmatuerRadio: groups.AmatuerRadio,
        MilitarySatellites: groups.MilitarySatellites
      });
  }
