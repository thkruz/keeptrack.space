import { SpaceObjectType } from '../api/SpaceObjectType';

export const spaceObjType2Str = (satType: SpaceObjectType): string => {
  switch (satType) {
    case SpaceObjectType.UNKNOWN:
      return 'Unknown';
    case SpaceObjectType.PAYLOAD:
      return 'Payload';
    case SpaceObjectType.ROCKET_BODY:
      return 'Rocket Body';
    case SpaceObjectType.DEBRIS:
      return 'Debris';
    case SpaceObjectType.SPECIAL:
      return 'Special';
    case SpaceObjectType.RADAR_MEASUREMENT:
      return 'Radar Measurement';
    case SpaceObjectType.RADAR_TRACK:
      return 'Radar Track';
    case SpaceObjectType.RADAR_OBJECT:
      return 'Radar Object';
    case SpaceObjectType.BALLISTIC_MISSILE:
      return 'Ballistic Missile';
    case SpaceObjectType.STAR:
      return 'Star';
    case SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION:
      return 'Intergovernmental Organization';
    case SpaceObjectType.SUBORBITAL_PAYLOAD_OPERATOR:
      return 'Suborbital Payload Operator';
    case SpaceObjectType.PAYLOAD_OWNER:
      return 'Payload Owner';
    case SpaceObjectType.METEOROLOGICAL_ROCKET_LAUNCH_AGENCY_OR_MANUFACTURER:
      return 'Meteorological Rocket Launch Agency or Manufacturer';
    case SpaceObjectType.PAYLOAD_MANUFACTURER:
      return 'Payload Manufacturer';
    case SpaceObjectType.LAUNCH_AGENCY:
      return 'Launch Agency';
    case SpaceObjectType.LAUNCH_SITE:
      return 'Launch Site';
    case SpaceObjectType.LAUNCH_POSITION:
      return 'Launch Position';
    case SpaceObjectType.LAUNCH_FACILITY:
      return 'Launch Facility';
    case SpaceObjectType.CONTORL_FACILITY:
      return 'Control Facility';
    case SpaceObjectType.GROUND_SENSOR_STATION:
      return 'Ground Sensor Station';
    case SpaceObjectType.OPTICAL:
      return 'Optical';
    case SpaceObjectType.MECHANICAL:
      return 'Mechanical';
    case SpaceObjectType.PHASED_ARRAY_RADAR:
      return 'Phased Array Radar';
    case SpaceObjectType.OBSERVER:
      return 'Observer';
    case SpaceObjectType.BISTATIC_RADIO_TELESCOPE:
      return 'Bi-static Radio Telescope';
    case SpaceObjectType.COUNTRY:
      return 'Country';
    case SpaceObjectType.LAUNCH_VEHICLE_MANUFACTURER:
      return 'Launch Vehicle Manufacturer';
    case SpaceObjectType.ENGINE_MANUFACTURER:
      return 'Engine Manufacturer';
    default:
      return 'Unknown';
  }
};
