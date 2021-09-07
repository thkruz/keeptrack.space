import * as externalSources from "@app/js/plugins/externalSources/externalSources"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("externalSources.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            externalSources.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
