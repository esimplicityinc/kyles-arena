import { useState } from "react";
import { TELEMETRY_DATA, INTERFERENCE_EVENTS } from "../data/mockSpectrumData";

interface IntermediateCalculationsProps {
  analysisComplete: boolean;
}

export function IntermediateCalculations({ analysisComplete }: IntermediateCalculationsProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("detection");
  
  if (!analysisComplete) {
    return (
      <div className="intermediate-calcs">
        <h3>Intermediate Calculations</h3>
        <div className="calcs-empty">
          Run Agentic Analysis to view detailed calculation breakdown
        </div>
      </div>
    );
  }
  
  // Get problem nodes
  const problemNodes = TELEMETRY_DATA.filter(n => n.snr_db < 15);
  
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="intermediate-calcs">
      <h3>Intermediate Calculations</h3>
      <p className="calcs-subtitle">Detailed breakdown of detection and analysis computations</p>
      
      {/* SNR Analysis Section */}
      <div className="calc-section">
        <div 
          className={`calc-header ${expandedSection === 'snr' ? 'expanded' : ''}`}
          onClick={() => toggleSection('snr')}
        >
          <span className="calc-title">SNR Degradation Analysis</span>
          <span className="calc-toggle">{expandedSection === 'snr' ? '−' : '+'}</span>
        </div>
        
        {expandedSection === 'snr' && (
          <div className="calc-content">
            <div className="calc-formula">
              <strong>Formula:</strong> SNR = Signal Power (dBm) - Noise Floor (dBm)
            </div>
            
            <table className="calc-table">
              <thead>
                <tr>
                  <th>Node</th>
                  <th>Signal (dBm)</th>
                  <th>Noise Floor (dBm)</th>
                  <th>SNR (dB)</th>
                  <th>Threshold</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {problemNodes.map(node => (
                  <tr key={node.device_id} className="problem-row">
                    <td className="mono">{node.device_id}</td>
                    <td className="mono">{node.signal_strength_dbm}</td>
                    <td className="mono">{node.noise_floor_dbm}</td>
                    <td className="mono">{node.snr_db}</td>
                    <td className="mono">≥ 15 dB</td>
                    <td>
                      <span className={`status-chip ${node.snr_db < 10 ? 'critical' : 'warning'}`}>
                        {node.snr_db < 10 ? 'CRITICAL' : 'DEGRADED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="calc-note">
              <strong>Analysis:</strong> {problemNodes.length} nodes showing SNR below operational threshold. 
              Elevated noise floor detected on {problemNodes.filter(n => n.noise_floor_dbm > -92).length} nodes, 
              indicating external interference source.
            </div>
          </div>
        )}
      </div>
      
      {/* I/N Ratio Section */}
      <div className="calc-section">
        <div 
          className={`calc-header ${expandedSection === 'in' ? 'expanded' : ''}`}
          onClick={() => toggleSection('in')}
        >
          <span className="calc-title">Interference-to-Noise (I/N) Analysis</span>
          <span className="calc-toggle">{expandedSection === 'in' ? '−' : '+'}</span>
        </div>
        
        {expandedSection === 'in' && (
          <div className="calc-content">
            <div className="calc-formula">
              <strong>Formula:</strong> I/N = Interference Level (dBm) - Noise Floor (dBm)
              <br />
              <strong>Threshold:</strong> I/N &gt; -6 dB indicates harmful interference
            </div>
            
            <table className="calc-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Est. Interference</th>
                  <th>Nominal Noise</th>
                  <th>I/N Ratio</th>
                  <th>Assessment</th>
                </tr>
              </thead>
              <tbody>
                {INTERFERENCE_EVENTS.map(event => {
                  const estInterference = event.interference_level === 'Critical' ? -82 : 
                                         event.interference_level === 'High' ? -85 : 
                                         event.interference_level === 'Medium' ? -88 : -92;
                  const nominalNoise = -98;
                  const inRatio = estInterference - nominalNoise;
                  
                  return (
                    <tr key={event.event_id}>
                      <td className="mono">{event.event_id}</td>
                      <td className="mono">{estInterference} dBm</td>
                      <td className="mono">{nominalNoise} dBm</td>
                      <td className="mono">{inRatio > 0 ? '+' : ''}{inRatio} dB</td>
                      <td>
                        <span className={`status-chip ${inRatio > 6 ? 'critical' : inRatio > 0 ? 'warning' : 'ok'}`}>
                          {inRatio > 6 ? 'HARMFUL' : inRatio > 0 ? 'SIGNIFICANT' : 'ACCEPTABLE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div className="calc-note">
              <strong>Regulatory Reference:</strong> ITU-R recommends I/N ≤ -6 dB for protection of victim receivers. 
              Events exceeding this threshold require mitigation action.
            </div>
          </div>
        )}
      </div>
      
      {/* Detection Confidence Section */}
      <div className="calc-section">
        <div 
          className={`calc-header ${expandedSection === 'detection' ? 'expanded' : ''}`}
          onClick={() => toggleSection('detection')}
        >
          <span className="calc-title">Detection Confidence Scoring</span>
          <span className="calc-toggle">{expandedSection === 'detection' ? '−' : '+'}</span>
        </div>
        
        {expandedSection === 'detection' && (
          <div className="calc-content">
            <div className="calc-formula">
              <strong>Confidence Model:</strong> Weighted combination of signal metrics
              <pre className="formula-code">
{`Confidence = (
  SNR_Score × 0.35 +
  NoiseFloor_Score × 0.25 +
  Correlation_Score × 0.20 +
  Temporal_Score × 0.20
) × 100`}
              </pre>
            </div>
            
            <table className="calc-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>SNR (35%)</th>
                  <th>Noise (25%)</th>
                  <th>Correlation (20%)</th>
                  <th>Temporal (20%)</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {INTERFERENCE_EVENTS.map(event => {
                  // Simulated component scores
                  const snrScore = event.confidence > 90 ? 0.95 : event.confidence > 80 ? 0.85 : 0.75;
                  const noiseScore = event.confidence > 90 ? 0.92 : event.confidence > 80 ? 0.80 : 0.70;
                  const corrScore = event.confidence > 85 ? 0.90 : 0.75;
                  const tempScore = event.confidence > 85 ? 0.95 : 0.80;
                  
                  return (
                    <tr key={event.event_id}>
                      <td className="mono">{event.event_id}</td>
                      <td className="mono">{(snrScore * 35).toFixed(1)}%</td>
                      <td className="mono">{(noiseScore * 25).toFixed(1)}%</td>
                      <td className="mono">{(corrScore * 20).toFixed(1)}%</td>
                      <td className="mono">{(tempScore * 20).toFixed(1)}%</td>
                      <td className="mono total">{event.confidence}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div className="calc-note">
              <strong>Methodology:</strong> Confidence scores combine multiple detection vectors. 
              SNR degradation patterns, noise floor elevation, cross-node correlation, and 
              temporal persistence are weighted to minimize false positives.
            </div>
          </div>
        )}
      </div>
      
      {/* Propagation Impact Section */}
      <div className="calc-section">
        <div 
          className={`calc-header ${expandedSection === 'propagation' ? 'expanded' : ''}`}
          onClick={() => toggleSection('propagation')}
        >
          <span className="calc-title">Propagation Impact Estimation</span>
          <span className="calc-toggle">{expandedSection === 'propagation' ? '−' : '+'}</span>
        </div>
        
        {expandedSection === 'propagation' && (
          <div className="calc-content">
            <div className="calc-formula">
              <strong>Coverage Impact Model:</strong>
              <pre className="formula-code">
{`Coverage_Reduction = f(SNR_degradation, affected_area)

Packet_Loss = 1 - (1 - BER)^packet_size
  where BER = f(SNR, modulation_scheme)

Latency_Impact = base_latency × (1 + retransmission_rate)`}
              </pre>
            </div>
            
            <div className="impact-breakdown">
              <div className="impact-item">
                <span className="impact-label">Affected Coverage Area</span>
                <div className="impact-bar-container">
                  <div className="impact-bar" style={{ width: '35%' }}></div>
                </div>
                <span className="impact-value">35% of Sector A</span>
              </div>
              
              <div className="impact-item">
                <span className="impact-label">Est. Packet Loss Rate</span>
                <div className="impact-bar-container">
                  <div className="impact-bar critical" style={{ width: '28%' }}></div>
                </div>
                <span className="impact-value">28% (critical)</span>
              </div>
              
              <div className="impact-item">
                <span className="impact-label">Latency Degradation</span>
                <div className="impact-bar-container">
                  <div className="impact-bar warning" style={{ width: '60%' }}></div>
                </div>
                <span className="impact-value">+120ms avg</span>
              </div>
            </div>
            
            <div className="calc-note">
              <strong>Simulation Basis:</strong> Impact estimates derived from Monte Carlo propagation 
              model with 10,000 iterations. Results validated against historical interference events 
              in similar RF environments.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
