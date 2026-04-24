import { useState, useMemo } from "react";
import type { Transmitter, Receiver, PropagationParams, CalculationStep } from "../types/rfSystems";
import { calculateLinkBudget, calculateInterferenceAnalysis } from "../utils/rfCalculations";

interface AnalysisPanelProps {
  transmitters: Transmitter[];
  receivers: Receiver[];
  propagation: PropagationParams;
}

export function AnalysisPanel({ transmitters, receivers, propagation }: AnalysisPanelProps) {
  const [selectedVictim, setSelectedVictim] = useState<string | null>(null);
  const [showLinkDetails, setShowLinkDetails] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"interference" | "link">("interference");

  // Calculate I/N analysis for all receivers
  const interferenceResults = useMemo(() => {
    if (receivers.length === 0 || transmitters.length === 0) return [];

    return receivers.map(rx => {
      return calculateInterferenceAnalysis(rx, null, transmitters, propagation);
    });
  }, [transmitters, receivers, propagation]);

  // Calculate individual link budgets when requested
  const linkBudgetDetails = useMemo(() => {
    if (!showLinkDetails) return null;
    
    const [txId, rxId] = showLinkDetails.split('->');
    const tx = transmitters.find(t => t.id === txId);
    const rx = receivers.find(r => r.id === rxId);
    
    if (!tx || !rx) return null;
    
    return calculateLinkBudget(tx, rx, propagation);
  }, [showLinkDetails, transmitters, receivers, propagation]);

  if (transmitters.length === 0 || receivers.length === 0) {
    return (
      <div className="analysis-panel">
        <div className="panel-header">
          <h2>Interference Analysis</h2>
          <p className="panel-subtitle">Run I/N calculations with full intermediate values</p>
        </div>
        <div className="empty-state">
          <p>Define at least one transmitter and one receiver to run analysis.</p>
          <p className="hint">Go to the Systems tab to add or load sample data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-panel">
      <div className="panel-header">
        <h2>Interference Analysis</h2>
        <p className="panel-subtitle">I/N calculations showing all intermediate values</p>
      </div>

      {/* Analysis Mode Toggle */}
      <div className="analysis-mode-toggle">
        <button 
          className={`mode-btn ${analysisMode === 'interference' ? 'active' : ''}`}
          onClick={() => setAnalysisMode('interference')}
        >
          I/N Analysis
        </button>
        <button 
          className={`mode-btn ${analysisMode === 'link' ? 'active' : ''}`}
          onClick={() => setAnalysisMode('link')}
        >
          Link Budget
        </button>
      </div>

      {/* I/N Analysis Results */}
      {analysisMode === 'interference' && (
        <div className="interference-results">
          <h3>I/N Results by Victim Receiver</h3>
          
          {interferenceResults.map(result => (
            <div 
              key={result.victim_id} 
              className={`victim-card ${result.status}`}
              onClick={() => setSelectedVictim(selectedVictim === result.victim_id ? null : result.victim_id)}
            >
              <div className="victim-header">
                <div className="victim-info">
                  <span className="victim-id">{result.victim_id}</span>
                  <span className="victim-name">{result.victim_name}</span>
                </div>
                <div className="victim-status">
                  <span className={`status-badge ${result.status}`}>
                    {result.status === 'compliant' ? 'COMPLIANT' : 
                     result.status === 'marginal' ? 'MARGINAL' : 'EXCEEDED'}
                  </span>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="victim-metrics">
                <div className="metric">
                  <span className="metric-label">I/N</span>
                  <span className={`metric-value ${result.i_over_n_dB > result.protection_criterion_dB ? 'bad' : 'good'}`}>
                    {result.i_over_n_dB.toFixed(1)} dB
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Criterion</span>
                  <span className="metric-value">{result.protection_criterion_dB} dB</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Margin</span>
                  <span className={`metric-value ${result.margin_dB < 0 ? 'bad' : result.margin_dB < 3 ? 'warn' : 'good'}`}>
                    {result.margin_dB.toFixed(1)} dB
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Total I</span>
                  <span className="metric-value">{result.total_interference_dBm.toFixed(1)} dBm</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Noise Floor</span>
                  <span className="metric-value">{result.noise_floor_dBm.toFixed(1)} dBm</span>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedVictim === result.victim_id && (
                <div className="victim-details">
                  <h4>Interference Contributions</h4>
                  <p className="formula-note">
                    I/N = 10·log₁₀(ΣI) - N where I is sum of all interference powers
                  </p>
                  
                  <table className="interference-table">
                    <thead>
                      <tr>
                        <th>Interferer</th>
                        <th>EIRP (dBm)</th>
                        <th>Path Loss (dB)</th>
                        <th>Ant. Discr. (dB)</th>
                        <th>OOB Rej. (dB)</th>
                        <th>Freq Offset</th>
                        <th>I at Rx (dBm)</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.interferers.map(intf => (
                        <tr 
                          key={intf.interferer_id}
                        >
                          <td>
                            <span className="interferer-id">{intf.interferer_id}</span>
                            <span className="interferer-name">{intf.interferer_name}</span>
                          </td>
                          <td className="mono">{intf.tx_eirp_dBm.toFixed(1)}</td>
                          <td className="mono">{intf.path_loss_dB.toFixed(1)}</td>
                          <td className="mono">{intf.rx_antenna_discrimination_dB.toFixed(1)}</td>
                          <td className="mono">{intf.oob_rejection_dB.toFixed(1)}</td>
                          <td className="mono">{intf.frequency_offset_MHz.toFixed(1)} MHz</td>
                          <td className={`mono ${intf.interference_power_dBm > result.noise_floor_dBm ? 'bad' : ''}`}>
                            {intf.interference_power_dBm.toFixed(1)}
                          </td>
                          <td>
                            <button 
                              className="btn-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowLinkDetails(`${intf.interferer_id}->${result.victim_id}`);
                              }}
                            >
                              View Chain
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan={6}><strong>Total Interference (linear sum)</strong></td>
                        <td className="mono"><strong>{result.total_interference_dBm.toFixed(1)}</strong></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="calculation-summary">
                    <div className="calc-row">
                      <span>Noise Floor (N) = kTB + NF</span>
                      <span className="mono">{result.noise_floor_dBm.toFixed(1)} dBm</span>
                    </div>
                    <div className="calc-row">
                      <span>Total Interference (I)</span>
                      <span className="mono">{result.total_interference_dBm.toFixed(1)} dBm</span>
                    </div>
                    <div className="calc-row highlight">
                      <span><strong>I/N = I - N</strong></span>
                      <span className={`mono ${result.i_over_n_dB > result.protection_criterion_dB ? 'bad' : 'good'}`}>
                        <strong>{result.i_over_n_dB.toFixed(1)} dB</strong>
                      </span>
                    </div>
                    <div className="calc-row">
                      <span>Protection Criterion</span>
                      <span className="mono">{result.protection_criterion_dB} dB</span>
                    </div>
                    <div className={`calc-row ${result.margin_dB < 0 ? 'exceeded' : 'compliant'}`}>
                      <span><strong>Margin = Criterion - I/N</strong></span>
                      <span className="mono"><strong>{result.margin_dB.toFixed(1)} dB</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Link Budget Mode */}
      {analysisMode === 'link' && (
        <div className="link-budget-section">
          <h3>Select Link to Analyze</h3>
          <div className="link-selector">
            <select 
              value={showLinkDetails || ''}
              onChange={(e) => setShowLinkDetails(e.target.value || null)}
            >
              <option value="">Select a Tx → Rx link...</option>
              {transmitters.flatMap(tx => 
                receivers.map(rx => (
                  <option key={`${tx.id}->${rx.id}`} value={`${tx.id}->${rx.id}`}>
                    {tx.name} → {rx.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      )}

      {/* Link Budget Details Modal */}
      {linkBudgetDetails && (
        <div className="link-details-panel">
          <div className="link-details-header">
            <h3>Link Budget: Full Calculation Chain</h3>
            <button className="btn-close" onClick={() => setShowLinkDetails(null)}>&times;</button>
          </div>
          
          <div className="link-summary">
            <div className="link-endpoint">
              <span className="endpoint-label">Transmitter</span>
              <span className="endpoint-id">{linkBudgetDetails.result.transmitter_id}</span>
            </div>
            <div className="link-arrow">→</div>
            <div className="link-endpoint">
              <span className="endpoint-label">Receiver</span>
              <span className="endpoint-id">{linkBudgetDetails.result.receiver_id}</span>
            </div>
          </div>

          <div className="calculation-chain">
            <h4>Calculation Steps (Intermediate Values)</h4>
            
            {linkBudgetDetails.steps.map((step, idx) => (
              <CalculationStepCard key={idx} step={step} index={idx + 1} />
            ))}
          </div>

          <div className="final-results">
            <h4>Final Link Results</h4>
            <div className="results-grid">
              <div className="result-item">
                <span className="result-label">Received Power</span>
                <span className="result-value">{linkBudgetDetails.result.received_power_dBm.toFixed(1)} dBm</span>
              </div>
              <div className="result-item">
                <span className="result-label">Noise Floor</span>
                <span className="result-value">{linkBudgetDetails.result.noise_floor_dBm.toFixed(1)} dBm</span>
              </div>
              <div className="result-item">
                <span className="result-label">SNR</span>
                <span className={`result-value ${linkBudgetDetails.result.snr_dB > 10 ? 'good' : linkBudgetDetails.result.snr_dB > 0 ? 'warn' : 'bad'}`}>
                  {linkBudgetDetails.result.snr_dB.toFixed(1)} dB
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">Link Margin</span>
                <span className={`result-value ${linkBudgetDetails.result.link_margin_dB > 10 ? 'good' : linkBudgetDetails.result.link_margin_dB > 0 ? 'warn' : 'bad'}`}>
                  {linkBudgetDetails.result.link_margin_dB.toFixed(1)} dB
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Calculation Step Card Component
function CalculationStepCard({ step, index }: { step: CalculationStep; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`calc-step ${expanded ? 'expanded' : ''}`} onClick={() => setExpanded(!expanded)}>
      <div className="step-header">
        <span className="step-number">{index}</span>
        <span className="step-label">{step.label}</span>
        <span className="step-result">
          {step.result.toFixed(2)} {step.unit}
        </span>
        <span className="step-expand">{expanded ? '−' : '+'}</span>
      </div>
      
      {expanded && (
        <div className="step-details">
          <div className="step-formula">
            <strong>Formula:</strong> {step.formula}
          </div>
          <div className="step-inputs">
            <strong>Inputs:</strong>
            <ul>
              {step.inputs.map((input, idx) => (
                <li key={idx}>
                  {input.name} = {typeof input.value === 'number' ? input.value.toFixed(4) : input.value} {input.unit}
                </li>
              ))}
            </ul>
          </div>
          <div className="step-output">
            <strong>Result:</strong> {step.result.toFixed(4)} {step.unit}
          </div>
        </div>
      )}
    </div>
  );
}
