/**
 * @format
 */

import { getIdFromSensorName, getIdFromStarName, getSat, getSatPosOnly } from '@app/js/satSet.js';

var lineManager = {};
var drawLineList = [];

class Line {
  constructor() {
    let gl = lineManager.gl;
    this.vertBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(6), gl.STREAM_DRAW);
  }

  set(pt1, pt2) {
    let gl = lineManager.gl;
    var buf = [];
    buf.push(pt1[0]);
    buf.push(pt1[1]);
    buf.push(pt1[2]);
    buf.push(pt2[0]);
    buf.push(pt2[1]);
    buf.push(pt2[2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buf), gl.STREAM_DRAW);
  }

  draw(color) {
    let gl = lineManager.gl;
    let shader = lineManager.shader;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(shader);
    if (typeof color == 'undefined') color = [1.0, 0.0, 1.0, 1.0];
    try {
      gl.uniform4fv(shader.uColor, color);
    } catch (e) {
      gl.uniform4fv(shader.uColor, [1.0, 0.0, 1.0, 1.0]);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.vertexAttribPointer(shader.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shader.aPos);
    gl.drawArrays(gl.LINES, 0, 2);

    gl.disableVertexAttribArray(shader.aColor);

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
  }
}

lineManager.init = (gl, shader) => {
  lineManager.gl = gl;
  lineManager.shader = shader;
};

lineManager.drawWhenSelected = () => {
  for (i = 0; i < drawLineList.length; i++) {
    if (drawLineList[i].isDrawWhenSelected) {
      drawLineList.splice(i, 1);
    }
  }
};

lineManager.clear = () => {
  drawLineList = [];
};

lineManager.removeStars = () => {
  let starFound = false;
  for (var i = 0; i < drawLineList.length; i++) {
    if ((typeof drawLineList[i].sat !== 'undefined' && drawLineList[i].sat.type == 'Star') || (typeof drawLineList[i].sat2 !== 'undefined' && drawLineList[i].sat2.type == 'Star')) {
      drawLineList.splice(i, 1);
      starFound = true;
    }
  }
  return starFound;
};

lineManager.create = (type, value, color) => {
  if (typeof color == 'undefined') color = [1.0, 0, 1.0, 1.0];
  switch (color) {
    case 'r':
      color = [1.0, 0.0, 0.0, 1.0];
      break;
    case 'o':
      color = [1.0, 0.5, 0.0, 1.0];
      break;
    case 'y':
      color = [1.0, 1.0, 0.0, 1.0];
      break;
    case 'g':
      color = [0.0, 1.0, 0.0, 1.0];
      break;
    case 'b':
      color = [0.0, 0.0, 1.0, 1.0];
      break;
    case 'c':
      color = [0.0, 1.0, 1.0, 1.0];
      break;
    case 'p':
      color = [1.0, 0.0, 1.0, 1.0];
      break;
    case 'w':
      color = [1.0, 1.0, 1.0, 1.0];
      break;
  }
  if (type == 'sat') {
    let sat = getSat(value);
    drawLineList.push({
      line: new Line(lineManager.shader),
      sat: sat,
      ref: [0, 0, 0],
      ref2: [sat.position.x, sat.position.y, sat.position.z],
      color: color,
    });
  }
  if (type == 'sat2') {
    let sat = getSat(value[0]);
    drawLineList.push({
      line: new Line(lineManager.shader),
      sat: sat,
      ref: [value[1], value[2], value[3]],
      ref2: [sat.position.x, sat.position.y, sat.position.z],
      color: color,
    });
  }
  if (type == 'sat3') {
    let sat = getSat(value[0]);
    let sat2 = getSat(value[1]);
    drawLineList.push({
      line: new Line(lineManager.shader),
      sat: sat,
      sat2: sat2,
      ref: [sat.position.x, sat.position.y, sat.position.z],
      ref2: [sat2.position.x, sat2.position.y, sat2.position.z],
      color: color,
      isOnlyInFOV: true,
      isDrawWhenSelected: false,
    });
  }
  if (type == 'sat4') {
    let sat = getSat(value[0]);
    let sat2 = getSat(value[1]);
    drawLineList.push({
      line: new Line(lineManager.shader),
      sat: sat,
      sat2: sat2,
      ref: [sat.position.x, sat.position.y, sat.position.z],
      ref2: [sat2.position.x, sat2.position.y, sat2.position.z],
      color: color,
      isOnlyInFOV: true,
      isDrawWhenSelected: true,
    });
  }
  if (type == 'sat5') {
    let sat = getSat(value[0]);
    let sat2 = getSat(value[1]);
    drawLineList.push({
      line: new Line(lineManager.shader),
      sat: sat,
      sat2: sat2,
      ref: [sat.position.x, sat.position.y, sat.position.z],
      ref2: [sat2.position.x, sat2.position.y, sat2.position.z],
      color: color,
      isOnlyInFOV: false,
      isDrawWhenSelected: false,
    });
  }
  if (type == 'ref') {
    drawLineList.push({
      line: new Line(lineManager.shader),
      ref: [0, 0, 0],
      ref2: [value[0], value[1], value[2]],
      color: color,
    });
  }
  if (type == 'ref2') {
    drawLineList.push({
      line: new Line(lineManager.shader),
      ref: [value[0], value[1], value[2]],
      ref2: [value[3], value[4], value[5]],
      color: color,
    });
  }
};

lineManager.updateLineToSat = (satId, sensorId) => {
  let isLineDrawnToSat = false;
  for (i = 0; i < drawLineList.length; i++) {
    if (typeof drawLineList[i].sat == 'undefined') continue;

    if (drawLineList[i].sat.id == satId) {
      isLineDrawnToSat = true;
    }
  }
  if (!isLineDrawnToSat) {
    lineManager.create('sat4', [satId, sensorId], 'g');
  }
};

lineManager.getLineListLen = () => drawLineList.length;

var i = 0;
var tempStar1, tempStar2;
lineManager.draw = () => {
  if (drawLineList.length == 0) return;
  for (i = 0; i < drawLineList.length; i++) {
    if (typeof drawLineList[i].sat != 'undefined' && drawLineList[i].sat != null && typeof drawLineList[i].sat.id != 'undefined') {
      // At least One Satellite
      drawLineList[i].sat = getSatPosOnly(drawLineList[i].sat.id);
      if (typeof drawLineList[i].sat2 != 'undefined' && drawLineList[i].sat2 != null) {
        // Satellite and Static
        if (typeof drawLineList[i].sat2.name != 'undefined') {
          if (typeof drawLineList[i].sat2.id == 'undefined' && drawLineList[i].sat2.id != null) {
            drawLineList[i].sat2.id = getIdFromSensorName(drawLineList[i].sat2.name);
          }
          drawLineList[i].sat2 = getSat(drawLineList[i].sat2.id);
          if (drawLineList[i].isOnlyInFOV && !drawLineList[i].sat.getTEARR().inview) {
            drawLineList.splice(i, 1);
            continue;
          }
          drawLineList[i].line.set([drawLineList[i].sat.position.x, drawLineList[i].sat.position.y, drawLineList[i].sat.position.z], [drawLineList[i].sat2.position.x, drawLineList[i].sat2.position.y, drawLineList[i].sat2.position.z]);
        } else {
          // Two Satellites
          drawLineList[i].sat2 = getSatPosOnly(drawLineList[i].sat2.id);
          drawLineList[i].line.set([drawLineList[i].sat.position.x, drawLineList[i].sat.position.y, drawLineList[i].sat.position.z], [drawLineList[i].sat2.position.x, drawLineList[i].sat2.position.y, drawLineList[i].sat2.position.z]);
        }
      } else {
        // Just One Satellite
        drawLineList[i].line.set(drawLineList[i].ref, [drawLineList[i].sat.position.x, drawLineList[i].sat.position.y, drawLineList[i].sat.position.z]);
      }
    } else if (typeof drawLineList[i].star1 != 'undefined' && typeof drawLineList[i].star2 != 'undefined' && drawLineList[i].star1 != null && drawLineList[i].star2 != null) {
      // Constellation
      if (typeof drawLineList[i].star1ID == 'undefined') {
        drawLineList[i].star1ID = getIdFromStarName(drawLineList[i].star1);
      }
      if (typeof drawLineList[i].star2ID == 'undefined') {
        drawLineList[i].star2ID = getIdFromStarName(drawLineList[i].star2);
      }
      tempStar1 = getSatPosOnly(drawLineList[i].star1ID);
      tempStar2 = getSatPosOnly(drawLineList[i].star2ID);
      drawLineList[i].line.set([tempStar1.position.x, tempStar1.position.y, tempStar1.position.z], [tempStar2.position.x, tempStar2.position.y, tempStar2.position.z]);
    } else {
      // Arbitrary Lines
      drawLineList[i].line.set(drawLineList[i].ref, drawLineList[i].ref2);
    }

    drawLineList[i].line.draw(drawLineList[i].color);
  }
};

export { lineManager };
