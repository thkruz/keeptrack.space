// import 'webgl-lint';
import { vec3 } from 'gl-matrix';
import { BufferAttribute } from './buffer-attribute';

export abstract class GlUtils {
  static isWebglLintEnabled = false;

  static tagObject(gl: WebGL2RenderingContext, obj, tag?: string) {
    if (GlUtils.isWebglLintEnabled && tag) {
      const ext = gl.getExtension('GMAN_debug_helper');

      ext.tagObject(obj, tag);
    }
  }

  static readonly PLANE_DIRECTIONS = {
    'z': [0, 1, 2, 1, -1, 1],
    '-z': [0, 1, 2, -1, -1, -1],
    '-x': [2, 1, 0, 1, -1, -1],
    'x': [2, 1, 0, -1, -1, 1],
    'y': [0, 2, 1, 1, 1, 1],
    '-y': [0, 2, 1, 1, -1, -1],
  };

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
   * Assigns attributes to an attribute object.
   */
  public static assignAttributes(attribs: Record<string, BufferAttribute>, gl: WebGL2RenderingContext, program: WebGLProgram, attributes: string[]): void {
    attributes.forEach((attribute) => {
      attribs[attribute].location = gl.getAttribLocation(program, attribute);
    });
  }

  /**
   * Assigns uniforms to a uniform object.
   */
  public static assignUniforms(uniforms: Record<string, WebGLUniformLocation | null>, gl: WebGL2RenderingContext, program: WebGLProgram, uniformsList: string[]): void {
    uniformsList.forEach((uniform) => {
      const uniformLocation = gl.getUniformLocation(program, uniform);

      // TODO: We need to handle turning on uniforms better

      // Avoid crashing production immediately even if it might crash later.
      if (!uniformLocation) {
        if (window.location.hostname === 'localhost') {
          throw new Error(`Uniform ${uniform} not found in program ${program}`);
        } else {
          console.warn(`Uniform ${uniform} not found in program ${program}`);
        }
      }

      uniforms[uniform] = uniformLocation as WebGLUniformLocation;
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
  public static bindBufferDynamicDraw(gl: WebGL2RenderingContext, buffer: WebGLBuffer, data: Float32Array | Uint16Array): WebGLBuffer {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    return buffer;
  }

  /**
   * Init a texture and load an image.
   */
  // eslint-disable-next-line require-await
  static async initTexture(gl: WebGL2RenderingContext, url: string): Promise<WebGLTexture> {
    const texture = gl.createTexture();

    try {
      const resp = await fetch(url);

      if (!resp.ok) {
        throw new Error(`Failed to fetch image: ${url} (${resp.status})`);
      }

      const blob = await resp.blob();
      const imgBitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', imageOrientation: 'none' });

      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgBitmap);

      if (GlUtils.isPowerOf2(imgBitmap.width) && GlUtils.isPowerOf2(imgBitmap.height)) {
        // power of 2: generate mipmaps and set trilinear filtering + repeat
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        const ext = gl.getExtension('EXT_texture_filter_anisotropic');

        if (ext) {
          const maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);

          gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, maxAnisotropy);
        }

        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        // not power of 2: clamp and linear filtering
        // eslint-disable-next-line no-console
        console.warn(`Texture ${url} is not power of 2!`);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }

      return texture;
    } catch (err) {
      throw new Error(`Failed to load image: ${url} - ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  static getBestTexture(textureMap: Record<string, WebGLTexture>): WebGLTexture {
    const qualityOrder = [
      '16k',
      '8k',
      '4k',
      '2k',
      '1k',
      '512',
    ];

    for (const quality of qualityOrder) {
      const texture = textureMap[quality];

      if (texture) {
        return texture;
      }
    }

    // If no texture is found, return null
    return null as unknown as WebGLTexture;
  }

  /**
   * Deteremine if a number is a power of 2.
   */
  static isPowerOf2(value: number): boolean {
    return (value & (value - 1)) === 0;
  }

  /**
   * Binds an image to a texture.
   */
  public static bindImageToTexture(gl: WebGL2RenderingContext, texture: WebGLTexture, img: HTMLImageElement): void {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    if (GlUtils.isPowerOf2(img.width) && GlUtils.isPowerOf2(img.height)) {
      // Yes, it's a power of 2. Generate mips. Set up trilinear filtering (mipmap + linear)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      // Repeat the texture if it's a power of 2
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

      const ext = gl.getExtension('EXT_texture_filter_anisotropic');

      if (ext) {
        const maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);

        gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, maxAnisotropy);
      }

      // Generate mipmaps
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`Texture ${img.src} is not power of 2!`);

      // No, it's not a power of 2. Turn off mips and set wrapping to clamp to edge
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
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

  static createRadarDomeVertices(minRange: number, maxRange: number, minEl: number, maxEl: number, minAz: number, maxAz: number) {
    const combinedArray = [] as number[];
    const indices = [] as number[];
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
    for (let i = 0; i < positions.length; i += 3) {
      combinedArray.push(positions[i][0], positions[i][1], positions[i][2]);
      combinedArray.push(normals[i][0], normals[i][1], normals[i][2]);
    }

    return {
      combinedArray,
      vertIndex: indices,
    };
  }

  /**
   * Creates a sphere with the given radius, latitudinal bands, and longitudinal bands.
   */
  public static createSphere(radius: number, latBands: number, longBands: number, isSkipTexture = false): { combinedArray: number[]; vertIndex: number[] } {
    // generate a uvsphere bottom up, CCW order
    const combinedArray = [] as number[];

    for (let lat = 0; lat <= latBands; lat++) {
      const latAngle = (Math.PI / latBands) * lat - Math.PI / 2;
      const diskRadius = Math.cos(Math.abs(latAngle));
      const z = Math.sin(latAngle);

      for (let lon = 0; lon <= longBands; lon++) {
        // add an extra vertex for texture funness
        const lonAngle = ((Math.PI * 2) / longBands) * lon;
        const x = Math.cos(lonAngle) * diskRadius;
        const y = Math.sin(lonAngle) * diskRadius;
        /*
         * console.log('i: ' + i + '    LON: ' + lonAngle * RAD2DEG + ' X: ' + x + ' Y: ' + y)
         * mercator cylindrical projection (simple angle interpolation)
         */
        const v = 1 - lat / latBands;
        const u = 0.5 + lon / longBands; // may need to change to move map

        /*
         * console.log('u: ' + u + ' v: ' + v);
         * normals: should just be a vector from center to point (aka the point itself!
         */
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
    const vertIndex = [] as number[];

    for (let lat = 0; lat < latBands; lat++) {
      // this is for each QUAD, not each vertex, so <
      for (let lon = 0; lon < longBands; lon++) {
        const blVert = lat * (longBands + 1) + lon; // there's longBands + 1 verts in each horizontal band
        const brVert = blVert + 1;
        const tlVert = (lat + 1) * (longBands + 1) + lon;
        const trVert = tlVert + 1;
        /*
         * DEBUG:
         * console.log('bl: ' + blVert + ' br: ' + brVert +  ' tl: ' + tlVert + ' tr: ' + trVert);
         */

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

  public static crossProduct(a: number[], b: number[]): number[] {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  /**
   * Creates a box with the given width, length, and height.
   */
  public static cube() {
    // prettier-ignore
    const vertices = [
      /*
       * x,    y,    z
       * front face (z: +1)
       */
      1.0, 1.0, 1.0, // top right
      -1.0, 1.0, 1.0, // top left
      -1.0, -1.0, 1.0, // bottom left
      1.0, -1.0, 1.0, // bottom right
      // right face (x: +1)
      1.0, 1.0, -1.0, // top right
      1.0, 1.0, 1.0, // top left
      1.0, -1.0, 1.0, // bottom left
      1.0, -1.0, -1.0, // bottom right
      // top face (y: +1)
      1.0, 1.0, -1.0, // top right
      -1.0, 1.0, -1.0, // top left
      -1.0, 1.0, 1.0, // bottom left
      1.0, 1.0, 1.0, // bottom right
      // left face (x: -1)
      -1.0, 1.0, 1.0, // top right
      -1.0, 1.0, -1.0, // top left
      -1.0, -1.0, -1.0, // bottom left
      -1.0, -1.0, 1.0, // bottom right
      // bottom face (y: -1)
      1.0, -1.0, 1.0, // top right
      -1.0, -1.0, 1.0, // top left
      -1.0, -1.0, -1.0, // bottom left
      1.0, -1.0, -1.0, // bottom right
      // back face (z: -1)
      -1.0, 1.0, -1.0, // top right
      1.0, 1.0, -1.0, // top left
      1.0, -1.0, -1.0, // bottom left
      -1.0, -1.0, -1.0, // bottom right
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
      0.0, 0.0, -1.0,
    ];

    // prettier-ignore
    const indices = [
      0, 1, 2, 0, 2, 3,
      4, 5, 6, 4, 6, 7,
      8, 9, 10, 8, 10, 11,
      12, 13, 14, 12, 14, 15,
      16, 17, 18, 16, 18, 19,
      20, 21, 22, 20, 22, 23,
    ];

    const combinedArray = [] as number[];

    for (let i = 0; i < vertices.length; i += 3) {
      combinedArray.push(vertices[i], vertices[i + 1], vertices[i + 2]);
      combinedArray.push(normals[i], normals[i + 1], normals[i + 2]);
    }

    return {
      combinedArray,
      vertIndex: indices,
    };
  }

  public static ellipsoidFromCovariance(radii: vec3) {
    const latitudeBands = 12;
    const longitudeBands = 24;

    const vertices = [] as number[];
    const normals = [] as number[];
    const indices = [] as number[];

    for (let latNumber = 0; latNumber <= latitudeBands; latNumber++) {
      const theta = (latNumber * Math.PI) / latitudeBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let longNumber = 0; longNumber <= longitudeBands; longNumber++) {
        const phi = (longNumber * 2 * Math.PI) / longitudeBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;

        const normal = vec3.fromValues(x, y, z);

        vec3.normalize(normal, normal);

        vertices.push(radii[0] * x, radii[1] * y, radii[2] * z);
        normals.push(normal[0], normal[1], normal[2]);
      }
    }

    for (let latNumber = 0; latNumber < latitudeBands; latNumber++) {
      for (let longNumber = 0; longNumber < longitudeBands; longNumber++) {
        const first = latNumber * (longitudeBands + 1) + longNumber;
        const second = first + longitudeBands + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    const combinedArray = [] as number[];

    for (let i = 0; i < vertices.length; i += 3) {
      combinedArray.push(vertices[i], vertices[i + 1], vertices[i + 2]);
      combinedArray.push(normals[i], normals[i + 1], normals[i + 2]);
    }

    return {
      combinedArray,
      vertIndex: indices,
    };
  }

  public static customMesh(vertices: Float32Array) {
    // Calculate indices
    const indices = this.calculateTriangleIndices();

    // Calculate normals
    const normals = this.calculateNormals(vertices, indices);

    // Combine arrays
    const combinedArray = [] as number[];

    for (let i = 0; i < vertices.length; i += 3) {
      combinedArray.push(vertices[i], vertices[i + 1], vertices[i + 2]);
      combinedArray.push(normals[i], normals[i + 1], normals[i + 2]);
    }

    return {
      combinedArray,
      vertIndex: indices,
    };
  }

  static flattenVec3(vertices: { x: number; y: number; z: number }[]) {
    return vertices.reduce((acc, cur) => {
      acc.push(cur.x, cur.y, cur.z);

      return acc;
    }, [] as number[]);
  }

  public static subtract(a: number[], b: number[]): number[] {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }
}
