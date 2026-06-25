import { SolarBody } from '@app/engine/core/interfaces';
import { vec3, vec4 } from 'gl-matrix';
import { LineDescription } from './line';
import { Path } from './path';

export class OrbitPathLine extends Path {
  private readonly path_: vec3[];
  color: vec4;
  solarBody: SolarBody;

  constructor(path: vec3[] | vec4[], color: vec4, solarBody: SolarBody) {
    super(path.length, solarBody);
    this.path_ = path;

    this.validateColor(color);
    this.color_ = color;
    this.solarBody = solarBody;

    this.updateVertBuf(this.path_);
  }

  update(): void {
    // Do nothing
  }

  updateData(data: Float32Array, pointCount: number): void {
    this.updateVertBufDirect(data, pointCount);
  }

  getDescription(): LineDescription {
    return { kind: 'orbitPath' };
  }
}
