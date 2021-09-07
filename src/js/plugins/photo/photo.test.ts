import * as photo from "@app/js/plugins/photo/photo"

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("photo.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            photo.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
