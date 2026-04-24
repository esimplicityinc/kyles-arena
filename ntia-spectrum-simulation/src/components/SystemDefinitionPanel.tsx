import { useState } from "react";
import type { Transmitter, Receiver, PropagationParams } from "../types/rfSystems";
import { SAMPLE_TRANSMITTERS, SAMPLE_RECEIVERS, SAMPLE_SCENARIOS, DEFAULT_PROPAGATION, EMPTY_TRANSMITTER, EMPTY_RECEIVER } from "../data/sampleScenarios";

interface SystemDefinitionPanelProps {
  transmitters: Transmitter[];
  receivers: Receiver[];
  propagation: PropagationParams;
  onTransmittersChange: (txs: Transmitter[]) => void;
  onReceiversChange: (rxs: Receiver[]) => void;
  onPropagationChange: (prop: PropagationParams) => void;
}

export function SystemDefinitionPanel({
  transmitters,
  receivers,
  propagation,
  onTransmittersChange,
  onReceiversChange,
  onPropagationChange
}: SystemDefinitionPanelProps) {
  const [activeSection, setActiveSection] = useState<"transmitters" | "receivers" | "propagation" | "scenarios">("transmitters");
  const [editingTx, setEditingTx] = useState<Transmitter | null>(null);
  const [editingRx, setEditingRx] = useState<Receiver | null>(null);

  const loadScenario = (scenarioId: string) => {
    const scenario = SAMPLE_SCENARIOS.find(s => s.id === scenarioId);
    if (scenario) {
      onTransmittersChange(scenario.transmitters);
      onReceiversChange(scenario.receivers);
      onPropagationChange(scenario.propagation);
    }
  };

  const loadSampleData = () => {
    onTransmittersChange(SAMPLE_TRANSMITTERS);
    onReceiversChange(SAMPLE_RECEIVERS);
    onPropagationChange(DEFAULT_PROPAGATION);
  };

  const addTransmitter = () => {
    const newTx: Transmitter = {
      ...EMPTY_TRANSMITTER,
      id: `TX-${String(transmitters.length + 1).padStart(3, '0')}`,
      name: `New Transmitter ${transmitters.length + 1}`
    };
    setEditingTx(newTx);
  };

  const addReceiver = () => {
    const newRx: Receiver = {
      ...EMPTY_RECEIVER,
      id: `RX-${String(receivers.length + 1).padStart(3, '0')}`,
      name: `New Receiver ${receivers.length + 1}`
    };
    setEditingRx(newRx);
  };

  const saveTx = (tx: Transmitter) => {
    const exists = transmitters.find(t => t.id === tx.id);
    if (exists) {
      onTransmittersChange(transmitters.map(t => t.id === tx.id ? tx : t));
    } else {
      onTransmittersChange([...transmitters, tx]);
    }
    setEditingTx(null);
  };

  const saveRx = (rx: Receiver) => {
    const exists = receivers.find(r => r.id === rx.id);
    if (exists) {
      onReceiversChange(receivers.map(r => r.id === rx.id ? rx : r));
    } else {
      onReceiversChange([...receivers, rx]);
    }
    setEditingRx(null);
  };

  const deleteTx = (id: string) => {
    onTransmittersChange(transmitters.filter(t => t.id !== id));
  };

  const deleteRx = (id: string) => {
    onReceiversChange(receivers.filter(r => r.id !== id));
  };

  return (
    <div className="system-definition-panel">
      <div className="panel-header">
        <h2>System Definition</h2>
        <p className="panel-subtitle">Define transmitters and receivers to analyze</p>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="btn btn-secondary" onClick={loadSampleData}>
          Load Sample Data
        </button>
        <select 
          className="scenario-select"
          onChange={(e) => loadScenario(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Load Scenario...</option>
          {SAMPLE_SCENARIOS.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Section Tabs */}
      <div className="section-tabs">
        <button 
          className={`section-tab ${activeSection === 'transmitters' ? 'active' : ''}`}
          onClick={() => setActiveSection('transmitters')}
        >
          Transmitters ({transmitters.length})
        </button>
        <button 
          className={`section-tab ${activeSection === 'receivers' ? 'active' : ''}`}
          onClick={() => setActiveSection('receivers')}
        >
          Receivers ({receivers.length})
        </button>
        <button 
          className={`section-tab ${activeSection === 'propagation' ? 'active' : ''}`}
          onClick={() => setActiveSection('propagation')}
        >
          Propagation
        </button>
      </div>

      {/* Transmitters Section */}
      {activeSection === 'transmitters' && (
        <div className="section-content">
          <div className="section-toolbar">
            <button className="btn btn-primary btn-sm" onClick={addTransmitter}>
              + Add Transmitter
            </button>
          </div>

          {transmitters.length === 0 ? (
            <div className="empty-state-small">
              No transmitters defined. Add one or load sample data.
            </div>
          ) : (
            <div className="system-list">
              {transmitters.map(tx => (
                <div key={tx.id} className="system-card">
                  <div className="system-card-header">
                    <div className="system-info">
                      <span className="system-id">{tx.id}</span>
                      <span className="system-name">{tx.name}</span>
                    </div>
                    <div className="system-actions">
                      <button className="btn-icon" onClick={() => setEditingTx(tx)}>Edit</button>
                      <button className="btn-icon danger" onClick={() => deleteTx(tx.id)}>Delete</button>
                    </div>
                  </div>
                  <div className="system-card-body">
                    <div className="param-grid">
                      <div className="param">
                        <span className="param-label">Frequency</span>
                        <span className="param-value">{tx.frequency_MHz} MHz</span>
                      </div>
                      <div className="param">
                        <span className="param-label">Power</span>
                        <span className="param-value">{tx.power_dBm} dBm</span>
                      </div>
                      <div className="param">
                        <span className="param-label">Antenna Gain</span>
                        <span className="param-value">{tx.antenna.gain_dBi} dBi</span>
                      </div>
                      <div className="param">
                        <span className="param-label">EIRP</span>
                        <span className="param-value highlight">{(tx.power_dBm + tx.antenna.gain_dBi).toFixed(1)} dBm</span>
                      </div>
                      <div className="param">
                        <span className="param-label">Height</span>
                        <span className="param-value">{tx.height_m} m</span>
                      </div>
                      <div className="param">
                        <span className="param-label">Bandwidth</span>
                        <span className="param-value">{tx.bandwidth_MHz} MHz</span>
                      </div>
                      <div className="param">
                        <span className="param-label">Location</span>
                        <span className="param-value">{tx.latitude.toFixed(4)}°, {tx.longitude.toFixed(4)}°</span>
                      </div>
                      <div className="param">
                        <span className="param-label">Azimuth</span>
                        <span className="param-value">{tx.antenna.azimuth_deg}°</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Receivers Section */}
      {activeSection === 'receivers' && (
        <div className="section-content">
          <div className="section-toolbar">
            <button className="btn btn-primary btn-sm" onClick={addReceiver}>
              + Add Receiver
            </button>
          </div>

          {receivers.length === 0 ? (
            <div className="empty-state-small">
              No receivers defined. Add one or load sample data.
            </div>
          ) : (
            <div className="system-list">
              {receivers.map(rx => (
                <div key={rx.id} className="system-card">
                  <div className="system-card-header">
                    <div className="system-info">
                      <span className="system-id">{rx.id}</span>
                      <span className="system-name">{rx.name}</span>
                    </div>
                    <div className="system-actions">
                      <button className="btn-icon" onClick={() => setEditingRx(rx)}>Edit</button>
                      <button className="btn-icon danger" onClick={() => deleteRx(rx.id)}>Delete</button>
                    </div>
                  </div>
                  <div className="system-card-body">
                    <div className="param-grid">
                      <div className="param">
                        <span className="param-label">Frequency</span>
                        <span className="param-value">{rx.frequency_MHz} MHz</span>
                      </div>
                      <div className="param">
                        <span className="param-label">Bandwidth</span>
                        <span className="param-value">{rx.bandwidth_MHz} MHz</span>
                      </div>
                      <div className="param">
                        <span className="param-label">Antenna Gain</span>
                        <span className="param-value">{rx.antenna.gain_dBi} dBi</span>
                      </div>
                      <div className="param">
                        <span className="param-label">Noise Figure</span>
                        <span className="param-value">{rx.noise_figure_dB} dB</span>
                      </div>
                      <div className="param">
                        <span className="param-label">I/N Criterion</span>
                        <span className="param-value highlight">{rx.in_protection_dB} dB</span>
                      </div>
                      <div className="param">
                        <span className="param-label">Threshold</span>
                        <span className="param-value">{rx.threshold_dBm} dBm</span>
                      </div>
                      <div className="param">
                        <span className="param-label">Location</span>
                        <span className="param-value">{rx.latitude.toFixed(4)}°, {rx.longitude.toFixed(4)}°</span>
                      </div>
                      <div className="param">
                        <span className="param-label">Height</span>
                        <span className="param-value">{rx.height_m} m</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Propagation Section */}
      {activeSection === 'propagation' && (
        <div className="section-content">
          <div className="propagation-form">
            <div className="form-group">
              <label>Propagation Model</label>
              <select 
                value={propagation.model}
                onChange={(e) => onPropagationChange({
                  ...propagation,
                  model: e.target.value as PropagationParams['model']
                })}
              >
                <option value="fspl">Free Space Path Loss (ITU-R P.525)</option>
                <option value="hata">Okumura-Hata (150-1500 MHz)</option>
                <option value="cost231">COST-231 Hata (1500-2000 MHz)</option>
                <option value="itu-r_p.452">ITU-R P.452 (Interference)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Environment</label>
              <select 
                value={propagation.environment}
                onChange={(e) => onPropagationChange({
                  ...propagation,
                  environment: e.target.value as PropagationParams['environment']
                })}
              >
                <option value="urban">Urban</option>
                <option value="suburban">Suburban</option>
                <option value="rural">Rural</option>
                <option value="open">Open/Free Space</option>
              </select>
            </div>

            <div className="form-group">
              <label>Atmospheric Loss (dB/km)</label>
              <input 
                type="number"
                step="0.01"
                value={propagation.atmospheric_loss_dB_per_km}
                onChange={(e) => onPropagationChange({
                  ...propagation,
                  atmospheric_loss_dB_per_km: parseFloat(e.target.value) || 0
                })}
              />
            </div>

            <div className="form-group">
              <label>Rain Attenuation (dB)</label>
              <input 
                type="number"
                step="0.1"
                value={propagation.rain_attenuation_dB}
                onChange={(e) => onPropagationChange({
                  ...propagation,
                  rain_attenuation_dB: parseFloat(e.target.value) || 0
                })}
              />
            </div>

            <div className="form-group">
              <label>Clutter Loss (dB)</label>
              <input 
                type="number"
                step="0.5"
                value={propagation.clutter_loss_dB}
                onChange={(e) => onPropagationChange({
                  ...propagation,
                  clutter_loss_dB: parseFloat(e.target.value) || 0
                })}
              />
            </div>

            <div className="model-info-box">
              <strong>Model Reference:</strong>
              {propagation.model === 'fspl' && (
                <p>Free Space Path Loss assumes unobstructed line-of-sight propagation. Use for satellite links or open terrain.</p>
              )}
              {propagation.model === 'hata' && (
                <p>Okumura-Hata empirical model for terrestrial mobile communications (150-1500 MHz). Includes urban, suburban, and rural corrections.</p>
              )}
              {propagation.model === 'cost231' && (
                <p>COST-231 extends Hata model to 1500-2000 MHz. Commonly used for cellular network planning.</p>
              )}
              {propagation.model === 'itu-r_p.452' && (
                <p>ITU-R P.452 for interference prediction between stations on the surface of the Earth.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transmitter Edit Modal */}
      {editingTx && (
        <TransmitterEditModal 
          transmitter={editingTx}
          onSave={saveTx}
          onCancel={() => setEditingTx(null)}
        />
      )}

      {/* Receiver Edit Modal */}
      {editingRx && (
        <ReceiverEditModal 
          receiver={editingRx}
          onSave={saveRx}
          onCancel={() => setEditingRx(null)}
        />
      )}
    </div>
  );
}

// Transmitter Edit Modal Component
function TransmitterEditModal({ 
  transmitter, 
  onSave, 
  onCancel 
}: { 
  transmitter: Transmitter; 
  onSave: (tx: Transmitter) => void; 
  onCancel: () => void;
}) {
  const [tx, setTx] = useState<Transmitter>(transmitter);

  const updateTx = (updates: Partial<Transmitter>) => {
    setTx({ ...tx, ...updates });
  };

  const updateAntenna = (updates: Partial<Transmitter['antenna']>) => {
    setTx({ ...tx, antenna: { ...tx.antenna, ...updates } });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{transmitter.id ? 'Edit' : 'Add'} Transmitter</h3>
          <button className="modal-close" onClick={onCancel}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>ID</label>
              <input type="text" value={tx.id} onChange={e => updateTx({ id: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={tx.name} onChange={e => updateTx({ name: e.target.value })} />
            </div>
          </div>

          <div className="form-section-title">Location</div>
          <div className="form-row">
            <div className="form-group">
              <label>Latitude (°)</label>
              <input type="number" step="0.0001" value={tx.latitude} onChange={e => updateTx({ latitude: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Longitude (°)</label>
              <input type="number" step="0.0001" value={tx.longitude} onChange={e => updateTx({ longitude: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Height (m)</label>
              <input type="number" step="1" value={tx.height_m} onChange={e => updateTx({ height_m: parseFloat(e.target.value) })} />
            </div>
          </div>

          <div className="form-section-title">RF Parameters</div>
          <div className="form-row">
            <div className="form-group">
              <label>Frequency (MHz)</label>
              <input type="number" step="1" value={tx.frequency_MHz} onChange={e => updateTx({ frequency_MHz: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Bandwidth (MHz)</label>
              <input type="number" step="0.1" value={tx.bandwidth_MHz} onChange={e => updateTx({ bandwidth_MHz: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Power (dBm)</label>
              <input type="number" step="1" value={tx.power_dBm} onChange={e => updateTx({ power_dBm: parseFloat(e.target.value) })} />
            </div>
          </div>

          <div className="form-section-title">Antenna</div>
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select value={tx.antenna.type} onChange={e => updateAntenna({ type: e.target.value as 'omni' | 'directional' | 'parabolic' })}>
                <option value="omni">Omnidirectional</option>
                <option value="directional">Directional (Sector)</option>
                <option value="parabolic">Parabolic (Dish)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Gain (dBi)</label>
              <input type="number" step="0.5" value={tx.antenna.gain_dBi} onChange={e => updateAntenna({ gain_dBi: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Beamwidth (°)</label>
              <input type="number" step="1" value={tx.antenna.beamwidth_deg} onChange={e => updateAntenna({ beamwidth_deg: parseFloat(e.target.value) })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Azimuth (°)</label>
              <input type="number" step="1" value={tx.antenna.azimuth_deg} onChange={e => updateAntenna({ azimuth_deg: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Elevation (°)</label>
              <input type="number" step="0.5" value={tx.antenna.elevation_deg} onChange={e => updateAntenna({ elevation_deg: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Sidelobe (dB)</label>
              <input type="number" step="1" value={tx.antenna.sidelobe_dB} onChange={e => updateAntenna({ sidelobe_dB: parseFloat(e.target.value) })} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>System Type</label>
              <select value={tx.system_type} onChange={e => updateTx({ system_type: e.target.value as Transmitter['system_type'] })}>
                <option value="fixed">Fixed</option>
                <option value="mobile">Mobile</option>
                <option value="satellite">Satellite</option>
                <option value="radar">Radar</option>
              </select>
            </div>
            <div className="form-group">
              <label>Emission Designator</label>
              <input type="text" value={tx.emission_designator || ''} onChange={e => updateTx({ emission_designator: e.target.value })} placeholder="e.g., 20M0W7D" />
            </div>
          </div>

          <div className="calculated-eirp">
            <span>Calculated EIRP:</span>
            <strong>{(tx.power_dBm + tx.antenna.gain_dBi).toFixed(1)} dBm</strong>
            <span className="eirp-watts">({(Math.pow(10, (tx.power_dBm + tx.antenna.gain_dBi) / 10) / 1000).toFixed(2)} W)</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(tx)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// Receiver Edit Modal Component
function ReceiverEditModal({ 
  receiver, 
  onSave, 
  onCancel 
}: { 
  receiver: Receiver; 
  onSave: (rx: Receiver) => void; 
  onCancel: () => void;
}) {
  const [rx, setRx] = useState<Receiver>(receiver);

  const updateRx = (updates: Partial<Receiver>) => {
    setRx({ ...rx, ...updates });
  };

  const updateAntenna = (updates: Partial<Receiver['antenna']>) => {
    setRx({ ...rx, antenna: { ...rx.antenna, ...updates } });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{receiver.id ? 'Edit' : 'Add'} Receiver</h3>
          <button className="modal-close" onClick={onCancel}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>ID</label>
              <input type="text" value={rx.id} onChange={e => updateRx({ id: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={rx.name} onChange={e => updateRx({ name: e.target.value })} />
            </div>
          </div>

          <div className="form-section-title">Location</div>
          <div className="form-row">
            <div className="form-group">
              <label>Latitude (°)</label>
              <input type="number" step="0.0001" value={rx.latitude} onChange={e => updateRx({ latitude: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Longitude (°)</label>
              <input type="number" step="0.0001" value={rx.longitude} onChange={e => updateRx({ longitude: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Height (m)</label>
              <input type="number" step="1" value={rx.height_m} onChange={e => updateRx({ height_m: parseFloat(e.target.value) })} />
            </div>
          </div>

          <div className="form-section-title">RF Parameters</div>
          <div className="form-row">
            <div className="form-group">
              <label>Frequency (MHz)</label>
              <input type="number" step="1" value={rx.frequency_MHz} onChange={e => updateRx({ frequency_MHz: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Bandwidth (MHz)</label>
              <input type="number" step="0.1" value={rx.bandwidth_MHz} onChange={e => updateRx({ bandwidth_MHz: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Noise Figure (dB)</label>
              <input type="number" step="0.1" value={rx.noise_figure_dB} onChange={e => updateRx({ noise_figure_dB: parseFloat(e.target.value) })} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Threshold (dBm)</label>
              <input type="number" step="1" value={rx.threshold_dBm} onChange={e => updateRx({ threshold_dBm: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>I/N Protection (dB)</label>
              <input type="number" step="1" value={rx.in_protection_dB} onChange={e => updateRx({ in_protection_dB: parseFloat(e.target.value) })} />
              <span className="form-hint">Typical: -6 to -10 dB</span>
            </div>
          </div>

          <div className="form-section-title">Antenna</div>
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select value={rx.antenna.type} onChange={e => updateAntenna({ type: e.target.value as 'omni' | 'directional' | 'parabolic' })}>
                <option value="omni">Omnidirectional</option>
                <option value="directional">Directional (Sector)</option>
                <option value="parabolic">Parabolic (Dish)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Gain (dBi)</label>
              <input type="number" step="0.5" value={rx.antenna.gain_dBi} onChange={e => updateAntenna({ gain_dBi: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Beamwidth (°)</label>
              <input type="number" step="1" value={rx.antenna.beamwidth_deg} onChange={e => updateAntenna({ beamwidth_deg: parseFloat(e.target.value) })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Azimuth (°)</label>
              <input type="number" step="1" value={rx.antenna.azimuth_deg} onChange={e => updateAntenna({ azimuth_deg: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Elevation (°)</label>
              <input type="number" step="0.5" value={rx.antenna.elevation_deg} onChange={e => updateAntenna({ elevation_deg: parseFloat(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Sidelobe (dB)</label>
              <input type="number" step="1" value={rx.antenna.sidelobe_dB} onChange={e => updateAntenna({ sidelobe_dB: parseFloat(e.target.value) })} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>System Type</label>
              <select value={rx.system_type} onChange={e => updateRx({ system_type: e.target.value as Receiver['system_type'] })}>
                <option value="fixed">Fixed</option>
                <option value="mobile">Mobile</option>
                <option value="satellite">Satellite</option>
                <option value="radar">Radar</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(rx)}>Save</button>
        </div>
      </div>
    </div>
  );
}
