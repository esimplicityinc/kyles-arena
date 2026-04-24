import { useState } from "react";
import type { Transmitter, Receiver, PropagationParams } from "./types/rfSystems";
import { DEFAULT_PROPAGATION } from "./data/sampleScenarios";
import { SystemDefinitionPanel } from "./components/SystemDefinitionPanel";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { MitigationExplorer } from "./components/MitigationExplorer";
import { SystemMap } from "./components/SystemMap";
import "./App.css";

type TabId = "systems" | "analysis" | "map" | "mitigation";

function App() {
  // Core state: User-defined systems
  const [transmitters, setTransmitters] = useState<Transmitter[]>([]);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [propagation, setPropagation] = useState<PropagationParams>(DEFAULT_PROPAGATION);
  
  const [activeTab, setActiveTab] = useState<TabId>("systems");
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [selectedRx, setSelectedRx] = useState<string | null>(null);

  return (
    <div className="app">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-left">
          <span className="brand">SPECTRUM WORKBENCH</span>
          <span className="brand-subtitle">RF Interference Analysis Tool</span>
        </div>
        <div className="nav-right">
          <span className="org-label">eSimplicity | Rapid Innovation Center</span>
        </div>
      </nav>

      {/* Tab Bar */}
      <div className="tab-bar">
        {(
          [
            { id: "systems", label: "Systems", icon: "⚙️" },
            { id: "analysis", label: "Analysis", icon: "📊" },
            { id: "map", label: "Map", icon: "🗺️" },
            { id: "mitigation", label: "Mitigation", icon: "🔧" },
          ] as { id: TabId; label: string; icon: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">Transmitters:</span>
          <span className="status-value">{transmitters.length}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Receivers:</span>
          <span className="status-value">{receivers.length}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Model:</span>
          <span className="status-value">{propagation.model.toUpperCase()}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Environment:</span>
          <span className="status-value">{propagation.environment}</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        {/* Systems Tab */}
        {activeTab === "systems" && (
          <div className="tab-content">
            <SystemDefinitionPanel
              transmitters={transmitters}
              receivers={receivers}
              propagation={propagation}
              onTransmittersChange={setTransmitters}
              onReceiversChange={setReceivers}
              onPropagationChange={setPropagation}
            />
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === "analysis" && (
          <div className="tab-content">
            <AnalysisPanel
              transmitters={transmitters}
              receivers={receivers}
              propagation={propagation}
            />
          </div>
        )}

        {/* Map Tab */}
        {activeTab === "map" && (
          <div className="tab-content">
            <div className="map-page">
              <h2>Geographic Overview</h2>
              <p className="panel-subtitle">
                Visualize system locations and interference paths
              </p>
              <SystemMap
                transmitters={transmitters}
                receivers={receivers}
                propagation={propagation}
                selectedTx={selectedTx}
                selectedRx={selectedRx}
                onSelectTx={setSelectedTx}
                onSelectRx={setSelectedRx}
              />
              
              {/* Selected System Info */}
              {(selectedTx || selectedRx) && (
                <div className="selected-info">
                  {selectedTx && (
                    <div className="info-card">
                      <h4>Selected Transmitter: {selectedTx}</h4>
                      {(() => {
                        const tx = transmitters.find(t => t.id === selectedTx);
                        if (!tx) return null;
                        return (
                          <div className="info-grid">
                            <div className="info-item">
                              <span className="info-label">Name</span>
                              <span className="info-value">{tx.name}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Frequency</span>
                              <span className="info-value">{tx.frequency_MHz} MHz</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Power</span>
                              <span className="info-value">{tx.power_dBm} dBm</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">EIRP</span>
                              <span className="info-value">{(tx.power_dBm + tx.antenna.gain_dBi).toFixed(1)} dBm</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {selectedRx && (
                    <div className="info-card">
                      <h4>Selected Receiver: {selectedRx}</h4>
                      {(() => {
                        const rx = receivers.find(r => r.id === selectedRx);
                        if (!rx) return null;
                        return (
                          <div className="info-grid">
                            <div className="info-item">
                              <span className="info-label">Name</span>
                              <span className="info-value">{rx.name}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Frequency</span>
                              <span className="info-value">{rx.frequency_MHz} MHz</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">I/N Criterion</span>
                              <span className="info-value">{rx.in_protection_dB} dB</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Noise Figure</span>
                              <span className="info-value">{rx.noise_figure_dB} dB</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mitigation Tab */}
        {activeTab === "mitigation" && (
          <div className="tab-content">
            <MitigationExplorer
              transmitters={transmitters}
              receivers={receivers}
              propagation={propagation}
              onTransmittersChange={setTransmitters}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-left">
          <span>Spectrum Interference Analysis Workbench v2.0</span>
        </div>
        <div className="footer-right">
          <span>Data you input → Calculations with intermediate values → I/N results</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
