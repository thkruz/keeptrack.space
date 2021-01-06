import * as $ from 'jquery';
import { MINUTES_PER_DAY, RAD2DEG } from '@app/js/constants.js';
import { SunCalc } from '@app/js/SunCalc/suncalc.js';
import { objectManager } from '@app/js/objectManager/objectManager.js';
import { sMM } from '@app/js/sideMenuManager.js';
import { satSet } from '@app/js/satSet/satSet.js';
import { satellite } from '@app/js/lib/lookangles.js';
import { sensorManager } from '@app/modules/sensorManager.js';
import { settingsManager } from '@app/js/settings.js';
import { timeManager } from '@app/js/timeManager.js';

var isLookanglesMenuOpen = false;
var isselectedSatNegativeOne = false;

var selectSatManager = {};

selectSatManager.init = (groupColorScheme) => {
  selectSatManager.groupColorScheme = groupColorScheme;
};

selectSatManager.selectSat = (satId, cameraManager) => {
  var sat;
  if (satId !== -1) {
    cameraManager.rotateEarth(false);
    sat = satSet.getSat(satId);
    if (sat.type == 'Star') return;
    if ((sat.active == false || typeof sat.active == 'undefined') && typeof sat.staticNum == 'undefined') return; // Non-Missile Non-Sensor Object
  }
  satSet.selectSat(satId);
  cameraManager.camSnapMode = false;

  if (satId === -1) {
    if (settingsManager.currentColorScheme === selectSatManager.groupColorScheme || $('#search').val().length >= 3) {
      // If group selected
      $('#menu-sat-fov').removeClass('bmenu-item-disabled');
    } else {
      $('#menu-sat-fov').removeClass('bmenu-item-selected');
      $('#menu-sat-fov').addClass('bmenu-item-disabled');
      settingsManager.isSatOverflyModeOn = false;
      satSet.satCruncher.postMessage({
        isShowSatOverfly: 'reset',
      });
    }
  }

  if (satId === -1 && !isselectedSatNegativeOne) {
    cameraManager.fts2default();
    isselectedSatNegativeOne = true;
    $('#sat-infobox').fadeOut();
    // $('#iss-stream').html('')
    // $('#iss-stream-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000)
    // Remove Red Box
    $('#menu-lookanglesmultisite').removeClass('bmenu-item-selected');
    $('#menu-lookangles').removeClass('bmenu-item-selected');
    $('#menu-editSat').removeClass('bmenu-item-selected');

    $('#menu-map').removeClass('bmenu-item-selected');
    $('#menu-newLaunch').removeClass('bmenu-item-selected');
    $('#menu-breakup').removeClass('bmenu-item-selected');
    $('#menu-customSensor').removeClass('bmenu-item-selected');
    // Add Grey Out
    $('#menu-lookanglesmultisite').addClass('bmenu-item-disabled');
    $('#menu-lookangles').addClass('bmenu-item-disabled');
    $('#menu-satview').addClass('bmenu-item-disabled');
    $('#menu-editSat').addClass('bmenu-item-disabled');
    $('#menu-map').addClass('bmenu-item-disabled');
    $('#menu-newLaunch').addClass('bmenu-item-disabled');
    $('#menu-breakup').addClass('bmenu-item-disabled');
    // Remove Side Menus
    // $('#lookanglesmultisite-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000)
    // $('#lookangles-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000)
    $('#editSat-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#map-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#newLaunch-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#breakup-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);

    if ($('#search').val().length > 0) {
      $('#search-results').attr('style', 'display: block; max-height:auto');
    }

    // Toggle the side menus as closed
    sMM.isEditSatMenuOpen(false);
    isLookanglesMenuOpen = false;
    settingsManager.isMapMenuOpen = false;
    sMM.isLookanglesMultiSiteMenuOpen(false);
    sMM.isNewLaunchMenuOpen(false);
    sMM.isBreakupMenuOpen(false);
    sMM.isMissileMenuOpen(false);
    sMM.setCustomSensorMenuOpen(false);
  } else if (satId !== -1) {
    if (cameraManager.cameraType.current == cameraManager.cameraType.default) {
      cameraManager.ecLastZoom = cameraManager.zoomLevel;
      cameraManager.cameraType.set(cameraManager.cameraType.fixedToSat);
    }
    isselectedSatNegativeOne = false;
    objectManager.setSelectedSat(satId);
    sat = satSet.getSatExtraOnly(satId);
    if (!sat) return;
    if (sat.type == 'Star') {
      return;
    }
    if (sat.static) {
      if (typeof sat.staticNum == 'undefined') return;
      sat = satSet.getSat(satId);
      if (objectManager.isSensorManagerLoaded) sensorManager.setSensor(null, sat.staticNum); // Pass staticNum to identify which sensor the user clicked
      if (objectManager.isSensorManagerLoaded) sensorManager.curSensorPositon = [sat.position.x, sat.position.y, sat.position.z];
      objectManager.setSelectedSat(-1);
      $('#menu-sensor-info').removeClass('bmenu-item-disabled');
      $('#menu-fov-bubble').removeClass('bmenu-item-disabled');
      $('#menu-surveillance').removeClass('bmenu-item-disabled');
      $('#menu-planetarium').removeClass('bmenu-item-disabled');
      $('#menu-astronomy').removeClass('bmenu-item-disabled');
      if (objectManager.selectedSat !== -1) {
        $('#menu-lookangles').removeClass('bmenu-item-disabled');
      }
      return;
    }
    cameraManager.camZoomSnappedOnSat = true;
    cameraManager.camAngleSnappedOnSat = true;

    if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null) {
      $('#menu-lookangles').removeClass('bmenu-item-disabled');
    }

    $('#menu-lookanglesmultisite').removeClass('bmenu-item-disabled');
    $('#menu-satview').removeClass('bmenu-item-disabled');
    $('#menu-editSat').removeClass('bmenu-item-disabled');
    $('#menu-sat-fov').removeClass('bmenu-item-disabled');
    $('#menu-map').removeClass('bmenu-item-disabled');
    $('#menu-newLaunch').removeClass('bmenu-item-disabled');

    if ($('#search-results').css('display') === 'block') {
      if (window.innerWidth > 1000) {
        if ($('#search').val().length > 0) {
          $('#search-results').attr('style', 'display:block; max-height:27%');
        }
        if (cameraManager.cameraType.current !== cameraManager.cameraType.planetarium) {
          // Unclear why this was needed...
          // uiManager.legendMenuChange('default')
        }
      }
    } else {
      if (window.innerWidth > 1000) {
        if ($('#search').val().length > 0) {
          $('#search-results').attr('style', 'display:block; max-height:auto');
        }
        if (cameraManager.cameraType.current !== cameraManager.cameraType.planetarium) {
          // Unclear why this was needed...
          // uiManager.legendMenuChange('default')
        }
      }
    }

    if (!sat.missile) {
      $('.sat-only-info').show();
    } else {
      $('.sat-only-info').hide();
    }

    $('#sat-infobox').fadeIn();
    $('#sat-info-title').html(sat.ON);

    if (sat.URL && sat.URL !== '') {
      $('#sat-info-title').html("<a class='iframe' href='" + sat.URL + "'>" + sat.ON + '</a>');
    }

    $('#edit-satinfo-link').html("<a class='iframe' href='editor.htm?scc=" + sat.SCC_NUM + "&popup=true'>Edit Satellite Info</a>");

    $('#sat-intl-des').html(sat.intlDes);
    if (sat.OT === 'unknown') {
      $('#sat-objnum').html(1 + sat.TLE2.substr(2, 7).toString());
    } else {
      //      $('#sat-objnum').html(sat.TLE2.substr(2,7))
      $('#sat-objnum').html(sat.SCC_NUM);
      if (settingsManager.isOfficialWebsite) {
        // ga('send', 'event', 'Satellite', 'SCC: ' + sat.SCC_NUM, 'SCC Number');
      }
    }

    var objtype;
    if (sat.OT === 0) {
      objtype = 'TBA';
    }
    if (sat.OT === 1) {
      objtype = 'Payload';
    }
    if (sat.OT === 2) {
      objtype = 'Rocket Body';
    }
    if (sat.OT === 3) {
      objtype = 'Debris';
    }
    if (sat.OT === 4) {
      if (settingsManager.offline) {
        objtype = 'Special';
      } else {
        objtype = 'Amateur Sat';
      }
    }
    if (sat.OT === 5) {
      objtype = 'Measurement';
    }
    if (sat.OT === 6) {
      objtype = 'Radar Track';
    }
    if (sat.OT === 7) {
      objtype = 'Radar Object';
    }
    if (sat.missile) {
      objtype = 'Ballistic Missile';
    }
    $('#sat-type').html(objtype);

    // /////////////////////////////////////////////////////////////////////////
    // Country Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    var country;
    country = objectManager.extractCountry(sat.C);
    $('#sat-country').html(country);

    // /////////////////////////////////////////////////////////////////////////
    // Launch Site Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    var site = [];
    var missileLV;
    var missileOrigin;
    var satLvString;
    if (sat.missile) {
      site = sat.desc.split('(');
      missileOrigin = site[0].substr(0, site[0].length - 1);
      missileLV = sat.desc.split('(')[1].split(')')[0]; // Remove the () from the booster type

      site.site = missileOrigin;
      site.sitec = sat.C;
    } else {
      site = objectManager.extractLaunchSite(sat.LS);
    }

    $('#sat-site').html(site.site);
    $('#sat-sitec').html(site.sitec);

    if (settingsManager.isOfficialWebsite) {
      // ga('send', 'event', 'Satellite', 'Country: ' + country, 'Country');
    }
    if (settingsManager.isOfficialWebsite) {
      // ga('send', 'event', 'Satellite', 'Site: ' + site, 'Site');
    }

    // /////////////////////////////////////////////////////////////////////////
    // Launch Vehicle Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    if (sat.missile) {
      sat.LV = missileLV;
      $('#sat-vehicle').html(sat.LV);
    } else {
      $('#sat-vehicle').html(sat.LV); // Set to JSON record
      if (sat.LV === 'U') {
        $('#sat-vehicle').html('Unknown');
      } // Replace with Unknown if necessary
      satLvString = objectManager.extractLiftVehicle(sat.LV); // Replace with link if available
      $('#sat-vehicle').html(satLvString);
    }

    // /////////////////////////////////////////////////////////////////////////
    // RCS Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    if (sat.R === null || typeof sat.R == 'undefined') {
      $('#sat-rcs').html('Unknown');
    } else {
      var rcs;
      if (sat.R < 0.1) {
        rcs = 'Small';
      }
      if (sat.R >= 0.1) {
        rcs = 'Medium';
      }
      if (sat.R > 1) {
        rcs = 'Large';
      }
      $('#sat-rcs').html(rcs);
      $('#sat-rcs').tooltip({ delay: 50, html: sat.R, position: 'left' });
    }

    if (!sat.missile) {
      $('a.iframe').colorbox({
        iframe: true,
        width: '80%',
        height: '80%',
        fastIframe: false,
        closeButton: false,
      });
      $('#sat-apogee').html(sat.apogee.toFixed(0) + ' km');
      $('#sat-perigee').html(sat.perigee.toFixed(0) + ' km');
      $('#sat-inclination').html((sat.inclination * RAD2DEG).toFixed(2) + '°');
      $('#sat-eccentricity').html(sat.eccentricity.toFixed(3));

      $('#sat-period').html(sat.period.toFixed(2) + ' min');
      $('#sat-period').tooltip({
        delay: 50,
        html: 'Mean Motion: ' + MINUTES_PER_DAY / sat.period.toFixed(2),
        position: 'left',
      });

      if (typeof sat.U != 'undefined' && sat.U != '') {
        $('#sat-user').html(sat.U);
      } else {
        $('#sat-user').html('Unknown');
      }
      if (typeof sat.P != 'undefined' && sat.P != '') {
        $('#sat-purpose').html(sat.P);
      } else {
        $('#sat-purpose').html('Unknown');
      }
      if (typeof sat.Con != 'undefined' && sat.Con != '') {
        $('#sat-contractor').html(sat.Con);
      } else {
        $('#sat-contractor').html('Unknown');
      }
      if (typeof sat.LM != 'undefined' && sat.LM != '') {
        $('#sat-lmass').html(sat.LM + ' kg');
      } else {
        $('#sat-lmass').html('Unknown');
      }
      if (typeof sat.DM != 'undefined' && sat.DM != '') {
        $('#sat-dmass').html(sat.DM + ' kg');
      } else {
        $('#sat-dmass').html('Unknown');
      }
      if (typeof sat.Li != 'undefined' && sat.Li != '') {
        $('#sat-life').html(sat.Li + ' yrs');
      } else {
        $('#sat-life').html('Unknown');
      }
      if (typeof sat.Pw != 'undefined' && sat.Pw != '') {
        $('#sat-power').html(sat.Pw + ' w');
      } else {
        $('#sat-power').html('Unknown');
      }
      if (typeof sat.vmag != 'undefined' && sat.vmag != '') {
        $('#sat-vmag').html(sat.vmag);
      } else {
        $('#sat-vmag').html('Unknown');
      }
      if (typeof sat.S1 != 'undefined' && sat.S1 != '') {
        $('#sat-source1').html(`<a class="iframe" href="${sat.S1}">${sat.S1.split('//').splice(1)}</a>`);
        $('#sat-source1w').show();
      } else {
        $('#sat-source1').html('Unknown');
        $('#sat-source1w').hide();
      }
      if (typeof sat.S2 != 'undefined' && sat.S2 != '') {
        $('#sat-source2').html(`<a class="iframe" href="${sat.S2}">${sat.S2.split('//').splice(1)}</a>`);
        $('#sat-source2w').show();
      } else {
        $('#sat-source2').html('Unknown');
        $('#sat-source2w').hide();
      }
      if (typeof sat.S3 != 'undefined' && sat.S3 != '') {
        $('#sat-source3').html(`<a class="iframe" href="${sat.S3}">${sat.S3.split('//').splice(1)}</a>`);
        $('#sat-source3w').show();
      } else {
        $('#sat-source3').html('Unknown');
        $('#sat-source3w').hide();
      }
      if (typeof sat.S4 != 'undefined' && sat.S4 != '') {
        $('#sat-source4').html(`<a class="iframe" href="${sat.S4}">${sat.S4.split('//').splice(1)}</a>`);
        $('#sat-source4w').show();
      } else {
        $('#sat-source4').html('Unknown');
        $('#sat-source4w').hide();
      }
      if (typeof sat.S5 != 'undefined' && sat.S5 != '') {
        $('#sat-source5').html(`<a class="iframe" href="${sat.S5}">${sat.S5.split('//').splice(1)}</a>`);
        $('#sat-source5w').show();
      } else {
        $('#sat-source5').html('Unknown');
        $('#sat-source5w').hide();
      }
      if (typeof sat.S6 != 'undefined' && sat.S6 != '') {
        $('#sat-source6').html(`<a class="iframe" href="${sat.S6}">${sat.S6.split('//').splice(1)}</a>`);
        $('#sat-source6w').show();
      } else {
        $('#sat-source6').html('Unknown');
        $('#sat-source6w').hide();
      }
      if (typeof sat.S7 != 'undefined' && sat.S7 != '') {
        $('#sat-source7').html(`<a class="iframe" href="${sat.S7}">${sat.S7.split('//').splice(1)}</a>`);
        $('#sat-source7w').show();
      } else {
        $('#sat-source7').html('Unknown');
        $('#sat-source7w').hide();
      }
      if (typeof sat.URL != 'undefined' && sat.URL != '') {
        $('#sat-source8').html(`<a class="iframe" href="${sat.URL}">${sat.URL.split('//').splice(1)}</a>`);
        $('#sat-source8w').show();
      } else {
        $('#sat-source8').html('Unknown');
        $('#sat-source8w').hide();
      }
      $('a.iframe').colorbox({
        iframe: true,
        width: '80%',
        height: '80%',
        fastIframe: false,
        closeButton: false,
      });

      // TODO: Error checking on Iframe

      var now = new Date();
      var jday = timeManager.getDayOfYear(now);
      now = now.getFullYear();
      now = now.toString().substr(2, 2);
      var daysold;
      if (satSet.getSat(satId).TLE1.substr(18, 2) === now) {
        daysold = jday - satSet.getSat(satId).TLE1.substr(20, 3);
      } else {
        daysold = jday + parseInt(now) * 365 - (parseInt(satSet.getSat(satId).TLE1.substr(18, 2)) * 365 + parseInt(satSet.getSat(satId).TLE1.substr(20, 3)));
      }
      $('#sat-elset-age').html(daysold + ' Days');
      $('#sat-elset-age').tooltip({
        delay: 50,
        html: 'Epoch Year: ' + sat.TLE1.substr(18, 2).toString() + ' Day: ' + sat.TLE1.substr(20, 8).toString(),
        position: 'left',
      });

      if (!objectManager.isSensorManagerLoaded) {
        $('#sat-sun').parent().hide();
      } else {
        now = new Date(timeManager.propRealTime + timeManager.propOffset);
        var sunTime = SunCalc.getTimes(now, sensorManager.currentSensor.lat, sensorManager.currentSensor.long);
        var satInSun = sat.isInSun;
        // If No Sensor, then Ignore Sun Exclusion
        if (sensorManager.currentSensor.lat == null) {
          if (satInSun == 0) $('#sat-sun').html('No Sunlight');
          if (satInSun == 1) $('#sat-sun').html('Limited Sunlight');
          if (satInSun == 2) $('#sat-sun').html('Direct Sunlight');
          // If Radar Selected, then Say the Sun Doesn't Matter
        } else if (sensorManager.currentSensor.type !== 'Optical' && sensorManager.currentSensor.type !== 'Observer') {
          $('#sat-sun').html('No Effect');
          // If Dawn Dusk Can be Calculated then show if the satellite is in the sun
        } else if (sunTime.dawn.getTime() - now > 0 || sunTime.dusk.getTime() - now < 0) {
          if (satInSun == 0) $('#sat-sun').html('No Sunlight');
          if (satInSun == 1) $('#sat-sun').html('Limited Sunlight');
          if (satInSun == 2) $('#sat-sun').html('Direct Sunlight');
          // If Optical Sesnor but Dawn Dusk Can't Be Calculated, then you are at a
          // high latitude and we need to figure that out
        } else if (sunTime.night != 'Invalid Date' && (sunTime.dawn == 'Invalid Date' || sunTime.dusk == 'Invalid Date')) {
          if (satInSun == 0) $('#sat-sun').html('No Sunlight');
          if (satInSun == 1) $('#sat-sun').html('Limited Sunlight');
          if (satInSun == 2) $('#sat-sun').html('Direct Sunlight');
        } else {
          // Unless you are in sun exclusion
          $('#sat-sun').html('Sun Exclusion');
        }
      }
    }
    if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null) {
      if (isLookanglesMenuOpen) {
        satellite.getlookangles(sat);
      }
    }
  }

  objectManager.setSelectedSat(satId);

  if (satId !== -1) {
    if (typeof sat.TTP != 'undefined') {
      $('#sat-ttp-wrapper').show();
      $('#sat-ttp').html(sat.TTP);
    } else {
      $('#sat-ttp-wrapper').hide();
    }
    if (typeof sat.NOTES != 'undefined') {
      $('#sat-notes-wrapper').show();
      $('#sat-notes').html(sat.NOTES);
    } else {
      $('#sat-notes-wrapper').hide();
    }
    if (typeof sat.FMISSED != 'undefined') {
      $('#sat-fmissed-wrapper').show();
      $('#sat-fmissed').html(sat.FMISSED);
    } else {
      $('#sat-fmissed-wrapper').hide();
    }
    if (typeof sat.ORPO != 'undefined') {
      $('#sat-oRPO-wrapper').show();
      $('#sat-oRPO').html(sat.ORPO);
    } else {
      $('#sat-oRPO-wrapper').hide();
    }
    if (typeof sat.constellation != 'undefined') {
      $('#sat-constellation-wrapper').show();
      $('#sat-constellation').html(sat.constellation);
    } else {
      $('#sat-constellation-wrapper').hide();
    }
    if (typeof sat.maneuver != 'undefined') {
      $('#sat-maneuver-wrapper').show();
      $('#sat-maneuver').html(sat.maneuver);
    } else {
      $('#sat-maneuver-wrapper').hide();
    }
    if (typeof sat.associates != 'undefined') {
      $('#sat-associates-wrapper').show();
      $('#sat-associates').html(sat.associates);
    } else {
      $('#sat-associates-wrapper').hide();
    }

    // ISS Stream Slows Down a Lot Of Computers
    // if (sat.SCC_NUM === '25544') { // ISS is Selected
    //   $('#iss-stream-menu').show()
    //   $('#iss-stream').html('<iframe src="http://www.ustream.tv/embed/17074538?html5ui=1" allowfullscreen="true" webkitallowfullscreen="true" scrolling="no" frameborder="0" style="border: 0px none transparent"></iframe><iframe src="http://www.ustream.tv/embed/9408562?html5ui=1" allowfullscreen="true" webkitallowfullscreen="true" scrolling="no" frameborder="0" style="border: 0px none transparent"></iframe><br />' +
    //                         '<iframe src="http://www.ustream.tv/embed/6540154?html5ui=1" allowfullscreen="true" webkitallowfullscreen="true" scrolling="no" frameborder="0" style="border: 0px none transparent"></iframe><iframe src="http://cdn.livestream.com/embed/spaceflightnow?layout=4&ampheight=340&ampwidth=560&ampautoplay=false" style="border:0outline:0" frameborder="0" scrolling="no"></iframe>')
    // } else {
    //   $('#iss-stream').html('')
    //   $('#iss-stream-menu').hide()
    // }
  }
};

export { selectSatManager, isselectedSatNegativeOne };
