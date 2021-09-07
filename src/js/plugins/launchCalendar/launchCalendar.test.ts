import * as launchCalendar from "@app/js/plugins/launchCalendar/launchCalendar"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("launchCalendar.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            launchCalendar.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
