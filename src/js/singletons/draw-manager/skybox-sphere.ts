import { DEG2RAD } from '@app/js/lib/constants';
import { SettingsManager } from '@app/js/settings/settings';
import { GlUtils } from '@app/js/static/gl-utils';
import { mat3, mat4 } from 'gl-matrix';
import { keepTrackApi } from './../../keepTrackApi';
/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

declare module '@app/js/interfaces' {
  interface UserSettings {
    installDirectory: string;
    isDrawConstellationBoundaries: boolean;
    isDrawMilkyWay: boolean;
    isDrawNasaConstellations: boolean;
  }
}
export class SkyBoxSphere {
  private DRAW_RADIUS = 200000;
  private NUM_LAT_SEGS = 16;
  private NUM_LON_SEGS = 16;
  private attribs_ = {
    a_position: 0,
    a_texCoord: 0,
    a_normal: 0,
  };

  private uniforms_ = {
    u_pMatrix: <WebGLUniformLocation>null,
    u_camMatrix: <WebGLUniformLocation>null,
    u_mvMatrix: <WebGLUniformLocation>null,
    u_nMatrix: <WebGLUniformLocation>null,
    u_texMilkyWay: <WebGLUniformLocation>null,
    u_texBoundaries: <WebGLUniformLocation>null,
    u_texConstellations: <WebGLUniformLocation>null,
    u_fMilkyWay: <WebGLUniformLocation>null,
  };

  private gl_: WebGL2RenderingContext;
  private isLoaded_: boolean;
  private isReadyBoundaries_ = false;
  private isReadyConstellations_ = false;
  private isReadyGraySkybox_ = false;
  private isReadyMilkyWay_ = false;
  private mvMatrix_ = mat4.create();
  private nMatrix_ = mat3.create();
  private program_: WebGLProgram;
  private settings_: SettingsManager;
  private shaders_ = {
    frag: `#version 300 es
        #ifdef GL_FRAGMENT_PRECISION_HIGH
          precision highp float;
        #else
          precision mediump float;
        #endif
    
        uniform sampler2D u_texMilkyWay;
        uniform sampler2D u_texBoundaries;
        uniform sampler2D u_texConstellations;
  
        uniform float u_fMilkyWay;
  
        in vec2 v_texcoord;
        in vec3 v_normal;
        in float v_dist;
  
        out vec4 fragColor;
    
        void main(void) {
            // Don't draw the front of the sphere
            if (v_dist < 1.0) {
              discard;
            }
            
            // 20% goes to the boundaries
            vec4 vecBoundaries = texture(u_texBoundaries, v_texcoord) * 0.2;
            // 20% goes to the constellations
            vec4 vecConstellations = texture(u_texConstellations, v_texcoord) * 0.2;
            // 60% goes to the milky way no matter what
            vec4 vecMilkyWay = texture(u_texMilkyWay, v_texcoord) * u_fMilkyWay * 0.1;
            fragColor = vecMilkyWay + vecConstellations + vecBoundaries;
        }
        `,
    vert: `#version 300 es
        uniform mat4 u_pMatrix;
        uniform mat4 u_camMatrix;
        uniform mat4 u_mvMatrix;
        uniform mat3 u_nMatrix;
        
        in vec3 a_position;
        in vec2 a_texCoord;
        in vec3 a_normal;
      
        out vec2 v_texcoord;
        out vec3 v_normal;
        out float v_dist;
    
        void main(void) {
            vec4 position = u_mvMatrix * vec4(a_position, 1.0);
            gl_Position = u_pMatrix * u_camMatrix * position;
  
            // This lets us figure out which verticies are on the back half
            v_dist = distance(position.xyz,vec3(0.0,0.0,0.0));
            
            v_texcoord = a_texCoord;
            v_texcoord.x = 1.0 - v_texcoord.x;
            v_normal = u_nMatrix * a_normal;
        }
        `,
  };

  private texBuf_: WebGLBuffer;
  private textureBoundaries_ = <WebGLTexture>null;
  private textureConstellations_ = <WebGLTexture>null;
  private textureGraySkybox_: WebGLTexture;
  private textureMilkyWay_ = <WebGLTexture>null;
  private vao_: WebGLVertexArrayObject;
  private vertCount_: number;
  private vertIndexBuf_: WebGLBuffer;
  private vertNormBuf_: WebGLBuffer;
  private vertPosBuf_: WebGLBuffer;

  public static getSrcBoundaries(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('installDirectory is not defined');

    let src = `${settings.installDirectory}textures/skyboxBoundaries8k.jpg`;

    return src;
  }

  public static getSrcConstellations(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('installDirectory is not defined');

    let src = `${settings.installDirectory}textures/skyboxConstellations8k.jpg`;

    return src;
  }

  public static getSrcGraySkybox(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('installDirectory is not defined');

    let src = `${settings.installDirectory}textures/skybox1k-gray.jpg`;

    return src;
  }

  public static getSrcMilkyWay(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('installDirectory is not defined');

    let src = `${settings.installDirectory}textures/skybox8k.jpg`;

    if (settings.hiresMilkWay) {
      src = `${settings.installDirectory}textures/skybox16k.jpg`;
    }

    return src;
  }

  public draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer): void {
    if (!this.isLoaded_ || settingsManager.isDisableSkybox) return;

    // Make sure there is something to draw
    if (!this.settings_.isDrawMilkyWay && !this.settings_.isDrawConstellationBoundaries && !this.settings_.isDrawNasaConstellations && !this.settings_.isGraySkybox) return;

    const gl = this.gl_;

    gl.useProgram(this.program_);
    if (tgtBuffer) gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    // Set the uniforms
    gl.uniformMatrix3fv(this.uniforms_.u_nMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);

    if (!this.settings_.isDrawMilkyWay && !this.settings_.isDrawConstellationBoundaries && !this.settings_.isDrawNasaConstellations) {
      gl.uniform1i(this.uniforms_.u_texMilkyWay, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.textureGraySkybox_);
      gl.uniform1f(this.uniforms_.u_fMilkyWay, 2);
    } else {
      if (this.settings_.isDrawMilkyWay) {
        gl.uniform1i(this.uniforms_.u_texMilkyWay, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textureMilkyWay_);
      }

      if (this.settings_.isDrawConstellationBoundaries) {
        gl.uniform1i(this.uniforms_.u_texBoundaries, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textureBoundaries_);
      } else {
        gl.uniform1i(this.uniforms_.u_texMilkyWay, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textureMilkyWay_);
      }

      if (this.settings_.isDrawNasaConstellations) {
        gl.uniform1i(this.uniforms_.u_texConstellations, 2);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.textureConstellations_);
      } else {
        gl.uniform1i(this.uniforms_.u_texMilkyWay, 2);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.textureMilkyWay_);
      }

      // Figure out how bright the milky way should be to make the blending consistent
      // The more textures that are on the brighter the milky way needs to be
      let milkyWayMul: 6 | 4 | 2 | 0;
      const factor1 = this.settings_.isDrawMilkyWay ? 1 : 0;
      const factor2 = this.settings_.isDrawConstellationBoundaries ? 1 : 0;
      const factor3 = this.settings_.isDrawNasaConstellations ? 1 : 0;
      const sum = factor1 + factor2 + factor3;
      if (sum === 3) milkyWayMul = 6;
      else if (sum === 2) milkyWayMul = 4;
      else if (sum === 1) milkyWayMul = 2;
      else milkyWayMul = 0;

      gl.uniform1f(this.uniforms_.u_fMilkyWay, milkyWayMul);
    }

    gl.bindVertexArray(this.vao_);
    gl.blendFunc(gl.ONE_MINUS_SRC_COLOR, gl.ONE_MINUS_SRC_COLOR);
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    gl.drawElements(gl.TRIANGLES, this.vertCount_, gl.UNSIGNED_SHORT, 0);

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(null);
  }

  public async init(settings: SettingsManager, gl: WebGL2RenderingContext): Promise<void> {
    this.gl_ = gl;
    this.settings_ = settings;

    this.program_ = GlUtils.createProgram(this.gl_, this.shaders_.vert, this.shaders_.frag, this.attribs_, this.uniforms_);
    this.initTextures_();
    this.initBuffers_();
    this.initVao_();

    this.isLoaded_ = true;
  }

  public update(): void {
    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);

    const cameraPos = keepTrackApi.getMainCamera().getCameraPosition();
    mat4.translate(this.mvMatrix_, this.mvMatrix_, cameraPos);

    mat4.rotateZ(this.mvMatrix_, this.mvMatrix_, -90 * DEG2RAD);
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  private initBuffers_(): void {
    // generate a uvsphere bottom up, CCW order
    const vertPos = [];
    const vertNorm = [];
    const texCoord = [];
    for (let lat = 0; lat <= this.NUM_LAT_SEGS; lat++) {
      const latAngle = (Math.PI / this.NUM_LAT_SEGS) * lat - Math.PI / 2;
      const diskRadius = Math.cos(Math.abs(latAngle));
      const z = Math.sin(latAngle);
      for (let lon = 0; lon <= this.NUM_LON_SEGS; lon++) {
        // add an extra vertex for texture funness
        const lonAngle = ((Math.PI * 2) / this.NUM_LON_SEGS) * lon;
        const x = Math.cos(lonAngle) * diskRadius;
        const y = Math.sin(lonAngle) * diskRadius;
        const v = 1 - lat / this.NUM_LAT_SEGS;
        const u = 0.5 + lon / this.NUM_LON_SEGS; // may need to change to move map
        vertPos.push(x * this.DRAW_RADIUS);
        vertPos.push(y * this.DRAW_RADIUS);
        vertPos.push(z * this.DRAW_RADIUS);
        texCoord.push(u);
        texCoord.push(v);
        vertNorm.push(x);
        vertNorm.push(y);
        vertNorm.push(z);
      }
    }

    // ok let's calculate vertex draw orders.... indiv triangles
    const vertIndex = [];
    for (let lat = 0; lat < this.NUM_LAT_SEGS; lat++) {
      // this is for each QUAD, not each vertex, so <
      for (let lon = 0; lon < this.NUM_LON_SEGS; lon++) {
        const blVert = lat * (this.NUM_LON_SEGS + 1) + lon; // there's NUM_LON_SEGS + 1 verts in each horizontal band
        const brVert = blVert + 1;
        const tlVert = (lat + 1) * (this.NUM_LON_SEGS + 1) + lon;
        const trVert = tlVert + 1;
        vertIndex.push(blVert);
        vertIndex.push(brVert);
        vertIndex.push(tlVert);

        vertIndex.push(tlVert);
        vertIndex.push(trVert);
        vertIndex.push(brVert);
      }
    }
    this.vertCount_ = vertIndex.length;

    const gl = this.gl_;
    this.texBuf_ = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuf_);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoord), gl.STATIC_DRAW);

    this.vertPosBuf_ = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertPosBuf_);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

    this.vertNormBuf_ = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertNormBuf_);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);

    this.vertIndexBuf_ = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertIndexBuf_);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);
  }

  private initTexture_(src: string, texture: WebGLTexture): void {
    const img = new Image();
    img.onload = () => {
      GlUtils.bindImageToTexture(this.gl_, texture, img);
    };
    img.src = src;
  }

  private initTextures_(): void {
    if (this.settings_.isDrawMilkyWay && !this.isReadyMilkyWay_) {
      this.textureMilkyWay_ = this.gl_.createTexture();
      this.initTexture_(SkyBoxSphere.getSrcMilkyWay(this.settings_), this.textureMilkyWay_);
      this.isReadyMilkyWay_ = true;
    }
    if (this.settings_.isDrawConstellationBoundaries && !this.isReadyBoundaries_) {
      this.textureBoundaries_ = this.gl_.createTexture();
      this.initTexture_(SkyBoxSphere.getSrcBoundaries(this.settings_), this.textureBoundaries_);
      this.isReadyBoundaries_ = true;
    }
    if (this.settings_.isDrawNasaConstellations && !this.isReadyConstellations_) {
      this.textureConstellations_ = this.gl_.createTexture();
      this.initTexture_(SkyBoxSphere.getSrcConstellations(this.settings_), this.textureConstellations_);
      this.isReadyConstellations_ = true;
    }
    if (this.settings_.isGraySkybox && !this.isReadyGraySkybox_) {
      this.textureGraySkybox_ = this.gl_.createTexture();
      this.initTexture_(SkyBoxSphere.getSrcGraySkybox(this.settings_), this.textureGraySkybox_);
      this.isReadyGraySkybox_ = true;
    }
  }

  private initVao_(): void {
    const gl = this.gl_;
    // Make New Vertex Array Objects
    this.vao_ = gl.createVertexArray();
    gl.bindVertexArray(this.vao_);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertPosBuf_);
    gl.enableVertexAttribArray(this.attribs_.a_position);
    gl.vertexAttribPointer(this.attribs_.a_position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertNormBuf_);
    gl.enableVertexAttribArray(this.attribs_.a_normal);
    gl.vertexAttribPointer(this.attribs_.a_normal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuf_);
    gl.enableVertexAttribArray(this.attribs_.a_texCoord);
    gl.vertexAttribPointer(this.attribs_.a_texCoord, 2, gl.FLOAT, false, 0, 0);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertIndexBuf_);

    gl.bindVertexArray(null);
  }
}
