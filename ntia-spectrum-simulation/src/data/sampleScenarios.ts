// Sample scenarios with realistic RF system parameters
// These represent the kind of data users would input

import type { Transmitter, Receiver, PropagationParams, Scenario } from "../types/rfSystems";

// Sample Transmitters - Various system types
export const SAMPLE_TRANSMITTERS: Transmitter[] = [
  {
    id: "TX-001",
    name: "LTE Base Station Alpha",
    latitude: 38.9072,
    longitude: -77.0369,
    height_m: 30,
    frequency_MHz: 2350,
    bandwidth_MHz: 20,
    power_dBm: 43, // ~20W
    antenna: {
      type: "directional",
      gain_dBi: 18,
      beamwidth_deg: 65,
      azimuth_deg: 45,
      elevation_deg: -3,
      sidelobe_dB: -18
    },
    emission_designator: "20M0W7D",
    system_type: "fixed"
  },
  {
    id: "TX-002", 
    name: "Radar System Bravo",
    latitude: 38.9142,
    longitude: -77.0250,
    height_m: 25,
    frequency_MHz: 2380,
    bandwidth_MHz: 5,
    power_dBm: 50, // ~100W
    antenna: {
      type: "directional",
      gain_dBi: 25,
      beamwidth_deg: 8,
      azimuth_deg: 180, // rotating, but snapshot
      elevation_deg: 2,
      sidelobe_dB: -25
    },
    emission_designator: "5M00P0N",
    system_type: "radar"
  },
  {
    id: "TX-003",
    name: "Point-to-Point Link Charlie",
    latitude: 38.9000,
    longitude: -77.0500,
    height_m: 45,
    frequency_MHz: 2400,
    bandwidth_MHz: 10,
    power_dBm: 30, // 1W
    antenna: {
      type: "parabolic",
      gain_dBi: 32,
      beamwidth_deg: 3,
      azimuth_deg: 90,
      elevation_deg: 0,
      sidelobe_dB: -30
    },
    emission_designator: "10M0G7W",
    system_type: "fixed"
  },
  {
    id: "TX-004",
    name: "Mobile Unit Delta",
    latitude: 38.9100,
    longitude: -77.0400,
    height_m: 2,
    frequency_MHz: 2355,
    bandwidth_MHz: 5,
    power_dBm: 23, // 200mW
    antenna: {
      type: "omni",
      gain_dBi: 2,
      beamwidth_deg: 360,
      azimuth_deg: 0,
      elevation_deg: 0,
      sidelobe_dB: 0
    },
    system_type: "mobile"
  }
];

// Sample Receivers
export const SAMPLE_RECEIVERS: Receiver[] = [
  {
    id: "RX-001",
    name: "Federal Monitoring Station",
    latitude: 38.9080,
    longitude: -77.0300,
    height_m: 15,
    frequency_MHz: 2360,
    bandwidth_MHz: 20,
    antenna: {
      type: "directional",
      gain_dBi: 12,
      beamwidth_deg: 90,
      azimuth_deg: 270,
      elevation_deg: 5,
      sidelobe_dB: -15
    },
    noise_figure_dB: 4,
    threshold_dBm: -100,
    system_type: "fixed",
    in_protection_dB: -6 // I/N must be below -6 dB
  },
  {
    id: "RX-002",
    name: "Satellite Earth Station",
    latitude: 38.9200,
    longitude: -77.0350,
    height_m: 8,
    frequency_MHz: 2345,
    bandwidth_MHz: 36,
    antenna: {
      type: "parabolic",
      gain_dBi: 38,
      beamwidth_deg: 1.5,
      azimuth_deg: 180,
      elevation_deg: 35,
      sidelobe_dB: -32
    },
    noise_figure_dB: 1.2,
    threshold_dBm: -120,
    system_type: "satellite",
    in_protection_dB: -10 // More stringent for satellite
  },
  {
    id: "RX-003",
    name: "LTE User Equipment",
    latitude: 38.9050,
    longitude: -77.0380,
    height_m: 1.5,
    frequency_MHz: 2350,
    bandwidth_MHz: 20,
    antenna: {
      type: "omni",
      gain_dBi: 0,
      beamwidth_deg: 360,
      azimuth_deg: 0,
      elevation_deg: 0,
      sidelobe_dB: 0
    },
    noise_figure_dB: 7,
    threshold_dBm: -95,
    system_type: "mobile",
    in_protection_dB: -6
  }
];

// Default propagation parameters
export const DEFAULT_PROPAGATION: PropagationParams = {
  model: "cost231",
  environment: "suburban",
  atmospheric_loss_dB_per_km: 0.01,
  rain_attenuation_dB: 0,
  clutter_loss_dB: 8
};

// Pre-built scenarios
export const SAMPLE_SCENARIOS: Scenario[] = [
  {
    id: "SCEN-001",
    name: "LTE/Radar Coexistence Study",
    description: "Analyzing interference from a radar system into an LTE network in the 2.3-2.4 GHz band",
    transmitters: [SAMPLE_TRANSMITTERS[0], SAMPLE_TRANSMITTERS[1]],
    receivers: [SAMPLE_RECEIVERS[0], SAMPLE_RECEIVERS[2]],
    propagation: DEFAULT_PROPAGATION,
    created_at: new Date().toISOString()
  },
  {
    id: "SCEN-002", 
    name: "Satellite Earth Station Protection",
    description: "Evaluating terrestrial interference into a satellite earth station receiver",
    transmitters: SAMPLE_TRANSMITTERS,
    receivers: [SAMPLE_RECEIVERS[1]],
    propagation: {
      ...DEFAULT_PROPAGATION,
      model: "fspl",
      clutter_loss_dB: 3
    },
    created_at: new Date().toISOString()
  }
];

// Empty template for new systems
export const EMPTY_TRANSMITTER: Transmitter = {
  id: "",
  name: "",
  latitude: 38.9,
  longitude: -77.0,
  height_m: 10,
  frequency_MHz: 2400,
  bandwidth_MHz: 10,
  power_dBm: 30,
  antenna: {
    type: "directional",
    gain_dBi: 10,
    beamwidth_deg: 60,
    azimuth_deg: 0,
    elevation_deg: 0,
    sidelobe_dB: -15
  },
  system_type: "fixed"
};

export const EMPTY_RECEIVER: Receiver = {
  id: "",
  name: "",
  latitude: 38.9,
  longitude: -77.0,
  height_m: 10,
  frequency_MHz: 2400,
  bandwidth_MHz: 10,
  antenna: {
    type: "directional",
    gain_dBi: 10,
    beamwidth_deg: 60,
    azimuth_deg: 0,
    elevation_deg: 0,
    sidelobe_dB: -15
  },
  noise_figure_dB: 5,
  threshold_dBm: -100,
  system_type: "fixed",
  in_protection_dB: -6
};
