import { vec3, vec4 } from 'gl-matrix';
import { Path } from './path';

export class OrbitPathLine extends Path {
  private readonly path_: vec3[];
  color: vec4;

  constructor(path: vec3[], color: vec4) {
    super(path.length);
    this.path_ = path;

    this.validateColor(color);
    this.color_ = color;

    this.updateVertBuf(this.path_);
  }

  update(): void {
    // Do nothing
  }
}
