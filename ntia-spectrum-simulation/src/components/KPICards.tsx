import { TELEMETRY_DATA, INTERFERENCE_EVENTS } from "../data/mockSpectrumData";

interface KPICardsProps {
  analysisComplete: boolean;
}

export function KPICards({ analysisComplete }: KPICardsProps) {
  const activeNodes = TELEMETRY_DATA.length;
  const frequencyBands = new Set(TELEMETRY_DATA.map((r) => r.frequency_mhz)).size;
  const interferenceEvents = INTERFERENCE_EVENTS.length;
  const simulationScenarios = analysisComplete ? 1 : 0;

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-value">{activeNodes}</div>
        <div className="kpi-label">Active Nodes</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-value">{frequencyBands}</div>
        <div className="kpi-label">Frequency Bands Monitored</div>
      </div>
      <div className="kpi-card warning">
        <div className="kpi-value">{interferenceEvents}</div>
        <div className="kpi-label">Interference Events</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-value">{simulationScenarios}</div>
        <div className="kpi-label">Simulation Scenarios</div>
      </div>
    </div>
  );
}
