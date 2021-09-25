import * as newLaunch from "@app/js/plugins/newLaunch/newLaunch"

import { expect } from "@jest/globals"
import { keepTrackApi } from "@app/js/api/externalApi"
import { keepTrackApiStubs } from "@app/js/api/apiMocks"

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
keepTrackApi.programs.settingsManager = window.settingsManager;

// @ponicode
describe("newLaunch.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            newLaunch.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("newLaunch.newLaunchSubmit", () => {
    test("0", () => {
        let callFunction: any = () => {
            keepTrackApi.programs.objectManager.isLaunchSiteManagerLoaded = true;
            newLaunch.newLaunchSubmit()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("newLaunch.uiManagerInit", () => {
    test("0", () => {
        let callFunction: any = () => {
            newLaunch.uiManagerInit()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("newLaunch.hideSideMenus", () => {
    test("0", () => {
        let callFunction: any = () => {
            newLaunch.hideSideMenus()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("newLaunch.adviceReady", () => {
    test("0", () => {
        let callFunction: any = () => {
            newLaunch.adviceReady()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("newLaunch.bottomMenuClick", () => {
    test("0", () => {
        let callFunction: any = () => {
            newLaunch.bottomMenuClick("Credit Card Account")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            keepTrackApi.programs.objectManager.selectedSat = 1;
            newLaunch.bottomMenuClick("menu-newLaunch")
            newLaunch.bottomMenuClick("menu-newLaunch")
            keepTrackApi.programs.objectManager.selectedSat = -1;
            newLaunch.bottomMenuClick("menu-newLaunch")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            newLaunch.bottomMenuClick("")
        }
    
        expect(callFunction).not.toThrow()
    })
})
