import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  const { searchBox, orbitManager, uiManager, satSet, objectManager, settingsManager } = keepTrackApi.programs;  
  let groups: any;
  let lineManager: any;
  let isConstellationsMenuOpen = false;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'constellations',
    cb: () => {
      // Side Menu
      $('#left-menus').append(keepTrackApi.html`
        <div id="constellations-menu" class="side-menu-parent start-hidden text-select">
          <div id="constellation-menu" class="side-menu">
            <ul>
              <h5 class="center-align">Constellations</h5>
              <li class="divider"></li>
              <li class="menu-selectable" data-group="aehf">Milstar and AEHF</li>
              <li class="menu-selectable" data-group="wgs">DSCS and WGS</li>
              <li class="menu-selectable" data-group="starlink">Starlink</li>
              <li class="menu-selectable" data-group="GPSGroup">GPS Satellites</li>
              <li class="menu-selectable" data-group="GalileoGroup">Galileo Satellites</li>
              <li class="menu-selectable" data-group="GlonassGroup">Glonass Satellites</li>
              <li class="menu-selectable" data-group="AmatuerRadio">Amateur Radio</li>
            </ul>
          </div>
        </div>
      `);

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-constellations" class="bmenu-item">
          <img
            alt="constellation"
            src=""
            delayedsrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAADTUlEQVR4nO2dT08TQRiHf9OQthiKfgQP5dTAReKZnggHIxr9LHiz3vSzaBCjCeFUPBrwhD2Vgx+Ag4KRQgivBxljSrfdP7P77uz8nls77czkfXa6k5ntOwAhhBBCCCGEEEICpj2URnsojaLaM0U15AOdgdTNb7yDQf3XGTa/d80o7zYp4AYbfGPwCAAE2CtCAgXgdvAtRUgIXkBU8C15SwhawKzgW/KUEKyAuMG35CUhSAFJg2/JQ0JwAtIG3+JaQlACsgbf4lJCMAJcBd/iSkIQAlwH3+JCQs1lh8pIeyiN2gg7U4NvsJumzADrrUVsZ1k7qrSAzkDqzR94C8FG1GcE2Ds7xdOo8usmNkXwMbIRwUbzJz7c70szTR8rK2CtL3NxrvzRXTye9hMy6JjL0T08jzMS1voyl7SflRWw3zVXEHyOKrdX/vGSuZhV1/GSuZg1EgT4st81V0n7WVkBAHC0at4AeDH+fpqb56BjLuUOnk2SIAa9bw/MqzR9rLQA4LaELDOXSRKyBB8IZBoKAMuHsiVANyr4y4cik753tGpuxejfxk0NX7MEHwhIAPD3xhz1O51EwKy6khCUgGkkFeCKyt8Dyg4FKEMBylCAMhSgTOK1i6REzS60yHtWkxSOAGUoQBkKUIYClKEAZXKfBUVRttmIFhwBylCAMhSgDAUoQwHKUIAyFKAMBShDAcpQgDIUoIzaWlAUZdtByxuOAGUoQBkKUIYClKEAZUo3Cwptp4wjQBkKUIYClKEAZShAGScC0vxDvIi6fCCzgJUD6Z208CltroT/6QykfrKA7eVDeZ21Ll/IJGDlQHpi8NIA6wst7GSRMJZSZisUCakF2ODb11kkROTzCUJCKgHjwbekkTAjmVLlJSQWsNaXOanhYVR5kiRGMZMprVT5xpxq3SVOCjCbFKPVwvmk8ut5NOLWUUQSbS1SL3y1h9KYP8X7admoYLAbWT6t7Kb8fBFP4uTz8ZlMK49lTobnC5mXfsuaDtIXnKy9lzEhqi842/woW0pgX3C6+1SmpNi+4Hz7ryxp4X0hl/3XMhyM4Au5bYBrHw3iC7k+gaB5OI4v5P4IiNbxUL5QyDM4GgekkTGKPiKQEEIIIYQQQgghZeQPbZbQOqruDvAAAAAASUVORK5CYII="
          />
          <span class="bmenu-title">Constellations</span>
          <div class="status-icon"></div>
        </div>
      `);

      $('#constellations-menu').resizable({
        handles: 'e',
        stop: function () {
          $(this).css('height', '');
        },
        maxWidth: 450,
        minWidth: 280,
      });

      $('#constellation-menu>ul>li').on('click', function () {
        constellationMenuClick($(this).data('group'));
      });

      groups = keepTrackApi.programs.groupsManager;
      lineManager = keepTrackApi.programs.lineManager;      
    },
  });

  const constellationMenuClick = (groupName: any) => {
    if (typeof groups == 'undefined') return;
    switch (groupName) {
      case 'SpaceStations':
        if (typeof groups.SpaceStations == 'undefined') {
          groups.SpaceStations = groups.createGroup('objNum', [25544, 41765]);
        }
        break;
      case 'GlonassGroup':
        if (typeof groups.GlonassGroup == 'undefined') {
          groups.GlonassGroup = groups.createGroup('nameRegex', /GLONASS/u);
        }
        break;
      case 'GalileoGroup':
        if (typeof groups.GalileoGroup == 'undefined') {
          groups.GalileoGroup = groups.createGroup('nameRegex', /GALILEO/u);
        }
        break;
      case 'GPSGroup':
        if (typeof groups.GPSGroup == 'undefined') {
          groups.GPSGroup = groups.createGroup('nameRegex', /NAVSTAR/u);
        }
        break;
      case 'AmatuerRadio':
        if (typeof groups.AmatuerRadio == 'undefined') {
          groups.AmatuerRadio = groups.createGroup(
            'objNum',
            [
              7530, 14781, 20442, 22826, 24278, 25338, 25397, 25544, 26931, 27607, 27844, 27848, 28895, 32785, 32788, 32789, 32791, 33493, 33498, 33499, 35932, 35933, 35935, 37224, 37839, 37841, 37855, 38760, 39090, 39134, 39136, 39161, 39417, 39430,
              39436, 39439, 39440, 39444, 39469, 39770, 40014, 40021, 40024, 40025, 40030, 40032, 40042, 40043, 40057, 40071, 40074, 40377, 40378, 40379, 40380, 40654, 40719, 40900, 40903, 40906, 40907, 40908, 40910, 40911, 40912, 40926, 40927,
              40928, 40931, 40967, 40968, 41168, 41171, 41340, 41459, 41460, 41465, 41474, 41600, 41619, 41789, 41932, 41935, 42017,
            ]
          );
        }
        break;
      case 'aehf':
        if (typeof groups.aehf == 'undefined') {
          groups.aehf = groups.createGroup('objNum', satSet.convertIdArrayToSatnumArray(objectManager.satLinkManager.aehf));
        }
        $('#loading-screen').fadeIn(1000, function () {
          lineManager.clear();
          objectManager.satLinkManager.showLinks(lineManager, satSet, 'aehf');
          $('#loading-screen').fadeOut('slow');
        });
        break;
      case 'wgs':
        // WGS also selects DSCS
        if (typeof groups.wgs == 'undefined') {
          groups.wgs = groups.createGroup('objNum', satSet.convertIdArrayToSatnumArray(objectManager.satLinkManager.wgs.concat(objectManager.satLinkManager.dscs)));
        }
        $('#loading-screen').fadeIn(1000, function () {
          lineManager.clear();
          try {
            objectManager.satLinkManager.showLinks(lineManager, satSet, 'wgs');
          } catch (e) {
            // Maybe the objectManager.satLinkManager isn't installed?
          }
          $('#loading-screen').fadeOut('slow');
        });
        break;
      case 'starlink':
        // WGS also selects DSCS
        if (typeof groups.starlink == 'undefined') {
          groups.starlink = groups.createGroup('objNum', satSet.convertIdArrayToSatnumArray(objectManager.satLinkManager.starlink));
        }
        $('#loading-screen').fadeIn(1000, function () {
          lineManager.clear();
          try {
            objectManager.satLinkManager.showLinks(lineManager, satSet, 'starlink');
          } catch (e) {
            // Maybe the objectManager.satLinkManager isn't installed?
          }
          $('#loading-screen').fadeOut('slow');
        });
        break;
      case 'sbirs':
        // SBIRS and DSP
        if (typeof groups.sbirs == 'undefined') {
          groups.sbirs = groups.createGroup('objNum', satSet.convertIdArrayToSatnumArray(objectManager.satLinkManager.sbirs));
        }
        $('#loading-screen').fadeIn(1000, function () {
          lineManager.clear();
          try {
            objectManager.satLinkManager.showLinks(lineManager, satSet, 'sbirs');
          } catch (e) {
            // Maybe the objectManager.satLinkManager isn't installed?
          }
          $('#loading-screen').fadeOut('slow');
        });
        break;
    }
    groupSelected(groupName);
    uiManager.doSearch($('#search').val());
  };

  const groupSelected = function (groupName: string | number) {
    if (typeof groupName == 'undefined') return;
    if (typeof groups[groupName] == 'undefined') return;
    const searchDOM = $('#search');
    groups.selectGroup(groups[groupName], orbitManager);
    searchDOM.val('');

    var results = groups[groupName].sats;
    for (var i = 0; i < results.length; i++) {
      var satId = groups[groupName].sats[i].satId;
      var scc = satSet.getSat(satId).SCC_NUM;
      if (i === results.length - 1) {
        searchDOM.val(searchDOM.val() + scc);
      } else {
        searchDOM.val(searchDOM.val() + scc + ',');
      }
    }

    searchBox.fillResultBox(groups[groupName].sats, satSet);

    objectManager.setSelectedSat(-1); // Clear selected sat

    // Close Menus
    if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(true);
    uiManager.hideSideMenus();
  };

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'constellations',
    cb: (iconName: string): void => {
      if (iconName === 'menu-constellations') {
        if (isConstellationsMenuOpen) {
          uiManager.hideSideMenus();
          isConstellationsMenuOpen = false;
          return;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#constellations-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isConstellationsMenuOpen = true;
          $('#menu-constellations').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'constellations',
    cb: (): void => {
      $('#constellations-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-constellations').removeClass('bmenu-item-selected');
      isConstellationsMenuOpen = false;
    },
  });
};
