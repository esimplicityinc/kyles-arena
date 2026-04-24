// RF System Types - Real engineering parameters

export interface AntennaPattern {
  type: "omni" | "directional" | "parabolic";
  gain_dBi: number;
  beamwidth_deg: number;  // 3dB beamwidth
  azimuth_deg: number;    // pointing direction
  elevation_deg: number;  // tilt
  sidelobe_dB: number;    // sidelobe level below peak
}

export interface Transmitter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  height_m: number;
  frequency_MHz: number;
  bandwidth_MHz: number;
  power_dBm: number;
  antenna: AntennaPattern;
  emission_designator?: string;
  system_type: "fixed" | "mobile" | "satellite" | "radar";
}

export interface Receiver {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  height_m: number;
  frequency_MHz: number;
  bandwidth_MHz: number;
  antenna: AntennaPattern;
  noise_figure_dB: number;
  threshold_dBm: number;  // minimum signal for demod
  system_type: "fixed" | "mobile" | "satellite" | "radar";
  // I/N protection criterion
  in_protection_dB: number;  // typically -6 to -10 dB
}

export interface PropagationParams {
  model: "fspl" | "hata" | "cost231" | "itu-r_p.525" | "itu-r_p.452";
  environment: "urban" | "suburban" | "rural" | "open";
  atmospheric_loss_dB_per_km: number;
  rain_attenuation_dB: number;
  clutter_loss_dB: number;
}

export interface LinkAnalysisResult {
  transmitter_id: string;
  receiver_id: string;
  
  // Intermediate values (what AnhThu asked for)
  tx_power_dBm: number;
  tx_antenna_gain_dBi: number;
  tx_line_loss_dB: number;
  eirp_dBm: number;
  
  distance_km: number;
  free_space_loss_dB: number;
  atmospheric_loss_dB: number;
  clutter_loss_dB: number;
  total_path_loss_dB: number;
  
  rx_antenna_gain_dBi: number;
  rx_antenna_discrimination_dB: number;  // off-axis loss
  polarization_loss_dB: number;
  rx_line_loss_dB: number;
  
  received_power_dBm: number;
  noise_floor_dBm: number;
  
  // Final metrics
  snr_dB: number;
  link_margin_dB: number;
}

export interface InterferenceAnalysisResult {
  victim_id: string;
  victim_name: string;
  
  // Desired signal
  desired_signal_dBm: number;
  
  // Interference contributions
  interferers: {
    interferer_id: string;
    interferer_name: string;
    interference_power_dBm: number;
    frequency_offset_MHz: number;
    // Full chain for tracing
    tx_eirp_dBm: number;
    path_loss_dB: number;
    rx_antenna_discrimination_dB: number;
    oob_rejection_dB: number;  // out of band rejection
  }[];
  
  // Aggregated interference
  total_interference_dBm: number;
  noise_floor_dBm: number;
  
  // Final I/N metrics
  i_over_n_dB: number;
  c_over_i_dB: number;
  c_over_iplusn_dB: number;
  
  // Assessment
  protection_criterion_dB: number;
  margin_dB: number;
  status: "compliant" | "marginal" | "exceeded";
}

export interface CalculationStep {
  label: string;
  formula: string;
  inputs: { name: string; value: number; unit: string }[];
  result: number;
  unit: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  transmitters: Transmitter[];
  receivers: Receiver[];
  propagation: PropagationParams;
  created_at: string;
}
