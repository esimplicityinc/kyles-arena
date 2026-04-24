// RF Calculation Engine - Real engineering math
// These are the actual formulas used in spectrum analysis

import type { 
  Transmitter, 
  Receiver, 
  PropagationParams, 
  LinkAnalysisResult,
  InterferenceAnalysisResult,
  CalculationStep 
} from "../types/rfSystems";

// Physical constants
const BOLTZMANN_K = 1.38e-23; // J/K
const REFERENCE_TEMP = 290; // K (standard temperature)

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate bearing between two points
 */
export function calculateBearing(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Free Space Path Loss (ITU-R P.525)
 * FSPL = 20*log10(d) + 20*log10(f) + 32.45
 * where d is in km and f is in MHz
 */
export function calculateFSPL(distance_km: number, frequency_MHz: number): number {
  if (distance_km <= 0) return 0;
  return 20 * Math.log10(distance_km) + 20 * Math.log10(frequency_MHz) + 32.45;
}

/**
 * Okumura-Hata Model (150-1500 MHz)
 */
export function calculateHataLoss(
  distance_km: number,
  frequency_MHz: number,
  txHeight_m: number,
  rxHeight_m: number,
  environment: "urban" | "suburban" | "rural"
): number {
  const f = frequency_MHz;
  const hb = txHeight_m;
  const hm = rxHeight_m;
  const d = distance_km;
  
  // Mobile antenna height correction factor (small/medium city)
  const ahm = (1.1 * Math.log10(f) - 0.7) * hm - (1.56 * Math.log10(f) - 0.8);
  
  // Basic median path loss for urban areas
  let Lu = 69.55 + 26.16 * Math.log10(f) - 13.82 * Math.log10(hb) 
           - ahm + (44.9 - 6.55 * Math.log10(hb)) * Math.log10(d);
  
  if (environment === "suburban") {
    return Lu - 2 * Math.pow(Math.log10(f / 28), 2) - 5.4;
  } else if (environment === "rural") {
    return Lu - 4.78 * Math.pow(Math.log10(f), 2) + 18.33 * Math.log10(f) - 40.94;
  }
  
  return Lu;
}

/**
 * COST-231 Hata Model (1500-2000 MHz extension)
 */
export function calculateCOST231Loss(
  distance_km: number,
  frequency_MHz: number,
  txHeight_m: number,
  rxHeight_m: number,
  environment: "urban" | "suburban" | "rural"
): number {
  const f = frequency_MHz;
  const hb = txHeight_m;
  const hm = rxHeight_m;
  const d = distance_km;
  
  const ahm = (1.1 * Math.log10(f) - 0.7) * hm - (1.56 * Math.log10(f) - 0.8);
  const Cm = environment === "urban" ? 3 : 0; // metropolitan center correction
  
  return 46.3 + 33.9 * Math.log10(f) - 13.82 * Math.log10(hb) 
         - ahm + (44.9 - 6.55 * Math.log10(hb)) * Math.log10(d) + Cm;
}

/**
 * Calculate path loss using selected model
 */
export function calculatePathLoss(
  distance_km: number,
  frequency_MHz: number,
  txHeight_m: number,
  rxHeight_m: number,
  params: PropagationParams
): { pathLoss: number; steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  let baseLoss: number;
  
  // Calculate base propagation loss
  if (params.model === "fspl" || params.model === "itu-r_p.525") {
    baseLoss = calculateFSPL(distance_km, frequency_MHz);
    steps.push({
      label: "Free Space Path Loss",
      formula: "FSPL = 20·log₁₀(d) + 20·log₁₀(f) + 32.45",
      inputs: [
        { name: "d", value: distance_km, unit: "km" },
        { name: "f", value: frequency_MHz, unit: "MHz" }
      ],
      result: baseLoss,
      unit: "dB"
    });
  } else if (params.model === "hata") {
    // Map "open" to "rural" for Hata model
    const hataEnv = params.environment === "open" ? "rural" : params.environment;
    baseLoss = calculateHataLoss(distance_km, frequency_MHz, txHeight_m, rxHeight_m, hataEnv);
    steps.push({
      label: "Okumura-Hata Path Loss",
      formula: "L = 69.55 + 26.16·log(f) - 13.82·log(hb) - a(hm) + [44.9-6.55·log(hb)]·log(d)",
      inputs: [
        { name: "f", value: frequency_MHz, unit: "MHz" },
        { name: "hb", value: txHeight_m, unit: "m" },
        { name: "hm", value: rxHeight_m, unit: "m" },
        { name: "d", value: distance_km, unit: "km" }
      ],
      result: baseLoss,
      unit: "dB"
    });
  } else {
    // Map "open" to "rural" for COST-231 model
    const cost231Env = params.environment === "open" ? "rural" : params.environment;
    baseLoss = calculateCOST231Loss(distance_km, frequency_MHz, txHeight_m, rxHeight_m, cost231Env);
    steps.push({
      label: "COST-231 Hata Path Loss",
      formula: "L = 46.3 + 33.9·log(f) - 13.82·log(hb) - a(hm) + [44.9-6.55·log(hb)]·log(d) + Cm",
      inputs: [
        { name: "f", value: frequency_MHz, unit: "MHz" },
        { name: "hb", value: txHeight_m, unit: "m" },
        { name: "hm", value: rxHeight_m, unit: "m" },
        { name: "d", value: distance_km, unit: "km" }
      ],
      result: baseLoss,
      unit: "dB"
    });
  }
  
  // Add atmospheric loss
  const atmosphericLoss = params.atmospheric_loss_dB_per_km * distance_km;
  if (atmosphericLoss > 0) {
    steps.push({
      label: "Atmospheric Attenuation",
      formula: "La = α · d",
      inputs: [
        { name: "α", value: params.atmospheric_loss_dB_per_km, unit: "dB/km" },
        { name: "d", value: distance_km, unit: "km" }
      ],
      result: atmosphericLoss,
      unit: "dB"
    });
  }
  
  // Add clutter loss
  if (params.clutter_loss_dB > 0) {
    steps.push({
      label: "Clutter Loss",
      formula: "Lc (environment-based)",
      inputs: [
        { name: "environment", value: 0, unit: params.environment }
      ],
      result: params.clutter_loss_dB,
      unit: "dB"
    });
  }
  
  const totalLoss = baseLoss + atmosphericLoss + params.clutter_loss_dB + params.rain_attenuation_dB;
  
  steps.push({
    label: "Total Path Loss",
    formula: "Lp = FSPL + La + Lc + Lr",
    inputs: [
      { name: "Base Loss", value: baseLoss, unit: "dB" },
      { name: "Atmospheric", value: atmosphericLoss, unit: "dB" },
      { name: "Clutter", value: params.clutter_loss_dB, unit: "dB" },
      { name: "Rain", value: params.rain_attenuation_dB, unit: "dB" }
    ],
    result: totalLoss,
    unit: "dB"
  });
  
  return { pathLoss: totalLoss, steps };
}

/**
 * Calculate antenna discrimination (off-axis loss)
 * Using ITU-R F.699 reference pattern approximation
 */
export function calculateAntennaDiscrimination(
  offAxisAngle: number,
  beamwidth: number,
  peakGain: number,
  sidelobeLevel: number
): number {
  const ratio = offAxisAngle / (beamwidth / 2);
  
  if (ratio <= 1) {
    // Main beam: 12*(θ/θ₃dB)² approximation
    return Math.min(12 * ratio * ratio, 3);
  } else if (ratio <= 2.5) {
    // First sidelobe region
    return Math.min(12 * ratio * ratio, sidelobeLevel);
  } else {
    // Far sidelobe region
    return Math.min(peakGain - 10, sidelobeLevel + 10);
  }
}

/**
 * Calculate thermal noise floor
 * N = kTB (in dBm)
 */
export function calculateNoiseFloor(bandwidth_MHz: number, noiseFigure_dB: number): number {
  const bandwidth_Hz = bandwidth_MHz * 1e6;
  const thermalNoise_W = BOLTZMANN_K * REFERENCE_TEMP * bandwidth_Hz;
  const thermalNoise_dBm = 10 * Math.log10(thermalNoise_W * 1000);
  return thermalNoise_dBm + noiseFigure_dB;
}

/**
 * Full link budget analysis between Tx and Rx
 */
export function calculateLinkBudget(
  tx: Transmitter,
  rx: Receiver,
  propagation: PropagationParams
): { result: LinkAnalysisResult; steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  
  // Distance calculation
  const distance = calculateDistance(tx.latitude, tx.longitude, rx.latitude, rx.longitude);
  steps.push({
    label: "Distance",
    formula: "Haversine formula",
    inputs: [
      { name: "Tx Lat", value: tx.latitude, unit: "°" },
      { name: "Tx Lon", value: tx.longitude, unit: "°" },
      { name: "Rx Lat", value: rx.latitude, unit: "°" },
      { name: "Rx Lon", value: rx.longitude, unit: "°" }
    ],
    result: distance,
    unit: "km"
  });
  
  // EIRP calculation
  const txLineLoss = 2; // Assume 2 dB line loss
  const eirp = tx.power_dBm + tx.antenna.gain_dBi - txLineLoss;
  steps.push({
    label: "EIRP",
    formula: "EIRP = Pt + Gt - Lt",
    inputs: [
      { name: "Pt", value: tx.power_dBm, unit: "dBm" },
      { name: "Gt", value: tx.antenna.gain_dBi, unit: "dBi" },
      { name: "Lt", value: txLineLoss, unit: "dB" }
    ],
    result: eirp,
    unit: "dBm"
  });
  
  // Path loss
  const { pathLoss, steps: pathSteps } = calculatePathLoss(
    distance, tx.frequency_MHz, tx.height_m, rx.height_m, propagation
  );
  steps.push(...pathSteps);
  
  // Rx antenna pointing
  const bearing = calculateBearing(rx.latitude, rx.longitude, tx.latitude, tx.longitude);
  const offAxisAngle = Math.abs(bearing - rx.antenna.azimuth_deg);
  const normalizedOffAxis = offAxisAngle > 180 ? 360 - offAxisAngle : offAxisAngle;
  const rxDiscrimination = calculateAntennaDiscrimination(
    normalizedOffAxis, rx.antenna.beamwidth_deg, rx.antenna.gain_dBi, rx.antenna.sidelobe_dB
  );
  
  steps.push({
    label: "Rx Antenna Discrimination",
    formula: "Off-axis loss based on ITU-R F.699",
    inputs: [
      { name: "Bearing to Tx", value: bearing, unit: "°" },
      { name: "Rx Pointing", value: rx.antenna.azimuth_deg, unit: "°" },
      { name: "Off-axis", value: normalizedOffAxis, unit: "°" }
    ],
    result: rxDiscrimination,
    unit: "dB"
  });
  
  // Received power
  const rxLineLoss = 1.5; // Assume 1.5 dB line loss
  const polarizationLoss = 0.5; // Assume small mismatch
  const effectiveRxGain = rx.antenna.gain_dBi - rxDiscrimination;
  const receivedPower = eirp - pathLoss + effectiveRxGain - rxLineLoss - polarizationLoss;
  
  steps.push({
    label: "Received Power",
    formula: "Pr = EIRP - Lp + Gr - Dr - Lr - Lpol",
    inputs: [
      { name: "EIRP", value: eirp, unit: "dBm" },
      { name: "Path Loss", value: pathLoss, unit: "dB" },
      { name: "Rx Gain", value: rx.antenna.gain_dBi, unit: "dBi" },
      { name: "Discrimination", value: rxDiscrimination, unit: "dB" },
      { name: "Rx Line Loss", value: rxLineLoss, unit: "dB" },
      { name: "Pol. Loss", value: polarizationLoss, unit: "dB" }
    ],
    result: receivedPower,
    unit: "dBm"
  });
  
  // Noise floor
  const noiseFloor = calculateNoiseFloor(rx.bandwidth_MHz, rx.noise_figure_dB);
  steps.push({
    label: "Noise Floor",
    formula: "N = kTB + NF = -174 + 10·log(B) + NF",
    inputs: [
      { name: "Bandwidth", value: rx.bandwidth_MHz, unit: "MHz" },
      { name: "Noise Figure", value: rx.noise_figure_dB, unit: "dB" }
    ],
    result: noiseFloor,
    unit: "dBm"
  });
  
  // SNR and Link Margin
  const snr = receivedPower - noiseFloor;
  const linkMargin = receivedPower - rx.threshold_dBm;
  
  steps.push({
    label: "Signal-to-Noise Ratio",
    formula: "SNR = Pr - N",
    inputs: [
      { name: "Pr", value: receivedPower, unit: "dBm" },
      { name: "N", value: noiseFloor, unit: "dBm" }
    ],
    result: snr,
    unit: "dB"
  });
  
  steps.push({
    label: "Link Margin",
    formula: "Margin = Pr - Threshold",
    inputs: [
      { name: "Pr", value: receivedPower, unit: "dBm" },
      { name: "Threshold", value: rx.threshold_dBm, unit: "dBm" }
    ],
    result: linkMargin,
    unit: "dB"
  });
  
  return {
    result: {
      transmitter_id: tx.id,
      receiver_id: rx.id,
      tx_power_dBm: tx.power_dBm,
      tx_antenna_gain_dBi: tx.antenna.gain_dBi,
      tx_line_loss_dB: txLineLoss,
      eirp_dBm: eirp,
      distance_km: distance,
      free_space_loss_dB: calculateFSPL(distance, tx.frequency_MHz),
      atmospheric_loss_dB: propagation.atmospheric_loss_dB_per_km * distance,
      clutter_loss_dB: propagation.clutter_loss_dB,
      total_path_loss_dB: pathLoss,
      rx_antenna_gain_dBi: rx.antenna.gain_dBi,
      rx_antenna_discrimination_dB: rxDiscrimination,
      polarization_loss_dB: polarizationLoss,
      rx_line_loss_dB: rxLineLoss,
      received_power_dBm: receivedPower,
      noise_floor_dBm: noiseFloor,
      snr_dB: snr,
      link_margin_dB: linkMargin
    },
    steps
  };
}

/**
 * Calculate I/N analysis for a victim receiver against multiple interferers
 */
export function calculateInterferenceAnalysis(
  victim: Receiver,
  desiredTx: Transmitter | null,
  interferers: Transmitter[],
  propagation: PropagationParams
): InterferenceAnalysisResult {
  const noiseFloor = calculateNoiseFloor(victim.bandwidth_MHz, victim.noise_figure_dB);
  
  // Calculate desired signal if present
  let desiredSignal = -999;
  if (desiredTx) {
    const { result } = calculateLinkBudget(desiredTx, victim, propagation);
    desiredSignal = result.received_power_dBm;
  }
  
  // Calculate interference from each source
  const interfererResults = interferers.map(interferer => {
    const { result } = calculateLinkBudget(interferer, victim, propagation);
    
    // Calculate frequency offset and OOB rejection
    const freqOffset = Math.abs(interferer.frequency_MHz - victim.frequency_MHz);
    let oobRejection = 0;
    
    // Simple OOB model: 20 dB/decade rolloff outside receiver bandwidth
    if (freqOffset > victim.bandwidth_MHz / 2) {
      oobRejection = Math.min(60, 20 * Math.log10(freqOffset / (victim.bandwidth_MHz / 2)));
    }
    
    const effectiveInterference = result.received_power_dBm - oobRejection;
    
    return {
      interferer_id: interferer.id,
      interferer_name: interferer.name,
      interference_power_dBm: effectiveInterference,
      frequency_offset_MHz: freqOffset,
      tx_eirp_dBm: result.eirp_dBm,
      path_loss_dB: result.total_path_loss_dB,
      rx_antenna_discrimination_dB: result.rx_antenna_discrimination_dB,
      oob_rejection_dB: oobRejection
    };
  });
  
  // Sum interference power (linear addition)
  const totalInterferencePower_mW = interfererResults.reduce((sum, i) => {
    return sum + Math.pow(10, i.interference_power_dBm / 10);
  }, 0);
  const totalInterference = 10 * Math.log10(totalInterferencePower_mW);
  
  // Calculate metrics
  const i_over_n = totalInterference - noiseFloor;
  const c_over_i = desiredSignal - totalInterference;
  
  // C/(I+N) calculation
  const noisePower_mW = Math.pow(10, noiseFloor / 10);
  const totalIPlusN_mW = totalInterferencePower_mW + noisePower_mW;
  const totalIPlusN = 10 * Math.log10(totalIPlusN_mW);
  const c_over_iplusn = desiredSignal - totalIPlusN;
  
  // Determine status
  const margin = victim.in_protection_dB - i_over_n;
  let status: "compliant" | "marginal" | "exceeded";
  if (margin > 3) {
    status = "compliant";
  } else if (margin > 0) {
    status = "marginal";
  } else {
    status = "exceeded";
  }
  
  return {
    victim_id: victim.id,
    victim_name: victim.name,
    desired_signal_dBm: desiredSignal,
    interferers: interfererResults,
    total_interference_dBm: totalInterference,
    noise_floor_dBm: noiseFloor,
    i_over_n_dB: i_over_n,
    c_over_i_dB: c_over_i,
    c_over_iplusn_dB: c_over_iplusn,
    protection_criterion_dB: victim.in_protection_dB,
    margin_dB: margin,
    status
  };
}
