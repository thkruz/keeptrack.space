import { keepTrackApi } from '@app/js/api/externalApi';
import { SatObject } from '@app/js/api/keepTrack';
import { MINUTES_PER_DAY, RAD2DEG } from '@app/js/lib/constants.js';
import { SunCalc } from '@app/js/lib/suncalc.js';

const satInfoboxCore = {
  sensorInfo: {
    isLoaded: false,
  },
  launchData: {
    isLoaded: false,
  },
  orbitalData: {
    isLoaded: false,
  },
  satMissionData: {
    isLoaded: false,
  },
};

export const sensorInfo = (sat: SatObject): void => {
  if (!satInfoboxCore.sensorInfo.isLoaded && settingsManager.plugins.sensor) {
    $('#sat-infobox').append(keepTrackApi.html`
        <div id="sensor-sat-info">
          <li class="divider"></li>
          <div class="sat-info-row">
            <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
              data-tooltip="Distance from the Sensor">
              Range
            </div>
            <div class="sat-info-value" id="sat-range">xxxx km</div>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
              data-tooltip="Angle (Left/Right) from the Sensor">
              Azimuth
            </div>
            <div class="sat-info-value" id="sat-azimuth">XX deg</div>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
              data-tooltip="Angle (Up/Down) from the Sensor">
              Elevation
            </div>
            <div class="sat-info-value" id="sat-elevation">XX deg</div>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
              data-tooltip="Linear Width at Target's Range">
              Beam Width
            </div>
            <div class="sat-info-value" id="sat-beamwidth">xxxx km</div>
          </div>
          <div class="sat-info-row">
            <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
              data-tooltip="Time for RF/Light to Reach Target">
              Max Tmx Time
            </div>
            <div class="sat-info-value" id="sat-maxTmx">xxxx ms</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
              data-tooltip="Is the Sun Affected the Sensor">
              Sun
            </div>
            <div class="sat-info-value" id="sat-sun">Sun Stuff</div>
          </div>
          <div id="sat-info-nextpass-row" class="sat-info-row sat-only-info">
            <div id="sat-info-nextpass" class="sat-info-key  tooltipped" data-position="left" data-delay="50"
              data-tooltip="Next Time in Coverage">
              Next Pass
            </div>
            <div id="sat-nextpass" class="sat-info-value">00:00:00z</div>
          </div>
        </div> 
        `);
    satInfoboxCore.sensorInfo.isLoaded = true;
  }

  // If we are using the sensor manager plugin then we should hide the sensor to satellite
  // info when there is no sensor selected
  if (settingsManager.plugins.sensor) {
    if (keepTrackApi.programs.sensorManager.checkSensorSelected()) {
      $('#sensor-sat-info').show();
    } else {
      $('#sensor-sat-info').hide();
    }
  }

  if (!sat.missile) {
    $('.sat-only-info').show();
  } else {
    $('.sat-only-info').hide();
  }
};
export const launchData = (sat: SatObject): void => {
  if (!satInfoboxCore.launchData.isLoaded) {
    $('#sat-infobox').append(`
          <li class="divider"></li>
          <div class="sat-info-row">
            <div class="sat-info-key">Type</div>
            <div class="sat-info-value" id="sat-type">PAYLOAD</div>
          </div>
          <div class="sat-info-row sat-only-info">
          <div class="sat-info-key">Country</div>
          <div class="sat-info-value" id="sat-country">COUNTRY</div>
          </div>
          <div class="sat-info-row" id="sat-site-row">
            <div class="sat-info-key">Site</div>
            <div class="sat-info-value" id="sat-site">SITE</div>
            </div>
          <div class="sat-info-row">
          <div class="sat-info-key"></div>
          <div class="sat-info-value" id="sat-sitec">LAUNCH COUNTRY</div>
          </div>
          <div class="sat-info-row">
          <div class="sat-info-key">Rocket</div>
          <div class="sat-info-value" id="sat-vehicle">VEHICLE</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key">RCS</div>
            <div class="sat-info-value" id="sat-rcs">NO DATA</div>
          </div>  
        `);
    satInfoboxCore.launchData.isLoaded = true;
  }

  // /////////////////////////////////////////////////////////////////////////
  // Country Correlation Table
  // /////////////////////////////////////////////////////////////////////////
  const country = keepTrackApi.programs.objectManager.extractCountry(sat.C);
  $('#sat-country').html(country);

  // /////////////////////////////////////////////////////////////////////////
  // Launch Site Correlation Table
  // /////////////////////////////////////////////////////////////////////////
  let siteArr = [];
  let site = {} as any;
  let missileLV: any;
  let missileOrigin: any;
  let satLvString: any;
  if (sat.missile) {
    siteArr = sat.desc.split('(');
    missileOrigin = siteArr[0].substr(0, siteArr[0].length - 1);
    missileLV = sat.desc.split('(')[1].split(')')[0]; // Remove the () from the booster type

    site.site = missileOrigin;
    site.sitec = sat.C;
  } else {
    site = keepTrackApi.programs.objectManager.extractLaunchSite(sat.LS);
  }

  $('#sat-site').html(site.site);
  $('#sat-sitec').html(site.sitec);

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
    satLvString = keepTrackApi.programs.objectManager.extractLiftVehicle(sat.LV); // Replace with link if available
    $('#sat-vehicle').html(satLvString);
  }

  $('a.iframe').colorbox({
    iframe: true,
    width: '80%',
    height: '80%',
    fastIframe: false,
    closeButton: false,
  });
};
export const nearObjectsLinkClick = (): void => {
  const { uiManager, satSet, objectManager } = keepTrackApi.programs;
  if (objectManager.selectedSat === -1) {
    return;
  }
  const sat = objectManager.selectedSat;
  const SCCs = [];
  let pos = satSet.getSatPosOnly(sat).position;
  const posXmin = pos.x - 100;
  const posXmax = pos.x + 100;
  const posYmin = pos.y - 100;
  const posYmax = pos.y + 100;
  const posZmin = pos.z - 100;
  const posZmax = pos.z + 100;
  $('#search').val('');
  for (let i = 0; i < satSet.numSats; i++) {
    pos = satSet.getSatPosOnly(i).position;
    if (pos.x < posXmax && pos.x > posXmin && pos.y < posYmax && pos.y > posYmin && pos.z < posZmax && pos.z > posZmin) {
      SCCs.push(satSet.getSatExtraOnly(i).SCC_NUM);
    }
  }

  for (let i = 0; i < SCCs.length; i++) {
    if (i < SCCs.length - 1) {
      $('#search').val($('#search').val() + SCCs[i] + ',');
    } else {
      $('#search').val($('#search').val() + SCCs[i]);
    }
  }

  uiManager.doSearch($('#search').val());
};
export const nearOrbitsLink = () => {
  const { satSet, searchBox, satellite } = keepTrackApi.programs;
  // searchBox.doArraySearch(satellite.findNearbyObjectsByOrbit(satSet.getSat(objectManager.selectedSat)));
  const searchStr = searchBox.doArraySearch(satellite.findNearbyObjectsByOrbit(satSet.getSat(keepTrackApi.programs.objectManager.selectedSat)));
  searchBox.doSearch(searchStr, false);
};
export const allObjectsLink = (): void => {
  const { uiManager, satSet, objectManager } = keepTrackApi.programs;
  if (objectManager.selectedSat === -1) {
    return;
  }
  const intldes = satSet.getSatExtraOnly(objectManager.selectedSat).intlDes;
  const searchStr = intldes.slice(0, 8);
  uiManager.doSearch(searchStr);
  $('#search').val(searchStr);
};
export const orbitalData = (sat: SatObject): void => {
  if (!satInfoboxCore.orbitalData.isLoaded) {
    $('#ui-wrapper').append(keepTrackApi.html`
          <div id="sat-infobox" class="text-select">
            <div id="sat-info-top-links">
              <div id="sat-info-title" class="center-text">This is a title</div>
              <div id="all-objects-link" class="link sat-infobox-links sat-only-info">Find all objects from this launch...</div>
              <div id="near-orbits-link" class="link sat-infobox-links sat-only-info">Find all objects near this orbit...</div>
              <div id="near-objects-link" class="link sat-infobox-links">Find all objects near this object...</div>              
            </div>
            <li class="divider"></li>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key">COSPAR</div>
              <div class="sat-info-value" id="sat-intl-des">xxxx-xxxA</div>
            </div>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key">NORAD</div>
              <div class="sat-info-value" id="sat-objnum">99999</div>
            </div>          
            <li class="divider"></li>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key tooltipped" data-position="left" data-delay="50"
                data-tooltip="Highest Point in the Orbit">
                Apogee
              </div>
              <div class="sat-info-value" id="sat-apogee">xxx km</div>
            </div>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key tooltipped" data-position="left" data-delay="50"
                data-tooltip="Lowest Point in the Orbit">
                Perigee
              </div>
              <div class="sat-info-value" id="sat-perigee">xxx km</div>
            </div>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key tooltipped" data-position="left" data-delay="50"
                data-tooltip="Angle Measured from Equator on the Ascending Node">
                Inclination
              </div>
              <div class="sat-info-value" id="sat-inclination">xxx.xx</div>
            </div>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
                data-tooltip="How Circular the Orbit Is (0 is a Circle)">
                Eccentricity
              </div>
              <div class="sat-info-value" id="sat-eccentricity">x.xx</div>
            </div>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
                data-tooltip="Where it Rises Above the Equator">
                Right Ascension
              </div>
              <div class="sat-info-value" id="sat-raan">x.xx</div>
            </div>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
                data-tooltip="Where the Lowest Part of the Orbit Is">
                Arg of Perigee
              </div>
              <div class="sat-info-value" id="sat-argPe">x.xx</div>
            </div>
            <div class="sat-info-row">
              <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
                data-tooltip="Current Latitude Over Earth">
                Latitude
              </div>
              <div class="sat-info-value" id="sat-latitude">x.xx</div>
            </div>
            <div class="sat-info-row">
              <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
                data-tooltip="Current Longitude Over Earth">
                Longitude
              </div>
              <div class="sat-info-value" id="sat-longitude">x.xx</div>
            </div>
            <div class="sat-info-row">
              <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
                data-tooltip="Current Altitude Above Sea Level">
                Altitude
              </div>
              <div class="sat-info-value" id="sat-altitude">xxx km</div>
            </div> 
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
                data-tooltip="Time for One Complete Revolution Around Earth">
                Period
              </div>
              <div class="sat-info-value" id="sat-period">xxx min</div>
            </div>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
                data-tooltip="Current Velocity of the Satellite (Higher the Closer to Earth it Is)">
                Velocity
              </div>
              <div class="sat-info-value" id="sat-velocity">xxx km/s</div>
            </div>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
                data-tooltip="Time Since Official Orbit Calculated (Older ELSETs are Less Accuarate Usually)">
                Age of ELSET
              </div>
              <div class="sat-info-value" id="sat-elset-age">xxx.xxxx</div>
            </div>
          </div>
        `);

    // Create a Sat Info Box Initializing Script
    $('#sat-infobox').draggable({
      containment: 'window',
      drag: () => {
        $('#sat-infobox').height(600);
      },
    });
    $('#sat-infobox').resizable({
      handles: 'all',
      // alsoResize: '#bottom-icons-container',
      // No larger than the stack of icons
      maxHeight: 900,
      minHeight: 200,
      maxWidth: 600,
      minWidth: 350,
    });

    // If right click kill and reinit
    $('#sat-infobox').on('mousedown', (e) => {
      if (e.button === 2) {
        $('#sat-infobox').removeClass().removeAttr('style');
        return;
      }
    });

    satInfoboxCore.orbitalData.isLoaded = true;
  }

  if (!sat.missile) {
    try {
      $('a.iframe').colorbox({
        iframe: true,
        width: '80%',
        height: '80%',
        fastIframe: false,
        closeButton: false,
      });
    } catch (error) {
      // console.warn(error);
    }

    $('#sat-apogee').html(sat.apogee.toFixed(0) + ' km');
    $('#sat-perigee').html(sat.perigee.toFixed(0) + ' km');
    $('#sat-inclination').html((sat.inclination * RAD2DEG).toFixed(2) + '°');
    $('#sat-eccentricity').html(sat.eccentricity.toFixed(3));
    $('#sat-raan').html((sat.raan * RAD2DEG).toFixed(2) + '°');
    $('#sat-argPe').html((sat.argPe * RAD2DEG).toFixed(2) + '°');

    $('#sat-period').html(sat.period.toFixed(2) + ' min');
    $('#sat-period').tooltip({
      // delay: 50,
      html: 'Mean Motion: ' + (MINUTES_PER_DAY / sat.period).toFixed(2),
      position: 'left',
    });

    // TODO: Error checking on Iframe
    let now: Date | number | string = new Date();
    const jday = keepTrackApi.programs.timeManager.getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let daysold;
    if (sat.TLE1.substr(18, 2) === now) {
      daysold = jday - parseInt(sat.TLE1.substr(20, 3));
    } else {
      daysold = jday + parseInt(now) * 365 - (parseInt(sat.TLE1.substr(18, 2)) * 365 + parseInt(sat.TLE1.substr(20, 3)));
    }
    $('#sat-elset-age').html(daysold + ' Days');
    $('#sat-elset-age').tooltip({
      // delay: 50,
      html: 'Epoch Year: ' + sat.TLE1.substr(18, 2).toString() + ' Day: ' + sat.TLE1.substr(20, 8).toString(),
      position: 'left',
    });

    if (!keepTrackApi.programs.objectManager.isSensorManagerLoaded) {
      $('#sat-sun').parent().hide();
    } else {
      now = new Date(keepTrackApi.programs.timeManager.dynamicOffsetEpoch + keepTrackApi.programs.timeManager.propOffset);
      const sunTime: any = SunCalc.getTimes(now, keepTrackApi.programs.sensorManager.currentSensor[0].lat, keepTrackApi.programs.sensorManager.currentSensor[0].lon);

      let satInSun = -1;
      if (typeof sat.isInSun !== 'undefined') {
        satInSun = sat.isInSun();
      }

      // If No Sensor, then Ignore Sun Exclusion
      if (keepTrackApi.programs.sensorManager.currentSensor[0].lat === null) {
        $('#sat-sun').hide();
        return;
      } else {
        $('#sat-sun').show();
      }

      // If Radar Selected, then Say the Sun Doesn't Matter
      if (keepTrackApi.programs.sensorManager.currentSensor[0].type !== 'Optical' && keepTrackApi.programs.sensorManager.currentSensor[0].type !== 'Observer') {
        $('#sat-sun').html('No Effect');
        // If Dawn Dusk Can be Calculated then show if the satellite is in the sun
      } else if (sunTime.dawn.getTime() - now.getTime() > 0 || sunTime.dusk.getTime() - now.getTime() < 0) {
        if (satInSun == 0) $('#sat-sun').html('No Sunlight');
        if (satInSun == 1) $('#sat-sun').html('Limited Sunlight');
        if (satInSun == 2) $('#sat-sun').html('Direct Sunlight');
        // If Optical Sesnor but Dawn Dusk Can't Be Calculated, then you are at a
        // high latitude and we need to figure that out
      } else if (sunTime.night != 'Invalid Date' && (sunTime.dawn == 'Invalid Date' || sunTime.dusk == 'Invalid Date')) {
        // TODO: Figure out how to calculate this
        console.debug('No Dawn or Dusk');
        if (satInSun == 0) $('#sat-sun').html('No Sunlight');
        if (satInSun == 1) $('#sat-sun').html('Limited Sunlight');
        if (satInSun == 2) $('#sat-sun').html('Direct Sunlight');
      } else {
        // Unless you are in sun exclusion
        $('#sat-sun').html('Sun Exclusion');
      }
      if (satInSun == -1) $('#sat-sun').html('Unable to Calculate');
    }
  }

  $('#all-objects-link').on('click', allObjectsLink);
  $('#near-orbits-link').on('click', nearOrbitsLink);
  $('#near-objects-link').on('click', nearObjectsLinkClick);
};
export const satMissionData = (sat: SatObject): void => {
  if (!satInfoboxCore.satMissionData.isLoaded) {
    $('#sat-infobox').append(`
        <li class="divider"></li>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
            data-tooltip="Visual Magnitude - Smaller Numbers Are Brighter">
            Visual Mag
          </div>
          <div class="sat-info-value" id="sat-vmag">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
            data-tooltip="Primary User of the Satellite">
            User
          </div>
          <div class="sat-info-value" id="sat-user">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
            data-tooltip="Main Function of the Satellite">
            Purpose
          </div>
          <div class="sat-info-value" id="sat-purpose">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
            data-tooltip="Contractor Who Built the Satellite">
            Contractor
          </div>
          <div class="sat-info-value" id="sat-contractor">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
            data-tooltip="Mass at Lift Off">
            Lift Mass
          </div>
          <div class="sat-info-value" id="sat-lmass">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key  tooltipped" data-position="left" data-delay="50" data-tooltip="Unfueled Mass">
            Dry Mass
          </div>
          <div class="sat-info-value" id="sat-dmass">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
            data-tooltip="How Long the Satellite was Expected to be Operational">
            Life Expectancy
          </div>
          <div class="sat-info-value" id="sat-life">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key  tooltipped" data-position="left" data-delay="50"
            data-tooltip="Power of the Satellite">
            Power
          </div>
          <div class="sat-info-value" id="sat-power">
            NO DATA
          </div>
        </div>              
        <div class="sat-info-row sat-only-info" id="sat-source1w">
          <div class="sat-info-key">
            Source
          </div>
          <div class="sat-info-value" id="sat-source1">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info" id="sat-source2w">
          <div class="sat-info-key">
            Source
          </div>
          <div class="sat-info-value" id="sat-source2">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info" id="sat-source3w">
          <div class="sat-info-key">
            Source
          </div>
          <div class="sat-info-value" id="sat-source3">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info" id="sat-source4w">
          <div class="sat-info-key">
            Source
          </div>
          <div class="sat-info-value" id="sat-source4">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info" id="sat-source5w">
          <div class="sat-info-key">
            Source
          </div>
          <div class="sat-info-value" id="sat-source5">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info" id="sat-source6w">
          <div class="sat-info-key">
            Source
          </div>
          <div class="sat-info-value" id="sat-source6">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info" id="sat-source7w">
          <div class="sat-info-key">
            Source
          </div>
          <div class="sat-info-value" id="sat-source7">
            NO DATA
          </div>
        </div>
        <div class="sat-info-row sat-only-info" id="sat-source8w">
          <div class="sat-info-key">
            Source
          </div>
          <div class="sat-info-value" id="sat-source8">
            NO DATA
          </div>
        </div>
        `);
    satInfoboxCore.satMissionData.isLoaded = true;
  }

  if (!sat.missile) {
    $('.sat-only-info').show();
  } else {
    $('.sat-only-info').hide();
  }

  if (!sat.missile) {
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
    if (typeof sat.vmag != 'undefined' && sat.vmag.toString() != '') {
      $('#sat-vmag').html(sat.vmag.toString());
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
  }
};
export const intelData = (sat: SatObject, satId?: number): void => {
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
  }
};
export const objectData = (sat: SatObject): void => {
  $('#sat-info-title').html(sat.ON);

  let objtype;
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

  if (sat.URL && sat.URL !== '') {
    $('#sat-info-title').html("<a class='iframe' href='" + sat.URL + "'>" + sat.ON + '</a>');
  }

  $('#edit-satinfo-link').html("<a class='iframe' href='editor.htm?scc=" + sat.SCC_NUM + "&popup=true'>Edit Satellite Info</a>");

  $('a.iframe').colorbox({
    iframe: true,
    width: '80%',
    height: '80%',
    fastIframe: false,
    closeButton: false,
  });

  $('#sat-intl-des').html(sat.intlDes);
  if (sat.OT > 4) {
    $('#sat-objnum').html(1 + sat.TLE2.substr(2, 7).toString());
  } else {
    $('#sat-objnum').html(sat.SCC_NUM);
  }

  // /////////////////////////////////////////////////////////////////////////
  // RCS Correlation Table
  // /////////////////////////////////////////////////////////////////////////
  if (sat.R === null || typeof sat.R == 'undefined') {
    $('#sat-rcs').html('Unknown');
  } else {
    $('#sat-rcs').html(sat.R);
  }
};
export const init = (): void => {
  // Register launch data
  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'launchData',
    cb: launchData,
  });

  // Register orbital element data
  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'orbitalData',
    cb: orbitalData,
  });

  // Register sensor data
  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'sensorInfo',
    cb: sensorInfo,
  });

  // Register mission data
  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'satMissionData',
    cb: satMissionData,
  });

  // Register intel data
  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'intelData',
    cb: intelData,
  });

  // Register object data
  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'objectData',
    cb: objectData,
  });
};
