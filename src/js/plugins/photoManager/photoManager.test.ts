import * as photoManager from "@app/js/plugins/photoManager/photoManager"

import { expect } from "@jest/globals"
import { keepTrackApi } from "@app/js/api/externalApi"
import { keepTrackApiStubs } from "@app/js/api/apiMocks"

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
keepTrackApi.programs.settingsManager = window.settingsManager;
// @ponicode
describe("photoManager.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            photoManager.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("photoManager.dscovrLoaded", () => {
    test("0", () => {
        let callFunction: any = () => {
            photoManager.dscovrLoaded({ status: 429 })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            photoManager.dscovrLoaded({ status: 100 })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            photoManager.dscovrLoaded({ 
                status: 200,
                response: JSON.stringify([{
                    image: 'test',
                    centroid_coordinates: {
                        lat: 0,
                        long: 0
                    },
                    identifier: '123456789123456789',                    
                }]),                
            })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            photoManager.dscovrLoaded({ response: -Infinity })
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("photoManager.meteosat11", () => {
    test("0", () => {
        let callFunction: any = () => {
            photoManager.meteosat11()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("photoManager.meteosat8", () => {
    test("0", () => {
        let callFunction: any = () => {
            photoManager.meteosat8()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("photoManager.goes1", () => {
    test("0", () => {
        let callFunction: any = () => {
            photoManager.goes1()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("photoManager.himawari8", () => {
    test("0", () => {
        let callFunction: any = () => {
            photoManager.himawari8()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("photoManager.colorbox", () => {
    test("0", () => {
        let callFunction: any = () => {
            photoManager.colorbox("https://croplands.org/app/a/confirm?t=")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            photoManager.colorbox("http://base.com")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            photoManager.colorbox("https://api.telegram.org/bot")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            photoManager.colorbox("www.google.com")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            photoManager.colorbox("http://www.croplands.org/account/confirm?t=")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            photoManager.colorbox("")
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("photoManager.hideSideMenus", () => {
    test("0", () => {
        let callFunction: any = () => {
            photoManager.hideSideMenus()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("photoManager.bottomMenuClick", () => {
    test("0", () => {
        let callFunction: any = () => {
            photoManager.bottomMenuClick("menu-sat-photo")
            photoManager.bottomMenuClick("menu-sat-photo")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            photoManager.bottomMenuClick("")
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("photoManager.uiManagerInit", () => {
    test("0", () => {
        let callFunction: any = () => {
            photoManager.uiManagerInit()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("photoManager.discovr", () => {
    test("0", () => {
        let callFunction: any = () => {
            photoManager.discovr()
        }
    
        expect(callFunction).not.toThrow()
    })
})
