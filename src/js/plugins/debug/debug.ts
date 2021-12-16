// @ts-ignore-next-line
import * as gremlins from 'gremlins.js';
import $ from 'jquery';

/*
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
export const getRandomInt = (min: number, max: number): any => {
  min = Number.isNaN(min) ? 0 : Math.ceil(min);
  max = Number.isNaN(max) ? 100 : Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const defaultPositionSelector = () => {
  const x = getRandomInt(0, Math.max(0, document.documentElement.clientWidth - 1));
  const y = getRandomInt(Math.max(0, document.documentElement.clientHeight - 100), Math.max(0, document.documentElement.clientHeight - 1));
  return [x, y];
};
export const canClick = (element: { parentElement: { className: string } }) => {
  if (typeof element.parentElement == 'undefined' || element.parentElement == null) return null;
  return element.parentElement.className === 'bmenu-item';
};
export const startGremlins = () => {
  const bottomMenuGremlinClicker = gremlins.species.clicker({
    // Click only if parent is has class test-class
    canClick: canClick,
    defaultPositionSelector: defaultPositionSelector,
  });
  const bottomMenuGremlinScroller = gremlins.species.toucher({
    touchTypes: ['gesture'],
    defaultPositionSelector: defaultPositionSelector,
  });
  const distributionStrategy = gremlins.strategies.distribution({
    distribution: [0.3, 0.3, 0.1, 0.1, 0.1, 0.1],
    delay: 5, // wait 5 ms between each action
  });
  gremlins
    .createHorde({
      species: [
        bottomMenuGremlinClicker,
        bottomMenuGremlinScroller,
        gremlins.species.clicker(),
        gremlins.species.toucher(),
        gremlins.species.formFiller(),
        gremlins.species.typer(),
      ],
      mogwais: [gremlins.mogwais.alert(), gremlins.mogwais.fps(), gremlins.mogwais.gizmo({ maxErrors: 1000 })],
      strategies: [distributionStrategy],
    })
    .unleash();
};
export const runGremlins = () => {
  $('#nav-footer').height(200);
  $('#nav-footer-toggle').hide();
  $('#bottom-icons-container').height(200);
  $('#bottom-icons').height(200);
  startGremlins();
};
//Global Debug Manager
export const init = (): void => {
  const db: any = {
    gremlinsSettings: {
      nb: 100000,
      delay: 5,
    },
    gremlins: runGremlins,
  };

  settingsManager.db = db;
};
