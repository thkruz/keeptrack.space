import * as debug from "@app/js/plugins/debug/debug"

import { expect } from "@jest/globals"
import { keepTrackApi } from "@app/js/api/externalApi"
import { keepTrackApiStubs } from "@app/js/api/apiMocks"

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe("debug.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            debug.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("debug.startGremlins", () => {
    test("0", () => {
        let callFunction: any = () => {
            debug.startGremlins()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("debug.canClick", () => {
    test("0", () => {
        let callFunction: any = () => {
            debug.canClick({ parentElement: { className: "bmenu-item" } })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            debug.canClick({ parentElement: { className: "" } })
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("debug.getRandomInt", () => {
    test("0", () => {
        let callFunction: any = () => {
            debug.getRandomInt(0, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            debug.getRandomInt(0, -100)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            debug.getRandomInt(0, 1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            debug.getRandomInt(100, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            debug.getRandomInt(-1, -1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            debug.getRandomInt(NaN, NaN)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("6", () => {
        let callFunction: any = () => {
            debug.getRandomInt(-1, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("7", () => {
        let callFunction: any = () => {
            debug.getRandomInt(1, 100)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("8", () => {
        let callFunction: any = () => {
            debug.getRandomInt(-100, 100)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("9", () => {
        let callFunction: any = () => {
            debug.getRandomInt(0, -1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("10", () => {
        let callFunction: any = () => {
            debug.getRandomInt(0.1, -1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("11", () => {
        let callFunction: any = () => {
            debug.getRandomInt(Infinity, Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("debug.defaultPositionSelector", () => {
    test("0", () => {
        let callFunction: any = () => {
            debug.defaultPositionSelector()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("debug.runGremlins", () => {
    test("0", () => {
        let callFunction: any = () => {
            debug.runGremlins()
        }
    
        expect(callFunction).not.toThrow()
    })
})
