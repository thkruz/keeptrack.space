/* eslint-disable no-undefined */
import { PayloadStatus, SpaceObjectType, TleLine1, TleLine2 } from '@ootk/src/main';
import { ColorSchemeTestUtils } from '../__helpers__/color-scheme-test-utils';

export const mockSatellites = {
  // Standard operational satellites
  activePayload: ColorSchemeTestUtils.createMockSatellite({
    id: 1,
    name: 'ACTIVE COMSAT',
    type: SpaceObjectType.PAYLOAD,
    status: PayloadStatus.OPERATIONAL,
    country: 'US',
    rcs: 5.2,
    vmag: 7.5,
    tle1: '1 25544U 98067A   25341.54791667  .00016717  00000-0  10270-3 0  9004' as TleLine1,
    tle2: '2 25544  51.6446 351.7886 0002187  96.5361  28.6483 15.49315347256916' as TleLine2,
  }),

  inactivePayload: ColorSchemeTestUtils.createMockSatellite({
    id: 2,
    name: 'DEAD SATELLITE',
    type: SpaceObjectType.PAYLOAD,
    status: PayloadStatus.NONOPERATIONAL,
    country: 'RU',
    rcs: 3.1,
    vmag: 8.2,
  }),

  rocketBody: ColorSchemeTestUtils.createMockSatellite({
    id: 3,
    name: 'FALCON 9 R/B',
    type: SpaceObjectType.ROCKET_BODY,
    country: 'US',
    rcs: 25.7,
    vmag: 6.8,
  }),

  debris: ColorSchemeTestUtils.createMockSatellite({
    id: 4,
    name: 'FRAGMENT',
    type: SpaceObjectType.DEBRIS,
    rcs: 0.05,
    vmag: 12.1,
  }),

  // Edge cases
  noRcsData: ColorSchemeTestUtils.createMockSatellite({
    id: 5,
    name: 'UNKNOWN RCS',
    type: SpaceObjectType.PAYLOAD,
    rcs: undefined,
    vmag: 9.0,
  }),

  extremelySmallRcs: ColorSchemeTestUtils.createMockSatellite({
    id: 6,
    name: 'TINY DEBRIS',
    type: SpaceObjectType.DEBRIS,
    rcs: 0.001,
    vmag: 15.5,
  }),

  extremelyLargeRcs: ColorSchemeTestUtils.createMockSatellite({
    id: 7,
    name: 'MASSIVE OBJECT',
    type: SpaceObjectType.PAYLOAD,
    rcs: 1000.0,
    vmag: 2.1,
  }),

  // Starlink satellite
  starlinkSat: ColorSchemeTestUtils.createMockSatellite({
    id: 8,
    name: 'STARLINK-1234',
    type: SpaceObjectType.PAYLOAD,
    status: PayloadStatus.OPERATIONAL,
    country: 'US',
    rcs: 1.2,
    vmag: 8.5,
  }),

  // International satellites
  chineseSat: ColorSchemeTestUtils.createMockSatellite({
    id: 9,
    name: 'CHINASAT-1',
    type: SpaceObjectType.PAYLOAD,
    country: 'CN',
    rcs: 4.5,
  }),

  japanesesSat: ColorSchemeTestUtils.createMockSatellite({
    id: 10,
    name: 'HIMAWARI-8',
    type: SpaceObjectType.PAYLOAD,
    country: 'J',
    rcs: 8.2,
  }),
};
