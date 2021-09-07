import * as countries from "@app/js/plugins/countries/countries"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("countries.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            countries.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
