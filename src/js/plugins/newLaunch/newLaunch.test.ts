import * as newLaunch from "@app/js/plugins/newLaunch/newLaunch"

import { expect } from '@jest/globals';
// @ponicode
describe("newLaunch.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            newLaunch.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
