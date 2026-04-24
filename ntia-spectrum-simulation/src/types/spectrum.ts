export interface TelemetryRecord {
  timestamp: string;
  location: "Sector_A" | "Sector_B" | "Sector_C";
  latitude: number;
  longitude: number;
  frequency_mhz: number;
  bandwidth_mhz: number;
  signal_strength_dbm: number;
  noise_floor_dbm: number;
  snr_db: number;
  device_id: string;
  modulation: string;
}

export interface AgentStep {
  id: string;
  name: string;
  description: string;
  status: "idle" | "running" | "complete";
}

export interface InterferenceEvent {
  event_id: string;
  sector: string;
  frequency_mhz: number;
  interference_level: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  suspected_cause: string;
  affected_nodes: string[];
  priority: "P1" | "P2" | "P3";
}

export interface SimulationScenario {
  simulation_id: string;
  scenario_name: string;
  frequency_mhz: number;
  location: string;
  interference_profile: {
    type: string;
    severity: string;
    estimated_duration_min: number;
  };
  environment: {
    terrain: string;
    urban_density: string;
    atmospheric_conditions: string;
  };
  simulation_goal: string;
  recommended_simulation_type: string;
  generated_at: string;
}

export interface SimulationResult {
  before: {
    packet_loss_pct: number;
    coverage_reduction_pct: number;
    latency_increase_ms: number;
    risk_level: string;
  };
  after: {
    packet_loss_pct: number;
    coverage_reduction_pct: number;
    latency_increase_ms: number;
    risk_level: string;
  };
}

export interface Recommendation {
  rank: number;
  action: string;
  expected_impact: string;
  complexity: "Low" | "Medium" | "High";
  confidence: number;
}
