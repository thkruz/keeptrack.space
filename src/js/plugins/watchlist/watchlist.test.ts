import * as watchlist from "@app/js/plugins/watchlist/watchlist"

import { expect } from '@jest/globals';
// @ponicode
describe("watchlist.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            watchlist.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})
