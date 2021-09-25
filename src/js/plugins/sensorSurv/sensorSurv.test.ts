import * as sensorSurv from "@app/js/plugins/sensorSurv/sensorSurv"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("sensorSurv.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            sensorSurv.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe("sensorSurv.bottomMenuClick", () => {
    test("0", () => {
        let callFunction: any = () => {
            keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
            sensorSurv.bottomMenuClick('menu-surveillance')
            sensorSurv.bottomMenuClick('menu-surveillance')
            keepTrackApi.programs.sensorManager.checkSensorSelected = () => false;
            sensorSurv.bottomMenuClick('menu-surveillance')
            sensorSurv.bottomMenuClick('menu-surveillance')
        }
    
        expect(callFunction).not.toThrow()
    })
    test("0", () => {
        let callFunction: any = () => {
            sensorSurv.bottomMenuClick('')
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe("sensorSurv.uiManagerInit", () => {
    test("0", () => {
        let callFunction: any = () => {
            sensorSurv.uiManagerInit()
        }
    
        expect(callFunction).not.toThrow()
    })
})