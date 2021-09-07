import * as dops from "@app/js/plugins/dops/dops"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("dops.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            dops.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
