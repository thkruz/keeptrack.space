/* eslint-disable max-lines */
import { DepthManager } from '../rendering/depth-manager';
import { glsl } from './development/formatter';

export const postProcessingShaderCode = {
  hdr: {
    frag: `#version 300 es
      precision mediump float;

      // our texture
      uniform sampler2D u_canvas;

      // the texCoords passed in from the vertex shader.
      in vec2 v_texCoord;

      out vec4 fragColor;

      void main() {
        fragColor = texture(u_canvas, v_texCoord);
      }
    `,
    vert: `#version 300 es
      in vec2 a_position;
      in vec2 a_texCoord;

      uniform vec2 u_resolution;

      out vec2 v_texCoord;

      void main() {
        // convert the rectangle from pixels to 0.0 to 1.0
        vec2 zeroToOne = a_position / u_resolution;

        // convert from 0->1 to 0->2
        vec2 zeroToTwo = zeroToOne * 2.0;

        // convert from 0->2 to -1->+1 (clipspace)
        vec2 clipSpace = zeroToTwo - 1.0;

        gl_Position = vec4(clipSpace, 0, 1);

        // pass the texCoord to the fragment shader
        // The GPU will interpolate pPM value between points.
        v_texCoord = a_texCoord;
      }
    `,
  },
  gaussian: {
    frag: `#version 300 es
      precision highp float;

      // our texture
      uniform sampler2D u_canvas;
      uniform vec2 u_resolution;
      uniform float u_radius;
      uniform vec2 u_dir;

      // the texCoords passed in from the vertex shader.
      in vec2 v_texCoord;

      out vec4 fragColor;

      void main() {
        //this will be our RGBA sum
        vec4 sum = vec4(0.0);

        //our original texcoord for this fragment
        vec2 tc = v_texCoord;

        //the amount to blur, i.e. how far off center to sample from
        //1.0 -> blur by one pixel
        //2.0 -> blur by two pixels, etc.
        float blur = u_radius / u_resolution[0];

        //the direction of our blur
        //(1.0, 0.0) -> x-axis blur
        //(0.0, 1.0) -> y-axis blur
        float hstep = u_dir[0];
        float vstep = u_dir[1];

        //apply blurring, using a 9-tap filter with predefined gaussian weights

        sum += texture(u_canvas, vec2(tc.x - 4.0*blur*hstep, tc.y - 4.0*blur*vstep)) * 0.0162162162;
        sum += texture(u_canvas, vec2(tc.x - 3.0*blur*hstep, tc.y - 3.0*blur*vstep)) * 0.0540540541;
        sum += texture(u_canvas, vec2(tc.x - 2.0*blur*hstep, tc.y - 2.0*blur*vstep)) * 0.1216216216;
        sum += texture(u_canvas, vec2(tc.x - 1.0*blur*hstep, tc.y - 1.0*blur*vstep)) * 0.1945945946;

        sum += texture(u_canvas, vec2(tc.x, tc.y)) * 0.2270270270;

        sum += texture(u_canvas, vec2(tc.x + 1.0*blur*hstep, tc.y + 1.0*blur*vstep)) * 0.1945945946;
        sum += texture(u_canvas, vec2(tc.x + 2.0*blur*hstep, tc.y + 2.0*blur*vstep)) * 0.1216216216;
        sum += texture(u_canvas, vec2(tc.x + 3.0*blur*hstep, tc.y + 3.0*blur*vstep)) * 0.0540540541;
        sum += texture(u_canvas, vec2(tc.x + 4.0*blur*hstep, tc.y + 4.0*blur*vstep)) * 0.0162162162;

        //discard alpha for our simple demo, multiply by vertex color and return
        fragColor = vec4(sum.rgb, 1.0);
      }
    `,
    vert: `#version 300 es
      precision highp float;

      in vec2 a_position;
      in vec2 a_texCoord;

      uniform vec2 u_resolution;

      out vec2 v_texCoord;

      void main() {
        // convert the rectangle from pixels to 0.0 to 1.0
        vec2 zeroToOne = a_position / u_resolution;

        // convert from 0->1 to 0->2
        vec2 zeroToTwo = zeroToOne * 2.0;

        // convert from 0->2 to -1->+1 (clipspace)
        vec2 clipSpace = zeroToTwo - 1.0;

        gl_Position = vec4(clipSpace, 0, 1);

        // pass the texCoord to the fragment shader
        // The GPU will interpolate pPM value between points.
        v_texCoord = a_texCoord;
      }
    `,
  },
  occlusion: {
    vert: glsl`#version 300 es
                #extension GL_EXT_frag_depth : enable
                in vec3 a_position;

                uniform mat4 uCamMatrix;
                uniform mat4 uMvMatrix;
                uniform mat4 uPMatrix;
                uniform vec3 uWorldOffset;
                uniform float logDepthBufFC;

                void main(void) {
                  float scale = 0.99;
                  mat4 scaleMatrix = mat4(vec4(scale, 0.0, 0.0, 0.0),vec4(0.0, scale, 0.0, 0.0),vec4(0.0, 0.0, scale, 0.0),vec4(0.0, 0.0, 0.0, 1.0));

                  vec4 worldPosition = scaleMatrix * uMvMatrix * vec4(a_position, 1.0);
                  worldPosition.xyz += uWorldOffset;
                  gl_Position = uPMatrix * uCamMatrix * worldPosition;
                  ${DepthManager.getLogDepthVertCode()}
                }
            `,
    frag: glsl`#version 300 es
                precision highp float;

                uniform float logDepthBufFC;
                out vec4 fragColor;

                void main(void) {
                    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    ${DepthManager.getLogDepthFragCode()}
                }
            `,
  },
  fxaa: {
    vert: `#version 300 es
            in vec2 a_position;
            in vec2 a_texCoord;

            uniform vec2 u_resolution;

            out vec2 v_texCoord;

            void main() {
              // convert the rectangle from pixels to 0.0 to 1.0
              vec2 zeroToOne = a_position / u_resolution;

              // convert from 0->1 to 0->2
              vec2 zeroToTwo = zeroToOne * 2.0;

              // convert from 0->2 to -1->+1 (clipspace)
              vec2 clipSpace = zeroToTwo - 1.0;

              gl_Position = vec4(clipSpace, 0, 1);

              // pass the texCoord to the fragment shader
              // The GPU will interpolate pPM value between points.
              v_texCoord = a_texCoord;
            }
            `,
    frag: `#version 300 es
              precision highp float;

              #ifndef FXAA_REDUCE_MIN
                  #define FXAA_REDUCE_MIN   (1.0/ 128.0)
              #endif
              #ifndef FXAA_REDUCE_MUL
                  #define FXAA_REDUCE_MUL   (1.0 / 8.0)
              #endif
              #ifndef FXAA_SPAN_MAX
                  #define FXAA_SPAN_MAX     8.0
              #endif

              // optimized version for mobile, where dependent
              // texture reads can be a bottleneck
              vec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution,
                          vec2 v_rgbNW, vec2 v_rgbNE,
                          vec2 v_rgbSW, vec2 v_rgbSE,
                          vec2 v_rgbM) {
                  vec4 color;
                  vec2 inverseVP = vec2(1.0 / resolution.x, 1.0 / resolution.y);
                  vec3 rgbNW = texture(tex, v_rgbNW).xyz;
                  vec3 rgbNE = texture(tex, v_rgbNE).xyz;
                  vec3 rgbSW = texture(tex, v_rgbSW).xyz;
                  vec3 rgbSE = texture(tex, v_rgbSE).xyz;
                  vec4 texColor = texture(tex, v_rgbM);
                  vec3 rgbM  = texColor.xyz;
                  vec3 luma = vec3(0.299, 0.587, 0.114);
                  float lumaNW = dot(rgbNW, luma);
                  float lumaNE = dot(rgbNE, luma);
                  float lumaSW = dot(rgbSW, luma);
                  float lumaSE = dot(rgbSE, luma);
                  float lumaM  = dot(rgbM,  luma);
                  float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
                  float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

                  vec2 dir;
                  dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
                  dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

                  float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) *
                                        (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);

                  float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
                  dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),
                            max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
                            dir * rcpDirMin)) * inverseVP;

                  vec3 rgbA = 0.5 * (
                      texture(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz +
                      texture(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);
                  vec3 rgbB = rgbA * 0.5 + 0.25 * (
                      texture(tex, fragCoord * inverseVP + dir * -0.5).xyz +
                      texture(tex, fragCoord * inverseVP + dir * 0.5).xyz);

                  float lumaB = dot(rgbB, luma);
                  if ((lumaB < lumaMin) || (lumaB > lumaMax))
                      color = vec4(rgbA, texColor.a);
                  else
                      color = vec4(rgbB, texColor.a);
                  return color;
              }

              void texcoords(vec2 fragCoord, vec2 resolution,
                          out vec2 v_rgbNW, out vec2 v_rgbNE,
                          out vec2 v_rgbSW, out vec2 v_rgbSE,
                          out vec2 v_rgbM) {
                  vec2 inverseVP = 1.0 / resolution.xy;
                  v_rgbNW = (fragCoord + vec2(-1.0, -1.0)) * inverseVP;
                  v_rgbNE = (fragCoord + vec2(1.0, -1.0)) * inverseVP;
                  v_rgbSW = (fragCoord + vec2(-1.0, 1.0)) * inverseVP;
                  v_rgbSE = (fragCoord + vec2(1.0, 1.0)) * inverseVP;
                  v_rgbM = vec2(fragCoord * inverseVP);
              }

              vec4 apply(sampler2D tex, vec2 fragCoord, vec2 resolution) {
                  vec2 v_rgbNW;
                  vec2 v_rgbNE;
                  vec2 v_rgbSW;
                  vec2 v_rgbSE;
                  vec2 v_rgbM;

                  // compute the texture coords
                  texcoords(fragCoord, resolution,
                            v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);

                  // compute FXAA
                  return fxaa(tex, fragCoord, resolution,
                              v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);
              }

              uniform vec2 u_resolution;
              uniform sampler2D u_canvas;

              in vec2 v_texCoord;

              out vec4 fragColor;

              void main() {
                  vec2 fragCoord = v_texCoord * u_resolution;
                  fragColor = apply(u_canvas, fragCoord, u_resolution);
              }
            `,
  },
  fxaaNvidia: {
    vert: `#version 300 es
            in vec2 a_position;
            in vec2 a_texCoord;

            uniform vec2 u_resolution;

            out vec2 v_texCoord;

            void main() {
              // convert the rectangle from pixels to 0.0 to 1.0
              vec2 zeroToOne = a_position / u_resolution;

              // convert from 0->1 to 0->2
              vec2 zeroToTwo = zeroToOne * 2.0;

              // convert from 0->2 to -1->+1 (clipspace)
              vec2 clipSpace = zeroToTwo - 1.0;

              gl_Position = vec4(clipSpace, 0, 1);

              // pass the texCoord to the fragment shader
              // The GPU will interpolate pPM value between points.
              v_texCoord = a_texCoord;
            }
            `,
    frag: `#version 300 es
            // FXAA 3.11 implementation by NVIDIA, ported to WebGL by Agost Biro (biro@archilogic.com)

            //----------------------------------------------------------------------------------
            // File:        es3-kepler/FXAA/assets/shaders/FXAA_DefaultES.frag
            // SDK Version: v3.00
            // Email:       gameworks@nvidia.com
            // Site:        http://developer.nvidia.com/
            //
            // Copyright (c) 2014-2015, NVIDIA CORPORATION. All rights reserved.
            //
            // Redistribution and use in source and binary forms, with or without
            // modification, are permitted provided that the following conditions
            // are met:
            //  * Redistributions of source code must retain the above copyright
            //    notice, this list of conditions and the following disclaimer.
            //  * Redistributions in binary form must reproduce the above copyright
            //    notice, this list of conditions and the following disclaimer in the
            //    documentation and/or other materials provided with the distribution.
            //  * Neither the name of NVIDIA CORPORATION nor the names of its
            //    contributors may be used to endorse or promote products derived
            //    from this software without specific prior written permission.
            //
            // THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AS IS AND ANY
            // EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
            // IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
            // PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
            // CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
            // EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
            // PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
            // PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
            // OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
            // (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
            // OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
            //
            //----------------------------------------------------------------------------------

            precision highp float;

            uniform sampler2D u_canvas;

            uniform vec2 u_resolution;

            in vec2 v_texCoord;

            out vec4 fragColor;

            #define FXAA_PC 1
            #define FXAA_GLSL_100 1
            #define FXAA_QUALITY_PRESET 12

            #define FXAA_GREEN_AS_LUMA 1

            /*--------------------------------------------------------------------------*/
            #ifndef FXAA_PC_CONSOLE
                //
                // The console algorithm for PC is included
                // for developers targeting really low spec machines.
                // Likely better to just run FXAA_PC, and use a really low preset.
                //
                #define FXAA_PC_CONSOLE 0
            #endif
            /*--------------------------------------------------------------------------*/
            #ifndef FXAA_GLSL_120
                #define FXAA_GLSL_120 0
            #endif
            /*--------------------------------------------------------------------------*/
            #ifndef FXAA_GLSL_130
                #define FXAA_GLSL_130 0
            #endif
            /*--------------------------------------------------------------------------*/
            #ifndef FXAA_HLSL_3
                #define FXAA_HLSL_3 0
            #endif
            /*--------------------------------------------------------------------------*/
            #ifndef FXAA_HLSL_4
                #define FXAA_HLSL_4 0
            #endif
            /*--------------------------------------------------------------------------*/
            #ifndef FXAA_HLSL_5
                #define FXAA_HLSL_5 0
            #endif
            /*==========================================================================*/
            #ifndef FXAA_GREEN_AS_LUMA
                //
                // For those using non-linear color,
                // and either not able to get luma in alpha, or not wanting to,
                // this enables FXAA to run using green as a proxy for luma.
                // So with this enabled, no need to pack luma in alpha.
                //
                // This will turn off AA on anything which lacks some amount of green.
                // Pure red and blue or combination of only R and B, will get no AA.
                //
                // Might want to lower the settings for both,
                //    fxaaConsoleEdgeThresholdMin
                //    fxaaQualityEdgeThresholdMin
                // In order to insure AA does not get turned off on colors
                // which contain a minor amount of green.
                //
                // 1 = On.
                // 0 = Off.
                //
                #define FXAA_GREEN_AS_LUMA 0
            #endif
            /*--------------------------------------------------------------------------*/
            #ifndef FXAA_EARLY_EXIT
                //
                // Controls algorithm's early exit path.
                // On PS3 turning this ON adds 2 cycles to the shader.
                // On 360 turning this OFF adds 10ths of a millisecond to the shader.
                // Turning this off on console will result in a more blurry image.
                // So this defaults to on.
                //
                // 1 = On.
                // 0 = Off.
                //
                #define FXAA_EARLY_EXIT 1
            #endif
            /*--------------------------------------------------------------------------*/
            #ifndef FXAA_DISCARD
                //
                // Only valid for PC OpenGL currently.
                // Probably will not work when FXAA_GREEN_AS_LUMA = 1.
                //
                // 1 = Use discard on pixels which don't need AA.
                //     For APIs which enable concurrent TEX+ROP from same surface.
                // 0 = Return unchanged color on pixels which don't need AA.
                //
                #define FXAA_DISCARD 0
            #endif
            /*--------------------------------------------------------------------------*/
            #ifndef FXAA_FAST_PIXEL_OFFSET
                //
                // Used for GLSL 120 only.
                //
                // 1 = GL API supports fast pixel offsets
                // 0 = do not use fast pixel offsets
                //
                #ifdef GL_EXT_gpu_shader4
                    #define FXAA_FAST_PIXEL_OFFSET 1
                #endif
                #ifdef GL_NV_gpu_shader5
                    #define FXAA_FAST_PIXEL_OFFSET 1
                #endif
                #ifdef GL_ARB_gpu_shader5
                    #define FXAA_FAST_PIXEL_OFFSET 1
                #endif
                #ifndef FXAA_FAST_PIXEL_OFFSET
                    #define FXAA_FAST_PIXEL_OFFSET 0
                #endif
            #endif
            /*--------------------------------------------------------------------------*/
            #ifndef FXAA_GATHER4_ALPHA
                //
                // 1 = API supports gather4 on alpha channel.
                // 0 = API does not support gather4 on alpha channel.
                //
                #if (FXAA_HLSL_5 == 1)
                    #define FXAA_GATHER4_ALPHA 1
                #endif
                #ifdef GL_ARB_gpu_shader5
                    #define FXAA_GATHER4_ALPHA 1
                #endif
                #ifdef GL_NV_gpu_shader5
                    #define FXAA_GATHER4_ALPHA 1
                #endif
                #ifndef FXAA_GATHER4_ALPHA
                    #define FXAA_GATHER4_ALPHA 0
                #endif
            #endif


            /*============================================================================
                                    FXAA QUALITY - TUNING KNOBS
            ------------------------------------------------------------------------------
            NOTE the other tuning knobs are now in the shader function inputs!
            ============================================================================*/
            #ifndef FXAA_QUALITY_PRESET
                //
                // Choose the quality preset.
                // This needs to be compiled into the shader as it effects code.
                // Best option to include multiple presets is to
                // in each shader define the preset, then include this file.
                //
                // OPTIONS
                // -----------------------------------------------------------------------
                // 10 to 15 - default medium dither (10=fastest, 15=highest quality)
                // 20 to 29 - less dither, more expensive (20=fastest, 29=highest quality)
                // 39       - no dither, very expensive
                //
                // NOTES
                // -----------------------------------------------------------------------
                // 12 = slightly faster then FXAA 3.9 and higher edge quality (default)
                // 13 = about same speed as FXAA 3.9 and better than 12
                // 23 = closest to FXAA 3.9 visually and performance wise
                //  _ = the lowest digit is directly related to performance
                // _  = the highest digit is directly related to style
                //
                #define FXAA_QUALITY_PRESET 12
            #endif


            /*============================================================================

                                      FXAA QUALITY - PRESETS

            ============================================================================*/

            /*============================================================================
                                FXAA QUALITY - MEDIUM DITHER PRESETS
            ============================================================================*/
            #if (FXAA_QUALITY_PRESET == 10)
                #define FXAA_QUALITY_PS 3
                #define FXAA_QUALITY_P0 1.5
                #define FXAA_QUALITY_P1 3.0
                #define FXAA_QUALITY_P2 12.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 11)
                #define FXAA_QUALITY_PS 4
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 3.0
                #define FXAA_QUALITY_P3 12.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 12)
                #define FXAA_QUALITY_PS 5
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 2.0
                #define FXAA_QUALITY_P3 4.0
                #define FXAA_QUALITY_P4 12.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 13)
                #define FXAA_QUALITY_PS 6
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 2.0
                #define FXAA_QUALITY_P3 2.0
                #define FXAA_QUALITY_P4 4.0
                #define FXAA_QUALITY_P5 12.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 14)
                #define FXAA_QUALITY_PS 7
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 2.0
                #define FXAA_QUALITY_P3 2.0
                #define FXAA_QUALITY_P4 2.0
                #define FXAA_QUALITY_P5 4.0
                #define FXAA_QUALITY_P6 12.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 15)
                #define FXAA_QUALITY_PS 8
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 2.0
                #define FXAA_QUALITY_P3 2.0
                #define FXAA_QUALITY_P4 2.0
                #define FXAA_QUALITY_P5 2.0
                #define FXAA_QUALITY_P6 4.0
                #define FXAA_QUALITY_P7 12.0
            #endif

            /*============================================================================
                                FXAA QUALITY - LOW DITHER PRESETS
            ============================================================================*/
            #if (FXAA_QUALITY_PRESET == 20)
                #define FXAA_QUALITY_PS 3
                #define FXAA_QUALITY_P0 1.5
                #define FXAA_QUALITY_P1 2.0
                #define FXAA_QUALITY_P2 8.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 21)
                #define FXAA_QUALITY_PS 4
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 2.0
                #define FXAA_QUALITY_P3 8.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 22)
                #define FXAA_QUALITY_PS 5
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 2.0
                #define FXAA_QUALITY_P3 2.0
                #define FXAA_QUALITY_P4 8.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 23)
                #define FXAA_QUALITY_PS 6
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 2.0
                #define FXAA_QUALITY_P3 2.0
                #define FXAA_QUALITY_P4 2.0
                #define FXAA_QUALITY_P5 8.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 24)
                #define FXAA_QUALITY_PS 7
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 2.0
                #define FXAA_QUALITY_P3 2.0
                #define FXAA_QUALITY_P4 2.0
                #define FXAA_QUALITY_P5 3.0
                #define FXAA_QUALITY_P6 8.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 25)
                #define FXAA_QUALITY_PS 8
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 2.0
                #define FXAA_QUALITY_P3 2.0
                #define FXAA_QUALITY_P4 2.0
                #define FXAA_QUALITY_P5 2.0
                #define FXAA_QUALITY_P6 4.0
                #define FXAA_QUALITY_P7 8.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 26)
                #define FXAA_QUALITY_PS 9
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 2.0
                #define FXAA_QUALITY_P3 2.0
                #define FXAA_QUALITY_P4 2.0
                #define FXAA_QUALITY_P5 2.0
                #define FXAA_QUALITY_P6 2.0
                #define FXAA_QUALITY_P7 4.0
                #define FXAA_QUALITY_P8 8.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 27)
                #define FXAA_QUALITY_PS 10
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 2.0
                #define FXAA_QUALITY_P3 2.0
                #define FXAA_QUALITY_P4 2.0
                #define FXAA_QUALITY_P5 2.0
                #define FXAA_QUALITY_P6 2.0
                #define FXAA_QUALITY_P7 2.0
                #define FXAA_QUALITY_P8 4.0
                #define FXAA_QUALITY_P9 8.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 28)
                #define FXAA_QUALITY_PS 11
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 2.0
                #define FXAA_QUALITY_P3 2.0
                #define FXAA_QUALITY_P4 2.0
                #define FXAA_QUALITY_P5 2.0
                #define FXAA_QUALITY_P6 2.0
                #define FXAA_QUALITY_P7 2.0
                #define FXAA_QUALITY_P8 2.0
                #define FXAA_QUALITY_P9 4.0
                #define FXAA_QUALITY_P10 8.0
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PRESET == 29)
                #define FXAA_QUALITY_PS 12
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.5
                #define FXAA_QUALITY_P2 2.0
                #define FXAA_QUALITY_P3 2.0
                #define FXAA_QUALITY_P4 2.0
                #define FXAA_QUALITY_P5 2.0
                #define FXAA_QUALITY_P6 2.0
                #define FXAA_QUALITY_P7 2.0
                #define FXAA_QUALITY_P8 2.0
                #define FXAA_QUALITY_P9 2.0
                #define FXAA_QUALITY_P10 4.0
                #define FXAA_QUALITY_P11 8.0
            #endif

            /*============================================================================
                                FXAA QUALITY - EXTREME QUALITY
            ============================================================================*/
            #if (FXAA_QUALITY_PRESET == 39)
                #define FXAA_QUALITY_PS 12
                #define FXAA_QUALITY_P0 1.0
                #define FXAA_QUALITY_P1 1.0
                #define FXAA_QUALITY_P2 1.0
                #define FXAA_QUALITY_P3 1.0
                #define FXAA_QUALITY_P4 1.0
                #define FXAA_QUALITY_P5 1.5
                #define FXAA_QUALITY_P6 2.0
                #define FXAA_QUALITY_P7 2.0
                #define FXAA_QUALITY_P8 2.0
                #define FXAA_QUALITY_P9 2.0
                #define FXAA_QUALITY_P10 4.0
                #define FXAA_QUALITY_P11 8.0
            #endif



            /*============================================================================

                                            API PORTING

            ============================================================================*/
            #if (FXAA_GLSL_100 == 1) || (FXAA_GLSL_120 == 1) || (FXAA_GLSL_130 == 1)
                #define FxaaBool bool
                #define FxaaDiscard discard
                #define FxaaFloat float
                #define FxaaFloat2 vec2
                #define FxaaFloat3 vec3
                #define FxaaFloat4 vec4
                #define FxaaHalf float
                #define FxaaHalf2 vec2
                #define FxaaHalf3 vec3
                #define FxaaHalf4 vec4
                #define FxaaInt2 ivec2
                #define FxaaSat(x) clamp(x, 0.0, 1.0)
                #define FxaaTex sampler2D
            #else
                #define FxaaBool bool
                #define FxaaDiscard clip(-1)
                #define FxaaFloat float
                #define FxaaFloat2 float2
                #define FxaaFloat3 float3
                #define FxaaFloat4 float4
                #define FxaaHalf half
                #define FxaaHalf2 half2
                #define FxaaHalf3 half3
                #define FxaaHalf4 half4
                #define FxaaSat(x) saturate(x)
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_GLSL_100 == 1)
              #define FxaaTexTop(t, p) texture(t, p, 0.0)
              #define FxaaTexOff(t, p, o, r) texture(t, p + (o * r), 0.0)
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_GLSL_120 == 1)
                // Requires,
                //  #version 120
                // And at least,
                //  #extension GL_EXT_gpu_shader4 : enable
                //  (or set FXAA_FAST_PIXEL_OFFSET 1 to work like DX9)
                #define FxaaTexTop(t, p) textureLod(t, p, 0.0)
                #if (FXAA_FAST_PIXEL_OFFSET == 1)
                    #define FxaaTexOff(t, p, o, r) textureLodOffset(t, p, 0.0, o)
                #else
                    #define FxaaTexOff(t, p, o, r) textureLod(t, p + (o * r), 0.0)
                #endif
                #if (FXAA_GATHER4_ALPHA == 1)
                    // use #extension GL_ARB_gpu_shader5 : enable
                    #define FxaaTexAlpha4(t, p) textureGather(t, p, 3)
                    #define FxaaTexOffAlpha4(t, p, o) textureGatherOffset(t, p, o, 3)
                    #define FxaaTexGreen4(t, p) textureGather(t, p, 1)
                    #define FxaaTexOffGreen4(t, p, o) textureGatherOffset(t, p, o, 1)
                #endif
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_GLSL_130 == 1)
                // Requires "#version 130" or better
                #define FxaaTexTop(t, p) textureLod(t, p, 0.0)
                #define FxaaTexOff(t, p, o, r) textureLodOffset(t, p, 0.0, o)
                #if (FXAA_GATHER4_ALPHA == 1)
                    // use #extension GL_ARB_gpu_shader5 : enable
                    #define FxaaTexAlpha4(t, p) textureGather(t, p, 3)
                    #define FxaaTexOffAlpha4(t, p, o) textureGatherOffset(t, p, o, 3)
                    #define FxaaTexGreen4(t, p) textureGather(t, p, 1)
                    #define FxaaTexOffGreen4(t, p, o) textureGatherOffset(t, p, o, 1)
                #endif
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_HLSL_3 == 1)
                #define FxaaInt2 float2
                #define FxaaTex sampler2D
                #define FxaaTexTop(t, p) tex2Dlod(t, float4(p, 0.0, 0.0))
                #define FxaaTexOff(t, p, o, r) tex2Dlod(t, float4(p + (o * r), 0, 0))
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_HLSL_4 == 1)
                #define FxaaInt2 int2
                struct FxaaTex { SamplerState smpl; texture tex; };
                #define FxaaTexTop(t, p) t.tex.SampleLevel(t.smpl, p, 0.0)
                #define FxaaTexOff(t, p, o, r) t.tex.SampleLevel(t.smpl, p, 0.0, o)
            #endif
            /*--------------------------------------------------------------------------*/
            #if (FXAA_HLSL_5 == 1)
                #define FxaaInt2 int2
                struct FxaaTex { SamplerState smpl; texture tex; };
                #define FxaaTexTop(t, p) t.tex.SampleLevel(t.smpl, p, 0.0)
                #define FxaaTexOff(t, p, o, r) t.tex.SampleLevel(t.smpl, p, 0.0, o)
                #define FxaaTexAlpha4(t, p) t.tex.GatherAlpha(t.smpl, p)
                #define FxaaTexOffAlpha4(t, p, o) t.tex.GatherAlpha(t.smpl, p, o)
                #define FxaaTexGreen4(t, p) t.tex.GatherGreen(t.smpl, p)
                #define FxaaTexOffGreen4(t, p, o) t.tex.GatherGreen(t.smpl, p, o)
            #endif


            /*============================================================================
                              GREEN AS LUMA OPTION SUPPORT FUNCTION
            ============================================================================*/
            #if (FXAA_GREEN_AS_LUMA == 0)
                FxaaFloat FxaaLuma(FxaaFloat4 rgba) { return rgba.w; }
            #else
                FxaaFloat FxaaLuma(FxaaFloat4 rgba) { return rgba.y; }
            #endif




            /*============================================================================

                                        FXAA3 QUALITY - PC

            ============================================================================*/
            #if (FXAA_PC == 1)
            /*--------------------------------------------------------------------------*/
            FxaaFloat4 FxaaPixelShader(
                //
                // Use noperspective interpolation here (turn off perspective interpolation).
                // {xy} = center of pixel
                FxaaFloat2 pos,
                //
                // Used only for FXAA Console, and not used on the 360 version.
                // Use noperspective interpolation here (turn off perspective interpolation).
                // {xy_} = upper left of pixel
                // {_zw} = lower right of pixel
                FxaaFloat4 fxaaConsolePosPos,
                //
                // Input color texture.
                // {rgb_} = color in linear or perceptual color space
                // if (FXAA_GREEN_AS_LUMA == 0)
                //     {__a} = luma in perceptual color space (not linear)
                FxaaTex tex,
                //
                // Only used on the optimized 360 version of FXAA Console.
                // For everything but 360, just use the same input here as for "tex".
                // For 360, same texture, just alias with a 2nd sampler.
                // This sampler needs to have an exponent bias of -1.
                FxaaTex fxaaConsole360TexExpBiasNegOne,
                //
                // Only used on the optimized 360 version of FXAA Console.
                // For everything but 360, just use the same input here as for "tex".
                // For 360, same texture, just alias with a 3nd sampler.
                // This sampler needs to have an exponent bias of -2.
                FxaaTex fxaaConsole360TexExpBiasNegTwo,
                //
                // Only used on FXAA Quality.
                // This must be from a constant/uniform.
                // {x_} = 1.0/screenWidthInPixels
                // {_y} = 1.0/screenHeightInPixels
                FxaaFloat2 fxaaQualityRcpFrame,
                //
                // Only used on FXAA Console.
                // This must be from a constant/uniform.
                // This effects sub-pixel AA quality and inversely sharpness.
                //   Where N ranges between,
                //     N = 0.50 (default)
                //     N = 0.33 (sharper)
                // {x__} = -N/screenWidthInPixels
                // {_y_} = -N/screenHeightInPixels
                // {_z_} =  N/screenWidthInPixels
                // {__w} =  N/screenHeightInPixels
                FxaaFloat4 fxaaConsoleRcpFrameOpt,
                //
                // Only used on FXAA Console.
                // Not used on 360, but used on PS3 and PC.
                // This must be from a constant/uniform.
                // {x__} = -2.0/screenWidthInPixels
                // {_y_} = -2.0/screenHeightInPixels
                // {_z_} =  2.0/screenWidthInPixels
                // {__w} =  2.0/screenHeightInPixels
                FxaaFloat4 fxaaConsoleRcpFrameOpt2,
                //
                // Only used on FXAA Console.
                // Only used on 360 in place of fxaaConsoleRcpFrameOpt2.
                // This must be from a constant/uniform.
                // {x__} =  8.0/screenWidthInPixels
                // {_y_} =  8.0/screenHeightInPixels
                // {_z_} = -4.0/screenWidthInPixels
                // {__w} = -4.0/screenHeightInPixels
                FxaaFloat4 fxaaConsole360RcpFrameOpt2,
                //
                // Only used on FXAA Quality.
                // This used to be the FXAA_QUALITY_SUBPIX define.
                // It is here now to allow easier tuning.
                // Choose the amount of sub-pixel aliasing removal.
                // This can effect sharpness.
                //   1.00 - upper limit (softer)
                //   0.75 - default amount of filtering
                //   0.50 - lower limit (sharper, less sub-pixel aliasing removal)
                //   0.25 - almost off
                //   0.00 - completely off
                FxaaFloat fxaaQualitySubpix,
                //
                // Only used on FXAA Quality.
                // This used to be the FXAA_QUALITY_EDGE_THRESHOLD define.
                // It is here now to allow easier tuning.
                // The minimum amount of local contrast required to apply algorithm.
                //   0.333 - too little (faster)
                //   0.250 - low quality
                //   0.166 - default
                //   0.125 - high quality
                //   0.063 - overkill (slower)
                FxaaFloat fxaaQualityEdgeThreshold,
                //
                // Only used on FXAA Quality.
                // This used to be the FXAA_QUALITY_EDGE_THRESHOLD_MIN define.
                // It is here now to allow easier tuning.
                // Trims the algorithm from processing darks.
                //   0.0833 - upper limit (default, the start of visible unfiltered edges)
                //   0.0625 - high quality (faster)
                //   0.0312 - visible limit (slower)
                // Special notes when using FXAA_GREEN_AS_LUMA,
                //   Likely want to set this to zero.
                //   As colors that are mostly not-green
                //   will appear very dark in the green channel!
                //   Tune by looking at mostly non-green content,
                //   then start at zero and increase until aliasing is a problem.
                FxaaFloat fxaaQualityEdgeThresholdMin,
                //
                // Only used on FXAA Console.
                // This used to be the FXAA_CONSOLE_EDGE_SHARPNESS define.
                // It is here now to allow easier tuning.
                // This does not effect PS3, as this needs to be compiled in.
                //   Use FXAA_CONSOLE_PS3_EDGE_SHARPNESS for PS3.
                //   Due to the PS3 being ALU bound,
                //   there are only three safe values here: 2 and 4 and 8.
                //   These options use the shaders ability to a free *|/ by 2|4|8.
                // For all other platforms can be a non-power of two.
                //   8.0 is sharper (default!!!)
                //   4.0 is softer
                //   2.0 is really soft (good only for vector graphics inputs)
                FxaaFloat fxaaConsoleEdgeSharpness,
                //
                // Only used on FXAA Console.
                // This used to be the FXAA_CONSOLE_EDGE_THRESHOLD define.
                // It is here now to allow easier tuning.
                // This does not effect PS3, as this needs to be compiled in.
                //   Use FXAA_CONSOLE_PS3_EDGE_THRESHOLD for PS3.
                //   Due to the PS3 being ALU bound,
                //   there are only two safe values here: 1/4 and 1/8.
                //   These options use the shaders ability to a free *|/ by 2|4|8.
                // The console setting has a different mapping than the quality setting.
                // Other platforms can use other values.
                //   0.125 leaves less aliasing, but is softer (default!!!)
                //   0.25 leaves more aliasing, and is sharper
                FxaaFloat fxaaConsoleEdgeThreshold,
                //
                // Only used on FXAA Console.
                // This used to be the FXAA_CONSOLE_EDGE_THRESHOLD_MIN define.
                // It is here now to allow easier tuning.
                // Trims the algorithm from processing darks.
                // The console setting has a different mapping than the quality setting.
                // This only applies when FXAA_EARLY_EXIT is 1.
                // This does not apply to PS3,
                // PS3 was simplified to avoid more shader instructions.
                //   0.06 - faster but more aliasing in darks
                //   0.05 - default
                //   0.04 - slower and less aliasing in darks
                // Special notes when using FXAA_GREEN_AS_LUMA,
                //   Likely want to set this to zero.
                //   As colors that are mostly not-green
                //   will appear very dark in the green channel!
                //   Tune by looking at mostly non-green content,
                //   then start at zero and increase until aliasing is a problem.
                FxaaFloat fxaaConsoleEdgeThresholdMin,
                //
                // Extra constants for 360 FXAA Console only.
                // Use zeros or anything else for other platforms.
                // These must be in physical constant registers and NOT immediates.
                // Immediates will result in compiler un-optimizing.
                // {xyzw} = float4(1.0, -1.0, 0.25, -0.25)
                FxaaFloat4 fxaaConsole360ConstDir
            ) {
            /*--------------------------------------------------------------------------*/
                FxaaFloat2 posM;
                posM.x = pos.x;
                posM.y = pos.y;
                #if (FXAA_GATHER4_ALPHA == 1)
                    #if (FXAA_DISCARD == 0)
                        FxaaFloat4 rgbyM = FxaaTexTop(tex, posM);
                        #if (FXAA_GREEN_AS_LUMA == 0)
                            #define lumaM rgbyM.w
                        #else
                            #define lumaM rgbyM.y
                        #endif
                    #endif
                    #if (FXAA_GREEN_AS_LUMA == 0)
                        FxaaFloat4 luma4A = FxaaTexAlpha4(tex, posM);
                        FxaaFloat4 luma4B = FxaaTexOffAlpha4(tex, posM, FxaaInt2(-1, -1));
                    #else
                        FxaaFloat4 luma4A = FxaaTexGreen4(tex, posM);
                        FxaaFloat4 luma4B = FxaaTexOffGreen4(tex, posM, FxaaInt2(-1, -1));
                    #endif
                    #if (FXAA_DISCARD == 1)
                        #define lumaM luma4A.w
                    #endif
                    #define lumaE luma4A.z
                    #define lumaS luma4A.x
                    #define lumaSE luma4A.y
                    #define lumaNW luma4B.w
                    #define lumaN luma4B.z
                    #define lumaW luma4B.x
                #else
                    FxaaFloat4 rgbyM = FxaaTexTop(tex, posM);
                    #if (FXAA_GREEN_AS_LUMA == 0)
                        #define lumaM rgbyM.w
                    #else
                        #define lumaM rgbyM.y
                    #endif
                    #if (FXAA_GLSL_100 == 1)
                      FxaaFloat lumaS = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 0.0, 1.0), fxaaQualityRcpFrame.xy));
                      FxaaFloat lumaE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0, 0.0), fxaaQualityRcpFrame.xy));
                      FxaaFloat lumaN = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 0.0,-1.0), fxaaQualityRcpFrame.xy));
                      FxaaFloat lumaW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0, 0.0), fxaaQualityRcpFrame.xy));
                    #else
                      FxaaFloat lumaS = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 0, 1), fxaaQualityRcpFrame.xy));
                      FxaaFloat lumaE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1, 0), fxaaQualityRcpFrame.xy));
                      FxaaFloat lumaN = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 0,-1), fxaaQualityRcpFrame.xy));
                      FxaaFloat lumaW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 0), fxaaQualityRcpFrame.xy));
                    #endif
                #endif
            /*--------------------------------------------------------------------------*/
                FxaaFloat maxSM = max(lumaS, lumaM);
                FxaaFloat minSM = min(lumaS, lumaM);
                FxaaFloat maxESM = max(lumaE, maxSM);
                FxaaFloat minESM = min(lumaE, minSM);
                FxaaFloat maxWN = max(lumaN, lumaW);
                FxaaFloat minWN = min(lumaN, lumaW);
                FxaaFloat rangeMax = max(maxWN, maxESM);
                FxaaFloat rangeMin = min(minWN, minESM);
                FxaaFloat rangeMaxScaled = rangeMax * fxaaQualityEdgeThreshold;
                FxaaFloat range = rangeMax - rangeMin;
                FxaaFloat rangeMaxClamped = max(fxaaQualityEdgeThresholdMin, rangeMaxScaled);
                FxaaBool earlyExit = range < rangeMaxClamped;
            /*--------------------------------------------------------------------------*/
                if(earlyExit)
                    #if (FXAA_DISCARD == 1)
                        FxaaDiscard;
                    #else
                        return rgbyM;
                    #endif
            /*--------------------------------------------------------------------------*/
                #if (FXAA_GATHER4_ALPHA == 0)
                    #if (FXAA_GLSL_100 == 1)
                      FxaaFloat lumaNW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0,-1.0), fxaaQualityRcpFrame.xy));
                      FxaaFloat lumaSE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0, 1.0), fxaaQualityRcpFrame.xy));
                      FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0,-1.0), fxaaQualityRcpFrame.xy));
                      FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0, 1.0), fxaaQualityRcpFrame.xy));
                    #else
                      FxaaFloat lumaNW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1,-1), fxaaQualityRcpFrame.xy));
                      FxaaFloat lumaSE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1, 1), fxaaQualityRcpFrame.xy));
                      FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1,-1), fxaaQualityRcpFrame.xy));
                      FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 1), fxaaQualityRcpFrame.xy));
                    #endif
                #else
                    FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(1, -1), fxaaQualityRcpFrame.xy));
                    FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 1), fxaaQualityRcpFrame.xy));
                #endif
            /*--------------------------------------------------------------------------*/
                FxaaFloat lumaNS = lumaN + lumaS;
                FxaaFloat lumaWE = lumaW + lumaE;
                FxaaFloat subpixRcpRange = 1.0/range;
                FxaaFloat subpixNSWE = lumaNS + lumaWE;
                FxaaFloat edgeHorz1 = (-2.0 * lumaM) + lumaNS;
                FxaaFloat edgeVert1 = (-2.0 * lumaM) + lumaWE;
            /*--------------------------------------------------------------------------*/
                FxaaFloat lumaNESE = lumaNE + lumaSE;
                FxaaFloat lumaNWNE = lumaNW + lumaNE;
                FxaaFloat edgeHorz2 = (-2.0 * lumaE) + lumaNESE;
                FxaaFloat edgeVert2 = (-2.0 * lumaN) + lumaNWNE;
            /*--------------------------------------------------------------------------*/
                FxaaFloat lumaNWSW = lumaNW + lumaSW;
                FxaaFloat lumaSWSE = lumaSW + lumaSE;
                FxaaFloat edgeHorz4 = (abs(edgeHorz1) * 2.0) + abs(edgeHorz2);
                FxaaFloat edgeVert4 = (abs(edgeVert1) * 2.0) + abs(edgeVert2);
                FxaaFloat edgeHorz3 = (-2.0 * lumaW) + lumaNWSW;
                FxaaFloat edgeVert3 = (-2.0 * lumaS) + lumaSWSE;
                FxaaFloat edgeHorz = abs(edgeHorz3) + edgeHorz4;
                FxaaFloat edgeVert = abs(edgeVert3) + edgeVert4;
            /*--------------------------------------------------------------------------*/
                FxaaFloat subpixNWSWNESE = lumaNWSW + lumaNESE;
                FxaaFloat lengthSign = fxaaQualityRcpFrame.x;
                FxaaBool horzSpan = edgeHorz >= edgeVert;
                FxaaFloat subpixA = subpixNSWE * 2.0 + subpixNWSWNESE;
            /*--------------------------------------------------------------------------*/
                if(!horzSpan) lumaN = lumaW;
                if(!horzSpan) lumaS = lumaE;
                if(horzSpan) lengthSign = fxaaQualityRcpFrame.y;
                FxaaFloat subpixB = (subpixA * (1.0/12.0)) - lumaM;
            /*--------------------------------------------------------------------------*/
                FxaaFloat gradientN = lumaN - lumaM;
                FxaaFloat gradientS = lumaS - lumaM;
                FxaaFloat lumaNN = lumaN + lumaM;
                FxaaFloat lumaSS = lumaS + lumaM;
                FxaaBool pairN = abs(gradientN) >= abs(gradientS);
                FxaaFloat gradient = max(abs(gradientN), abs(gradientS));
                if(pairN) lengthSign = -lengthSign;
                FxaaFloat subpixC = FxaaSat(abs(subpixB) * subpixRcpRange);
            /*--------------------------------------------------------------------------*/
                FxaaFloat2 posB;
                posB.x = posM.x;
                posB.y = posM.y;
                FxaaFloat2 offNP;
                offNP.x = (!horzSpan) ? 0.0 : fxaaQualityRcpFrame.x;
                offNP.y = ( horzSpan) ? 0.0 : fxaaQualityRcpFrame.y;
                if(!horzSpan) posB.x += lengthSign * 0.5;
                if( horzSpan) posB.y += lengthSign * 0.5;
            /*--------------------------------------------------------------------------*/
                FxaaFloat2 posN;
                posN.x = posB.x - offNP.x * FXAA_QUALITY_P0;
                posN.y = posB.y - offNP.y * FXAA_QUALITY_P0;
                FxaaFloat2 posP;
                posP.x = posB.x + offNP.x * FXAA_QUALITY_P0;
                posP.y = posB.y + offNP.y * FXAA_QUALITY_P0;
                FxaaFloat subpixD = ((-2.0)*subpixC) + 3.0;
                FxaaFloat lumaEndN = FxaaLuma(FxaaTexTop(tex, posN));
                FxaaFloat subpixE = subpixC * subpixC;
                FxaaFloat lumaEndP = FxaaLuma(FxaaTexTop(tex, posP));
            /*--------------------------------------------------------------------------*/
                if(!pairN) lumaNN = lumaSS;
                FxaaFloat gradientScaled = gradient * 1.0/4.0;
                FxaaFloat lumaMM = lumaM - lumaNN * 0.5;
                FxaaFloat subpixF = subpixD * subpixE;
                FxaaBool lumaMLTZero = lumaMM < 0.0;
            /*--------------------------------------------------------------------------*/
                lumaEndN -= lumaNN * 0.5;
                lumaEndP -= lumaNN * 0.5;
                FxaaBool doneN = abs(lumaEndN) >= gradientScaled;
                FxaaBool doneP = abs(lumaEndP) >= gradientScaled;
                if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P1;
                if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P1;
                FxaaBool doneNP = (!doneN) || (!doneP);
                if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P1;
                if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P1;
            /*--------------------------------------------------------------------------*/
                if(doneNP) {
                    if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                    if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                    if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                    if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                    doneN = abs(lumaEndN) >= gradientScaled;
                    doneP = abs(lumaEndP) >= gradientScaled;
                    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P2;
                    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P2;
                    doneNP = (!doneN) || (!doneP);
                    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P2;
                    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P2;
            /*--------------------------------------------------------------------------*/
                    #if (FXAA_QUALITY_PS > 3)
                    if(doneNP) {
                        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                        doneN = abs(lumaEndN) >= gradientScaled;
                        doneP = abs(lumaEndP) >= gradientScaled;
                        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P3;
                        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P3;
                        doneNP = (!doneN) || (!doneP);
                        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P3;
                        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P3;
            /*--------------------------------------------------------------------------*/
                        #if (FXAA_QUALITY_PS > 4)
                        if(doneNP) {
                            if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                            if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                            doneN = abs(lumaEndN) >= gradientScaled;
                            doneP = abs(lumaEndP) >= gradientScaled;
                            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P4;
                            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P4;
                            doneNP = (!doneN) || (!doneP);
                            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P4;
                            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P4;
            /*--------------------------------------------------------------------------*/
                            #if (FXAA_QUALITY_PS > 5)
                            if(doneNP) {
                                if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                                if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                                if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                                if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                                doneN = abs(lumaEndN) >= gradientScaled;
                                doneP = abs(lumaEndP) >= gradientScaled;
                                if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P5;
                                if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P5;
                                doneNP = (!doneN) || (!doneP);
                                if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P5;
                                if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P5;
            /*--------------------------------------------------------------------------*/
                                #if (FXAA_QUALITY_PS > 6)
                                if(doneNP) {
                                    if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                                    if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                                    if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                                    if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                                    doneN = abs(lumaEndN) >= gradientScaled;
                                    doneP = abs(lumaEndP) >= gradientScaled;
                                    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P6;
                                    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P6;
                                    doneNP = (!doneN) || (!doneP);
                                    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P6;
                                    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P6;
            /*--------------------------------------------------------------------------*/
                                    #if (FXAA_QUALITY_PS > 7)
                                    if(doneNP) {
                                        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                                        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                                        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                                        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                                        doneN = abs(lumaEndN) >= gradientScaled;
                                        doneP = abs(lumaEndP) >= gradientScaled;
                                        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P7;
                                        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P7;
                                        doneNP = (!doneN) || (!doneP);
                                        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P7;
                                        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P7;
            /*--------------------------------------------------------------------------*/
                #if (FXAA_QUALITY_PS > 8)
                if(doneNP) {
                    if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                    if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                    if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                    if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                    doneN = abs(lumaEndN) >= gradientScaled;
                    doneP = abs(lumaEndP) >= gradientScaled;
                    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P8;
                    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P8;
                    doneNP = (!doneN) || (!doneP);
                    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P8;
                    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P8;
            /*--------------------------------------------------------------------------*/
                    #if (FXAA_QUALITY_PS > 9)
                    if(doneNP) {
                        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                        doneN = abs(lumaEndN) >= gradientScaled;
                        doneP = abs(lumaEndP) >= gradientScaled;
                        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P9;
                        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P9;
                        doneNP = (!doneN) || (!doneP);
                        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P9;
                        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P9;
            /*--------------------------------------------------------------------------*/
                        #if (FXAA_QUALITY_PS > 10)
                        if(doneNP) {
                            if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                            if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                            doneN = abs(lumaEndN) >= gradientScaled;
                            doneP = abs(lumaEndP) >= gradientScaled;
                            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P10;
                            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P10;
                            doneNP = (!doneN) || (!doneP);
                            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P10;
                            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P10;
            /*--------------------------------------------------------------------------*/
                            #if (FXAA_QUALITY_PS > 11)
                            if(doneNP) {
                                if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                                if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                                if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                                if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                                doneN = abs(lumaEndN) >= gradientScaled;
                                doneP = abs(lumaEndP) >= gradientScaled;
                                if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P11;
                                if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P11;
                                doneNP = (!doneN) || (!doneP);
                                if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P11;
                                if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P11;
            /*--------------------------------------------------------------------------*/
                                #if (FXAA_QUALITY_PS > 12)
                                if(doneNP) {
                                    if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                                    if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                                    if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                                    if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                                    doneN = abs(lumaEndN) >= gradientScaled;
                                    doneP = abs(lumaEndP) >= gradientScaled;
                                    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P12;
                                    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P12;
                                    doneNP = (!doneN) || (!doneP);
                                    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P12;
                                    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P12;
            /*--------------------------------------------------------------------------*/
                                }
                                #endif
            /*--------------------------------------------------------------------------*/
                            }
                            #endif
            /*--------------------------------------------------------------------------*/
                        }
                        #endif
            /*--------------------------------------------------------------------------*/
                    }
                    #endif
            /*--------------------------------------------------------------------------*/
                }
                #endif
            /*--------------------------------------------------------------------------*/
                                    }
                                    #endif
            /*--------------------------------------------------------------------------*/
                                }
                                #endif
            /*--------------------------------------------------------------------------*/
                            }
                            #endif
            /*--------------------------------------------------------------------------*/
                        }
                        #endif
            /*--------------------------------------------------------------------------*/
                    }
                    #endif
            /*--------------------------------------------------------------------------*/
                }
            /*--------------------------------------------------------------------------*/
                FxaaFloat dstN = posM.x - posN.x;
                FxaaFloat dstP = posP.x - posM.x;
                if(!horzSpan) dstN = posM.y - posN.y;
                if(!horzSpan) dstP = posP.y - posM.y;
            /*--------------------------------------------------------------------------*/
                FxaaBool goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;
                FxaaFloat spanLength = (dstP + dstN);
                FxaaBool goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;
                FxaaFloat spanLengthRcp = 1.0/spanLength;
            /*--------------------------------------------------------------------------*/
                FxaaBool directionN = dstN < dstP;
                FxaaFloat dst = min(dstN, dstP);
                FxaaBool goodSpan = directionN ? goodSpanN : goodSpanP;
                FxaaFloat subpixG = subpixF * subpixF;
                FxaaFloat pixelOffset = (dst * (-spanLengthRcp)) + 0.5;
                FxaaFloat subpixH = subpixG * fxaaQualitySubpix;
            /*--------------------------------------------------------------------------*/
                FxaaFloat pixelOffsetGood = goodSpan ? pixelOffset : 0.0;
                FxaaFloat pixelOffsetSubpix = max(pixelOffsetGood, subpixH);
                if(!horzSpan) posM.x += pixelOffsetSubpix * lengthSign;
                if( horzSpan) posM.y += pixelOffsetSubpix * lengthSign;
                #if (FXAA_DISCARD == 1)
                    return FxaaTexTop(tex, posM);
                #else
                    return FxaaFloat4(FxaaTexTop(tex, posM).xyz, lumaM);
                #endif
            }
            /*==========================================================================*/
            #endif

            void main() {
              fragColor = FxaaPixelShader(
                v_texCoord,
                vec4(0.0),
                u_canvas,
                u_canvas,
                u_canvas,
                u_resolution,
                vec4(0.0),
                vec4(0.0),
                vec4(0.0),
                0.75,
                0.166,
                0.0833,
                0.0,
                0.0,
                0.0,
                vec4(0.0)
              );

              // TODO avoid querying texture twice for same texel
              fragColor.a = texture(u_canvas, v_texCoord).a;
            }
            `,
  },
  smaaEdges: {
    vert: `#version 300 es
            in vec2 a_position;
            in vec2 a_texCoord;

            uniform vec2 u_resolution;

            out vec2 v_texCoord;
            out vec4 v_offset[ 3 ];

            void SMAAEdgeDetectionVS( vec2 texcoord ) {
              v_offset[ 0 ] = texcoord.xyxy + u_resolution.xyxy * vec4( -1.0, 0.0, 0.0,  1.0 ); // WebGL port note: Changed sign in W component
              v_offset[ 1 ] = texcoord.xyxy + u_resolution.xyxy * vec4(  1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
              v_offset[ 2 ] = texcoord.xyxy + u_resolution.xyxy * vec4( -2.0, 0.0, 0.0,  2.0 ); // WebGL port note: Changed sign in W component
            }

            void main() {
              // convert the rectangle from pixels to 0.0 to 1.0
              vec2 zeroToOne = a_position / u_resolution;

              // convert from 0->1 to 0->2
              vec2 zeroToTwo = zeroToOne * 2.0;

              // convert from 0->2 to -1->+1 (clipspace)
              vec2 clipSpace = zeroToTwo - 1.0;

              gl_Position = vec4(clipSpace, 0, 1);

              // pass the texCoord to the fragment shader
              // The GPU will interpolate pPM value between points.
              v_texCoord = a_texCoord;
              SMAAEdgeDetectionVS( v_texCoord );
            }
            `,
    frag: `#version 300 es
              precision highp float;

              #ifndef SMAA_THRESHOLD
              #define SMAA_THRESHOLD 0.1
              #endif

              #ifndef SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR
              #define SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR 2.0
              #endif

              uniform sampler2D u_canvas;

              in vec2 v_texCoord;
              in vec4 v_offset[ 3 ];

              out vec4 fragColor;

              void main() {
                // Calculate the threshold:
                vec2 threshold = vec2(SMAA_THRESHOLD);

                // Calculate color deltas:
                vec4 delta;
                vec3 c = texture(u_canvas, v_texCoord).rgb;

                vec3 cLeft = texture(u_canvas, v_offset[0].xy).rgb;
                vec3 t = abs(c - cLeft);
                delta.x = max(max(t.r, t.g), t.b);

                vec3 cTop  = texture(u_canvas, v_offset[0].zw).rgb;
                t = abs(c - cTop);
                delta.y = max(max(t.r, t.g), t.b);

                // We do the usual threshold:
                vec2 edges = step(threshold, delta.xy);

                // Then discard if there is no edge:
                if (dot(edges, vec2(1.0, 1.0)) == 0.0)
                    discard;

                // Calculate right and bottom deltas:
                vec3 cRight = texture(u_canvas, v_offset[1].xy).rgb;
                t = abs(c - cRight);
                delta.z = max(max(t.r, t.g), t.b);

                vec3 cBottom  = texture(u_canvas, v_offset[1].zw).rgb;
                t = abs(c - cBottom);
                delta.w = max(max(t.r, t.g), t.b);

                // Calculate the maximum delta in the direct neighborhood:
                vec2 maxDelta = max(delta.xy, delta.zw);

                // Calculate left-left and top-top deltas:
                vec3 cLeftLeft  = texture(u_canvas, v_offset[2].xy).rgb;
                t = abs(c - cLeftLeft);
                delta.z = max(max(t.r, t.g), t.b);

                vec3 cTopTop = texture(u_canvas, v_offset[2].zw).rgb;
                t = abs(c - cTopTop);
                delta.w = max(max(t.r, t.g), t.b);

                // Calculate the final maximum delta:
                maxDelta = max(maxDelta.xy, delta.zw);
                float finalDelta = max(maxDelta.x, maxDelta.y);

                // Local contrast adaptation:
                edges.xy *= step(finalDelta, SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR * delta.xy);

                fragColor = vec4(edges, 0.0, 1.0);
              }
            `,
  },
  smaaWeights: {
    vert: `#version 300 es
            in vec2 a_position;
            in vec2 a_texCoord;

            uniform vec2 u_resolution;

            out vec2 v_texCoord;
            out vec4 v_offset[ 3 ];
            out vec2 v_pixcoord;

            #ifndef SMAA_MAX_SEARCH_STEPS
              #define SMAA_MAX_SEARCH_STEPS 8
            #endif

            void SMAABlendingWeightCalculationVS( vec2 texcoord ) {
              v_pixcoord = texcoord / u_resolution;
              // We will use these offsets for the searches later on (see @PSEUDO_GATHER4):
              v_offset[ 0 ] = texcoord.xyxy + u_resolution.xyxy * vec4( -0.25, 0.125, 1.25, 0.125 ); // WebGL port note: Changed sign in Y and W components
              v_offset[ 1 ] = texcoord.xyxy + u_resolution.xyxy * vec4( -0.125, 0.25, -0.125, -1.25 ); // WebGL port note: Changed sign in Y and W components
              // And these for the searches, they indicate the ends of the loops:
              v_offset[ 2 ] = vec4( v_offset[ 0 ].xz, v_offset[ 1 ].yw ) + vec4( -2.0, 2.0, -2.0, 2.0 ) * u_resolution.xxyy * float( SMAA_MAX_SEARCH_STEPS );
            }

            void main() {
              // convert the rectangle from pixels to 0.0 to 1.0
              vec2 zeroToOne = a_position / u_resolution;

              // convert from 0->1 to 0->2
              vec2 zeroToTwo = zeroToOne * 2.0;

              // convert from 0->2 to -1->+1 (clipspace)
              vec2 clipSpace = zeroToTwo - 1.0;

              gl_Position = vec4(clipSpace, 0, 1);

              // pass the texCoord to the fragment shader
              // The GPU will interpolate pPM value between points.
              v_texCoord = a_texCoord;
              SMAABlendingWeightCalculationVS( v_texCoord );
            }
            `,
    frag: `#version 300 es
              precision highp float;
              precision highp int;

              // Defaults
              #ifndef SMAA_THRESHOLD
              #define SMAA_THRESHOLD 0.1
              #endif
              #ifndef SMAA_MAX_SEARCH_STEPS
              #define SMAA_MAX_SEARCH_STEPS 16
              #endif
              #ifndef SMAA_MAX_SEARCH_STEPS_DIAG
              #define SMAA_MAX_SEARCH_STEPS_DIAG 8
              #endif
              #ifndef SMAA_CORNER_ROUNDING
              #define SMAA_CORNER_ROUNDING 25
              #endif

              // Non-Configurable Defines
              #define SMAA_AREATEX_MAX_DISTANCE 16
              #define SMAA_AREATEX_MAX_DISTANCE_DIAG 20
              #define SMAA_AREATEX_PIXEL_SIZE (1.0 / vec2(160.0, 560.0))
              #define SMAA_AREATEX_SUBTEX_SIZE (1.0 / 7.0)
              #define SMAA_SEARCHTEX_SIZE vec2(66.0, 33.0)
              #define SMAA_SEARCHTEX_PACKED_SIZE vec2(64.0, 16.0)
              #define SMAA_CORNER_ROUNDING_NORM (float(SMAA_CORNER_ROUNDING) / 100.0)

              // Texture Access Defines
              #ifndef SMAA_AREATEX_SELECT
              #define SMAA_AREATEX_SELECT(sample) sample.rg
              #endif

              #ifndef SMAA_SEARCHTEX_SELECT
              #define SMAA_SEARCHTEX_SELECT(sample) sample.r
              #endif

              uniform vec2 u_resolution;

              uniform sampler2D u_canvas;
              uniform sampler2D u_area;
              uniform sampler2D u_search;

              in vec2 v_texCoord;
              in vec4 v_offset[3];
              in vec2 v_pixcoord;

              out vec4 fragColor;

              vec4 SMAA_RT_METRICS = vec4(1.0 / u_resolution.x, 1.0 / u_resolution.y, u_resolution.x, u_resolution.y);

              #define mad(a, b, c) (a * b + c)
              #define saturate(a) clamp(a, 0.0, 1.0)
              #define round(v) floor(v + 0.5)
              #define SMAASampleLevelZeroOffset(tex, coord, offset) texture(tex, coord + offset * SMAA_RT_METRICS.xy)

              /**
               * Conditional move:
               */
              void SMAAMovc(bvec2 cond, inout vec2 variable, vec2 value) {
                if (cond.x) variable.x = value.x;
                if (cond.y) variable.y = value.y;
              }

              void SMAAMovc(bvec4 cond, inout vec4 variable, vec4 value) {
                SMAAMovc(cond.xy, variable.xy, value.xy);
                SMAAMovc(cond.zw, variable.zw, value.zw);
              }

              /**
               * Allows to decode two binary values from a bilinear-filtered access.
               */
              vec2 SMAADecodeDiagBilinearAccess(vec2 e) {
                // Bilinear access for fetching 'e' have a 0.25 offset, and we are
                // interested in the R and G edges:
                //
                // +---G---+-------+
                // |   x o R   x   |
                // +-------+-------+
                //
                // Then, if one of these edge is enabled:
                //   Red:   (0.75 * X + 0.25 * 1) => 0.25 or 1.0
                //   Green: (0.75 * 1 + 0.25 * X) => 0.75 or 1.0
                //
                // This function will unpack the values (mad + mul + round):
                // wolframalpha.com: round(x * abs(5 * x - 5 * 0.75)) plot 0 to 1
                e.r = e.r * abs(5.0 * e.r - 5.0 * 0.75);
                return round(e);
              }

              vec4 SMAADecodeDiagBilinearAccess(vec4 e) {
                e.rb = e.rb * abs(5.0 * e.rb - 5.0 * 0.75);
                return round(e);
              }

              /**
               * These functions allows to perform diagonal pattern searches.
               */
              vec2 SMAASearchDiag1(sampler2D u_canvas, vec2 texcoord, vec2 dir, out vec2 e) {
                vec4 coord = vec4(texcoord, -1.0, 1.0);
                vec3 t = vec3(SMAA_RT_METRICS.xy, 1.0);

                for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) {
                  if (!(coord.z < float(SMAA_MAX_SEARCH_STEPS_DIAG - 1) && coord.w > 0.9)) break;
                  coord.xyz = mad(t, vec3(dir, 1.0), coord.xyz);
                  e = texture(u_canvas, coord.xy).rg; // LinearSampler
                  coord.w = dot(e, vec2(0.5, 0.5));
                }
                return coord.zw;
              }

              vec2 SMAASearchDiag2(sampler2D u_canvas, vec2 texcoord, vec2 dir, out vec2 e) {
                vec4 coord = vec4(texcoord, -1.0, 1.0);
                coord.x += 0.25 * SMAA_RT_METRICS.x; // See @SearchDiag2Optimization
                vec3 t = vec3(SMAA_RT_METRICS.xy, 1.0);

                for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) {
                  if (!(coord.z < float(SMAA_MAX_SEARCH_STEPS_DIAG - 1) && coord.w > 0.9)) break;
                  coord.xyz = mad(t, vec3(dir, 1.0), coord.xyz);

                  // @SearchDiag2Optimization
                  // Fetch both edges at once using bilinear filtering:
                  e = texture(u_canvas, coord.xy).rg; // LinearSampler
                  e = SMAADecodeDiagBilinearAccess(e);

                  // Non-optimized version:
                  // e.g = texture(u_canvas, coord.xy).g; // LinearSampler
                  // e.r = SMAASampleLevelZeroOffset(u_canvas, coord.xy, vec2(1, 0)).r;

                  coord.w = dot(e, vec2(0.5, 0.5));
                }
                return coord.zw;
              }

              /**
               * Similar to SMAAArea, this calculates the area corresponding to a certain
               * diagonal distance and crossing edges 'e'.
               */
              vec2 SMAAAreaDiag(sampler2D u_area, vec2 dist, vec2 e, float offset) {
                vec2 texcoord = mad(vec2(SMAA_AREATEX_MAX_DISTANCE_DIAG, SMAA_AREATEX_MAX_DISTANCE_DIAG), e, dist);

                // We do a scale and bias for mapping to texel space:
                texcoord = mad(SMAA_AREATEX_PIXEL_SIZE, texcoord, 0.5 * SMAA_AREATEX_PIXEL_SIZE);

                // Diagonal areas are on the second half of the texture:
                texcoord.x += 0.5;

                // Move to proper place, according to the subpixel offset:
                texcoord.y += SMAA_AREATEX_SUBTEX_SIZE * offset;

                // Do it!
                return SMAA_AREATEX_SELECT(texture(u_area, texcoord)); // LinearSampler
              }

              /**
               * This searches for diagonal patterns and returns the corresponding weights.
               */
              vec2 SMAACalculateDiagWeights(sampler2D u_canvas, sampler2D u_area, vec2 texcoord, vec2 e, vec4 subsampleIndices) {
                vec2 weights = vec2(0.0, 0.0);

                // Search for the line ends:
                vec4 d;
                vec2 end;
                if (e.r > 0.0) {
                    d.xz = SMAASearchDiag1(u_canvas, texcoord, vec2(-1.0,  1.0), end);
                    d.x += float(end.y > 0.9);
                } else
                    d.xz = vec2(0.0, 0.0);
                d.yw = SMAASearchDiag1(u_canvas, texcoord, vec2(1.0, -1.0), end);

                if (d.x + d.y > 2.0) { // d.x + d.y + 1 > 3
                  // Fetch the crossing edges:
                  vec4 coords = mad(vec4(-d.x + 0.25, d.x, d.y, -d.y - 0.25), SMAA_RT_METRICS.xyxy, texcoord.xyxy);
                  vec4 c;
                  c.xy = SMAASampleLevelZeroOffset(u_canvas, coords.xy, vec2(-1,  0)).rg;
                  c.zw = SMAASampleLevelZeroOffset(u_canvas, coords.zw, vec2( 1,  0)).rg;
                  c.yxwz = SMAADecodeDiagBilinearAccess(c.xyzw);

                  // Non-optimized version:
                  // vec4 coords = mad(vec4(-d.x, d.x, d.y, -d.y), SMAA_RT_METRICS.xyxy, texcoord.xyxy);
                  // vec4 c;
                  // c.x = SMAASampleLevelZeroOffset(u_canvas, coords.xy, vec2(-1,  0)).g;
                  // c.y = SMAASampleLevelZeroOffset(u_canvas, coords.xy, vec2( 0,  0)).r;
                  // c.z = SMAASampleLevelZeroOffset(u_canvas, coords.zw, vec2( 1,  0)).g;
                  // c.w = SMAASampleLevelZeroOffset(u_canvas, coords.zw, vec2( 1, -1)).r;

                  // Merge crossing edges at each side into a single value:
                  vec2 cc = mad(vec2(2.0, 2.0), c.xz, c.yw);

                  // Remove the crossing edge if we didn't found the end of the line:
                  SMAAMovc(bvec2(step(0.9, d.zw)), cc, vec2(0.0, 0.0));

                  // Fetch the areas for this line:
                  weights += SMAAAreaDiag(u_area, d.xy, cc, subsampleIndices.z);
                }

                // Search for the line ends:
                d.xz = SMAASearchDiag2(u_canvas, texcoord, vec2(-1.0, -1.0), end);
                if (SMAASampleLevelZeroOffset(u_canvas, texcoord, vec2(1, 0)).r > 0.0) {
                  d.yw = SMAASearchDiag2(u_canvas, texcoord, vec2(1.0, 1.0), end);
                  d.y += float(end.y > 0.9);
                } else {
                  d.yw = vec2(0.0, 0.0);
                }

                if (d.x + d.y > 2.0) { // d.x + d.y + 1 > 3
                  // Fetch the crossing edges:
                  vec4 coords = mad(vec4(-d.x, -d.x, d.y, d.y), SMAA_RT_METRICS.xyxy, texcoord.xyxy);
                  vec4 c;
                  c.x  = SMAASampleLevelZeroOffset(u_canvas, coords.xy, vec2(-1,  0)).g;
                  c.y  = SMAASampleLevelZeroOffset(u_canvas, coords.xy, vec2( 0, -1)).r;
                  c.zw = SMAASampleLevelZeroOffset(u_canvas, coords.zw, vec2( 1,  0)).gr;
                  vec2 cc = mad(vec2(2.0, 2.0), c.xz, c.yw);

                  // Remove the crossing edge if we didn't found the end of the line:
                  SMAAMovc(bvec2(step(0.9, d.zw)), cc, vec2(0.0, 0.0));

                  // Fetch the areas for this line:
                  weights += SMAAAreaDiag(u_area, d.xy, cc, subsampleIndices.w).gr;
                }

                return weights;
              }

              /**
               * This allows to determine how much length should we add in the last step
               * of the searches. It takes the bilinearly interpolated edge (see
               * @PSEUDO_GATHER4), and adds 0, 1 or 2, depending on which edges and
               * crossing edges are active.
               */
              float SMAASearchLength(sampler2D u_search, vec2 e, float offset) {
                // The texture is flipped vertically, with left and right cases taking half
                // of the space horizontally:
                vec2 scale = SMAA_SEARCHTEX_SIZE * vec2(0.5, -1.0);
                vec2 bias = SMAA_SEARCHTEX_SIZE * vec2(offset, 1.0);

                // Scale and bias to access texel centers:
                scale += vec2(-1.0,  1.0);
                bias  += vec2( 0.5, -0.5);

                // Convert from pixel coordinates to texcoords:
                // (We use SMAA_SEARCHTEX_PACKED_SIZE because the texture is cropped)
                scale *= 1.0 / SMAA_SEARCHTEX_PACKED_SIZE;
                bias *= 1.0 / SMAA_SEARCHTEX_PACKED_SIZE;

                // Lookup the search texture:
                return SMAA_SEARCHTEX_SELECT(texture(u_search, mad(scale, e, bias))); // LinearSampler
              }

              /**
               * Horizontal/vertical search functions for the 2nd pass.
               */
              float SMAASearchXLeft(sampler2D u_canvas, sampler2D u_search, vec2 texcoord, float end) {
                /**
                  * @PSEUDO_GATHER4
                  * This texcoord has been offset by (-0.25, -0.125) in the vertex shader to
                  * sample between edge, thus fetching four edges in a row.
                  * Sampling with different offsets in each direction allows to disambiguate
                  * which edges are active from the four fetched ones.
                  */
                vec2 e = vec2(0.0, 1.0);
                for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) {
                  if (!(texcoord.x > end && e.g > 0.8281 && e.r == 0.0)) break;
                  e = texture(u_canvas, texcoord).rg; // LinearSampler
                  texcoord = mad(-vec2(2.0, 0.0), SMAA_RT_METRICS.xy, texcoord);
                }

                float offset = mad(-(255.0 / 127.0), SMAASearchLength(u_search, e, 0.0), 3.25);
                return mad(SMAA_RT_METRICS.x, offset, texcoord.x);

                // Non-optimized version:
                // We correct the previous (-0.25, -0.125) offset we applied:
                // texcoord.x += 0.25 * SMAA_RT_METRICS.x;

                // The searches are bias by 1, so adjust the coords accordingly:
                // texcoord.x += SMAA_RT_METRICS.x;

                // Disambiguate the length added by the last step:
                // texcoord.x += 2.0 * SMAA_RT_METRICS.x; // Undo last step
                // texcoord.x -= SMAA_RT_METRICS.x * (255.0 / 127.0) * SMAASearchLength(u_search, e, 0.0);
                // return mad(SMAA_RT_METRICS.x, offset, texcoord.x);
              }

              float SMAASearchXRight(sampler2D u_canvas, sampler2D u_search, vec2 texcoord, float end) {
                vec2 e = vec2(0.0, 1.0);
                for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) { if (!(texcoord.x < end && e.g > 0.8281 && e.r == 0.0)) break;
                  e = texture(u_canvas, texcoord).rg; // LinearSampler
                  texcoord = mad(vec2(2.0, 0.0), SMAA_RT_METRICS.xy, texcoord);
                }
                float offset = mad(-(255.0 / 127.0), SMAASearchLength(u_search, e, 0.5), 3.25);
                return mad(-SMAA_RT_METRICS.x, offset, texcoord.x);
              }

              float SMAASearchYUp(sampler2D u_canvas, sampler2D u_search, vec2 texcoord, float end) {
                vec2 e = vec2(1.0, 0.0);
                for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) { if (!(texcoord.y > end && e.r > 0.8281 && e.g == 0.0)) break;
                  e = texture(u_canvas, texcoord).rg; // LinearSampler
                  texcoord = mad(-vec2(0.0, 2.0), SMAA_RT_METRICS.xy, texcoord);
                }
                float offset = mad(-(255.0 / 127.0), SMAASearchLength(u_search, e.gr, 0.0), 3.25);
                return mad(SMAA_RT_METRICS.y, offset, texcoord.y);
              }

              float SMAASearchYDown(sampler2D u_canvas, sampler2D u_search, vec2 texcoord, float end) {
                vec2 e = vec2(1.0, 0.0);
                for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) { if (!(texcoord.y < end && e.r > 0.8281 && e.g == 0.0)) break;
                  e = texture(u_canvas, texcoord).rg; // LinearSampler
                  texcoord = mad(vec2(0.0, 2.0), SMAA_RT_METRICS.xy, texcoord);
                }
                float offset = mad(-(255.0 / 127.0), SMAASearchLength(u_search, e.gr, 0.5), 3.25);
                return mad(-SMAA_RT_METRICS.y, offset, texcoord.y);
              }

              /**
               * Ok, we have the distance and both crossing edges. So, what are the areas
               * at each side of current edge?
               */
              vec2 SMAAArea(sampler2D u_area, vec2 dist, float e1, float e2, float offset) {
                // Rounding prevents precision errors of bilinear filtering:
                vec2 texcoord = mad(vec2(SMAA_AREATEX_MAX_DISTANCE, SMAA_AREATEX_MAX_DISTANCE), round(4.0 * vec2(e1, e2)), dist);

                // We do a scale and bias for mapping to texel space:
                texcoord = mad(SMAA_AREATEX_PIXEL_SIZE, texcoord, 0.5 * SMAA_AREATEX_PIXEL_SIZE);

                // Move to proper place, according to the subpixel offset:
                texcoord.y = mad(SMAA_AREATEX_SUBTEX_SIZE, offset, texcoord.y);

                // Do it!
                return SMAA_AREATEX_SELECT(texture(u_area, texcoord)); // LinearSampler
              }

              // Corner Detection Functions
              void SMAADetectHorizontalCornerPattern(sampler2D u_canvas, inout vec2 weights, vec4 texcoord, vec2 d) {
                #if !defined(SMAA_DISABLE_CORNER_DETECTION)
                vec2 leftRight = step(d.xy, d.yx);
                vec2 rounding = (1.0 - SMAA_CORNER_ROUNDING_NORM) * leftRight;

                rounding /= leftRight.x + leftRight.y; // Reduce blending for pixels in the center of a line.

                vec2 factor = vec2(1.0, 1.0);
                factor.x -= rounding.x * SMAASampleLevelZeroOffset(u_canvas, texcoord.xy, vec2(0,  1)).r;
                factor.x -= rounding.y * SMAASampleLevelZeroOffset(u_canvas, texcoord.zw, vec2(1,  1)).r;
                factor.y -= rounding.x * SMAASampleLevelZeroOffset(u_canvas, texcoord.xy, vec2(0, -2)).r;
                factor.y -= rounding.y * SMAASampleLevelZeroOffset(u_canvas, texcoord.zw, vec2(1, -2)).r;

                weights *= saturate(factor);
                #endif
              }

              void SMAADetectVerticalCornerPattern(sampler2D u_canvas, inout vec2 weights, vec4 texcoord, vec2 d) {
                #if !defined(SMAA_DISABLE_CORNER_DETECTION)
                vec2 leftRight = step(d.xy, d.yx);
                vec2 rounding = (1.0 - SMAA_CORNER_ROUNDING_NORM) * leftRight;

                rounding /= leftRight.x + leftRight.y;

                vec2 factor = vec2(1.0, 1.0);
                factor.x -= rounding.x * SMAASampleLevelZeroOffset(u_canvas, texcoord.xy, vec2( 1, 0)).g;
                factor.x -= rounding.y * SMAASampleLevelZeroOffset(u_canvas, texcoord.zw, vec2( 1, 1)).g;
                factor.y -= rounding.x * SMAASampleLevelZeroOffset(u_canvas, texcoord.xy, vec2(-2, 0)).g;
                factor.y -= rounding.y * SMAASampleLevelZeroOffset(u_canvas, texcoord.zw, vec2(-2, 1)).g;

                weights *= saturate(factor);
                #endif
              }

              void main() {
                vec4 subsampleIndices = vec4(0.0); // Just pass zero for SMAA 1x, see @SUBSAMPLE_INDICES.
                // subsampleIndices = vec4(1.0, 1.0, 1.0, 0.0);
                vec4 weights = vec4(0.0, 0.0, 0.0, 0.0);
                vec2 e = texture(u_canvas, v_texCoord).rg;

                if (e.g > 0.0) { // Edge at north

                  #if !defined(SMAA_DISABLE_DIAG_DETECTION)
                  // Diagonals have both north and west edges, so searching for them in
                  // one of the boundaries is enough.
                  weights.rg = SMAACalculateDiagWeights(u_canvas, u_area, v_texCoord, e, subsampleIndices);

                  // We give priority to diagonals, so if we find a diagonal we skip
                  // horizontal/vertical processing.
                  if (weights.r == -weights.g) { // weights.r + weights.g == 0.0
                  #endif

                  vec2 d;

                  // Find the distance to the left:
                  vec3 coords;
                  coords.x = SMAASearchXLeft(u_canvas, u_search, v_offset[0].xy, v_offset[2].x);
                  coords.y = v_offset[1].y; // v_offset[1].y = v_texCoord.y - 0.25 * SMAA_RT_METRICS.y (@CROSSING_OFFSET)
                  d.x = coords.x;

                  // Now fetch the left crossing edges, two at a time using bilinear
                  // filtering. Sampling at -0.25 (see @CROSSING_OFFSET) enables to
                  // discern what value each edge has:
                  float e1 = texture(u_canvas, coords.xy).r; // LinearSampler

                  // Find the distance to the right:
                  coords.z = SMAASearchXRight(u_canvas, u_search, v_offset[0].zw, v_offset[2].y);
                  d.y = coords.z;

                  // We want the distances to be in pixel units (doing this here allow to
                  // better interleave arithmetic and memory accesses):
                  d = abs(round(mad(SMAA_RT_METRICS.zz, d, -v_pixcoord.xx)));

                  // SMAAArea below needs a sqrt, as the areas texture is compressed
                  // quadratically:
                  vec2 sqrt_d = sqrt(d);

                  // Fetch the right crossing edges:
                  float e2 = SMAASampleLevelZeroOffset(u_canvas, coords.zy, vec2(1, 0)).r;

                  // Ok, we know how this pattern looks like, now it is time for getting
                  // the actual area:
                  weights.rg = SMAAArea(u_area, sqrt_d, e1, e2, subsampleIndices.y);

                  // Fix corners:
                  coords.y = v_texCoord.y;
                  SMAADetectHorizontalCornerPattern(u_canvas, weights.rg, coords.xyzy, d);

                  #if !defined(SMAA_DISABLE_DIAG_DETECTION)
                  } else
                  e.r = 0.0; // Skip vertical processing.
                  #endif
                }

                if (e.r > 0.0) { // Edge at west
                  vec2 d;

                  // Find the distance to the top:
                  vec3 coords;
                  coords.y = SMAASearchYUp(u_canvas, u_search, v_offset[1].xy, v_offset[2].z);
                  coords.x = v_offset[0].x; // v_offset[1].x = v_texCoord.x - 0.25 * SMAA_RT_METRICS.x;
                  d.x = coords.y;

                  // Fetch the top crossing edges:
                  float e1 = texture(u_canvas, coords.xy).g; // LinearSampler

                  // Find the distance to the bottom:
                  coords.z = SMAASearchYDown(u_canvas, u_search, v_offset[1].zw, v_offset[2].w);
                  d.y = coords.z;

                  // We want the distances to be in pixel units:
                  d = abs(round(mad(SMAA_RT_METRICS.ww, d, -v_pixcoord.yy)));

                  // SMAAArea below needs a sqrt, as the areas texture is compressed
                  // quadratically:
                  vec2 sqrt_d = sqrt(d);

                  // Fetch the bottom crossing edges:
                  float e2 = SMAASampleLevelZeroOffset(u_canvas, coords.xz, vec2(0, 1)).g;

                  // Get the area for this direction:
                  weights.ba = SMAAArea(u_area, sqrt_d, e1, e2, subsampleIndices.x);

                  // Fix corners:
                  coords.x = v_texCoord.x;
                  SMAADetectVerticalCornerPattern(u_canvas, weights.ba, coords.xyxz, d);
                }

                fragColor = weights;
              }
      `,
  },
  smaaBlend: {
    vert: `#version 300 es
            #define mad(a, b, c) (a * b + c)
            in vec2 a_position;
            in vec2 a_texCoord;

            uniform vec2 u_resolution;

            out vec2 v_texCoord;
            out vec4 v_offset;

            void main() {
              // convert the rectangle from pixels to 0.0 to 1.0
              vec2 zeroToOne = a_position / u_resolution;

              // convert from 0->1 to 0->2
              vec2 zeroToTwo = zeroToOne * 2.0;

              // convert from 0->2 to -1->+1 (clipspace)
              vec2 clipSpace = zeroToTwo - 1.0;

              gl_Position = vec4(clipSpace, 0, 1);

              // pass the texCoord to the fragment shader
              // The GPU will interpolate pPM value between points.
              v_texCoord = a_texCoord;

              vec4 SMAA_RT_METRICS = vec4(1.0 / u_resolution.x, 1.0 / u_resolution.y, u_resolution.x, u_resolution.y);

              v_offset = mad(SMAA_RT_METRICS.xyxy, vec4(1.0, 0.0, 0.0,  1.0), v_texCoord.xyxy);
            }
            `,
    frag: `#version 300 es
            precision highp float;

            #define mad(a, b, c) (a * b + c)

            uniform sampler2D u_color;
            uniform sampler2D u_canvas;

            uniform vec2 u_resolution;

            in vec2 v_texCoord;
            in vec4 v_offset;

            out vec4 fragColor;

            vec4 SMAA_RT_METRICS = vec4(1.0 / u_resolution.x, 1.0 / u_resolution.y, u_resolution.x, u_resolution.y);

            /**
             * Conditional move:
             */
            void SMAAMovc(bvec2 cond, inout vec2 variable, vec2 value) {
              if (cond.x) variable.x = value.x;
              if (cond.y) variable.y = value.y;
            }

            void SMAAMovc(bvec4 cond, inout vec4 variable, vec4 value) {
              SMAAMovc(cond.xy, variable.xy, value.xy);
              SMAAMovc(cond.zw, variable.zw, value.zw);
            }

            void main() {
              vec4 color;

              // Fetch the blending weights for current pixel:
              vec4 a;
              a.x = texture(u_canvas, v_offset.xy).a; // Right
              a.y = texture(u_canvas, v_offset.zw).g; // Top
              a.wz = texture(u_canvas, v_texCoord).xz; // Bottom / Left

              // Is there any blending weight with a value greater than 0.0?
              if (dot(a, vec4(1.0, 1.0, 1.0, 1.0)) <= 1e-5) {
                color = texture(u_color, v_texCoord); // LinearSampler
              } else {
                bool h = max(a.x, a.z) > max(a.y, a.w); // max(horizontal) > max(vertical)

                // Calculate the blending offsets:
                vec4 blendingOffset = vec4(0.0, a.y, 0.0, a.w);
                vec2 blendingWeight = a.yw;
                SMAAMovc(bvec4(h, h, h, h), blendingOffset, vec4(a.x, 0.0, a.z, 0.0));
                SMAAMovc(bvec2(h, h), blendingWeight, a.xz);
                blendingWeight /= dot(blendingWeight, vec2(1.0, 1.0));

                // Calculate the texture coordinates:
                vec4 blendingCoord = mad(blendingOffset, vec4(SMAA_RT_METRICS.xy, -SMAA_RT_METRICS.xy), v_texCoord.xyxy);

                // We exploit bilinear filtering to mix current pixel with the chosen
                // neighbor:
                color = blendingWeight.x * texture(u_color, blendingCoord.xy); // LinearSampler
                color += blendingWeight.y * texture(u_color, blendingCoord.zw); // LinearSampler
              }

              fragColor = color;
            }
      `,
  },
};
