import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as initialOrbit from '@app/js/plugins/initialOrbit/initialOrbit';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('initialOrbit.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      initialOrbit.init();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('initialOrbit.hideSideMenus', () => {
  test('0', () => {
    const callFunction: any = () => {
      initialOrbit.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('initialOrbit.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      initialOrbit.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('initialOrbit.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      initialOrbit.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      initialOrbit.bottomMenuClick('menu-obfit');
      initialOrbit.bottomMenuClick('menu-obfit');
    };

    expect(callFunction).not.toThrow();
  });
});

describe('initialOrbit.obfitFormSubmit', () => {
  test('0', () => {
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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
    const callFunction: any = () => {
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

// @ponicode
describe('initialOrbit.hideSideMenus', () => {
  test('0', () => {
    const callFunction: any = () => {
      initialOrbit.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('initialOrbit.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      initialOrbit.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('initialOrbit.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      initialOrbit.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      initialOrbit.bottomMenuClick('menu-obfit');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      initialOrbit.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      initialOrbit.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      initialOrbit.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      initialOrbit.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
