import * as updateSelectBoxCore from "@app/js/plugins/updateSelectBox/updateSelectBoxCore"

import { defaultSat, keepTrackApiStubs } from '@app/js/api/apiMocks';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';

keepTrackApi.programs = {...keepTrackApi.programs, ...keepTrackApiStubs.programs};

// @ponicode
describe("updateSelectBoxCore.updateSelectBoxCoreCallback", () => {
    test("0", () => {
        let callFunction: any = () => {
            updateSelectBoxCore.updateSelectBoxCoreCallback(defaultSat);
            keepTrackApi.programs.objectManager.isSensorManagerLoaded = true;
            keepTrackApi.programs.satellite.currentTEARR = {
                lat: 1,
                lon: 1,
                alt: 0,
                az: 0,
                el: 0,
                rng: 0,
                inview: true,
            };
            updateSelectBoxCore.updateSelectBoxCoreCallback(defaultSat);
            keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
            keepTrackApi.programs.satellite.currentTEARR = {
                lat: 1,
                lon: 1,
                alt: 0,
                az: 0,
                el: 0,
                rng: 0,
                inview: false,
            };
            updateSelectBoxCore.updateSelectBoxCoreCallback(defaultSat);
            (<any>defaultSat).missile = true;
            updateSelectBoxCore.updateSelectBoxCoreCallback(defaultSat);
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            updateSelectBoxCore.updateSelectBoxCoreCallback(null)
        }
    
        expect(callFunction).toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            updateSelectBoxCore.updateSelectBoxCoreCallback(undefined)
        }
    
        expect(callFunction).toThrow()
    })
})
