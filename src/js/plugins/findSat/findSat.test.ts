import * as findSat from "@app/js/plugins/findSat/findSat"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("findSat.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            findSat.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
