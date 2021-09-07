import * as recorderManager from "@app/js/plugins/recorderManager/recorderManager"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("recorderManager.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            recorderManager.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
