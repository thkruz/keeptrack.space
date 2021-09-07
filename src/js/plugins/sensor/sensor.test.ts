import * as sensor from "@app/js/plugins/sensor/sensor"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = {...keepTrackApi.programs, ...keepTrackApiStubs.programs};
// @ponicode
describe("sensor.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            sensor.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
