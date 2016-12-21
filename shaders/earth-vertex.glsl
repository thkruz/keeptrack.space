attribute vec3 aVertexPosition;

attribute vec2 aTexCoord;
attribute vec3 aVertexNormal;

uniform mat4 uPMatrix;
uniform mat4 uCamMatrix;
uniform mat4 uMvMatrix;
uniform mat3 uNormalMatrix;


varying vec2 texCoord;
varying vec3 normal;
varying float directionalLightAmount;

void main(void) {
  gl_Position = uPMatrix * uCamMatrix * uMvMatrix * vec4(aVertexPosition, 1.0);
  texCoord = aTexCoord;
  
  normal = uNormalMatrix * aVertexNormal;
}
