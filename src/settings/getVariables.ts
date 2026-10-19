import { GodraySamples, parseGodraySamplesParam } from '@app/engine/rendering/draw-manager/godray-samples';

export class GetVariables {
  /** The `godrays=` URL value as a GodraySamples member; unrecognised values fall back to MEDIUM. */
  static godrays(value: string): GodraySamples {
    return parseGodraySamplesParam(value) ?? GodraySamples.MEDIUM;
  }
}
