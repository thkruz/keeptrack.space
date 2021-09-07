import * as initialOrbit from "@app/js/plugins/initialOrbit/initialOrbit"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("initialOrbit.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            initialOrbit.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
