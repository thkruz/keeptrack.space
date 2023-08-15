import { mat4 } from 'gl-matrix';

export abstract class GlUtils {
  /**
   * Assigns attributes to an attribute object.
   */
  public static assignAttributes(attribs: any, gl: WebGL2RenderingContext, program: WebGLProgram, attributes: string[]): void {
    attributes.forEach((attribute) => {
      attribs[attribute] = gl.getAttribLocation(program, attribute);
    });
  }

  /**
   * Assigns uniforms to a uniform object.
   */
  public static assignUniforms(uniforms: any, gl: WebGL2RenderingContext, program: WebGLProgram, uniformsList: string[]): void {
    uniformsList.forEach((uniform) => {
      uniforms[uniform] = gl.getUniformLocation(program, uniform);
    });
  }

  /**
   * upload the data to the GPU
   */
  public static bindArrayBuffer(gl: WebGL2RenderingContext, buffer: WebGLBuffer, data: Float32Array | Uint16Array): void {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  }

  /**
   * Upload the buffer to the GPU and bind it to the current ARRAY_BUFFER
   */
  public static bindBufferStreamDraw(gl: WebGL2RenderingContext, buffer: WebGLBuffer, data: Float32Array | Uint16Array): WebGLBuffer {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
    return buffer;
  }

  /**
   * Binds an image to a texture.
   */
  public static bindImageToTexture(gl: WebGL2RenderingContext, texture: WebGLTexture, img: HTMLImageElement) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  }

  /**
   * Create an array buffer and upload the data to the GPU
   */
  public static createArrayBuffer(gl: WebGL2RenderingContext, data: Float32Array | Uint16Array): WebGLBuffer {
    const buffer = gl.createBuffer();
    GlUtils.bindArrayBuffer(gl, buffer, data);
    return buffer;
  }

  /**
   * Create an array element buffer and upload the data to the GPU
   */
  public static createElementArrayBuffer(gl: WebGL2RenderingContext, data: Uint8Array | Uint16Array | Uint32Array): WebGLBuffer {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
  }

  /**
   * Creates a fragment shader from a string.
   */
  public static createFragmentShader(gl: WebGL2RenderingContext, source: string): WebGLShader {
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, source);
    gl.compileShader(fragShader);
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      throw new Error('Fragment shader compilation failed: ' + gl.getShaderInfoLog(fragShader));
    }
    return fragShader;
  }

  public static createPMvCamMatrix(modelViewMatrix: mat4, projectionMatrix: mat4, cameraMatrix: mat4): mat4 {
    mat4.mul(modelViewMatrix, modelViewMatrix, projectionMatrix);
    mat4.mul(modelViewMatrix, modelViewMatrix, cameraMatrix);
    return modelViewMatrix;
  }

  /**
   * Creates a WebGL program from a vertex and fragment shader.
   */
  public static createProgram(gl: WebGL2RenderingContext, vertShader: WebGLShader, fragShader: WebGLShader): WebGLProgram {
    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error('Could not compile WebGL program. \n\n' + info);
    }
    return program;
  }

  /**
   * Creates a WebGL program from a vertex and fragment shader code.
   */
  public static createProgramFromCode(gl: WebGL2RenderingContext, vertCode: string, fragCode: string): WebGLProgram {
    const vertShader = GlUtils.createVertexShader(gl, vertCode);
    const fragShader = GlUtils.createFragmentShader(gl, fragCode);

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error('Could not compile WebGL program. \n\n' + info);
    }
    return program;
  }

  /**
   * Creates a sphere with the given radius, latitudinal bands, and longitudinal bands.
   */
  public static createSphere(radius: number, latBands: number, longBands: number, isSkipTexture = false): { combinedArray: number[]; vertIndex: number[] } {
    // generate a uvsphere bottom up, CCW order
    let combinedArray = [];
    for (let lat = 0; lat <= latBands; lat++) {
      let latAngle = (Math.PI / latBands) * lat - Math.PI / 2;
      let diskRadius = Math.cos(Math.abs(latAngle));
      let z = Math.sin(latAngle);
      for (let lon = 0; lon <= longBands; lon++) {
        // add an extra vertex for texture funness
        let lonAngle = ((Math.PI * 2) / longBands) * lon;
        let x = Math.cos(lonAngle) * diskRadius;
        let y = Math.sin(lonAngle) * diskRadius;
        // console.log('i: ' + i + '    LON: ' + lonAngle * RAD2DEG + ' X: ' + x + ' Y: ' + y)
        // mercator cylindrical projection (simple angle interpolation)
        let v = 1 - lat / latBands;
        let u = 0.5 + lon / longBands; // may need to change to move map

        // console.log('u: ' + u + ' v: ' + v);
        // normals: should just be a vector from center to point (aka the point itself!
        combinedArray.push(x * radius);
        combinedArray.push(y * radius);
        combinedArray.push(z * radius);
        combinedArray.push(x);
        combinedArray.push(y);
        combinedArray.push(z);

        // Some objects don't need texture mapping
        if (!isSkipTexture) {
          combinedArray.push(u);
          combinedArray.push(v);
        }
      }
    }

    // ok let's calculate vertex draw orders.... indiv triangles
    let vertIndex = [];
    for (let lat = 0; lat < latBands; lat++) {
      // this is for each QUAD, not each vertex, so <
      for (let lon = 0; lon < longBands; lon++) {
        let blVert = lat * (longBands + 1) + lon; // there's longBands + 1 verts in each horizontal band
        let brVert = blVert + 1;
        let tlVert = (lat + 1) * (longBands + 1) + lon;
        let trVert = tlVert + 1;
        // DEBUG:
        // console.log('bl: ' + blVert + ' br: ' + brVert +  ' tl: ' + tlVert + ' tr: ' + trVert);
        vertIndex.push(blVert);
        vertIndex.push(brVert);
        vertIndex.push(tlVert);

        vertIndex.push(tlVert);
        vertIndex.push(trVert);
        vertIndex.push(brVert);
      }
    }
    return { combinedArray, vertIndex };
  }

  static getCellsTypedArray = (size: number) => {
    let TYPED_ARRAY_TYPE: Uint8ArrayConstructor | Uint16ArrayConstructor | Uint32ArrayConstructor;
    if (size <= 255) {
      TYPED_ARRAY_TYPE = Uint8Array;
    } else if (size <= 65535) {
      TYPED_ARRAY_TYPE = Uint16Array;
    } else {
      TYPED_ARRAY_TYPE = Uint32Array;
    }
    return TYPED_ARRAY_TYPE;
  };

  /**
   * Creates a box with the given width, length, and height.
   */
  public static cube() {
    // prettier-ignore
    const vertices = [
      // x,    y,    z
      // front face (z: +1)
       1.0,  1.0,  1.0, // top right
      -1.0,  1.0,  1.0, // top left
      -1.0, -1.0,  1.0, // bottom left
       1.0, -1.0,  1.0, // bottom right
      // right face (x: +1)
       1.0,  1.0, -1.0, // top right
       1.0,  1.0,  1.0, // top left
       1.0, -1.0,  1.0, // bottom left
       1.0, -1.0, -1.0, // bottom right
      // top face (y: +1)
       1.0,  1.0, -1.0, // top right
      -1.0,  1.0, -1.0, // top left
      -1.0,  1.0,  1.0, // bottom left
       1.0,  1.0,  1.0, // bottom right
      // left face (x: -1)
      -1.0,  1.0,  1.0, // top right
      -1.0,  1.0, -1.0, // top left
      -1.0, -1.0, -1.0, // bottom left
      -1.0, -1.0,  1.0, // bottom right
      // bottom face (y: -1)
       1.0, -1.0,  1.0, // top right
      -1.0, -1.0,  1.0, // top left
      -1.0, -1.0, -1.0, // bottom left
       1.0, -1.0, -1.0, // bottom right
      // back face (z: -1)
      -1.0,  1.0, -1.0, // top right
       1.0,  1.0, -1.0, // top left
       1.0, -1.0, -1.0, // bottom left
      -1.0, -1.0, -1.0  // bottom right
    ];

    // prettier-ignore
    const normals = [
      0.0, 0.0, 1.0,
      0.0, 0.0, 1.0,
      0.0, 0.0, 1.0,
      0.0, 0.0, 1.0,

      1.0, 0.0, 0.0,
      1.0, 0.0, 0.0,
      1.0, 0.0, 0.0,
      1.0, 0.0, 0.0,

      0.0, 1.0, 0.0,
      0.0, 1.0, 0.0,
      0.0, 1.0, 0.0,
      0.0, 1.0, 0.0,

      -1.0, 0.0, 0.0,
      -1.0, 0.0, 0.0,
      -1.0, 0.0, 0.0,
      -1.0, 0.0, 0.0,

      0.0, -1.0, 0.0,
      0.0, -1.0, 0.0,
      0.0, -1.0, 0.0,
      0.0, -1.0, 0.0,

      0.0, 0.0, -1.0,
      0.0, 0.0, -1.0,
      0.0, 0.0, -1.0,
      0.0, 0.0, -1.0
    ];

    // prettier-ignore
    const indices = [
       0,  1,  2,   0,  2,  3,
       4,  5,  6,   4,  6,  7,
       8,  9, 10,   8, 10, 11,
      12, 13, 14,  12, 14, 15,
      16, 17, 18,  16, 18, 19,
      20, 21, 22,  20, 22, 23
    ];

    const combinedArray = [];
    for (let i = 0; i < vertices.length; i += 3) {
      combinedArray.push(vertices[i], vertices[i + 1], vertices[i + 2]);
      combinedArray.push(normals[i], normals[i + 1], normals[i + 2]);
    }

    return {
      combinedArray: combinedArray,
      vertIndex: indices,
    };
  }

  public static customMesh(vertices: Float32Array) {
    // Calculate indices
    const indices = this.calculateTriangleIndices();

    // Calculate normals
    const normals = this.calculateNormals(vertices, indices);

    // Combine arrays
    const combinedArray = [];
    for (let i = 0; i < vertices.length; i += 3) {
      combinedArray.push(vertices[i], vertices[i + 1], vertices[i + 2]);
      combinedArray.push(normals[i], normals[i + 1], normals[i + 2]);
    }

    return {
      combinedArray: combinedArray,
      vertIndex: indices,
    };
  }

  static createRadarDomeVertices(minRange: number, maxRange: number, minEl: number, maxEl: number, minAz: number, maxAz: number) {
    const combinedArray = [];
    const indices = [];
    const elevationExtent = maxEl - minEl;
    let azimuthExtent = maxAz - minAz;
    if (minAz > maxAz) {
      azimuthExtent += 360;
    }

    const elevationSteps = 40; // You can adjust this value for more or less detail
    const azimuthSteps = 40; // You can adjust this value for more or less detail

    // Create positions first
    const positions: number[][] = [];
    const normals: number[][] = [];
    for (let e = 0; e <= elevationSteps; e++) {
      for (let a = 0; a <= azimuthSteps; a++) {
        const elevation = (((e / elevationSteps) * elevationExtent + minEl) * Math.PI) / 180;
        const azimuthFraction = a / azimuthSteps;
        const currentAzimuth = ((azimuthFraction * azimuthExtent + minAz) * Math.PI) / 180;

        const sinElevation = Math.sin(elevation);
        const cosElevation = Math.cos(elevation);
        const sinAzimuth = Math.sin(currentAzimuth);
        const cosAzimuth = Math.cos(currentAzimuth);

        for (const range of [minRange, maxRange]) {
          const x = range * sinAzimuth * cosElevation;
          const y = range * sinElevation;
          const z = range * cosAzimuth * cosElevation;
          positions.push([x, y, z]);
          normals.push([0, 0, 0]); // Placeholder for normals, to be calculated
        }
      }
    }

    // Indices and normals
    for (let e = 0; e < elevationSteps; e++) {
      for (let a = 0; a < azimuthSteps; a++) {
        for (const rangeIdx of [0, 1]) {
          const idx0 = ((e + 0) * (azimuthSteps + 1) + a + 0) * 2 + rangeIdx;
          const idx1 = ((e + 0) * (azimuthSteps + 1) + a + 1) * 2 + rangeIdx;
          const idx2 = ((e + 1) * (azimuthSteps + 1) + a + 0) * 2 + rangeIdx;
          const idx3 = ((e + 1) * (azimuthSteps + 1) + a + 1) * 2 + rangeIdx;

          // Create two triangles for each rectangle
          indices.push(idx0, idx1, idx2);
          indices.push(idx1, idx3, idx2);

          // Calculate normals for the two triangles and add them to normals array
          for (const [i0, i1, i2] of [
            [idx0, idx1, idx2],
            [idx1, idx3, idx2],
          ]) {
            const v0 = positions[i0];
            const v1 = positions[i1];
            const v2 = positions[i2];
            const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
            const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
            const normal = [edge1[1] * edge2[2] - edge1[2] * edge2[1], edge1[2] * edge2[0] - edge1[0] * edge2[2], edge1[0] * edge2[1] - edge1[1] * edge2[0]];
            const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
            normal.forEach((value, index) => {
              normal[index] = value / length;
            });
            normals[i0] = normals[i0].map((value, index) => value + normal[index]);
            normals[i1] = normals[i1].map((value, index) => value + normal[index]);
            normals[i2] = normals[i2].map((value, index) => value + normal[index]);
          }
        }
      }
    }

    // Normalize normals
    normals.forEach((normal) => {
      const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
      normal.forEach((value, index) => {
        normal[index] = value / length;
      });
    });

    // Combine positions and normals
    for (let i = 0; i < positions.length; i = i + 3) {
      combinedArray.push(positions[i][0], positions[i][1], positions[i][2]);
      combinedArray.push(normals[i][0], normals[i][1], normals[i][2]);
    }

    return {
      combinedArray: combinedArray,
      vertIndex: indices,
    };
  }

  static flattenVec3(vertices: { x: number; y: number; z: number }[]) {
    return vertices.reduce((acc, cur) => {
      acc.push(cur.x, cur.y, cur.z);
      return acc;
    }, []);
  }

  /**
   * Calculates the vertex indices for a 3d mesh.
   * @param vertices
   */
  public static calculateTriangleIndices(): number[] {
    const indices: number[] = [];

    // Define the indices for each face of the cube
    const faceIndices = [
      [0, 1, 2, 0, 2, 3], // front
      [4, 5, 6, 4, 6, 7], // back
      [8, 9, 10, 8, 10, 11], // top
      [12, 13, 14, 12, 14, 15], // bottom
      [16, 17, 18, 16, 18, 19], // right
      [20, 21, 22, 20, 22, 23], // left
    ];

    // Loop through each face and add its indices to the list
    for (let i = 0; i < faceIndices.length; i++) {
      const face = faceIndices[i];
      for (let j = 0; j < face.length; j++) {
        indices.push(face[j] + i * 4);
      }
    }

    return indices;
  }

  /**
   * Calculates the normals for a 3d mesh.
   * @param vertices
   * @returns
   */
  public static calculateNormals(vertices: Float32Array, indices: number[]): number[] {
    const normals: number[] = new Array(vertices.length).fill(0);

    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] * 3;
      const b = indices[i + 1] * 3;
      const c = indices[i + 2] * 3;

      const edge1 = GlUtils.subtract([vertices[b], vertices[b + 1], vertices[b + 2]], [vertices[a], vertices[a + 1], vertices[a + 2]]);
      const edge2 = GlUtils.subtract([vertices[c], vertices[c + 1], vertices[c + 2]], [vertices[a], vertices[a + 1], vertices[a + 2]]);
      const normal = GlUtils.crossProduct(edge1, edge2);

      normals[a] += normal[0];
      normals[a + 1] += normal[1];
      normals[a + 2] += normal[2];
      normals[b] += normal[0];
      normals[b + 1] += normal[1];
      normals[b + 2] += normal[2];
      normals[c] += normal[0];
      normals[c + 1] += normal[1];
      normals[c + 2] += normal[2];
    }

    for (let i = 0; i < normals.length; i += 3) {
      const x = normals[i];
      const y = normals[i + 1];
      const z = normals[i + 2];
      const length = Math.sqrt(x * x + y * y + z * z);
      normals[i] /= length;
      normals[i + 1] /= length;
      normals[i + 2] /= length;
    }

    return normals;
  }

  public static subtract(a: number[], b: number[]): number[] {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  public static crossProduct(a: number[], b: number[]): number[] {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  /**
   * Creates a vertex shader from a string.
   */
  public static createVertexShader(gl: WebGL2RenderingContext, source: string): WebGLShader {
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, source);
    gl.compileShader(vertShader);
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      throw new Error('Vertex shader compilation failed: ' + gl.getShaderInfoLog(vertShader));
    }
    return vertShader;
  }

  static readonly PLANE_DIRECTIONS = {
    'z': [0, 1, 2, 1, -1, 1],
    '-z': [0, 1, 2, -1, -1, -1],
    '-x': [2, 1, 0, 1, -1, -1],
    'x': [2, 1, 0, -1, -1, 1],
    'y': [0, 2, 1, 1, 1, 1],
    '-y': [0, 2, 1, 1, -1, -1],
  };
}
