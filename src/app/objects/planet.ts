import { rgbaArray } from '@app/engine/core/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { BaseObject } from '@ootk/src/main';


export class Planet extends BaseObject {
  color: rgbaArray = [0.0, 1.0, 0.0, 1.0];

  setHoverDotSize(gl: WebGL2RenderingContext, size: number): void {
    const dotsManagerInstance = keepTrackApi.getDotsManager();

    gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.buffers.size);
    gl.bufferSubData(gl.ARRAY_BUFFER, this.id, new Int8Array([size]));
  }
}
