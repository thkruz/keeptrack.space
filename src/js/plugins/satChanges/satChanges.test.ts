import * as satChanges from "@app/js/plugins/satChanges/satChanges"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("satChanges.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            satChanges.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
