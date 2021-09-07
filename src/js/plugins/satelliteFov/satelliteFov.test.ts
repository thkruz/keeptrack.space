import * as satelliteFov from "@app/js/plugins/satelliteFov/satelliteFov"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("satelliteFov.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            satelliteFov.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
