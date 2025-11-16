/**
 * Link Budget Mathematics Module
 * Provides RF link budget calculations for satellite communications
 */

import { Degrees, Kilometers } from '@ootk/src/main';

/**
 * Physical constants
 */
export const SPEED_OF_LIGHT = 299792.458; // km/s
export const BOLTZMANN_CONSTANT_DBW = -228.6; // dB(W/K/Hz)

/**
 * Parameters for link budget calculation
 */
export interface LinkBudgetParams {
  // Satellite parameters
  satTxPower: number;        // Watts
  satTxGain: number;         // dBi
  satRxGain: number;         // dBi
  satFreqDown: number;       // MHz
  satFreqUp: number;         // MHz

  // Ground station parameters
  gsTxPower: number;         // Watts
  gsTxGain: number;          // dBi
  gsRxGain: number;          // dBi
  gsSystemTemp: number;      // Kelvin
  gsNoiseFigure: number;     // dB

  // Link parameters
  bandwidth: number;         // Hz
  dataRate: number;          // bps
  ebNoRequired: number;      // dB
  codingGain: number;        // dB

  // Losses
  atmosphericLoss: number;   // dB
  rainFade: number;          // dB
  polarizationLoss: number;  // dB
  pointingLoss: number;      // dB
  miscLoss: number;          // dB
}

/**
 * Result of link budget calculation
 */
export interface LinkBudgetResult {
  uplink: {
    eirp: number;            // dBm
    fspl: number;            // dB
    receivedPower: number;   // dBm
    cno: number;             // dB-Hz
    linkMargin: number;      // dB
    totalLosses: number;     // dB
  };
  downlink: {
    eirp: number;            // dBm
    fspl: number;            // dB
    receivedPower: number;   // dBm
    cno: number;             // dB-Hz
    linkMargin: number;      // dB
    dataRate: number;        // Mbps
    totalLosses: number;     // dB
    gt: number;              // dB/K (G/T)
  };
  geometry: {
    range: number;           // km
    elevation: number;       // degrees
    azimuth: number;         // degrees
  };
  isViable: boolean;
}

/**
 * Default link budget parameters (S-band satellite)
 */
export const DEFAULT_PARAMS: LinkBudgetParams = {
  // Satellite - typical small sat
  satTxPower: 5,           // 5W
  satTxGain: 3,            // 3 dBi (omnidirectional)
  satRxGain: 2,            // 2 dBi
  satFreqDown: 2200,       // 2200 MHz (S-band)
  satFreqUp: 2025,         // 2025 MHz (S-band)

  // Ground station - amateur/small station
  gsTxPower: 100,          // 100W
  gsTxGain: 15,            // 15 dBi (small dish)
  gsRxGain: 15,            // 15 dBi
  gsSystemTemp: 150,       // 150K (decent LNA)
  gsNoiseFigure: 2,        // 2 dB

  // Link parameters
  bandwidth: 100000,       // 100 kHz
  dataRate: 9600,          // 9600 bps
  ebNoRequired: 10,        // 10 dB (BPSK)
  codingGain: 0,           // 0 dB (no FEC)

  // Losses
  atmosphericLoss: 0.5,    // 0.5 dB
  rainFade: 0,             // 0 dB (clear sky)
  polarizationLoss: 0.5,   // 0.5 dB
  pointingLoss: 0.5,       // 0.5 dB
  miscLoss: 1,             // 1 dB margin
};

/**
 * Convert power in Watts to dBm
 */
export function watts2dBm(watts: number): number {
  return 10 * Math.log10(watts * 1000);
}

/**
 * Convert power in dBm to Watts
 */
export function dBm2watts(dbm: number): number {
  return Math.pow(10, dbm / 10) / 1000;
}

/**
 * Convert linear value to dB
 */
export function linear2dB(linear: number): number {
  return 10 * Math.log10(linear);
}

/**
 * Convert dB to linear value
 */
export function dB2linear(db: number): number {
  return Math.pow(10, db / 10);
}

/**
 * Calculate Free Space Path Loss (FSPL)
 * @param range Distance in kilometers
 * @param frequency Frequency in MHz
 * @returns FSPL in dB
 */
export function calculateFSPL(range: Kilometers, frequency: number): number {
  // FSPL (dB) = 20*log10(d) + 20*log10(f) + 92.45
  // where d is in km and f is in MHz
  return 20 * Math.log10(range as number) + 20 * Math.log10(frequency) + 92.45;
}

/**
 * Calculate EIRP (Effective Isotropic Radiated Power)
 * @param txPower Transmit power in Watts
 * @param txGain Transmit antenna gain in dBi
 * @param lineLoss Line losses in dB (default 0)
 * @returns EIRP in dBm
 */
export function calculateEIRP(txPower: number, txGain: number, lineLoss: number = 0): number {
  const txPowerDbm = watts2dBm(txPower);

  return txPowerDbm + txGain - lineLoss;
}

/**
 * Calculate total path losses
 */
export function calculateTotalLosses(params: LinkBudgetParams): number {
  return (
    params.atmosphericLoss +
    params.rainFade +
    params.polarizationLoss +
    params.pointingLoss +
    params.miscLoss
  );
}

/**
 * Calculate additional pointing loss based on elevation angle
 * Low elevation = higher atmospheric path = more loss
 */
export function calculateElevationLoss(elevation: Degrees): number {
  const el = elevation as number;

  if (el < 0) {
    return 999; // Below horizon - infinite loss
  }
  if (el > 85) {
    return 0; // Near zenith - minimal loss
  }

  // Approximate atmospheric loss increase at low elevations
  // Based on sec(zenith angle) - 1 approximation
  const zenithAngle = 90 - el;
  const secant = 1 / Math.cos((zenithAngle * Math.PI) / 180);
  const additionalLoss = Math.max(0, (secant - 1) * 2); // ~2dB factor

  return Math.min(additionalLoss, 10); // Cap at 10 dB
}

/**
 * Calculate G/T (receiver figure of merit)
 * @param rxGain Receiver antenna gain in dBi
 * @param systemTemp System temperature in Kelvin
 * @returns G/T in dB/K
 */
export function calculateGT(rxGain: number, systemTemp: number): number {
  return rxGain - linear2dB(systemTemp);
}

/**
 * Calculate C/N0 (Carrier-to-Noise Density Ratio)
 * @param eirp EIRP in dBm
 * @param fspl Free space path loss in dB
 * @param gt G/T in dB/K
 * @param losses Total losses in dB
 * @returns C/N0 in dB-Hz
 */
export function calculateCNo(eirp: number, fspl: number, gt: number, losses: number): number {
  // C/N0 = EIRP - FSPL + G/T - k - Losses
  // where k is Boltzmann's constant in dB(W/K/Hz)
  return eirp - fspl + gt - BOLTZMANN_CONSTANT_DBW - losses;
}

/**
 * Calculate required C/N0 for a given data rate and Eb/N0
 * @param dataRate Data rate in bps
 * @param ebNo Required Eb/N0 in dB
 * @returns Required C/N0 in dB-Hz
 */
export function calculateRequiredCNo(dataRate: number, ebNo: number): number {
  // C/N0 (dB-Hz) = Eb/N0 (dB) + 10*log10(data rate)
  return ebNo + linear2dB(dataRate);
}

/**
 * Calculate link margin
 * @param actualCNo Actual C/N0 in dB-Hz
 * @param requiredCNo Required C/N0 in dB-Hz
 * @returns Link margin in dB
 */
export function calculateLinkMargin(actualCNo: number, requiredCNo: number): number {
  return actualCNo - requiredCNo;
}

/**
 * Calculate achievable data rate based on C/N0
 * Uses Shannon capacity as upper bound
 * @param cno C/N0 in dB-Hz
 * @param bandwidth Bandwidth in Hz
 * @param ebNoRequired Required Eb/N0 for modulation
 * @returns Data rate in Mbps
 */
export function calculateDataRate(cno: number, bandwidth: number, ebNoRequired: number): number {
  // Calculate SNR from C/N0 and bandwidth
  // SNR (dB) = C/N0 (dB-Hz) - 10*log10(BW)
  const snrDb = cno - linear2dB(bandwidth);
  const snrLinear = dB2linear(snrDb);

  // Shannon capacity: C = B * log2(1 + SNR)
  const shannonCapacity = bandwidth * Math.log2(1 + snrLinear);

  // Practical data rate limited by Eb/N0
  // Max rate where Eb/N0 requirement is met
  const maxPracticalRate = dB2linear(cno - ebNoRequired);

  // Take the minimum of Shannon and practical limit
  const dataRateBps = Math.min(shannonCapacity, maxPracticalRate);

  // Convert to Mbps
  return dataRateBps / 1e6;
}

/**
 * Calculate complete link budget
 */
export function calculateLinkBudget(
  range: Kilometers,
  elevation: Degrees,
  azimuth: Degrees,
  params: LinkBudgetParams,
): LinkBudgetResult {
  // Calculate elevation-dependent losses
  const elevationLoss = calculateElevationLoss(elevation);
  const totalLosses = calculateTotalLosses(params) + elevationLoss;

  // DOWNLINK (Satellite -> Ground Station)
  const downlinkEirp = calculateEIRP(params.satTxPower, params.satTxGain);
  const downlinkFspl = calculateFSPL(range, params.satFreqDown);
  const downlinkRxPower = downlinkEirp - downlinkFspl + params.gsRxGain - totalLosses;
  const gsGT = calculateGT(params.gsRxGain, params.gsSystemTemp);
  const downlinkCNo = calculateCNo(downlinkEirp, downlinkFspl, gsGT, totalLosses);
  const requiredCNo = calculateRequiredCNo(params.dataRate, params.ebNoRequired);
  const downlinkMargin = calculateLinkMargin(downlinkCNo, requiredCNo);
  const achievableDataRate = calculateDataRate(downlinkCNo, params.bandwidth, params.ebNoRequired);

  // UPLINK (Ground Station -> Satellite)
  const uplinkEirp = calculateEIRP(params.gsTxPower, params.gsTxGain);
  const uplinkFspl = calculateFSPL(range, params.satFreqUp);
  const uplinkRxPower = uplinkEirp - uplinkFspl + params.satRxGain - totalLosses;
  // Assume satellite system temperature of 500K (typical)
  const satGT = calculateGT(params.satRxGain, 500);
  const uplinkCNo = calculateCNo(uplinkEirp, uplinkFspl, satGT, totalLosses);
  const uplinkMargin = calculateLinkMargin(uplinkCNo, requiredCNo);

  // Check if link is viable (both uplink and downlink have positive margin)
  const isViable = downlinkMargin > 0 && uplinkMargin > 0 && (elevation as number) > 0;

  return {
    uplink: {
      eirp: uplinkEirp,
      fspl: uplinkFspl,
      receivedPower: uplinkRxPower,
      cno: uplinkCNo,
      linkMargin: uplinkMargin,
      totalLosses,
    },
    downlink: {
      eirp: downlinkEirp,
      fspl: downlinkFspl,
      receivedPower: downlinkRxPower,
      cno: downlinkCNo,
      linkMargin: downlinkMargin,
      dataRate: achievableDataRate,
      totalLosses,
      gt: gsGT,
    },
    geometry: {
      range: range as number,
      elevation: elevation as number,
      azimuth: azimuth as number,
    },
    isViable,
  };
}
