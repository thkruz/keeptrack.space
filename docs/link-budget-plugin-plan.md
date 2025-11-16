# Communication Link Budget Plugin - Implementation Plan

## Executive Summary

The Communication Link Budget Plugin will provide comprehensive RF link analysis capabilities for satellite-to-ground station communications within the KeepTrack platform. This plugin will enable users to analyze uplink and downlink performance, predict signal strength, calculate data rates, and determine total data volume during ground station passes.

## Requirements

### Core Features

1. **RF Link Analysis**
   - Uplink budget (ground station → satellite)
   - Downlink budget (satellite → ground station)
   - Free space path loss (FSPL) calculations
   - Link margin analysis
   - Signal-to-noise ratio (SNR/C/N0)

2. **Data Rate Calculations**
   - Range-dependent data rate predictions
   - Shannon capacity calculations
   - Modulation-specific throughput
   - Coding gain considerations

3. **Ground Station Communication Windows**
   - Pass prediction integration
   - Elevation-based visibility windows
   - Above-horizon timing
   - Maximum elevation and optimal communication periods

4. **Antenna Gain Patterns**
   - Ground station antenna gain modeling
   - Satellite antenna gain patterns
   - Pointing loss calculations
   - Beamwidth considerations

5. **Signal Strength Predictions**
   - Received power calculations
   - EIRP (Effective Isotropic Radiated Power)
   - G/T (receiver figure of merit)
   - Noise temperature considerations

6. **Total Data Volume Per Pass**
   - Integration of data rate over pass duration
   - Time-varying link quality assessment
   - Cumulative data transfer predictions
   - Contact windows optimization

## Technical Design

### Plugin Architecture

**Location:** `/src/plugins/link-budget/`

**Files:**
- `link-budget.ts` - Main plugin class
- `link-budget-math.ts` - RF calculations and link budget equations
- `link-budget.css` - Styling (optional)

### Plugin Class Structure

```typescript
class LinkBudgetPlugin extends KeepTrackPlugin {
  // Plugin Metadata
  id = 'linkBudget';
  dependencies_ = ['sensor'];
  menuMode = [MenuMode.ANALYSIS, MenuMode.ADVANCED];

  // UI Properties
  bottomIconImg = 'link-budget-icon.png';
  bottomIconLabel = 'Link Budget';
  sideMenuElementName = 'link-budget-menu';
  dragOptions = { isDraggable: true };

  // Core Methods
  init(): void;
  calculateLinkBudget(): LinkBudgetResult;
  calculatePassAnalysis(): PassAnalysis;
  exportResults(): void;
}
```

### Link Budget Mathematics

#### 1. Free Space Path Loss (FSPL)

```
FSPL (dB) = 20 log₁₀(d) + 20 log₁₀(f) + 20 log₁₀(4π/c)
          = 20 log₁₀(d) + 20 log₁₀(f) + 92.45

Where:
- d = distance (km)
- f = frequency (MHz)
- c = speed of light
```

#### 2. Link Budget Equation

**Downlink (Satellite → Ground Station):**
```
Pr = EIRP + Gr - FSPL - La

Where:
- Pr = Received Power (dBm)
- EIRP = Equivalent Isotropic Radiated Power (dBm)
- Gr = Receiver antenna gain (dBi)
- FSPL = Free Space Path Loss (dB)
- La = Atmospheric/misc losses (dB)
```

**EIRP Calculation:**
```
EIRP = Pt + Gt - Lt

Where:
- Pt = Transmitter power (dBm)
- Gt = Transmit antenna gain (dBi)
- Lt = Transmit line losses (dB)
```

#### 3. Carrier-to-Noise Ratio

```
C/N0 = EIRP + Gr - FSPL - k - Ts

Where:
- C/N0 = Carrier-to-noise density ratio (dB-Hz)
- k = Boltzmann's constant = -228.6 dB(W/K/Hz)
- Ts = System noise temperature (dBK)
```

**G/T (Figure of Merit):**
```
G/T = Gr - 10 log₁₀(Ts)
```

#### 4. Data Rate Calculations

**Shannon Capacity:**
```
C = B × log₂(1 + SNR)

Where:
- C = Channel capacity (bits/sec)
- B = Bandwidth (Hz)
- SNR = Signal-to-noise ratio (linear)
```

**Practical Data Rate:**
```
Data Rate = (C/N0 - Eb/N0_required) × 10^(x/10)

Where:
- Eb/N0_required = Required energy per bit for modulation/coding
```

#### 5. Link Margin

```
Link Margin = C/N0_actual - C/N0_required
```

### Data Structures

#### LinkBudgetParams

```typescript
interface LinkBudgetParams {
  // Satellite Parameters
  satTxPower: number;        // Watts
  satTxGain: number;         // dBi
  satRxGain: number;         // dBi
  satFreqDown: number;       // MHz
  satFreqUp: number;         // MHz
  satAntennaBw: number;      // Degrees

  // Ground Station Parameters
  gsTxPower: number;         // Watts
  gsTxGain: number;          // dBi
  gsRxGain: number;          // dBi
  gsSystemTemp: number;      // Kelvin
  gsNoiseFigure: number;     // dB

  // Link Parameters
  bandwidth: number;         // Hz
  dataRate: number;          // bps
  ebNoRequired: number;      // dB
  modulationType: string;    // BPSK, QPSK, etc.
  codingGain: number;        // dB

  // Losses
  atmosphericLoss: number;   // dB
  rainFade: number;          // dB
  polarizationLoss: number;  // dB
  pointingLoss: number;      // dB
  miscLoss: number;          // dB
}
```

#### LinkBudgetResult

```typescript
interface LinkBudgetResult {
  uplink: {
    eirp: number;            // dBm
    fspl: number;            // dB
    receivedPower: number;   // dBm
    cno: number;             // dB-Hz
    linkMargin: number;      // dB
  };
  downlink: {
    eirp: number;            // dBm
    fspl: number;            // dB
    receivedPower: number;   // dBm
    cno: number;             // dB-Hz
    linkMargin: number;      // dB
    dataRate: number;        // Mbps
  };
  geometry: {
    range: number;           // km
    elevation: number;       // degrees
    azimuth: number;         // degrees
    dopplerShift: number;    // Hz
  };
}
```

#### PassAnalysis

```typescript
interface PassAnalysis {
  passNumber: number;
  startTime: Date;
  endTime: Date;
  duration: number;              // seconds
  maxElevation: number;          // degrees
  timeOfMaxElevation: Date;

  // Link quality over time
  linkQualityProfile: {
    time: Date;
    elevation: number;
    range: number;
    dataRate: number;
    linkMargin: number;
  }[];

  // Summary statistics
  avgDataRate: number;           // Mbps
  maxDataRate: number;           // Mbps
  totalDataVolume: number;       // MB
  contactEfficiency: number;     // %
}
```

### UI Design

#### Side Menu Layout

```
┌─────────────────────────────────────┐
│     Communication Link Budget       │
├─────────────────────────────────────┤
│ Selected Satellite: [Name]          │
│ Selected Sensor: [Name]             │
├─────────────────────────────────────┤
│ LINK PARAMETERS                     │
│ ┌─────────────────────────────────┐ │
│ │ Frequency Band: [UHF  ▼]        │ │
│ │ Downlink Freq (MHz): [2200.0]   │ │
│ │ Uplink Freq (MHz): [2025.0]     │ │
│ │ Data Rate (Mbps): [10.0]        │ │
│ │ Modulation: [QPSK ▼]            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Calculate Link Budget ▶]          │
│ [Analyze Full Pass ▶]              │
├─────────────────────────────────────┤
│ CURRENT LINK STATUS                 │
│ ┌─────────────────────────────────┐ │
│ │ Range: 1,234 km                 │ │
│ │ Elevation: 45.2°                │ │
│ │ Azimuth: 123.4°                 │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ DOWNLINK BUDGET                     │
│ ┌─────────────────────────────────┐ │
│ │ EIRP:           42.0 dBm        │ │
│ │ Path Loss:     -165.3 dB        │ │
│ │ Rx Antenna:     35.0 dBi        │ │
│ │ Losses:         -2.5 dB         │ │
│ │ ───────────────────────         │ │
│ │ Rx Power:      -90.8 dBm        │ │
│ │ G/T:            12.5 dB/K       │ │
│ │ C/N0:           75.2 dB-Hz      │ │
│ │ Link Margin:    8.5 dB   ✓      │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ UPLINK BUDGET                       │
│ ┌─────────────────────────────────┐ │
│ │ EIRP:           65.0 dBm        │ │
│ │ Path Loss:     -163.8 dB        │ │
│ │ Rx Antenna:     12.0 dBi        │ │
│ │ Losses:         -3.0 dB         │ │
│ │ ───────────────────────         │ │
│ │ Rx Power:      -89.8 dBm        │ │
│ │ C/N0:           72.1 dB-Hz      │ │
│ │ Link Margin:    5.2 dB   ✓      │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ PASS ANALYSIS                       │
│ ┌─────────────────────────────────┐ │
│ │ Next Pass: 2025-11-16 14:23 UTC │ │
│ │ Duration: 8m 32s                │ │
│ │ Max Elevation: 67.3°            │ │
│ │ Avg Data Rate: 8.2 Mbps         │ │
│ │ Total Data: 419 MB              │ │
│ │ Contact Quality: Excellent      │ │
│ │                                 │ │
│ │ [View Full Pass Chart]          │ │
│ │ [Export Pass Data CSV]          │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### Secondary Menu (Settings)

```
┌─────────────────────────────────────┐
│     Link Budget Settings            │
├─────────────────────────────────────┤
│ DEFAULT SATELLITE PARAMETERS        │
│ ┌─────────────────────────────────┐ │
│ │ Tx Power (W): [5.0]             │ │
│ │ Tx Gain (dBi): [3.0]            │ │
│ │ Rx Gain (dBi): [2.0]            │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ATMOSPHERIC CONDITIONS              │
│ ┌─────────────────────────────────┐ │
│ │ Atmospheric Loss (dB): [0.5]    │ │
│ │ Rain Fade (dB): [0.0]           │ │
│ │ Polarization Loss (dB): [0.5]   │ │
│ │ Pointing Loss (dB): [0.5]       │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ CALCULATION OPTIONS                 │
│ ┌─────────────────────────────────┐ │
│ │ ☑ Auto-update on time change    │ │
│ │ ☑ Show intermediate calculations│ │
│ │ ☑ Highlight margin warnings     │ │
│ │ Min Elevation (°): [10.0]       │ │
│ │ Update Interval (s): [1.0]      │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ FREQUENCY PRESETS                   │
│ ┌─────────────────────────────────┐ │
│ │ [UHF] [L-Band] [S-Band]         │ │
│ │ [X-Band] [Ku-Band] [Custom]     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Integration Points

#### Required Dependencies

1. **SensorPlugin** - For ground station selection and parameters
2. **OOTK Library** - For orbital mechanics and geometry calculations
3. **Time Manager** - For propagation and pass predictions

#### Data Sources

1. **Satellite Selection:**
   - Current selected satellite from `SelectSatManager`
   - Satellite orbital elements (TLE)
   - Satellite position/velocity via SGP4

2. **Ground Station Selection:**
   - Current sensor from `SensorManager`
   - Sensor location (lat/lon/alt)
   - Sensor RF capabilities (frequency, power, gain)

3. **Orbital Geometry:**
   - Range calculation via `eci2rae()`
   - Azimuth/Elevation via `rae()`
   - Doppler shift calculations

#### Event Handling

```typescript
// Listen for satellite selection changes
EventBus.getInstance().on(EventBusEvent.selectSatData, (sat) => {
  this.updateCalculations(sat);
});

// Listen for sensor changes
EventBus.getInstance().on(EventBusEvent.sensorChange, (sensor) => {
  this.updateCalculations(null, sensor);
});

// Listen for time updates
EventBus.getInstance().on(EventBusEvent.timeManagerTick, (time) => {
  if (this.isAutoUpdate) {
    this.updateRealtimeLink();
  }
});
```

### Calculation Workflow

#### Real-Time Link Analysis

```typescript
calculateCurrentLink(sat: DetailedSatellite, sensor: DetailedSensor): LinkBudgetResult {
  // 1. Get current orbital position
  const eci = sat.getEci(currentTime);

  // 2. Calculate range, azimuth, elevation
  const rae = eci2rae(currentTime, eci, sensor);

  // 3. Check if satellite is visible
  if (rae.el < sensor.minEl) {
    return null; // Below horizon
  }

  // 4. Calculate downlink budget
  const downlink = {
    eirp: calculateEIRP(params.satTxPower, params.satTxGain),
    fspl: calculateFSPL(rae.rng, params.satFreqDown),
    losses: calculateTotalLosses(rae.el),
    receivedPower: calculateRxPower(...),
    cno: calculateCNo(...),
    linkMargin: calculateMargin(...)
  };

  // 5. Calculate uplink budget
  const uplink = {...};

  // 6. Calculate data rate based on link quality
  const dataRate = calculateDataRate(downlink.cno, params);

  return { uplink, downlink, geometry: rae, dataRate };
}
```

#### Pass Analysis

```typescript
analyzeFullPass(sat: DetailedSatellite, sensor: DetailedSensor): PassAnalysis {
  // 1. Find next pass window
  const pass = findNextPass(sat, sensor, {
    minEl: params.minElevation,
    maxPasses: 1
  });

  // 2. Sample link quality throughout pass
  const samples = [];
  const dt = 10; // seconds

  for (let t = pass.start; t < pass.end; t += dt) {
    const link = calculateCurrentLink(sat, sensor, t);
    samples.push({
      time: t,
      elevation: link.geometry.el,
      range: link.geometry.rng,
      dataRate: link.downlink.dataRate,
      linkMargin: link.downlink.linkMargin
    });
  }

  // 3. Integrate data rate over time
  const totalDataVolume = samples.reduce((sum, s, i) => {
    if (i === 0) return 0;
    const dt = samples[i].time - samples[i-1].time;
    const avgRate = (samples[i].dataRate + samples[i-1].dataRate) / 2;
    return sum + (avgRate * dt);
  }, 0);

  // 4. Calculate statistics
  return {
    passNumber: 1,
    startTime: pass.start,
    endTime: pass.end,
    duration: pass.end - pass.start,
    maxElevation: Math.max(...samples.map(s => s.elevation)),
    linkQualityProfile: samples,
    avgDataRate: samples.reduce((s, v) => s + v.dataRate, 0) / samples.length,
    maxDataRate: Math.max(...samples.map(s => s.dataRate)),
    totalDataVolume: totalDataVolume,
    contactEfficiency: calculateEfficiency(samples)
  };
}
```

### Frequency Band Presets

```typescript
const FREQUENCY_PRESETS = {
  VHF: { uplink: 148, downlink: 137 },      // MHz
  UHF: { uplink: 435, downlink: 401 },
  L_BAND: { uplink: 1626, downlink: 1525 },
  S_BAND: { uplink: 2200, downlink: 2025 },
  X_BAND: { uplink: 7900, downlink: 8400 },
  KU_BAND: { uplink: 14000, downlink: 12000 },
  KA_BAND: { uplink: 30000, downlink: 20000 }
};
```

### Export Functionality

#### CSV Export Format

```csv
Time (UTC),Range (km),Elevation (deg),Azimuth (deg),EIRP (dBm),FSPL (dB),Rx Power (dBm),C/N0 (dB-Hz),Link Margin (dB),Data Rate (Mbps)
2025-11-16 14:23:00,1234.5,10.2,123.4,42.0,-165.3,-90.8,75.2,8.5,10.2
2025-11-16 14:23:10,1198.2,15.8,125.1,42.0,-164.8,-90.3,75.7,9.0,10.5
...
```

## Implementation Phases

### Phase 1: Core Plugin Structure (Week 1)
- [ ] Create plugin skeleton extending KeepTrackPlugin
- [ ] Implement basic UI (side menu with forms)
- [ ] Set up event handlers for satellite/sensor selection
- [ ] Add plugin to registration system

### Phase 2: Link Budget Mathematics (Week 1-2)
- [ ] Implement `link-budget-math.ts` module
- [ ] FSPL calculations
- [ ] EIRP and received power calculations
- [ ] C/N0 and link margin calculations
- [ ] Data rate calculations (Shannon, practical)
- [ ] Unit tests for all math functions

### Phase 3: Real-Time Link Analysis (Week 2)
- [ ] Integrate with orbital propagation (OOTK)
- [ ] Calculate current link status
- [ ] Display uplink/downlink budgets
- [ ] Auto-update on time changes
- [ ] Visual indicators for link margin (good/warning/fail)

### Phase 4: Antenna Gain Patterns (Week 3)
- [ ] Implement antenna gain models
- [ ] Pointing loss calculations
- [ ] Beamwidth considerations
- [ ] Satellite antenna orientation tracking
- [ ] Off-axis gain calculations

### Phase 5: Pass Analysis (Week 3-4)
- [ ] Pass prediction integration
- [ ] Sample link quality throughout pass
- [ ] Data volume integration
- [ ] Pass statistics calculations
- [ ] Multi-pass analysis

### Phase 6: Visualization & Export (Week 4)
- [ ] Pass quality chart/graph
- [ ] Link budget breakdown visualization
- [ ] CSV export for pass data
- [ ] PDF report generation (optional)
- [ ] Copy results to clipboard

### Phase 7: Advanced Features (Week 5)
- [ ] Doppler shift calculations
- [ ] Rain fade modeling
- [ ] Ionospheric effects
- [ ] Multiple modulation schemes
- [ ] Adaptive coding/modulation
- [ ] Comparison mode (multiple satellites)

### Phase 8: Testing & Documentation (Week 5-6)
- [ ] Unit tests for all components
- [ ] Integration tests
- [ ] User documentation
- [ ] Example scenarios
- [ ] Performance optimization

## Testing Strategy

### Unit Tests

```typescript
describe('LinkBudgetMath', () => {
  it('should calculate FSPL correctly', () => {
    const fspl = calculateFSPL(1000, 2200); // 1000 km, 2200 MHz
    expect(fspl).toBeCloseTo(165.3, 1);
  });

  it('should calculate EIRP correctly', () => {
    const eirp = calculateEIRP(5, 3); // 5W, 3dBi
    expect(eirp).toBeCloseTo(10, 1); // dBm
  });

  it('should calculate link margin', () => {
    const margin = calculateLinkMargin(75.2, 66.7);
    expect(margin).toBeCloseTo(8.5, 1);
  });
});
```

### Integration Tests

1. **Satellite-Sensor Selection:**
   - Verify plugin activates only when both selected
   - Test sensor change updates calculations
   - Test satellite change updates calculations

2. **Real-Time Updates:**
   - Verify calculations update with time
   - Test auto-update toggle
   - Verify performance with rapid updates

3. **Pass Analysis:**
   - Test complete pass calculation
   - Verify data volume integration
   - Test export functionality

### Validation Data

Use known satellite links for validation:
- ISS ARISS (Amateur Radio on ISS)
- NOAA Weather Satellites
- Amateur radio satellites (SO-50, AO-91)
- Compare with STK, GMAT, or other tools

## Dependencies

### NPM Packages (Already Available)
- `@ootk/core` - Orbital mechanics
- Existing KeepTrack infrastructure

### New Dependencies (if needed)
- None required - all functionality can be built with existing libraries

## Performance Considerations

1. **Calculation Frequency:**
   - Limit real-time updates to 1 Hz (configurable)
   - Cache results for current satellite/sensor pair
   - Debounce parameter changes

2. **Pass Analysis:**
   - Sample at reasonable intervals (10-30 seconds)
   - Provide progress indicator for long passes
   - Option to cancel long-running calculations

3. **Memory:**
   - Limit stored pass data points
   - Clear old results when new calculations start
   - Efficient data structures for time series

## Future Enhancements

1. **Multi-Satellite Analysis:**
   - Compare multiple satellites for optimal selection
   - Constellation analysis (e.g., Starlink coverage)

2. **Weather Integration:**
   - Real-time weather data for rain fade
   - Cloud cover effects
   - Atmospheric attenuation models

3. **Optimization:**
   - Find optimal contact windows
   - Suggest frequency changes for best performance
   - Adaptive modulation recommendations

4. **Advanced Antenna Models:**
   - Custom antenna pattern upload
   - Phased array beam steering
   - Multi-beam analysis

5. **Machine Learning:**
   - Predict link quality based on historical data
   - Anomaly detection
   - Performance forecasting

## Success Metrics

1. **Accuracy:**
   - Link budget calculations within ±1 dB of reference tools
   - Pass predictions within ±10 seconds

2. **Performance:**
   - Real-time updates at 1 Hz with <10ms latency
   - Pass analysis completion in <5 seconds

3. **Usability:**
   - Intuitive UI requiring minimal training
   - Clear visualization of link status
   - Comprehensive export capabilities

## Conclusion

The Communication Link Budget Plugin will provide comprehensive RF analysis capabilities seamlessly integrated into KeepTrack's satellite tracking platform. By leveraging existing orbital mechanics infrastructure and adding sophisticated link budget calculations, users will gain deep insights into satellite communication performance, enabling better mission planning and real-time link monitoring.

The phased implementation approach ensures core functionality is delivered early while allowing for iterative enhancement based on user feedback. The plugin's architecture follows KeepTrack's established patterns, ensuring maintainability and consistency with the broader platform.
