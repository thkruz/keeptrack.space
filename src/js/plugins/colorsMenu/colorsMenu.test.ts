import * as colorsMenu from "@app/js/plugins/colorsMenu/colorsMenu"

import { expect } from "@jest/globals"
import { keepTrackApi } from "@app/js/api/externalApi"
import { keepTrackApiStubs } from "@app/js/api/apiMocks"

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
keepTrackApi.programs.settingsManager = window.settingsManager;

// @ponicode
describe("colorsMenu.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            colorsMenu.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("colorsMenu.hideSideMenus", () => {
    test("0", () => {
        let callFunction: any = () => {
            colorsMenu.hideSideMenus()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("colorsMenu.rightBtnMenuAdd", () => {
    test("0", () => {
        let callFunction: any = () => {
            colorsMenu.rightBtnMenuAdd()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("colorsMenu.uiManagerInit", () => {
    test("0", () => {
        let callFunction: any = () => {
            colorsMenu.uiManagerInit()
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe("colorsMenu.bottomMenuClick", () => {
    test("0", () => {
        let callFunction: any = () => {
            colorsMenu.bottomMenuClick("menu-color-scheme")
            colorsMenu.bottomMenuClick("menu-color-scheme")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            colorsMenu.bottomMenuClick("")
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("colorsMenu.colorsMenuClick", () => {
    test("0", () => {
        let callFunction: any = () => {
            colorsMenu.colorsMenuClick("default")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            colorsMenu.colorsMenuClick("velocity")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            colorsMenu.colorsMenuClick("sunlight")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            colorsMenu.colorsMenuClick("near-earth")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            colorsMenu.colorsMenuClick("deep-space")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            colorsMenu.colorsMenuClick("elset-age")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("6", () => {
        let callFunction: any = () => {
            document.body.innerHTML = `<input id="search" value="1"></input>`
            colorsMenu.colorsMenuClick("lost-objects")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("7", () => {
        let callFunction: any = () => {
            colorsMenu.colorsMenuClick("rcs")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("8", () => {
        let callFunction: any = () => {
            colorsMenu.colorsMenuClick("smallsats")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("9", () => {
        let callFunction: any = () => {
            colorsMenu.colorsMenuClick("countries")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("10", () => {
        let callFunction: any = () => {
            colorsMenu.colorsMenuClick("")
        }
    
        expect(callFunction).not.toThrow()
    })
})
