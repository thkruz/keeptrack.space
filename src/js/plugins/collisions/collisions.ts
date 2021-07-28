import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';
import { stringPad } from '@app/js/lib/helpers';

export const init = (): void => {
  let isSocratesMenuOpen = false;
  let socratesOnSatCruncher: number | null = null;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'collisions',
    cb: () => {
      // Side Menu
      $('#left-menus').append(keepTrackApi.html`
        <div id="socrates-menu" class="side-menu-parent start-hidden text-select">
          <div id="socrates-content" class="side-menu">
            <div class="row">
              <h5 class="center-align">Possible collisions</h5>
              <table id="socrates-table" class="center-align"></table>
            </div>
          </div>
        </div>
      `);

      $('#socrates-menu').on('click', '.socrates-object', function (evt) {
        // Might be better code for this.
        var hiddenRow = evt.currentTarget.attributes.hiddenrow.value;
        if (hiddenRow !== null) {
          socrates(hiddenRow);
        }
      });

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-satellite-collision" class="bmenu-item">
          <img alt="socrates" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAAK0UlEQVR4nO2cb3AV1RXAf2cTQgKIdqxOoQ4dGBAwyQvJSzB11EpppdpRPlhoa0cF+6G1M/bPaMTKqIjWYvF/p6OtU7VVGcWZzrR2altsq1U6rXkJ8PIygYAtWtRRi6hBA+FlTz9kM4Vw78vuvt19VPc3kw/Zc/fc8+7Ze/eee89dSElJSUlJSUlJSUlJSUlJSUn5qCCVqHR+TqdVwyKgHZgLzAJOBKZ4RfYDe1F2AdsFNlPDX/NN8mYl7I2TxBzQ3K0nDbtcrHAJkA2hwkV5AdjgTuKx3nrZH7GJFSF2B9TndIYjdKB8HaiLSO0+Ve6rrmb91mZ5JyKdFSE2B8zeqRPr3qUDuI7oGv4IFP4jwuqeFh5AROOoI25icUB9t57muGwE6uPQPxaFPwzDyr5WeT2J+qIkcgdkOvUrKvwcmBS17nF4TR2WFlokl3C9ZRGpAxpyeqXA3YDjo3gB5RmBza5Dvx5kT20NAzVDVB+o5WNDRU4WoUUcFqJ8ETjFh84PRLgon5Xfl/dLkiMyB3iNf+84xQYVHhK4v6dVenwrV3Uy3ZyjypXAUkrbfUBhaaFV/uhbfwWJxAHesPMY9idfRXj0kLKq3HG6qVMXunA3wqdLFNvvOpzZ2yLbyqkrCcp2QNOLWu86vIh9zH8LZUVPm/yu3LpGWbZRq7bPYjVwPVBtKiPw8tAw2e2ny96o6o2DshzgTTW7sM92+quqWLK1WXaXU4+NTJdeoMoT2Ke5G3ta5ctx1B0Vfl6WVrx5vrXxZQJnxdX4APmsPIXLecCgpcjyTKdeFFf9URC6B9TndIYD2zE/fW9VVbHQb+M35tQYRPW0ii/7vHfQBsy/518DA5y2e5Ec8KMraUL3AEfowNz4irIizid/LPk2eVzgTot45tSpfDMpW4ISygHN3XqSt7ZzFCI8GuUL1y8T4AbgJZNMle+d8xc1vqwrTSgHDLtcjPnpHzykrCrPpHB0tcoHwMMW8Yy3p7A0QXN8E8oBCpdaBA9Waj0ms00nA1eUKHJxUrYEIbAD5ud0GtBiFAo/LdegsOghrgKmW+XC+Z6TjikCO8DbyTJRCLS8ECHeQ9ExTrFad4gzkrAnCGGGoHbjVeWZ8kwJTzXcxP+2M62IcHYC5gQijAPmGq8KfyvPlHBkOrUBuNxn8cY4bQlDGAfMNl1UYUeZtoRCYT1Q5bPsaTGbE5gwDjjBdFEPsqdMWwLTkNNzEb7gt7zAnIZO/XycNgUljAPMY+3xJJqlsGyjVsnI02/iXe/vKERYv2yj+uoxSRDGAcb1mdpBEt0U75vJCiBjFCq3Aj+03NrUN5PLYjIrMGEcMGC6eGCI48IYUN+r485expLZppNFWGuSCbw8sJ97Bwa4R+BlYxnh5mMlJgjjgH2mizLR157tEdT36hQZ5Omg97lFrsYSdKmwevciObB7kRxQYbVFxXQvcKs4gR2gsMsimhdEz2jjC5wZ5L75OZ0mytUW43I9LWwY/benhQ0otiyJDi+AqyiBHSDQb7zultyjPQKfjW/cVK+CtVgmAgodRyRoiajaI+Qpnq6KEtwBagm4BF/TOz+Nr/CCW8dRO1mNOW0UWGm8R3mq0CbPjr1eaJNnVXnKbDIrG3Na0eAsuAMm8DwYZzz1DV1qnpWMFujVGj+Nr3WcZ0q+LRF0FXFKLIOPyIoGSZXap7KJENgB2xbIqwqdRqGW3nnqrZchR/mTTV6q8Zu6dInAEst9DxSy0mfTW8hKn8IDJpnAkoacnlvK7jgJtR8gyuPG67CyuVutS8IA+TZZI8pNY6+XavxlG7XKVeuTOkDxaH1HMVLGOIUWKhechXKAe4hfAO8bRLVFlx+Nd3++TdYA147+L7D50AHOt+X875jFSiwLaSKsK7TLG+PVWWiXN0S5zSLOeIFd4oTOimjI6U8EvmUQqQoXFrLy2/F0ZDp1jSsstj35MBJ06SH6Mc/799TAXG87clyyOZ00BDsw55m+JhM4Nd8kpgcrNkJnRVRVcyvmXiCiPNzYqbPG05FvkzVax+KSp12G6MC20yVc77fxwds3Fq63iKd7AV6ilJUZ15jTG8A8/irspMhZfoYHG83dOr3o0g8ctWwgsDWfJYuIe5g94+cXqTqZLroUFhiKvl/tcOqWFnktrM1BKSszzq1jncBWk0xgDtU8n/mHzgyrf9hlLYbGB3CVaw5vfN+IuK5yjUU62aszMcpyQG+9DKFcgnkoQmCOVtGZ6dILgupu6NKMYnkxCk8X2mRTUJ2jFNpkE2Jeg1JYkWRwVpYDAPJtUlDhUszBGcCJqvy6MaePjjdFPRxRa9A1LK71CfaNp2PYIKoCbi9Xv1/KdgBAISu/UvgudicI8LWiy0uZnN5X361NpfQ1dekSwBgcKTyUb5NCeRZ7Dw48ZBGf69kQO5EeUcrk9DsKd/nU2yewyRU26zD9FHmF49lf3MfEmlo2Y573v1+EObbkr6BJvt6B8Z2Y3zM98/5J85PLxdRLIiOSHjBKvlXuUeFLWN4JY5iv8G1RnnActjg17HUGOVhTy3tYgi4V1keZedfXKq+LWoebRi8AjJVIHQAjw5Eo7UDUx4Ne11ruiFgnw5O4HTA6VWFtmB27IETuABgZXweP53QV1gC+A6WSCDfG8XmC3nrZj3CjRTzNGRw3464sYnEAwK45crCQlZukyFyB+7GfYvFDYd5LPBiVbWPxdNte7FcFmb0FJTYHjJJvlz35Vrmi2uFT3u5Ud2Alyqo4X4ZPLpdh7Gn1k4vKzXHVXZHP1dTndIYon3GEM4C5OpJecqKxsPBMT1Z87baVe9SpsUs3oXzOIBp2HbJxHHutyKmR3lZ5BXjE+6Mhp89bdslcSfDAhytc7SjdHD0yVDkudwKLo64z9iFoPDKdelGJLcpf5lsl+JAVEu8Jf8Qi/mxjp54XdZ0VdUA2pxNcsWawDbpYZyex4VSzGtvMTbgj6rNmFT24dhCuEJhjEd/hDVW+8TvWl2LbAnm1oUvvEjUmdc3fO5WVWPaXw1CRlzDAgi16QnGYnQIfN4jfGiwye1e7vJe4YYykzjiD7AQ+YRC/OVhkTlS2VWwIGnb5vqXxEbixUo0PI8GZYJ16nlxXHV1aY0V6QObveopW04/5qOuOGmjsapVDQfWWOw09HO+DINswf4phUF3mFhbKv4PqHUtFeoBWsw7LBzZE6AjT+FHz5HIZFuU6i7hOxEcqjA8Sd0BTpzYDXzUKhefyWTGmEVaCfJv8BlsimXBZJqfm47oBSNwB7kgqoKleVUk+K2E8nJHlE9Pes0MEO2eJOiDTqRci1mhyw7H4wb1tbbIFzJmACosaO/X8cvQn5oBlG7VKhVst4gNFx3qYouJIkVXYVnOF28sJzhILxHbM4hvYP+50T1+LGI8TBSGKQMxEvl32NHbpjzGns8zfO5XLgZ+F0Z3INHTuC3pcTS39mAObfe4Qs3vPkLeTsCUs4wSOoYOzRIagCRO5FnPjo7DmWG98gK3N8o4Dt1jEJ9dVh5tAxN4DmrbqJ90i/ST/Jd2kGXRhXtD1q9h7gFvkFj78jQ9Q51jyZEsRaw/wUvy24PNbDh8CXNcl27tQjPmyJuLtAcJtfHQaH8BxHH4Q5IbYekBjt56Ny3Nx6T+WEWFxPit/9lM2nh6gKgyzLhbd/wcorEO1YnstKSkpKSkpKSkpKSkpKSkpKSkpKSkpKWP4L5/sq8viS8C0AAAAAElFTkSuQmCC">
          <span class="bmenu-title">Collisions</span>
          <div class="status-icon"></div>
        </div>
      `);

      // Allow resizing of the side menu
      $('#socrates-menu').resizable({
        handles: 'e',
        stop: function () {
          $(this).css('height', '');
        },
        maxWidth: 450,
        minWidth: 290,
      });
    },
  });

  let socratesObjOne: any[][] = []; // Array for tr containing CATNR1
  let socratesObjTwo: any[][] = []; // Array for tr containing CATNR2
  let findFutureDate = (socratesObjTwo: any[][], row: number) => {
    let socratesDate = socratesObjTwo[row][4].split(' '); // Date/time is on the second line 5th column
    let socratesTime = socratesDate[3].split(':'); // Split time from date for easier management

    let MMMtoInt = (month: string) => {
      switch (month) {
        case 'Jan':
          return 0;
        case 'Feb':
          return 1;
        case 'Mar':
          return 2;
        case 'Apr':
          return 3;
        case 'May':
          return 4;
        case 'Jun':
          return 5;
        case 'Jul':
          return 6;
        case 'Aug':
          return 7;
        case 'Sep':
          return 8;
        case 'Oct':
          return 9;
        case 'Nov':
          return 10;
        case 'Dec':
          return 11;
      }
    }; // Convert MMM format to an int for Date() constructor

    let sYear = parseInt(socratesDate[0]); // UTC Year
    let sMon = MMMtoInt(socratesDate[1]); // UTC Month in MMM prior to converting
    let sDay = parseInt(socratesDate[2]); // UTC Day
    let sHour = parseInt(socratesTime[0]); // UTC Hour
    let sMin = parseInt(socratesTime[1]); // UTC Min
    let sSec = parseInt(socratesTime[2]); // UTC Sec - This is a decimal, but when we convert to int we drop those

    let selectedDate = new Date(sYear, sMon, sDay, sHour, sMin, sSec); // New Date object of the future collision
    // Date object defaults to local time.
    selectedDate.setUTCDate(sDay); // Move to UTC day.
    selectedDate.setUTCHours(sHour); // Move to UTC Hour

    let today = new Date(); // Need to know today for offset calculation
    keepTrackApi.programs.timeManager.propOffset = selectedDate.getTime() - today.getTime(); // Find the offset from today
    keepTrackApi.programs.cameraManager.camSnapMode = false;
    keepTrackApi.programs.satSet.satCruncher.postMessage({
      // Tell satSet.satCruncher we have changed times for orbit calculations
      typ: 'offset',
      dat: keepTrackApi.programs.timeManager.propOffset.toString() + ' ' + (1.0).toString(),
    });
    keepTrackApi.programs.timeManager.propRealTime = Date.now(); // Reset realtime...this might not be necessary...
    keepTrackApi.programs.timeManager.propTime();
  }; // Allows passing -1 argument to socrates function to skip these steps

  const socrates = (row: number) => {
    // SOCRATES Variables

    /* SOCRATES.htm is a 20 row .pl script pulled from celestrak.com/cgi-bin/searchSOCRATES.pl
    If it ever becomes unavailable a similar, but less accurate (maybe?) cron job could be
    created using satCruncer.

    The variable row determines which set of objects on SOCRATES.htm we are using. First
    row is 0 and last one is 19. */
    if (row === -1 && socratesObjOne.length === 0 && socratesObjTwo.length === 0) {
      // Only generate the table if receiving the -1 argument for the first time
      $.get('/SOCRATES.htm', function (socratesHTM) {
        // Load SOCRATES.htm so we can use it instead of index.htm
        var tableRowOne = $("[name='CATNR1']", socratesHTM).closest('tr'); // Find the row(s) containing the hidden input named CATNR1
        var tableRowTwo = $("[name='CATNR2']", socratesHTM).closest('tr'); // Find the row(s) containing the hidden input named CATNR2
        // eslint-disable-next-line no-unused-vars
        tableRowOne.each(function (_rowIndex, _r) {
          var cols: any[] = [];
          $(this)
            .find('td')
            .each(function (_colIndex, c) {
              cols.push(c.textContent);
            });
          socratesObjOne.push(cols);
        });
        // eslint-disable-next-line no-unused-vars
        tableRowTwo.each(function (_rowIndex, _r) {
          var cols: any[] = [];
          $(this)
            .find('td')
            .each(function (_colIndex, c) {
              cols.push(c.textContent);
            });
          socratesObjTwo.push(cols);
        });
        // SOCRATES Menu
        var tbl = <HTMLTableElement>document.getElementById('socrates-table'); // Identify the table to update
        tbl.innerHTML = ''; // Clear the table from old object data
        // var tblLength = 0;                                   // Iniially no rows to the table

        var tr = tbl.insertRow();
        var tdT = tr.insertCell();
        tdT.appendChild(document.createTextNode('Time'));
        tdT.setAttribute('style', 'text-decoration: underline');
        var tdS1 = tr.insertCell();
        tdS1.appendChild(document.createTextNode('#1'));
        tdS1.setAttribute('style', 'text-decoration: underline');
        var tdS2 = tr.insertCell();
        tdS2.appendChild(document.createTextNode('#2'));
        tdS2.setAttribute('style', 'text-decoration: underline');

        for (var i = 0; i < 20; i++) {
          if (typeof socratesObjTwo[i] == 'undefined') break;
          // 20 rows
          if (typeof socratesObjTwo[i][4] == 'undefined') continue;
          tr = tbl.insertRow();
          tr.setAttribute('class', 'socrates-object link');
          tr.setAttribute('hiddenrow', i.toString());
          tdT = tr.insertCell();
          var socratesDate = socratesObjTwo[i][4].split(' '); // Date/time is on the second line 5th column
          var socratesTime = socratesDate[3].split(':'); // Split time from date for easier management
          var socratesTimeS = socratesTime[2].split('.'); // Split time from date for easier management
          tdT.appendChild(
            document.createTextNode(socratesDate[2] + ' ' + socratesDate[1] + ' ' + socratesDate[0] + ' - ' + stringPad.pad0(socratesTime[0], 2) + ':' + stringPad.pad0(socratesTime[1], 2) + ':' + stringPad.pad0(socratesTimeS[0], 2) + 'Z')
          );
          tdS1 = tr.insertCell();
          tdS1.appendChild(document.createTextNode(socratesObjOne[i][1]));
          tdS2 = tr.insertCell();
          tdS2.appendChild(document.createTextNode(socratesObjTwo[i][0]));
        }
      });
    }
    if (row !== -1) {
      // If an object was selected from the menu
      findFutureDate(socratesObjTwo, row); // Jump to the date/time of the collision

      keepTrackApi.programs.uiManager.doSearch(socratesObjOne[row][1] + ',' + socratesObjTwo[row][0]); // Actually perform the search of the two objects
      socratesOnSatCruncher = keepTrackApi.programs.satSet.getIdFromObjNum(socratesObjOne[row][1]);
    } // If a row was selected
  };

  // Add Advice Info
  keepTrackApi.register({
    method: 'adviceReady',
    cbName: 'Collisions',
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
    cbName: 'collisions',
    cb: (iconName: string): void => {
      if (iconName === 'menu-satellite-collision') {
        if (isSocratesMenuOpen) {
          isSocratesMenuOpen = false;
          keepTrackApi.programs.uiManager.hideSideMenus();
          return;
        } else {
          if (keepTrackApi.programs.settingsManager.isMobileModeEnabled) keepTrackApi.programs.uiManager.searchToggle(false);
          keepTrackApi.programs.uiManager.hideSideMenus();
          $('#socrates-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isSocratesMenuOpen = true;
          socrates(-1);
          $('#menu-satellite-collision').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'collisions',
    cb: (): void => {
      $('#socrates-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-satellite-collision').removeClass('bmenu-item-selected');
      isSocratesMenuOpen = false;
    },
  });

  keepTrackApi.register({
    method: 'onCruncherMessage',
    cbName: 'collisions',
    cb: (): void => {
      if (socratesOnSatCruncher !== null) {
        keepTrackApi.programs.objectManager.setSelectedSat(socratesOnSatCruncher);
        socratesOnSatCruncher = null;
      }
    },
  });
};
