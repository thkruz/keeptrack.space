/* global
  $

  ga
  ColorScheme
  selectSat

  satSet
  orbitDisplay
  settingsManager
  searchBox
  lookangles
*/
(function () {
  var groups = {};
  groups.selectedGroup = null;
  groups.SatGroup = SatGroup;

  function SatGroup (groupType, data) {
    var satId;
    this.sats = [];
    if (groupType === 'intlDes') {
      for (var i = 0; i < data.length; i++) {
        var theSatId = satSet.getIdFromIntlDes(data[i]);
        if (theSatId === null) continue;
        this.sats.push({
          satId: theSatId,
          isIntlDes: true
        });
      }
    } else if (groupType === 'nameRegex') {
      data = satSet.searchNameRegex(data);
      for (i = 0; i < data.length; i++) {
        this.sats.push({
          satId: data[i]
        });
      }
    } else if (groupType === 'countryRegex') {
      data = satSet.searchCountryRegex(data);
      for (i = 0; i < data.length; i++) {
        this.sats.push({
          satId: data[i]
        });
      }
    } else if (groupType === 'objNum') {
      for (i = 0; i < data.length; i++) {
        satId = satSet.getIdFromObjNum(data[i]);
        if (satId === null) continue;
        this.sats.push({
          satId: satId,
          isObjnum: true
        });
      }
    } else if (groupType === 'idList') {
      for (i = 0; i < data.length; i++) {
        this.sats.push({
          satId: data[i]
        });
      }
    }
  }

  SatGroup.prototype.hasSat = function (id) {
    var len = this.sats.length;
    for (var i = 0; i < len; i++) {
      if (this.sats[i].satId === id) return true;
    }
    return false;
  };
  SatGroup.prototype.updateOrbits = function () {
    // What calls the orbit buffer when selected a group from the menu.
    for (var i = 0; i < this.sats.length; i++) {
      orbitDisplay.updateOrbitBuffer(this.sats[i].satId);
    }
  };
  SatGroup.prototype.forEach = function (callback) {
    for (var i = 0; i < this.sats.length; i++) {
      callback(this.sats[i].satId);
    }
  };

  groups.selectGroup = function (group) {
    if (group === null || group === undefined) {
      return;
    }
    groups.selectedGroup = group;
    group.updateOrbits();
    satSet.setColorScheme(ColorScheme.group);
  };
  groups.clearSelect = function () {
    groups.selectedGroup = null;
    if (satSet.currentThe)
    if (settingsManager.currentColorScheme === ColorScheme.default || settingsManager.currentColorScheme === ColorScheme.onlyFOV) {
      if (settingsManager.isOnlyFOVChecked) { satSet.setColorScheme(ColorScheme.onlyFOV, true); }
      if (!settingsManager.isOnlyFOVChecked) { satSet.setColorScheme(ColorScheme.default, true); }
    }
  };
  groups.init = function () {
    var $search = $('#search');
    $('#countries-menu>li').click(function () {
      var groupName = $(this).data('group');
      selectSat(-1); // Clear selected sat
      groups.selectGroup(groups[groupName]);
      searchBox.fillResultBox(groups[groupName].sats, '');

      $search.val('');

      var results = groups[groupName].sats;
      for (var i = 0; i < results.length; i++) {
        var satId = groups[groupName].sats[i].satId;
        var scc = satSet.getSat(satId).SCC_NUM;
        if (i === results.length - 1) {
          $search.val($search.val() + scc);
        } else {
          $search.val($search.val() + scc + ',');
        }
      }

      $('#menu-countries .clear-option').css({display: 'block'}); // Show Clear Option
      $('#menu-countries .country-option').css({display: 'none'}); // Hide Country Options
      $('#menu-countries .menu-title').text('Countries (' + $(this).text() + ')');

      $('#groups-display').css({
        display: 'none'
      });
    });
    $('#colors-menu>li').click(function () {
      selectSat(-1); // clear selected sat
      var colorName = $(this).data('color');
      switch (colorName) {
        case 'default':
          if (satellite.sensorSelected()) {
            uiController.legendMenuChange('default');
          } else {
            uiController.legendMenuChange('default');
          }
          satSet.setColorScheme(ColorScheme.default, true);
          ga('send', 'event', 'ColorScheme Menu', 'Default Color', 'Selected');
          break;
        case 'velocity':
          uiController.legendMenuChange('velocity');
          satSet.setColorScheme(ColorScheme.velocity);
          ga('send', 'event', 'ColorScheme Menu', 'Velocity', 'Selected');
          break;
        case 'near-earth':
          uiController.legendMenuChange('near');
          satSet.setColorScheme(ColorScheme.leo);
          ga('send', 'event', 'ColorScheme Menu', 'near-earth', 'Selected');
          break;
        case 'deep-space':
          uiController.legendMenuChange('deep');
          satSet.setColorScheme(ColorScheme.geo);
          ga('send', 'event', 'ColorScheme Menu', 'Deep-Space', 'Selected');
          break;
        case 'lost-objects':
          $('#search').val('');
          $('#loading-screen').fadeIn('slow', function () {
            satSet.setColorScheme(ColorScheme.lostobjects);
            ga('send', 'event', 'ColorScheme Menu', 'Lost Objects', 'Selected');
            searchBox.doSearch($('#search').val());
            $('#loading-screen').fadeOut();
          });
          break;
        case 'rcs':
          uiController.legendMenuChange('rcs');
          satSet.setColorScheme(ColorScheme.rcs);
          ga('send', 'event', 'ColorScheme Menu', 'RCS', 'Selected');
          break;
        case 'smallsats':
          uiController.legendMenuChange('small');
          satSet.setColorScheme(ColorScheme.smallsats);
          ga('send', 'event', 'ColorScheme Menu', 'Small Satellites', 'Selected');
          break;
      }
    });

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
  };

  window.groups = groups;
})();
