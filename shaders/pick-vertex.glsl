attribute vec3 aPos;
attribute vec3 aColor;
attribute float aPickable;

uniform mat4 uCamMatrix;
uniform mat4 uMvMatrix;
uniform mat4 uPMatrix;

varying vec3 vColor;

void main(void) {
  float dotSize = 16.0;
  vec4 position = uPMatrix * uCamMatrix *  uMvMatrix * vec4(aPos, 1.0);
  gl_Position = position;
  gl_PointSize = dotSize * aPickable;
  vColor = aColor * aPickable;
}