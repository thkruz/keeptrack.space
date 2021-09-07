import * as photoManager from "@app/js/plugins/photoManager/photoManager"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("photoManager.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            photoManager.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
