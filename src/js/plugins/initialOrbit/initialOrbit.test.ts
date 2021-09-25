import * as initialOrbit from '@app/js/plugins/initialOrbit/initialOrbit';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe('initialOrbit.init', () => {
  test('0', () => {
    let callFunction: any = () => {
      initialOrbit.init();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('initialOrbit.hideSideMenus', () => {
  test('0', () => {
    let callFunction: any = () => {
      initialOrbit.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('initialOrbit.uiManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      initialOrbit.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('initialOrbit.bottomMenuClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      initialOrbit.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      initialOrbit.bottomMenuClick('menu-obfit');
      initialOrbit.bottomMenuClick('menu-obfit');
    };

    expect(callFunction).not.toThrow();
  });
});

describe('initialOrbit.obfitFormSubmit', () => {
  test('0', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value=""></input>
                <input id="obfit-t2" value=""></input>
                <input id="obfit-t3" value=""></input>
                <input id="obfit-x1"value=""></input>
                <input id="obfit-y1"value=""></input>
                <input id="obfit-z1"value=""></input>
                <input id="obfit-xd1"value=""></input>
                <input id="obfit-yd1"value=""></input>
                <input id="obfit-zd1"value=""></input>
                <input id="obfit-x2"value=""></input>
                <input id="obfit-y2"value=""></input>
                <input id="obfit-z2"value=""></input>
                <input id="obfit-xd2"value=""></input>
                <input id="obfit-yd2"value=""></input>
                <input id="obfit-zd2"value=""></input>
                <input id="obfit-x3"value=""></input>
                <input id="obfit-y3"value=""></input>
                <input id="obfit-z3"value=""></input>
                <input id="obfit-xd3"value=""></input>
                <input id="obfit-yd3"value=""></input>
                <input id="obfit-zd3"value=""></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                  <input id="obfit-t1" value="0"></input>
                  <input id="obfit-t2" value="a"></input>
                  <input id="obfit-t3" value="0"></input>
                  <input id="obfit-x1"value="0"></input>
                  <input id="obfit-y1"value="0"></input>
                  <input id="obfit-z1"value="0"></input>
                  <input id="obfit-xd1"value="0"></input>
                  <input id="obfit-yd1"value="0"></input>
                  <input id="obfit-zd1"value="0"></input>
                  <input id="obfit-x2"value="0"></input>
                  <input id="obfit-y2"value="0"></input>
                  <input id="obfit-z2"value="0"></input>
                  <input id="obfit-xd2"value="0"></input>
                  <input id="obfit-yd2"value="0"></input>
                  <input id="obfit-zd2"value="0"></input>
                  <input id="obfit-x3"value="0"></input>
                  <input id="obfit-y3"value="0"></input>
                  <input id="obfit-z3"value="0"></input>
                  <input id="obfit-xd3"value="0"></input>
                  <input id="obfit-yd3"value="0"></input>
                  <input id="obfit-zd3"value="0"></input>
              `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                  <input id="obfit-t1" value="0"></input>
                  <input id="obfit-t2" value="0"></input>
                  <input id="obfit-t3" value="a"></input>
                  <input id="obfit-x1"value="0"></input>
                  <input id="obfit-y1"value="0"></input>
                  <input id="obfit-z1"value="0"></input>
                  <input id="obfit-xd1"value="0"></input>
                  <input id="obfit-yd1"value="0"></input>
                  <input id="obfit-zd1"value="0"></input>
                  <input id="obfit-x2"value="0"></input>
                  <input id="obfit-y2"value="0"></input>
                  <input id="obfit-z2"value="0"></input>
                  <input id="obfit-xd2"value="0"></input>
                  <input id="obfit-yd2"value="0"></input>
                  <input id="obfit-zd2"value="0"></input>
                  <input id="obfit-x3"value="0"></input>
                  <input id="obfit-y3"value="0"></input>
                  <input id="obfit-z3"value="0"></input>
                  <input id="obfit-xd3"value="0"></input>
                  <input id="obfit-yd3"value="0"></input>
                  <input id="obfit-zd3"value="0"></input>
              `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                  <input id="obfit-t1" value="0"></input>
                  <input id="obfit-t2" value="0"></input>
                  <input id="obfit-t3" value="a"></input>
                  <input id="obfit-x1"value="0"></input>
                  <input id="obfit-y1"value="0"></input>
                  <input id="obfit-z1"value="0"></input>
                  <input id="obfit-xd1"value="0"></input>
                  <input id="obfit-yd1"value="0"></input>
                  <input id="obfit-zd1"value="0"></input>
                  <input id="obfit-x2"value="0"></input>
                  <input id="obfit-y2"value="0"></input>
                  <input id="obfit-z2"value="0"></input>
                  <input id="obfit-xd2"value="0"></input>
                  <input id="obfit-yd2"value="0"></input>
                  <input id="obfit-zd2"value="0"></input>
                  <input id="obfit-x3"value="0"></input>
                  <input id="obfit-y3"value="0"></input>
                  <input id="obfit-z3"value="0"></input>
                  <input id="obfit-xd3"value="0"></input>
                  <input id="obfit-yd3"value="0"></input>
                  <input id="obfit-zd3"value="0"></input>
              `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="a"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="a"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="a"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('8', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="a"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('9', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="a"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('10', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="a"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('11', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="a"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('12', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="a"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('13', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="a"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('14', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="a"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('15', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="a"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('16', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="a"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('17', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="a"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('18', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="a"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('19', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="a"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('20', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="a"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('21', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="a"></input>
                <input id="obfit-zd3"value="0"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });

  test('22', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
                <input id="obfit-t1" value="0"></input>
                <input id="obfit-t2" value="0"></input>
                <input id="obfit-t3" value="0"></input>
                <input id="obfit-x1"value="0"></input>
                <input id="obfit-y1"value="0"></input>
                <input id="obfit-z1"value="0"></input>
                <input id="obfit-xd1"value="0"></input>
                <input id="obfit-yd1"value="0"></input>
                <input id="obfit-zd1"value="0"></input>
                <input id="obfit-x2"value="0"></input>
                <input id="obfit-y2"value="0"></input>
                <input id="obfit-z2"value="0"></input>
                <input id="obfit-xd2"value="0"></input>
                <input id="obfit-yd2"value="0"></input>
                <input id="obfit-zd2"value="0"></input>
                <input id="obfit-x3"value="0"></input>
                <input id="obfit-y3"value="0"></input>
                <input id="obfit-z3"value="0"></input>
                <input id="obfit-xd3"value="0"></input>
                <input id="obfit-yd3"value="0"></input>
                <input id="obfit-zd3"value="a"></input>
            `;
      initialOrbit.obfitFormSubmit(new Event('submit'));
    };

    expect(callFunction).not.toThrow();
  });
});
