import { keepTrackContainer } from '@app/js/container';
import { Singletons } from '@app/js/interfaces';
import { mat4 } from 'gl-matrix';
import { DrawManager } from '../draw-manager';
import { CustomMesh } from './custom-mesh';
import { RadarDome } from './radar-dome';

// ////////////////////////////////////////////////////////////////////////////
// TODO: This is a WIP for a custom mesh factory. It's not used yet.
// ////////////////////////////////////////////////////////////////////////////

/* istanbul ignore file */

export class CustomMeshFactory {
  private customMeshes_: any[] = [];

  createCustomMesh(vertexList: Float32Array) {
    const customMesh = new CustomMesh();

    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    customMesh.init(drawManagerInstance.gl, vertexList);
    customMesh.id = this.customMeshes_.length;
    this.customMeshes_.push(customMesh);
    return customMesh;
  }

  remove(id: number) {
    this.customMeshes_.splice(id, 1);
  }

  updateVertexList(id: number, vertexList: Float32Array) {
    this.customMeshes_[id].updateVertexList(vertexList);
  }

  clear() {
    this.customMeshes_ = [];
  }

  drawAll(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    this.customMeshes_.forEach((customMesh) => {
      customMesh.draw(pMatrix, camMatrix, tgtBuffer);
    });
  }

  updateAll() {
    this.customMeshes_.forEach((customMesh) => {
      customMesh.update();
    });
  }

  createRadarDome() {
    const radarDome = new RadarDome();

    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    radarDome.init(drawManagerInstance.gl);
    radarDome.id = this.customMeshes_.length;
    this.customMeshes_.push(radarDome);
    return radarDome;
  }

  createMarkerMesh() {
    const centerPoint = [10000, 0, 0];
    const vertexList = new Float32Array(8 * 3);
    const halfExtent = 1000 / 2;
    vertexList[0] = centerPoint[0] - halfExtent;
    vertexList[1] = centerPoint[1] - halfExtent;
    vertexList[2] = centerPoint[2] - halfExtent;
    vertexList[3] = centerPoint[0] + halfExtent;
    vertexList[4] = centerPoint[1] - halfExtent;
    vertexList[5] = centerPoint[2] - halfExtent;
    vertexList[6] = centerPoint[0] - halfExtent;
    vertexList[7] = centerPoint[1] + halfExtent;
    vertexList[8] = centerPoint[2] - halfExtent;
    vertexList[9] = centerPoint[0] + halfExtent;
    vertexList[10] = centerPoint[1] + halfExtent;
    vertexList[11] = centerPoint[2] - halfExtent;
    vertexList[12] = centerPoint[0] - halfExtent;
    vertexList[13] = centerPoint[1] - halfExtent;
    vertexList[14] = centerPoint[2] + halfExtent;
    vertexList[15] = centerPoint[0] + halfExtent;
    vertexList[16] = centerPoint[1] - halfExtent;
    vertexList[17] = centerPoint[2] + halfExtent;
    vertexList[18] = centerPoint[0] - halfExtent;
    vertexList[19] = centerPoint[1] + halfExtent;
    vertexList[20] = centerPoint[2] + halfExtent;
    vertexList[21] = centerPoint[0] + halfExtent;
    vertexList[22] = centerPoint[1] + halfExtent;
    vertexList[23] = centerPoint[2] + halfExtent;

    return this.createCustomMesh(vertexList);
  }
}
