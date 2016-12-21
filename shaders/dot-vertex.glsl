attribute vec3 aPos;
attribute vec4 aColor;

uniform mat4 uCamMatrix;
uniform mat4 uMvMatrix;
uniform mat4 uPMatrix;

varying vec4 vColor;

void main(void) {
 // gl_PointSize = 16.0;
  vec4 position = uPMatrix * uCamMatrix *  uMvMatrix * vec4(aPos, 1.0);
  gl_PointSize = min(max(320000.0 / position.w, 7.5), 20.0) * 1.0;
  gl_Position = position;
  vColor = aColor;
}
