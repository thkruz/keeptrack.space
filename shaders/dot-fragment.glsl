precision mediump float;

varying vec4 vColor;

void main(void) {
  vec2 ptCoord = gl_PointCoord * 2.0 - vec2(1.0, 1.0);
  float r = 1.0 - min(abs(length(ptCoord)), 1.0);
 // r -= abs(ptCoord.x * ptCoord.y * 0.5);
 float alpha = pow(r + 0.1, 3.0);
 alpha = min(alpha, 1.0);
// float alpha = r;
  gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
}