import "@app/js/settingsManager/settingsManager"

import * as debug from "@app/js/plugins/debug/debug"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe("debug.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            debug.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
