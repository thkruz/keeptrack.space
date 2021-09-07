import * as satInfoboxCore from "@app/js/plugins/selectSatManager/satInfoboxCore"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = {...keepTrackApi.programs, ...keepTrackApiStubs.programs};
// @ponicode
describe("satInfoboxCore.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            satInfoboxCore.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
