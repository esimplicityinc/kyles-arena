import { useState } from "react";
import { TELEMETRY_DATA } from "../data/mockSpectrumData";
import type { TelemetryRecord } from "../types/spectrum";

type SectorFilter = "All" | "Sector_A" | "Sector_B" | "Sector_C";

export function TelemetryTable() {
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>("All");

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

  return (
    <div className="telemetry-section">
      <div className="section-header">
        <div>
          <h2>Spectrum Telemetry — RF Node Observations</h2>
          <p className="section-subtitle">
            {filteredData.length} records | 3 sectors | Last updated 2026-04-24 14:19:00Z
          </p>
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
              <th>Modulation</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((record) => (
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
                <td>{record.modulation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
