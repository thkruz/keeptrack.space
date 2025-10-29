import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { vec3 } from 'gl-matrix';
import { Layout, MeshMap, OBJ } from 'webgl-obj-loader';
import { BufferAttribute } from '../../buffer-attribute';
import { Material } from '../../material';
import type { MeshModel } from '../../mesh-manager';
import { MeshLoader } from '../mesh-loader';

export class OBJLoader extends MeshLoader {
  supports(extension: string): boolean {
    return extension === '.obj';
  }

  // eslint-disable-next-line require-await
  async load(meshName: string, url: string, gl: WebGLRenderingContext): Promise<MeshModel | null> {
    const meshFile = {
      obj: url,
      mtl: url.replace('.obj', '.mtl'),
    };


    return OBJ.downloadModels([meshFile]).then((mesh: MeshMap) => this.parseOBJ(meshName, mesh, gl));
  }

  private parseOBJ(meshName: string, mesh: MeshMap, gl: WebGLRenderingContext): MeshModel | null {
    try {
      const layout =
        new OBJ.Layout(OBJ.Layout.POSITION, OBJ.Layout.NORMAL, OBJ.Layout.AMBIENT, OBJ.Layout.DIFFUSE, OBJ.Layout.UV, OBJ.Layout.SPECULAR, OBJ.Layout.SPECULAR_EXPONENT);

      // Create the vertex buffer for this mesh
      const vertexBuffer = gl.createBuffer();

      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

      // Get the original vertex data
      const vertexData = mesh[meshName].makeBufferData(layout);

      /*
       * Scale positions to 1/20th (assuming positions are first in layout)
       * Find the position attribute in the layout
       */
      const positionAttr = layout.attributeMap[OBJ.Layout.POSITION.key];

      if (positionAttr) {
        /*
         * vertexData is a Float32Array
         * For each vertex, scale the position components
         */
        const vertexArray = new Float32Array(vertexData);

        for (let i = 0; i < vertexArray.length; i += layout.stride / 4) {
          // positionAttr.offset is in bytes, convert to floats
          const posOffset = positionAttr.offset / 4;

          vertexArray[i + posOffset + 0] *= 0.05;
          vertexArray[i + posOffset + 1] *= 0.05;
          vertexArray[i + posOffset + 2] *= 0.05;
        }
      }

      gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
      const numItems = vertexData.numItems as number;

      // Create the index buffer for this mesh
      const indexBuffer = gl.createBuffer() as WebGLBuffer & {
        numItems: number;
      };

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      const indexData = mesh[meshName].makeIndexBufferDataForMaterials(...Object.values(mesh[meshName].materialIndices));

      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
      indexBuffer.numItems = indexData.numItems as number;

      /*
       * this loops through the mesh names and creates new
       * model objects and setting their mesh to the current mesh
       */
      return {
        id: -1,
        name: meshName,
        mesh: mesh[meshName],
        buffers: {
          vertexBuffer: vertexBuffer as WebGLBuffer & { layout: Layout },
          indexBuffer,
          vertexCount: numItems,
          indexCount: indexBuffer.numItems,
        },
        layout,
        geometry: {
          positions: new Float32Array(mesh[meshName].vertices),
          normals: new Float32Array(mesh[meshName].vertexNormals),
          uvs: new Float32Array(mesh[meshName].textures),
          indices: new Uint16Array(mesh[meshName].indices),
          attributes: {
            positions: new BufferAttribute({ location: 0, vertices: 3, offset: 0, stride: layout.stride }),
            normals: new BufferAttribute({ location: 1, vertices: 3, offset: 12, stride: layout.stride }),
            uvs: new BufferAttribute({ location: 2, vertices: 2, offset: 24, stride: layout.stride }),
          },
        },
        material: new Material({
          ambient: vec3.fromValues(0.2, 0.2, 0.2),
          diffuse: vec3.fromValues(0.8, 0.8, 0.8),
          specular: vec3.fromValues(1.0, 1.0, 1.0),
          specularExponent: 32,
        }),
      };
    } catch (error) {
      errorManagerInstance.log(error);

      return null;
    }
  }
}
