import { useState } from "react";
import { TELEMETRY_DATA } from "../data/mockSpectrumData";
import type { TelemetryRecord } from "../types/spectrum";

type SectorFilter = "All" | "Sector_A" | "Sector_B" | "Sector_C";

export function TelemetryTable() {
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>("All");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filteredData =
    sectorFilter === "All"
      ? TELEMETRY_DATA
      : TELEMETRY_DATA.filter((r) => r.location === sectorFilter);

  const getRowClass = (record: TelemetryRecord): string => {
    if (record.snr_db < 15) return "row-danger";
    if (record.snr_db < 20) return "row-warning";
    return "";
  };

  const formatTimestamp = (ts: string): string => {
    return ts.replace("2026-04-24T", "").replace("Z", "");
  };

  // Calculate I/N ratio (estimated interference vs noise floor)
  // Nominal noise floor is -98 dBm, elevated indicates interference
  const calculateIN = (noiseFloor: number): number => {
    const nominalNoise = -98;
    return noiseFloor - nominalNoise; // Positive = interference above noise
  };

  // Calculate C/I ratio (carrier to interference)
  const calculateCI = (signal: number, noiseFloor: number): number => {
    const nominalNoise = -98;
    const interference = noiseFloor - nominalNoise;
    if (interference <= 0) return 99; // No interference
    return signal - noiseFloor;
  };

  // Get I/N status
  const getINStatus = (inRatio: number): string => {
    if (inRatio > 6) return "critical";
    if (inRatio > 0) return "warning";
    return "good";
  };

  return (
    <div className="telemetry-section">
      <div className="section-header">
        <div>
          <h2>Spectrum Telemetry — RF Node Observations</h2>
          <p className="section-subtitle">
            {filteredData.length} records | 3 sectors | Last updated 2026-04-24 14:19:00Z
          </p>
        </div>
        <div className="header-controls">
          <label className="advanced-toggle">
            <input 
              type="checkbox" 
              checked={showAdvanced} 
              onChange={(e) => setShowAdvanced(e.target.checked)} 
            />
            Show I/N Metrics
          </label>
        </div>
      </div>

      <div className="filter-row">
        {(["All", "Sector_A", "Sector_B", "Sector_C"] as SectorFilter[]).map((sector) => (
          <button
            key={sector}
            className={`filter-btn ${sectorFilter === sector ? "active" : ""}`}
            onClick={() => setSectorFilter(sector)}
          >
            {sector === "All" ? "All Sectors" : sector.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table className="telemetry-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Node</th>
              <th>Sector</th>
              <th>Freq (MHz)</th>
              <th>BW (MHz)</th>
              <th>Signal (dBm)</th>
              <th>Noise Floor (dBm)</th>
              <th>SNR (dB)</th>
              {showAdvanced && (
                <>
                  <th>I/N (dB)</th>
                  <th>C/I (dB)</th>
                  <th>Status</th>
                </>
              )}
              <th>Modulation</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((record) => {
              const inRatio = calculateIN(record.noise_floor_dbm);
              const ciRatio = calculateCI(record.signal_strength_dbm, record.noise_floor_dbm);
              const inStatus = getINStatus(inRatio);
              
              return (
                <tr key={record.device_id} className={getRowClass(record)}>
                  <td className="mono">{formatTimestamp(record.timestamp)}</td>
                  <td className="mono">{record.device_id}</td>
                  <td>{record.location.replace("_", " ")}</td>
                  <td className="mono">{record.frequency_mhz}</td>
                  <td className="mono">{record.bandwidth_mhz}</td>
                  <td className="mono">{record.signal_strength_dbm}</td>
                  <td className="mono">
                    {record.noise_floor_dbm}
                    {record.noise_floor_dbm > -92 && (
                      <span className="badge badge-danger">ELEVATED</span>
                    )}
                  </td>
                  <td className="mono">{record.snr_db}</td>
                  {showAdvanced && (
                    <>
                      <td className={`mono ${inStatus}`}>
                        {inRatio > 0 ? '+' : ''}{inRatio}
                      </td>
                      <td className="mono">
                        {ciRatio < 99 ? ciRatio : '—'}
                      </td>
                      <td>
                        <span className={`status-indicator ${inStatus}`}>
                          {inStatus === 'critical' ? '●' : inStatus === 'warning' ? '◐' : '○'}
                        </span>
                      </td>
                    </>
                  )}
                  <td>{record.modulation}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {showAdvanced && (
        <div className="table-legend">
          <span className="legend-title">I/N Thresholds:</span>
          <span className="legend-item"><span className="status-indicator good">○</span> ≤ 0 dB (Acceptable)</span>
          <span className="legend-item"><span className="status-indicator warning">◐</span> 0-6 dB (Significant)</span>
          <span className="legend-item"><span className="status-indicator critical">●</span> &gt; 6 dB (Harmful)</span>
        </div>
      )}
    </div>
  );
}
