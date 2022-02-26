import { keepTrackApiStubs } from '../api/apiMocks';
import * as externalApi from '../api/keepTrackApi';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import * as search from '../satSet/search';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
// @ponicode
describe('search.year', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.year(externalApi.keepTrackApi.programs.satSet.satData, 2020);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      search.year(externalApi.keepTrackApi.programs.satSet.satData, 2222);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      search.year(externalApi.keepTrackApi.programs.satSet.satData, 15);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      search.year(externalApi.keepTrackApi.programs.satSet.satData, Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('search.yearOrLess', () => {
  test('0', () => {
    const callFunction: any = () => {
      const satObjs = externalApi.keepTrackApi.programs.satSet.satData.map((sat) => {
        sat.TLE1 = '12345678958234567890';
        return sat;
      });
      search.yearOrLess(satObjs, 22);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      const satObjs = externalApi.keepTrackApi.programs.satSet.satData.map((sat) => {
        sat.TLE1 = '12345678957234567890';
        return sat;
      });
      search.yearOrLess(satObjs, 85);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      const satObjs = externalApi.keepTrackApi.programs.satSet.satData.map((sat) => {
        sat.TLE1 = '12345678999234567890';
        return sat;
      });
      search.yearOrLess(satObjs, 85);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('search.name', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.name(keepTrackApi.programs.satSet.satData, /ISS/u);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('search.country', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.country(keepTrackApi.programs.satSet.satData, /China/u);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('search.shape', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.shape(keepTrackApi.programs.satSet.satData, 'fakse');
    };

    expect(callFunction).not.toThrow();
  });
});

describe('search.bus', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.bus(keepTrackApi.programs.satSet.satData, 'fakse');
    };

    expect(callFunction).not.toThrow();
  });
});

describe('search.type', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.type(keepTrackApi.programs.satSet.satData, SpaceObjectType.DEBRIS);
    };

    expect(callFunction).not.toThrow();
  });
});
