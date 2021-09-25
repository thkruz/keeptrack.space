import '@app/js/settingsManager/settingsManager';

import * as analysis from "@app/js/plugins/analysis/analysis"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
keepTrackApi.programs.settingsManager = window.settingsManager;

// @ponicode
describe("analysis.analysisBptSumbit", () => {
    test("0", () => {
        let callFunction: any = () => {
            analysis.analysisBptSumbit()
            keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
            analysis.analysisBptSumbit()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("analysis.findCsoBtnClick", () => {
    test("0", () => {
        let callFunction: any = () => {
            analysis.findCsoBtnClick()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("analysis.analysisFormSubmit", () => {
    test("0", () => {
        let callFunction: any = () => {
            analysis.analysisFormSubmit()
            keepTrackApi.programs.sensorManager.currentSensor.shortName = undefined;
            analysis.analysisFormSubmit()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("analysis.uiManagerInit", () => {
    test("0", () => {
        let callFunction: any = () => {
            analysis.uiManagerInit()
        }
    
        expect(callFunction).not.toThrow()
    })
})
