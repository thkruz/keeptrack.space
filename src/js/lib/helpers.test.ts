import * as helpers from '@app/js/lib/helpers';
import { expect } from '@jest/globals';
/* eslint-disable no-undefined */


// @ponicode
describe("helpers.saveVariable", () => {
    test("0", () => {
        const callFunction: any = () => {
            helpers.saveVariable("Anas", "image.png")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        const callFunction: any = () => {
            helpers.saveVariable("Michael", "program.exe")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        const callFunction: any = () => {
            helpers.saveVariable("Jean-Philippe", "install.deb")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        const callFunction: any = () => {
            helpers.saveVariable("Michael", "note.txt")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        const callFunction: any = () => {
            helpers.saveVariable("Anas", "install.deb")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        const callFunction: any = () => {
            helpers.saveVariable("", undefined)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("helpers.saveCsv", () => {
    test("0", () => {
        const callFunction: any = () => {
            helpers.saveCsv(["DELETE FROM Projects WHERE pid = %s", 1000, "UNLOCK TABLES;", "DELETE FROM Projects WHERE pid = %s", "DROP TABLE tmp;"], "Pierre Edouard")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        const callFunction: any = () => {
            helpers.saveCsv([1, 1], "Pierre Edouard")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        const callFunction: any = () => {
            helpers.saveCsv([true, false, true], "Edmond")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        const callFunction: any = () => {
            helpers.saveCsv(["UPDATE Projects SET pname = %s WHERE pid = %s", 1, 1000, false, "UNLOCK TABLES;"], "Edmond")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        const callFunction: any = () => {
            helpers.saveCsv(["SELECT * FROM Movies WHERE Title=’Jurassic Park’ AND Director='Steven Spielberg';", 1000, 1000, true, "SELECT * FROM Movies WHERE Title=’Jurassic Park’ AND Director='Steven Spielberg';"], "Jean-Philippe")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        const callFunction: any = () => {
            helpers.saveCsv([], "")
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("helpers.parseRgba", () => {
    test("2", () => {
        const callFunction: any = () => {
            helpers.parseRgba("rgba(0.5,0.5,0.5,1.0)")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        const callFunction: any = () => {
            helpers.parseRgba("rgba(0.5,0.8,0.2,1.0)")
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("helpers.hex2RgbA", () => {
    test("0", () => {
        const callFunction: any = () => {
            helpers.hex2RgbA("0x9")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        const callFunction: any = () => {
            helpers.hex2RgbA("/#000000000/u")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        const callFunction: any = () => {
            helpers.hex2RgbA("0x3")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        const callFunction: any = () => {
            helpers.hex2RgbA("/#g00/u")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        const callFunction: any = () => {
            helpers.hex2RgbA("/#000000/u")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        const callFunction: any = () => {
            helpers.hex2RgbA("")
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("helpers.rgbCss", () => {
    test("0", () => {
        const callFunction: any = () => {
            helpers.rgbCss([-5.48, 1, 1, 1])
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        const callFunction: any = () => {
            helpers.rgbCss([-5.48, 1, 1, -5.48])
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        const callFunction: any = () => {
            helpers.rgbCss([100, 100, -100, -100])
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        const callFunction: any = () => {
            helpers.rgbCss([-5.48, -5.48, 100, -5.48])
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        const callFunction: any = () => {
            helpers.rgbCss([100, 1, 100, 1])
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        const callFunction: any = () => {
            helpers.rgbCss([null, null, null, null])
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("helpers.truncateString", () => {
    test("0", () => {
        const callFunction: any = () => {
            helpers.truncateString("<?xml version=\"1.0\" ?>\n<a b=\"c\"/>\n", 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        const callFunction: any = () => {
            helpers.truncateString("<?xml version=\"1.0\" ?>\n<a b=\"c\"/>\n", -5.48)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        const callFunction: any = () => {
            helpers.truncateString(undefined, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        const callFunction: any = () => {
            helpers.truncateString("<?xml version=\"1.0\" ?><a b=\"c\"/>", -5.48)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        const callFunction: any = () => {
            helpers.truncateString("<?xml version=\"1.0\" ?><a b=\"c\"/>", -100)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        const callFunction: any = () => {
            helpers.truncateString("", Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})
