import * as planetarium from "@app/js/plugins/planetarium/planetarium"

import { expect } from "@jest/globals"
import { keepTrackApi } from "@app/js/api/externalApi"
import { keepTrackApiStubs } from "@app/js/api/apiMocks"

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("planetarium.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            planetarium.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe('planetarium.bottomMenuClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      planetarium.bottomMenuClick('menu-planetarium');
      planetarium.bottomMenuClick('menu-planetarium');
      keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
      keepTrackApi.programs.astronomy = {};
      planetarium.bottomMenuClick('menu-planetarium');
      planetarium.bottomMenuClick('menu-planetarium');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      planetarium.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe("planetarium.uiManagerInit", () => {
    test("0", () => {
        let callFunction: any = () => {
            planetarium.uiManagerInit()
        }
    
        expect(callFunction).not.toThrow()
    })
})
