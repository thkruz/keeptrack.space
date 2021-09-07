import * as datetime from "@app/js/plugins/datetime/datetime"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("datetime.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            datetime.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
