import { SpaceObjectType } from '../api/SpaceObjectType';
import { spaceObjType2Str } from './spaceObjType2Str';

describe('spaceObjType2Str', () => {
  it('should return "Unknown" for SpaceObjectType.UNKNOWN', () => {
    expect(spaceObjType2Str(SpaceObjectType.UNKNOWN)).toBe('Unknown');
  });
  it('should return "Payload" for SpaceObjectType.PAYLOAD', () => {
    expect(spaceObjType2Str(SpaceObjectType.PAYLOAD)).toBe('Payload');
  });
  it('should return "Rocket Body" for SpaceObjectType.ROCKET_BODY', () => {
    expect(spaceObjType2Str(SpaceObjectType.ROCKET_BODY)).toBe('Rocket Body');
  });
  it('should return "Debris" for SpaceObjectType.DEBRIS', () => {
    expect(spaceObjType2Str(SpaceObjectType.DEBRIS)).toBe('Debris');
  });
  it('should return "Special" for SpaceObjectType.SPECIAL', () => {
    expect(spaceObjType2Str(SpaceObjectType.SPECIAL)).toBe('Special');
  });
  it('should return "Radar Measurement" for SpaceObjectType.RADAR_MEASUREMENT', () => {
    expect(spaceObjType2Str(SpaceObjectType.RADAR_MEASUREMENT)).toBe('Radar Measurement');
  });
  it('should return "Radar Track" for SpaceObjectType.RADAR_TRACK', () => {
    expect(spaceObjType2Str(SpaceObjectType.RADAR_TRACK)).toBe('Radar Track');
  });
  it('should return "Radar Object" for SpaceObjectType.RADAR_OBJECT', () => {
    expect(spaceObjType2Str(SpaceObjectType.RADAR_OBJECT)).toBe('Radar Object');
  });
  it('should return "Ballistic Missile" for SpaceObjectType.BALLISTIC_MISSILE', () => {
    expect(spaceObjType2Str(SpaceObjectType.BALLISTIC_MISSILE)).toBe('Ballistic Missile');
  });
  it('should return "Star" for SpaceObjectType.STAR', () => {
    expect(spaceObjType2Str(SpaceObjectType.STAR)).toBe('Star');
  });
  it('should return "Intergovernmental Organization" for SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION', () => {
    expect(spaceObjType2Str(SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION)).toBe('Intergovernmental Organization');
  });
  it('should return "Suborbital Payload Operator" for SpaceObjectType.SUBORBITAL_PAYLOAD_OPERATOR', () => {
    expect(spaceObjType2Str(SpaceObjectType.SUBORBITAL_PAYLOAD_OPERATOR)).toBe('Suborbital Payload Operator');
  });
  it('should return "Payload Owner" for SpaceObjectType.PAYLOAD_OWNER', () => {
    expect(spaceObjType2Str(SpaceObjectType.PAYLOAD_OWNER)).toBe('Payload Owner');
  });
  it('should return "Meteorological Rocket Launch Agency or Manufacturer" for SpaceObjectType.METEOROLOGICAL_ROCKET_LAUNCH_AGENCY_OR_MANUFACTURER', () => {
    expect(spaceObjType2Str(SpaceObjectType.METEOROLOGICAL_ROCKET_LAUNCH_AGENCY_OR_MANUFACTURER)).toBe('Meteorological Rocket Launch Agency or Manufacturer');
  });
  it('should return "Payload Manufacturer" for SpaceObjectType.PAYLOAD_MANUFACTURER', () => {
    expect(spaceObjType2Str(SpaceObjectType.PAYLOAD_MANUFACTURER)).toBe('Payload Manufacturer');
  });
  it('should return "Launch Agency" for SpaceObjectType.LAUNCH_AGENCY', () => {
    expect(spaceObjType2Str(SpaceObjectType.LAUNCH_AGENCY)).toBe('Launch Agency');
  });
  it('should return "Launch Site" for SpaceObjectType.LAUNCH_SITE', () => {
    expect(spaceObjType2Str(SpaceObjectType.LAUNCH_SITE)).toBe('Launch Site');
  });
  it('should return "Launch Position" for SpaceObjectType.LAUNCH_POSITION', () => {
    expect(spaceObjType2Str(SpaceObjectType.LAUNCH_POSITION)).toBe('Launch Position');
  });
  it('should return "Launch Facility" for SpaceObjectType.LAUNCH_FACILITY', () => {
    expect(spaceObjType2Str(SpaceObjectType.LAUNCH_FACILITY)).toBe('Launch Facility');
  });
  it('should return "Control Facility" for SpaceObjectType.CONTORL_FACILITY', () => {
    expect(spaceObjType2Str(SpaceObjectType.CONTROL_FACILITY)).toBe('Control Facility');
  });
  it('should return "Ground Sensor Station" for SpaceObjectType.GROUND_SENSOR_STATION', () => {
    expect(spaceObjType2Str(SpaceObjectType.GROUND_SENSOR_STATION)).toBe('Ground Sensor Station');
  });
  it('should return "Optical" for SpaceObjectType.OPTICAL', () => {
    expect(spaceObjType2Str(SpaceObjectType.OPTICAL)).toBe('Optical');
  });
  it('should return "Mechanical" for SpaceObjectType.MECHANICAL', () => {
    expect(spaceObjType2Str(SpaceObjectType.MECHANICAL)).toBe('Mechanical');
  });
  it('should return "Phased Array Radar" for SpaceObjectType.PHASED_ARRAY_RADAR', () => {
    expect(spaceObjType2Str(SpaceObjectType.PHASED_ARRAY_RADAR)).toBe('Phased Array Radar');
  });
  it('should return "Observer" for SpaceObjectType.OBSERVER', () => {
    expect(spaceObjType2Str(SpaceObjectType.OBSERVER)).toBe('Observer');
  });
  it('should return "Bi-static Radio Telescope" for SpaceObjectType.BISTATIC_RADIO_TELESCOPE', () => {
    expect(spaceObjType2Str(SpaceObjectType.BISTATIC_RADIO_TELESCOPE)).toBe('Bi-static Radio Telescope');
  });
  it('should return "Country" for SpaceObjectType.COUNTRY', () => {
    expect(spaceObjType2Str(SpaceObjectType.COUNTRY)).toBe('Country');
  });
  it('should return "Launch Vehicle Manufacturer" for SpaceObjectType.LAUNCH_VEHICLE_MANUFACTURER', () => {
    expect(spaceObjType2Str(SpaceObjectType.LAUNCH_VEHICLE_MANUFACTURER)).toBe('Launch Vehicle Manufacturer');
  });
  it('should return "Engine Manufacturer" for SpaceObjectType.ENGINE_MANUFACTURER', () => {
    expect(spaceObjType2Str(SpaceObjectType.ENGINE_MANUFACTURER)).toBe('Engine Manufacturer');
  });
});
