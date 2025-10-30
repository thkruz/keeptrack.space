import { EciArr3 } from '@app/engine/core/interfaces';
import { DetailedSatellite, KilometersPerSecond } from '@ootk/src/main';
import { Line, LineColors } from './line';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class SatRicLine extends Line {
  sat: DetailedSatellite;
  private coordinate_: 'R' | 'I' | 'C';

  private readonly lineLength = 2;

  constructor(sat: DetailedSatellite, coordinate: 'R' | 'I' | 'C', color = LineColors.ORANGE) {
    super();
    this.sat = sat;
    this.coordinate_ = coordinate;
    this.color_ = color;
  }

  update(): void {
    const posData = ServiceLocator.getDotsManager().positionData;
    const position = {
      x: posData[this.sat.id * 3],
      y: posData[this.sat.id * 3 + 1],
      z: posData[this.sat.id * 3 + 2],
    };
    const satArr = [position.x, position.y, position.z] as EciArr3;

    // Create In-Track Vector First
    const inTrack = { ...this.sat.velocity }; // Duplicate the velocity vector to avoid modifying the original
    // Normalize the velocity vector
    const inTrackMag = Math.sqrt(inTrack.x * inTrack.x + inTrack.y * inTrack.y + inTrack.z * inTrack.z);

    inTrack.x = inTrack.x / inTrackMag as KilometersPerSecond;
    inTrack.y = inTrack.y / inTrackMag as KilometersPerSecond;
    inTrack.z = inTrack.z / inTrackMag as KilometersPerSecond;

    // Now Create the Cross Track Vector (Cross Product of In-Track and Satellite Position)
    const r = position;
    const crossTrack = {
      x: r.y * inTrack.z - r.z * inTrack.y,
      y: r.z * inTrack.x - r.x * inTrack.z,
      z: r.x * inTrack.y - r.y * inTrack.x,
    };

    // Normalize the cross track vector
    const crossTrackMag = Math.sqrt(crossTrack.x * crossTrack.x + crossTrack.y * crossTrack.y + crossTrack.z * crossTrack.z);

    crossTrack.x = crossTrack.x / crossTrackMag as KilometersPerSecond;
    crossTrack.y = crossTrack.y / crossTrackMag as KilometersPerSecond;
    crossTrack.z = crossTrack.z / crossTrackMag as KilometersPerSecond;

    // Create the Radial Vector (Cross Product of In-Track and Cross-Track)
    const radial = {
      x: inTrack.y * crossTrack.z - inTrack.z * crossTrack.y,
      y: inTrack.z * crossTrack.x - inTrack.x * crossTrack.z,
      z: inTrack.x * crossTrack.y - inTrack.y * crossTrack.x,
    };

    // Normalize the radial vector
    const radialMag = Math.sqrt(radial.x * radial.x + radial.y * radial.y + radial.z * radial.z);

    radial.x = radial.x / radialMag as KilometersPerSecond;
    radial.y = radial.y / radialMag as KilometersPerSecond;
    radial.z = radial.z / radialMag as KilometersPerSecond;

    // Calculate a point this.lineLength in each direction from the satellite's position
    inTrack.x = position.x + inTrack.x * this.lineLength as KilometersPerSecond;
    inTrack.y = position.y + inTrack.y * this.lineLength as KilometersPerSecond;
    inTrack.z = position.z + inTrack.z * this.lineLength as KilometersPerSecond;

    crossTrack.x = position.x + crossTrack.x * this.lineLength as KilometersPerSecond;
    crossTrack.y = position.y + crossTrack.y * this.lineLength as KilometersPerSecond;
    crossTrack.z = position.z + crossTrack.z * this.lineLength as KilometersPerSecond;

    radial.x = position.x + radial.x * this.lineLength as KilometersPerSecond;
    radial.y = position.y + radial.y * this.lineLength as KilometersPerSecond;
    radial.z = position.z + radial.z * this.lineLength as KilometersPerSecond;

    let eciArr: EciArr3;

    switch (this.coordinate_) {
      case 'C':
        eciArr = [crossTrack.x, crossTrack.y, crossTrack.z] as EciArr3;
        break;
      case 'I':
        eciArr = [inTrack.x, inTrack.y, inTrack.z] as EciArr3;
        break;
      case 'R':
        eciArr = [radial.x, radial.y, radial.z] as EciArr3;
        break;
      default:
        throw new Error('Invalid type');
    }

    this.updateVertBuf([eciArr, satArr]);
  }
}
