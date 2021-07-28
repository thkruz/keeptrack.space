import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  const { groups, orbitManager, satSet, searchBox, objectManager, uiManager, settingsManager } = keepTrackApi.programs;
  let isCountriesMenuOpen = false;
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'countries',
    cb: () => {
      // Side Menu
      $('#left-menus').append(keepTrackApi.html`
        <div id="countries-menu" class="side-menu-parent start-hidden text-select">
          <div id="country-menu" class="side-menu">
            <ul>
              <h5 class="center-align">Countries</h5>
              <li class="divider"></li>
              <li class="menu-selectable country-option" data-group="Canada">Canadian</li>
              <li class="menu-selectable country-option" data-group="China">Chinese</li>
              <li class="menu-selectable country-option" data-group="France">French</li>
              <li class="menu-selectable country-option" data-group="India">Indian</li>
              <li class="menu-selectable country-option" data-group="Israel">Israeli</li>
              <li class="menu-selectable country-option" data-group="Japan">Japanese</li>
              <li class="menu-selectable country-option" data-group="Russia">Russian / USSR</li>
              <li class="menu-selectable country-option" data-group="UnitedKingdom">British</li>
              <li class="menu-selectable country-option" data-group="UnitedStates">American</li>
            </ul>
          </div>
        </div>
      `);

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-countries" class="bmenu-item">
          <img
            alt="flag"
            src=""
            delayedsrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAABc0lEQVR4nO3aT26CQBzF8QdOTO/gGdy1x+k52k1ddKW9Rf8cx523IQS6M0ZDCpMZH0O/n53kZ0J8GeQxSAAAAAAAAAAAAAAAIItqzND22Pe5T2SJTo/Vn79vfY8TwTACMIsJoFGvl1BrE2ptJL1KaozzRQsR39mdnqqPi8+H7bGXpL1pvmiTV0ArfV0f6zp9uuZLN3kFPNS3d05hrVXXeuYvjbnrmJvpK6DT8/Wxrr09dq/50sX0gEbSLtT6ls4/2Luk9cDXc8+flbgCFlXESgyAHmBGAGYpL0GNer2FlX6kkdf6vPN2Yy6JMUVsCAUtQrJLEAUtTrIAhgqUa74U6VYABS1K2j/hmRY0lzF/whQxM3qAGQGYsSNmxo6YGTtiZovaEZvb3VqW94IoXGktakdsbv5dEZsbXk0sAAEAAADAgCKWEUWsAARgRgBmBGBGAAAAADDgWVBGPAsqAAGYEYAZAZgRAAAAAAAAAAAAAAAAWKZfZIMQFE8x07MAAAAASUVORK5CYII="
          />
          <span class="bmenu-title">Countries</span>
          <div class="status-icon"></div>
        </div>
      `);

      const groupSelected = function (groupName: string | number) {
        const searchDOM = $('#search');
        if (typeof groupName == 'undefined') return;
        if (typeof groups[groupName] == 'undefined') return;
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

      const countryMenuClick = (groupName: any) => {
        if (typeof groups == 'undefined') return;
        switch (groupName) {
          case 'Canada':
            if (typeof groups.Canada == 'undefined') {
              groups.Canada = groups.createGroup('countryRegex', /CA/u);
            }
            break;
          case 'China':
            if (typeof groups.China == 'undefined') {
              groups.China = groups.createGroup('countryRegex', /PRC/u);
            }
            break;
          case 'France':
            if (typeof groups.France == 'undefined') {
              groups.France = groups.createGroup('countryRegex', /FR/u);
            }
            break;
          case 'India':
            if (typeof groups.India == 'undefined') {
              groups.India = groups.createGroup('countryRegex', /IND/u);
            }
            break;
          case 'Israel':
            if (typeof groups.Israel == 'undefined') {
              groups.Israel = groups.createGroup('countryRegex', /ISRA/u);
            }
            break;
          case 'Japan':
            if (typeof groups.Japan == 'undefined') {
              groups.Japan = groups.createGroup('countryRegex', /JPN/u);
            }
            break;
          case 'Russia':
            if (typeof groups.Russia == 'undefined') {
              groups.Russia = groups.createGroup('countryRegex', /CIS/u);
            }
            break;
          case 'UnitedKingdom':
            if (typeof groups.UnitedKingdom == 'undefined') {
              groups.UnitedKingdom = groups.createGroup('countryRegex', /UK/u);
            }
            break;
          case 'UnitedStates':
            if (typeof groups.UnitedStates == 'undefined') {
              groups.UnitedStates = groups.createGroup('countryRegex', /US/u);
            }
            break;
        }
        groupSelected(groupName);
      };

      $('#country-menu>ul>li').on('click', () => {
        countryMenuClick($(this).data('group'));
      });

      $('#countries-menu').resizable({
        handles: 'e',
        stop: function () {
          $(this).css('height', '');
        },
        maxWidth: 450,
        minWidth: 280,
      });      
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'countries',
    cb: (iconName: string): void => {
      if (iconName === 'menu-countries') {
        if (isCountriesMenuOpen) {
          uiManager.hideSideMenus();
          isCountriesMenuOpen = false;
          return;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#countries-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isCountriesMenuOpen = true;
          $('#menu-countries').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'countries',
    cb: (): void => {
      $('#countries-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-countries').removeClass('bmenu-item-selected');
      isCountriesMenuOpen = false;
    },
  });
};
