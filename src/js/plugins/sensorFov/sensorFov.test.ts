import * as sensorFov from "@app/js/plugins/sensorFov/sensorFov"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = {...keepTrackApi.programs, ...keepTrackApiStubs.programs};
// @ponicode
describe("sensorFov.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            sensorFov.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
