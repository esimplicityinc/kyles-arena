import { useState } from "react";
import { SIMULATION_SCENARIO, SIMULATION_RESULT } from "../data/mockSpectrumData";

export function SimulationOutputPanel() {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(SIMULATION_SCENARIO, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spectrum-simulation-scenario.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const { before, after } = SIMULATION_RESULT;

  return (
    <div className="output-sections">
      {/* Simulation Relay Output */}
      <div className="output-section">
        <div className="section-header">
          <div>
            <h2>Simulation Relay — Structured Payload</h2>
            <p className="section-subtitle">
              Ready for relay to RF modeling and simulation environment
            </p>
          </div>
        </div>

        <div className="code-block">
          <pre>{jsonString}</pre>
        </div>

        <div className="output-actions">
          <button className="btn btn-secondary" onClick={handleCopy}>
            {copied ? "Copied ✓" : "Copy JSON"}
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            Export Scenario JSON
          </button>
        </div>
      </div>

      {/* Predicted Impact */}
      <div className="output-section">
        <h2>Predicted Propagation Impact</h2>

        <div className="impact-comparison">
          <div className="impact-card before">
            <h3>Before Mitigation</h3>
            <div className="impact-metrics">
              <div className="impact-row">
                <span className="impact-label">Packet Loss</span>
                <span className="impact-value">{before.packet_loss_pct}%</span>
              </div>
              <div className="impact-row">
                <span className="impact-label">Coverage Reduction</span>
                <span className="impact-value">{before.coverage_reduction_pct}%</span>
              </div>
              <div className="impact-row">
                <span className="impact-label">Latency Increase</span>
                <span className="impact-value">{before.latency_increase_ms}ms</span>
              </div>
              <div className="impact-row">
                <span className="impact-label">Risk Level</span>
                <span className="impact-value risk-critical">{before.risk_level}</span>
              </div>
            </div>
          </div>

          <div className="impact-deltas">
            <div className="delta success">
              -{before.packet_loss_pct - after.packet_loss_pct}%
            </div>
            <div className="delta success">
              -{before.coverage_reduction_pct - after.coverage_reduction_pct}%
            </div>
            <div className="delta success">
              -{before.latency_increase_ms - after.latency_increase_ms}ms
            </div>
          </div>

          <div className="impact-card after">
            <h3>After Mitigation</h3>
            <div className="impact-metrics">
              <div className="impact-row">
                <span className="impact-label">Packet Loss</span>
                <span className="impact-value">{after.packet_loss_pct}%</span>
              </div>
              <div className="impact-row">
                <span className="impact-label">Coverage Reduction</span>
                <span className="impact-value">{after.coverage_reduction_pct}%</span>
              </div>
              <div className="impact-row">
                <span className="impact-label">Latency Increase</span>
                <span className="impact-value">{after.latency_increase_ms}ms</span>
              </div>
              <div className="impact-row">
                <span className="impact-label">Risk Level</span>
                <span className="impact-value risk-low">{after.risk_level}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
