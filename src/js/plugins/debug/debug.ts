import $ from 'jquery';

//Global Debug Manager
export const init = (): void => {
  let db: any = {};
  try {
    db = JSON.parse(localStorage.getItem('db'));
    if (db == null) throw new Error('Reload Debug Manager');
    if (typeof db.enabled == 'undefined') throw new Error('Reload Debug Manager');
  } catch (e) {
    db = {};
    db.enabled = false;
    db.verbose = false;
    localStorage.setItem('db', JSON.stringify(db));
  }
  db.init = (function () {
    db.log = function (message: string, isVerbose: boolean) {
      // Don't Log Verbose Stuff Normally
      if (isVerbose && !db.verbose) return;

      // If Logging is Enabled - Log It
      if (db.enabled) {
        console.log(message);
      }
    };
    db.on = function () {
      db.enabled = true;
      console.log('db is now on!');
      localStorage.setItem('db', JSON.stringify(db));
    };
    db.off = function () {
      db.enabled = false;
      console.log('db is now off!');
      localStorage.setItem('db', JSON.stringify(db));
    };
  })();
  db.gremlinsSettings = {};
  db.gremlinsSettings.nb = 100000;
  db.gremlinsSettings.delay = 5;
  db.gremlins = () => {
    $('#nav-footer').height(200);
    $('#nav-footer-toggle').hide();
    $('#bottom-icons-container').height(200);
    $('#bottom-icons').height(200);
    let startGremlins = () => {
      const bottomMenuGremlinClicker = window.gremlins.species.clicker({
        // Click only if parent is has class test-class
        canClick: (element: any) => {
          if (typeof element.parentElement == 'undefined' || element.parentElement == null) return null;
          return element.parentElement.className === 'bmenu-item';
        },
        defaultPositionSelector: () => {
          [
            window.randomizer.natural({
              max: Math.max(0, document.documentElement.clientWidth - 1),
            }),
            window.randomizer.natural({
              min: Math.max(0, document.documentElement.clientHeight - 100),
              max: Math.max(0, document.documentElement.clientHeight - 1),
            }),
          ];
        },
      });
      const bottomMenuGremlinScroller = window.gremlins.species.toucher({
        touchTypes: ['gesture'],
        defaultPositionSelector: () => {
          [
            window.randomizer.natural({
              max: Math.max(0, document.documentElement.clientWidth - 1),
            }),
            window.randomizer.natural({
              min: Math.max(0, document.documentElement.clientHeight - 100),
              max: Math.max(0, document.documentElement.clientHeight - 1),
            }),
          ];
        },
      });
      const distributionStrategy = window.gremlins.strategies.distribution({
        distribution: [0.3, 0.3, 0.1, 0.1, 0.1, 0.1], // the first three gremlins have more chances to be executed than the last
        delay: 5, // wait 5 ms between each action
      });
      window.gremlins
        .createHorde({
          species: [
            bottomMenuGremlinClicker,
            bottomMenuGremlinScroller,
            // gremlins.species.scroller(),
            window.gremlins.species.clicker(),
            window.gremlins.species.toucher(),
            window.gremlins.species.formFiller(),
            window.gremlins.species.typer(),
          ],
          mogwais: [window.gremlins.mogwais.alert(), window.gremlins.mogwais.fps(), window.gremlins.mogwais.gizmo({ maxErrors: 1000 })],
          strategies: [distributionStrategy],
        })
        .unleash();
      return;
    };
    if (typeof window.gremlins == 'undefined') {
      let s: any = document.createElement('script');
      s.src = 'https://unpkg.com/gremlins.js';
      if (s.addEventListener) {
        s.addEventListener('load', startGremlins, false);
      } else if (s.readyState) {
        s.onreadystatechange = startGremlins;
      }
      document.body.appendChild(s);
    } else {
      startGremlins();
    }
  };

  (<any>settingsManager).db = db;
};
