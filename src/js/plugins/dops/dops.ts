import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  let isDOPMenuOpen = false;
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'dops',
    cb: () => {
      // Side Menu
      $('#left-menus').append(keepTrackApi.html`
        <div id="dops-menu" class="side-menu-parent start-hidden text-select">
          <div id="dops-content" class="side-menu">
            <form id="dops-form">
              <div class="switch row">
                <h5 class="center-align">DOP Table</h5>
                <div class="input-field col s3">
                  <input value="41" id="dops-lat" type="text" class="tooltipped" data-position="right"
                    data-delay="50" data-tooltip="Latitude in Degrees">
                  <label for="dops-lat" class="active">Latitude</label>
                </div>
                <div class="input-field col s3">
                  <input value="-71" id="dops-lon" type="text" class="tooltipped" data-position="right"
                    data-delay="50" data-tooltip="Longitude in Degrees">
                  <label for="dops-lon" class="active">Longitude</label>
                </div>
                <div class="input-field col s3">
                  <input value="-71" id="dops-alt" type="text" class="tooltipped" data-position="right"
                    data-delay="50" data-tooltip="Altitude in KM">
                  <label for="dops-lon" class="active">Altitude</label>
                </div>
                <div class="input-field col s3">
                  <input value="15" id="dops-el" type="text" class="tooltipped" data-position="right"
                    data-delay="50" data-tooltip="Minimum Elevation for GPS Lock">
                  <label for="dops-el" class="active">Mask</label>
                </div>
              </div>
              <div class="row center">
                <button id="dops-submit" class="btn btn-ui waves-effect waves-light" type="submit"
                  name="action">Update DOP Data &#9658;
                </button>
              </div>
            </form>
            <div class="row">
              <table id="dops" class="center-align striped-light centered"></table>
            </div>
          </div>
        </div>
      `);

      $('#dops-form').on('submit', function (e) {
        keepTrackApi.programs.uiManager.hideSideMenus();
        isDOPMenuOpen = true;
        $('#loading-screen').fadeIn(1000, function () {
          let lat = parseFloat(<string>$('#dops-lat').val());
          let lon = parseFloat(<string>$('#dops-lon').val());
          let alt = parseFloat(<string>$('#dops-alt').val());
          let el = parseFloat(<string>$('#dops-el').val());
          keepTrackApi.programs.settingsManager.gpsElevationMask = el;
          keepTrackApi.programs.satellite.getDOPsTable(lat, lon, alt);
          $('#menu-dops').addClass('bmenu-item-selected');
          $('#loading-screen').fadeOut('slow');
          $('#dops-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
        });
        e.preventDefault();
      });

      // Allow resizing of the side menu
      $('#dops-menu').resizable({
        handles: 'e',
        stop: function () {
          $(this).css('height', '');
        },
        maxWidth: 450,
        minWidth: 280,
      });

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-dops" class="bmenu-item">
          <img alt="gps" src="data:image/png;base64,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">
          <span class="bmenu-title">DOPs</span>
          <div class="status-icon"></div>
        </div>      
      `);      
    },
  });

  // Add Advice Info
  keepTrackApi.register({
    method: 'adviceReady',
    cbName: 'dops',
    cb: () => {
      const aM = keepTrackApi.programs.adviceManager;
      aM.adviceCount.socrates = 0;

      aM.adviceList.socrates = () => {
        // Only Do this Twice
        if (aM.adviceCount.socrates >= 3) return;
        aM.adviceCount.socrates += 1;

        aM.showAdvice(
          'SOCRATES Near Conjunction List',
          'Did you know that objects frequently come close to colliding? Using data from Center for Space Standars and Innovation you can find upcomming possible collisions.',
          $('#menu-satellite-collision'),
          'bottom'
        );
      };
      aM.adviceArray.push(aM.adviceList.socrates);
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'dops',
    cb: (iconName: string): void => {
      if (iconName === 'menu-dops') {
        if (isDOPMenuOpen) {
          isDOPMenuOpen = false;
          keepTrackApi.programs.uiManager.hideSideMenus();
          return;
        } else {
          keepTrackApi.programs.uiManager.hideSideMenus();
          isDOPMenuOpen = true;
          $('#loading-screen').fadeIn(1000, function () {
            let lat = parseFloat(<string>$('#dops-lat').val());
            let lon = parseFloat(<string>$('#dops-lon').val());
            let alt = parseFloat(<string>$('#dops-alt').val());
            let el = parseFloat(<string>$('#dops-el').val());
            keepTrackApi.programs.settingsManager.gpsElevationMask = el;
            keepTrackApi.programs.satellite.getDOPsTable(lat, lon, alt);
            $('#menu-dops').addClass('bmenu-item-selected');
            $('#loading-screen').fadeOut('slow');
            $('#dops-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          });
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'dops',
    cb: (): void => {
      $('#dops-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-dops').removeClass('bmenu-item-selected');
      isDOPMenuOpen = false;
    },
  });
};
