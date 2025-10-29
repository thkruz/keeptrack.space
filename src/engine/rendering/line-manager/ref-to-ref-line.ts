import { EciArr3 } from '@app/engine/core/interfaces';
import { vec3, vec4 } from 'gl-matrix';
import { Line } from './line';

export class RefToRefLine extends Line {
  private readonly ref1_: vec3;
  private readonly ref2_: vec3;
  color: vec4;

  constructor(ref1: vec3, ref2: vec3, color: vec4) {
    super();
    this.ref1_ = ref1;
    this.ref2_ = ref2;

    this.validateColor(color);
    this.color_ = color;

    this.updateVertBuf([this.ref1_ as EciArr3, this.ref2_ as EciArr3]);
  }

  update(): void {
    // Do nothing
  }
}
