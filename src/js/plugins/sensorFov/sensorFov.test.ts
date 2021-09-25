import * as sensorFov from "@app/js/plugins/sensorFov/sensorFov"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("sensorFov.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            sensorFov.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe("sensorFov.bottomMenuClick", () => {
    test("0", () => {
        let callFunction: any = () => {
            keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
            sensorFov.bottomMenuClick('menu-fov-bubble')
            sensorFov.bottomMenuClick('menu-fov-bubble')
            settingsManager.isFOVBubbleModeOn = true;
            settingsManager.isShowSurvFence = false;
            sensorFov.bottomMenuClick('menu-fov-bubble')
            sensorFov.bottomMenuClick('menu-fov-bubble')
            keepTrackApi.programs.sensorManager.checkSensorSelected = () => false;
            sensorFov.bottomMenuClick('menu-fov-bubble')
            sensorFov.bottomMenuClick('menu-fov-bubble')            
        }
    
        expect(callFunction).not.toThrow()
    })
    test("1", () => {
        let callFunction: any = () => {
            sensorFov.bottomMenuClick('')
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe("sensorFov.enableFovView", () => {
    test("0", () => {
        let callFunction: any = () => {
            sensorFov.enableFovView()
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe("sensorFov.uiManagerInit", () => {
    test("0", () => {
        let callFunction: any = () => {
            sensorFov.uiManagerInit()
        }
    
        expect(callFunction).not.toThrow()
    })
})
