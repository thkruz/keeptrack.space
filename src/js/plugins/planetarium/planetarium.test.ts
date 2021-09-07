import * as planetarium from "@app/js/plugins/planetarium/planetarium"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("planetarium.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            planetarium.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
