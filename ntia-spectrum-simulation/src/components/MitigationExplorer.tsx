import { useState, useMemo } from "react";
import type { Transmitter, Receiver, PropagationParams } from "../types/rfSystems";
import { calculateInterferenceAnalysis } from "../utils/rfCalculations";

interface MitigationExplorerProps {
  transmitters: Transmitter[];
  receivers: Receiver[];
  propagation: PropagationParams;
  onTransmittersChange: (txs: Transmitter[]) => void;
}

type MitigationType = "power" | "frequency" | "antenna_azimuth" | "antenna_tilt";

interface MitigationOption {
  type: MitigationType;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  getValue: (tx: Transmitter) => number;
  applyValue: (tx: Transmitter, value: number) => Transmitter;
}

const MITIGATION_OPTIONS: MitigationOption[] = [
  {
    type: "power",
    label: "Transmit Power",
    unit: "dBm",
    min: 0,
    max: 60,
    step: 1,
    getValue: (tx) => tx.power_dBm,
    applyValue: (tx, value) => ({ ...tx, power_dBm: value })
  },
  {
    type: "frequency",
    label: "Frequency",
    unit: "MHz",
    min: 100,
    max: 6000,
    step: 5,
    getValue: (tx) => tx.frequency_MHz,
    applyValue: (tx, value) => ({ ...tx, frequency_MHz: value })
  },
  {
    type: "antenna_azimuth",
    label: "Antenna Azimuth",
    unit: "°",
    min: 0,
    max: 360,
    step: 5,
    getValue: (tx) => tx.antenna.azimuth_deg,
    applyValue: (tx, value) => ({ ...tx, antenna: { ...tx.antenna, azimuth_deg: value } })
  },
  {
    type: "antenna_tilt",
    label: "Antenna Tilt",
    unit: "°",
    min: -20,
    max: 20,
    step: 1,
    getValue: (tx) => tx.antenna.elevation_deg,
    applyValue: (tx, value) => ({ ...tx, antenna: { ...tx.antenna, elevation_deg: value } })
  }
];

export function MitigationExplorer({ 
  transmitters, 
  receivers, 
  propagation,
  onTransmittersChange 
}: MitigationExplorerProps) {
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [activeMitigation, setActiveMitigation] = useState<MitigationType>("power");
  const [modifiedTxs, setModifiedTxs] = useState<Map<string, Partial<Transmitter>>>(new Map());

  // Get the selected transmitter with any modifications applied
  const getModifiedTx = (tx: Transmitter): Transmitter => {
    const mods = modifiedTxs.get(tx.id);
    if (!mods) return tx;
    
    return {
      ...tx,
      ...mods,
      antenna: {
        ...tx.antenna,
        ...(mods.antenna || {})
      }
    };
  };

  // Calculate baseline I/N
  const baselineResults = useMemo(() => {
    if (receivers.length === 0 || transmitters.length === 0) return [];
    return receivers.map(rx => calculateInterferenceAnalysis(rx, null, transmitters, propagation));
  }, [transmitters, receivers, propagation]);

  // Calculate modified I/N with current adjustments
  const modifiedResults = useMemo(() => {
    if (receivers.length === 0 || transmitters.length === 0) return [];
    
    const modTxs = transmitters.map(tx => getModifiedTx(tx));
    return receivers.map(rx => calculateInterferenceAnalysis(rx, null, modTxs, propagation));
  }, [transmitters, receivers, propagation, modifiedTxs]);

  // Get selected transmitter
  const selectedTransmitter = selectedTx ? transmitters.find(t => t.id === selectedTx) : null;
  const modifiedTransmitter = selectedTransmitter ? getModifiedTx(selectedTransmitter) : null;

  // Apply mitigation value
  const applyMitigation = (type: MitigationType, value: number) => {
    if (!selectedTx) return;
    
    const option = MITIGATION_OPTIONS.find(o => o.type === type);
    if (!option) return;

    const tx = transmitters.find(t => t.id === selectedTx);
    if (!tx) return;

    const modifiedTx = option.applyValue(tx, value);
    const newMods = new Map(modifiedTxs);
    newMods.set(selectedTx, {
      ...modifiedTxs.get(selectedTx),
      power_dBm: modifiedTx.power_dBm,
      frequency_MHz: modifiedTx.frequency_MHz,
      antenna: modifiedTx.antenna
    });
    setModifiedTxs(newMods);
  };

  // Reset modifications
  const resetMods = () => {
    setModifiedTxs(new Map());
  };

  // Apply modifications permanently
  const applyMods = () => {
    const newTxs = transmitters.map(tx => getModifiedTx(tx));
    onTransmittersChange(newTxs);
    setModifiedTxs(new Map());
  };

  if (transmitters.length === 0 || receivers.length === 0) {
    return (
      <div className="mitigation-explorer">
        <div className="panel-header">
          <h2>Mitigation Explorer</h2>
          <p className="panel-subtitle">Adjust parameters and see real-time impact on I/N</p>
        </div>
        <div className="empty-state">
          <p>Define systems first to explore mitigations.</p>
        </div>
      </div>
    );
  }

  const currentOption = MITIGATION_OPTIONS.find(o => o.type === activeMitigation)!;
  const currentValue = modifiedTransmitter ? currentOption.getValue(modifiedTransmitter) : 0;
  const originalValue = selectedTransmitter ? currentOption.getValue(selectedTransmitter) : 0;

  return (
    <div className="mitigation-explorer">
      <div className="panel-header">
        <h2>Mitigation Explorer</h2>
        <p className="panel-subtitle">
          "What do I need to turn and twist to make this link possible?" — Adjust parameters and see I/N impact
        </p>
      </div>

      <div className="mitigation-layout">
        {/* Left: Controls */}
        <div className="mitigation-controls">
          <div className="control-section">
            <h4>Select Interferer to Adjust</h4>
            <select 
              value={selectedTx || ''}
              onChange={(e) => setSelectedTx(e.target.value || null)}
              className="tx-select"
            >
              <option value="">Select transmitter...</option>
              {transmitters.map(tx => (
                <option key={tx.id} value={tx.id}>
                  {tx.id}: {tx.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTransmitter && (
            <>
              <div className="control-section">
                <h4>Mitigation Type</h4>
                <div className="mitigation-type-btns">
                  {MITIGATION_OPTIONS.map(opt => (
                    <button
                      key={opt.type}
                      className={`type-btn ${activeMitigation === opt.type ? 'active' : ''}`}
                      onClick={() => setActiveMitigation(opt.type)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-section">
                <h4>Adjust {currentOption.label}</h4>
                <div className="slider-control">
                  <input
                    type="range"
                    min={currentOption.min}
                    max={currentOption.max}
                    step={currentOption.step}
                    value={currentValue}
                    onChange={(e) => applyMitigation(activeMitigation, parseFloat(e.target.value))}
                  />
                  <div className="slider-values">
                    <span className="original">Original: {originalValue} {currentOption.unit}</span>
                    <span className="current">Current: {currentValue} {currentOption.unit}</span>
                    <span className={`delta ${currentValue !== originalValue ? 'changed' : ''}`}>
                      Δ: {(currentValue - originalValue).toFixed(1)} {currentOption.unit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="control-section">
                <h4>Current Settings</h4>
                <div className="current-settings">
                  <div className="setting">
                    <span className="setting-label">Power</span>
                    <span className={`setting-value ${modifiedTransmitter!.power_dBm !== selectedTransmitter!.power_dBm ? 'modified' : ''}`}>
                      {modifiedTransmitter!.power_dBm} dBm
                    </span>
                  </div>
                  <div className="setting">
                    <span className="setting-label">Frequency</span>
                    <span className={`setting-value ${modifiedTransmitter!.frequency_MHz !== selectedTransmitter!.frequency_MHz ? 'modified' : ''}`}>
                      {modifiedTransmitter!.frequency_MHz} MHz
                    </span>
                  </div>
                  <div className="setting">
                    <span className="setting-label">Azimuth</span>
                    <span className={`setting-value ${modifiedTransmitter!.antenna.azimuth_deg !== selectedTransmitter!.antenna.azimuth_deg ? 'modified' : ''}`}>
                      {modifiedTransmitter!.antenna.azimuth_deg}°
                    </span>
                  </div>
                  <div className="setting">
                    <span className="setting-label">Tilt</span>
                    <span className={`setting-value ${modifiedTransmitter!.antenna.elevation_deg !== selectedTransmitter!.antenna.elevation_deg ? 'modified' : ''}`}>
                      {modifiedTransmitter!.antenna.elevation_deg}°
                    </span>
                  </div>
                </div>
              </div>

              <div className="control-actions">
                <button className="btn btn-secondary" onClick={resetMods}>
                  Reset All
                </button>
                <button className="btn btn-primary" onClick={applyMods}>
                  Apply Changes
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Results Comparison */}
        <div className="mitigation-results">
          <h3>I/N Impact Comparison</h3>
          
          <div className="comparison-table">
            <div className="comparison-header">
              <div className="col-victim">Victim Receiver</div>
              <div className="col-baseline">Baseline I/N</div>
              <div className="col-modified">Modified I/N</div>
              <div className="col-delta">Change</div>
              <div className="col-status">Status</div>
            </div>

            {baselineResults.map((baseline, idx) => {
              const modified = modifiedResults[idx];
              const delta = modified.i_over_n_dB - baseline.i_over_n_dB;
              const improved = delta < 0;
              const nowCompliant = modified.status === 'compliant';
              const wasExceeded = baseline.status === 'exceeded';

              return (
                <div key={baseline.victim_id} className="comparison-row">
                  <div className="col-victim">
                    <span className="victim-id">{baseline.victim_id}</span>
                    <span className="victim-name">{baseline.victim_name}</span>
                  </div>
                  <div className={`col-baseline ${baseline.status}`}>
                    {baseline.i_over_n_dB.toFixed(1)} dB
                  </div>
                  <div className={`col-modified ${modified.status}`}>
                    {modified.i_over_n_dB.toFixed(1)} dB
                  </div>
                  <div className={`col-delta ${improved ? 'improved' : delta > 0 ? 'worsened' : ''}`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)} dB
                    {improved && <span className="delta-arrow">↓</span>}
                    {delta > 0 && <span className="delta-arrow">↑</span>}
                  </div>
                  <div className="col-status">
                    <span className={`status-badge ${modified.status}`}>
                      {modified.status.toUpperCase()}
                    </span>
                    {wasExceeded && nowCompliant && (
                      <span className="fixed-badge">FIXED</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mitigation Recommendations */}
          {selectedTx && (
            <div className="mitigation-recommendations">
              <h4>Suggested Mitigations for {selectedTransmitter?.name}</h4>
              <ul>
                {baselineResults.some(r => r.status === 'exceeded') && (
                  <>
                    <li>
                      <strong>Reduce Power:</strong> Try reducing transmit power by 
                      {(() => {
                        const worstCase = baselineResults.find(r => r.status === 'exceeded');
                        if (!worstCase) return ' 3-6 dB';
                        const needed = Math.abs(worstCase.margin_dB) + 3;
                        return ` ${needed.toFixed(0)} dB`;
                      })()}
                    </li>
                    <li>
                      <strong>Frequency Offset:</strong> Shift frequency to increase OOB rejection
                    </li>
                    <li>
                      <strong>Antenna Pointing:</strong> Adjust azimuth away from victim receivers
                    </li>
                    <li>
                      <strong>Antenna Downtilt:</strong> Increase downtilt to reduce horizon gain
                    </li>
                  </>
                )}
                {baselineResults.every(r => r.status === 'compliant') && (
                  <li className="compliant-msg">
                    All links are currently compliant. No mitigation required.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
