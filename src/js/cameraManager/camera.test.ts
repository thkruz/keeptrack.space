import * as camera from "@app/js/cameraManager/camera"

import { defaultSat, keepTrackApiStubs } from "../api/apiMocks"

import { expect } from "@jest/globals"
import { keepTrackApi } from "@app/js/api/externalApi"

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe("getCamPos", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.getCamPos()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("earthHitTest", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.earthHitTest(keepTrackApi.programs.drawManager.gl, keepTrackApi.programs.dotsManager, 380, 30)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.earthHitTest(keepTrackApi.programs.drawManager.gl, keepTrackApi.programs.dotsManager, 70, 4)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.earthHitTest(keepTrackApi.programs.drawManager.gl, keepTrackApi.programs.dotsManager, 1, 100)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.earthHitTest(keepTrackApi.programs.drawManager.gl, keepTrackApi.programs.dotsManager, 320, 380)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.earthHitTest(keepTrackApi.programs.drawManager.gl, keepTrackApi.programs.dotsManager, 520, 410)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.earthHitTest(keepTrackApi.programs.drawManager.gl, keepTrackApi.programs.dotsManager, Infinity, Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("getForwardVector", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.getForwardVector()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("calculate", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.calculate(100, true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.calculate(0, true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.calculate(-5.48, 0.1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.calculate(1, false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.calculate(0, false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.calculate(-Infinity, false)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("fts2default", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.fts2default()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("keyDownHandler", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.keyDownHandler({ key: "SHIFT" })
            inst.keyDownHandler({ key: "ShiftRight" })
            inst.keyDownHandler({ key: "A" })
            inst.keyDownHandler({ key: "D" })
            inst.keyDownHandler({ key: "S" })
            inst.keyDownHandler({ key: "W" })
            inst.keyDownHandler({ key: "Q" })
            inst.keyDownHandler({ key: "E" })
            inst.keyDownHandler({ key: "J" })
            inst.keyDownHandler({ key: "L" })
            inst.keyDownHandler({ key: "I" })
            inst.keyDownHandler({ key: "K" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.cameraType.current = inst.cameraType.fps;
            inst.keyDownHandler({ key: "SHIFT" })
            inst.keyDownHandler({ key: "ShiftRight" })
            inst.keyDownHandler({ key: "A" })
            inst.keyDownHandler({ key: "D" })
            inst.keyDownHandler({ key: "S" })
            inst.keyDownHandler({ key: "W" })
            inst.keyDownHandler({ key: "Q" })
            inst.keyDownHandler({ key: "E" })
            inst.keyDownHandler({ key: "J" })
            inst.keyDownHandler({ key: "L" })            
            inst.keyDownHandler({ key: "I" })
            inst.keyDownHandler({ key: "K" })            
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.cameraType.current = inst.cameraType.astronomy;
            inst.keyDownHandler({ key: "L" })
            inst.keyDownHandler({ key: "J" })
            inst.keyDownHandler({ key: "Q" })
            inst.keyDownHandler({ key: "E" })       
        }
    
        expect(callFunction).not.toThrow()
    })    

    test("5", () => {
        let callFunction: any = () => {
            inst.keyDownHandler(-Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("keyUpHandler", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.keyUpHandler({ key: "A" })
            inst.keyUpHandler({ key: "D" })
            inst.keyUpHandler({ key: "S" })
            inst.keyUpHandler({ key: "W" })
            inst.keyUpHandler({ key: "Q" })
            inst.keyUpHandler({ key: "E" })
            inst.keyUpHandler({ key: "J" })
            inst.keyUpHandler({ key: "L" })
            inst.keyUpHandler({ key: "I" })
            inst.keyUpHandler({ key: "K" })
            inst.keyUpHandler({ key: "SHIFT" })
            inst.keyUpHandler({ key: "ShiftRight" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.fpsSideSpeed = -settingsManager.fpsSideSpeed;
            inst.keyUpHandler({ key: "A" })
            inst.fpsSideSpeed = settingsManager.fpsSideSpeed;
            inst.keyUpHandler({ key: "D" })
            inst.fpsForwardSpeed = -settingsManager.fpsForwardSpeed;
            inst.keyUpHandler({ key: "S" })
            inst.fpsForwardSpeed = settingsManager.fpsForwardSpeed;
            inst.keyUpHandler({ key: "W" })
            inst.fpsVertSpeed = -settingsManager.fpsVertSpeed;
            inst.keyUpHandler({ key: "Q" })
            inst.fpsVertSpeed = settingsManager.fpsVertSpeed;
            inst.keyUpHandler({ key: "E" })
            inst.keyUpHandler({ key: "J" })
            inst.cameraType.current = inst.cameraType.astronomy
            inst.keyUpHandler({ key: "L" })
            inst.keyUpHandler({ key: "I" })
            inst.keyUpHandler({ key: "K" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.keyUpHandler(NaN)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("camSnap", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.camSnap(320, 1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.camSnap(350, 550)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.camAngleSnappedOnSat = true;
            inst.camSnap(350, -1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.camSnap(520, 350)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.camSnap(4, 50)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.camSnap(NaN, NaN)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("camSnapToSat", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.camSnapToSat("v1.2.4")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.camSnapToSat("1.0.0")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.camSnapToSat("v4.0.0-rc.4")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.camSnapToSat(1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.camSnapToSat({ active: false, position: { x: 1, y: 1, z: 100 }, static: 0 })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.camSnapToSat({ active: true, position: { x: -Infinity, y: NaN, z: -Infinity }, static: undefined })
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("lookAtLatLon", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.lookAtLatLon(-Infinity, -Infinity, undefined, undefined)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("changeZoom", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.changeZoom("meo")
        }
    
        expect(callFunction).toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.changeZoom("geo")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.changeZoom(0.82)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.changeZoom(1.42)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.changeZoom("leo")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.changeZoom(NaN)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("autoPan", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.autoPan(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.autoPan(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.autoPan(undefined)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("autoRotate", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.autoRotate("yes")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.autoRotate(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.autoRotate(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.autoRotate(undefined)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("getCamDist", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.getCamDist()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("fpsMovement", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.fpsMovement()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("resetFpsPos", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.resetFpsPos()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("camera.Camera.normalizeAngle", () => {
    test("0", () => {
        let callFunction: any = () => {
            camera.Camera.normalizeAngle(1.0)            
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            camera.Camera.normalizeAngle(0.89)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            camera.Camera.normalizeAngle(-5.0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            camera.Camera.normalizeAngle(6.2)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            camera.Camera.normalizeAngle(0.1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            camera.Camera.normalizeAngle(-Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe("zoomLevels", () => {
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.zoomLevel = inst.zoomTarget;
            inst.zoomTarget = inst.zoomLevel;
            inst.zoomLevel = 1.1;
            inst.zoomLevel = -1;
            inst.zoomTarget = 1.1;
            inst.zoomTarget = -1;
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe("camera.Camera.latToPitch", () => {
    test("0", () => {
        let callFunction: any = () => {
            camera.Camera.latToPitch(1.0)            
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            camera.Camera.latToPitch(0.89)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            camera.Camera.latToPitch(-5.0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            camera.Camera.latToPitch(6.2)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            camera.Camera.latToPitch(0.1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            camera.Camera.latToPitch(-Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe("camera.Camera.longToYaw", () => {    
    test("0", () => {
        let callFunction: any = () => {
            camera.Camera.longToYaw(1.0, new Date("01-01-2020"));
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            camera.Camera.longToYaw(0.89, new Date("01-01-1020"));
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            camera.Camera.longToYaw(-5.0, new Date("01-01-3020"));
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            camera.Camera.longToYaw(6.2, new Date("01-01-2025"));
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            camera.Camera.longToYaw(0.1, new Date("01-01-2019"));
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            camera.Camera.longToYaw(-Infinity, new Date("01-01-2021"));
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe("camera.update", () => {
    const {drawManager} = keepTrackApi.programs;
    let inst: any

    beforeEach(() => {
        inst = new camera.Camera()
    })
    test("0", () => {
        let callFunction: any = () => {
            inst.update(drawManager.sat, drawManager.sensorPos);
        }
    
        expect(callFunction).not.toThrow()
    })
})