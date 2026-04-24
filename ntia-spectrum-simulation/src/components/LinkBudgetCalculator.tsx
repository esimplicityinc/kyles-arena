import { useState } from "react";

interface LinkBudgetResult {
  txPower: number;
  txGain: number;
  eirp: number;
  pathLoss: number;
  rxGain: number;
  rxPower: number;
  noiseFloor: number;
  snr: number;
  margin: number;
}

interface LinkBudgetCalculatorProps {
  selectedEvent?: {
    sector: string;
    frequency: number;
  };
}

export function LinkBudgetCalculator({ selectedEvent }: LinkBudgetCalculatorProps) {
  const [txPower, setTxPower] = useState(30); // dBm
  const [txGain, setTxGain] = useState(12); // dBi
  const [rxGain, setRxGain] = useState(6); // dBi
  const [distance, setDistance] = useState(5); // km
  const [frequency, setFrequency] = useState(selectedEvent?.frequency || 2450); // MHz
  
  // Free Space Path Loss calculation
  const calculateFSPL = (distKm: number, freqMHz: number): number => {
    // FSPL (dB) = 20*log10(d) + 20*log10(f) + 32.45
    return 20 * Math.log10(distKm) + 20 * Math.log10(freqMHz) + 32.45;
  };
  
  // Calculate full link budget
  const calculateLinkBudget = (): LinkBudgetResult => {
    const eirp = txPower + txGain;
    const pathLoss = calculateFSPL(distance, frequency);
    const rxPower = eirp - pathLoss + rxGain;
    const noiseFloor = -174 + 10 * Math.log10(20e6); // Thermal noise for 20 MHz BW
    const snr = rxPower - noiseFloor;
    const requiredSnr = 15; // dB for reliable comms
    const margin = snr - requiredSnr;
    
    return {
      txPower,
      txGain,
      eirp,
      pathLoss,
      rxGain,
      rxPower,
      noiseFloor,
      snr,
      margin
    };
  };
  
  const result = calculateLinkBudget();
  
  return (
    <div className="link-budget">
      <h3>Link Budget Calculator</h3>
      
      <div className="link-budget-layout">
        {/* Input parameters */}
        <div className="lb-inputs">
          <h4>System Parameters</h4>
          
          <div className="lb-input-group">
            <label>Tx Power (dBm)</label>
            <input 
              type="range" 
              min="0" 
              max="50" 
              value={txPower}
              onChange={(e) => setTxPower(Number(e.target.value))}
            />
            <span className="lb-value">{txPower}</span>
          </div>
          
          <div className="lb-input-group">
            <label>Tx Antenna Gain (dBi)</label>
            <input 
              type="range" 
              min="0" 
              max="30" 
              value={txGain}
              onChange={(e) => setTxGain(Number(e.target.value))}
            />
            <span className="lb-value">{txGain}</span>
          </div>
          
          <div className="lb-input-group">
            <label>Rx Antenna Gain (dBi)</label>
            <input 
              type="range" 
              min="0" 
              max="30" 
              value={rxGain}
              onChange={(e) => setRxGain(Number(e.target.value))}
            />
            <span className="lb-value">{rxGain}</span>
          </div>
          
          <div className="lb-input-group">
            <label>Distance (km)</label>
            <input 
              type="range" 
              min="0.1" 
              max="50" 
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
            />
            <span className="lb-value">{distance.toFixed(1)}</span>
          </div>
          
          <div className="lb-input-group">
            <label>Frequency (MHz)</label>
            <select value={frequency} onChange={(e) => setFrequency(Number(e.target.value))}>
              <option value={900}>900 MHz (Sector C)</option>
              <option value={2450}>2450 MHz (Sector A)</option>
              <option value={5180}>5180 MHz (Sector B)</option>
            </select>
          </div>
        </div>
        
        {/* Link budget chain visualization */}
        <div className="lb-chain">
          <h4>Signal Chain</h4>
          
          <div className="chain-diagram">
            <div className="chain-block tx">
              <div className="chain-label">Transmitter</div>
              <div className="chain-value">{txPower} dBm</div>
            </div>
            
            <div className="chain-arrow">
              <span>+{txGain} dBi</span>
              →
            </div>
            
            <div className="chain-block eirp">
              <div className="chain-label">EIRP</div>
              <div className="chain-value">{result.eirp.toFixed(1)} dBm</div>
            </div>
            
            <div className="chain-arrow loss">
              <span>-{result.pathLoss.toFixed(1)} dB</span>
              →
            </div>
            
            <div className="chain-block path">
              <div className="chain-label">Path Loss</div>
              <div className="chain-sublabel">FSPL @ {distance} km</div>
            </div>
            
            <div className="chain-arrow">
              <span>+{rxGain} dBi</span>
              →
            </div>
            
            <div className={`chain-block rx ${result.margin > 0 ? 'good' : 'bad'}`}>
              <div className="chain-label">Receiver</div>
              <div className="chain-value">{result.rxPower.toFixed(1)} dBm</div>
            </div>
          </div>
        </div>
        
        {/* Results summary */}
        <div className="lb-results">
          <h4>Link Analysis</h4>
          
          <div className="lb-result-grid">
            <div className="lb-result">
              <span className="lb-result-label">EIRP</span>
              <span className="lb-result-value">{result.eirp.toFixed(1)} dBm</span>
            </div>
            <div className="lb-result">
              <span className="lb-result-label">Free Space Path Loss</span>
              <span className="lb-result-value">{result.pathLoss.toFixed(1)} dB</span>
            </div>
            <div className="lb-result">
              <span className="lb-result-label">Received Power</span>
              <span className="lb-result-value">{result.rxPower.toFixed(1)} dBm</span>
            </div>
            <div className="lb-result">
              <span className="lb-result-label">Thermal Noise Floor</span>
              <span className="lb-result-value">{result.noiseFloor.toFixed(1)} dBm</span>
            </div>
            <div className="lb-result">
              <span className="lb-result-label">SNR</span>
              <span className={`lb-result-value ${result.snr > 20 ? 'good' : result.snr > 10 ? 'warn' : 'bad'}`}>
                {result.snr.toFixed(1)} dB
              </span>
            </div>
            <div className="lb-result">
              <span className="lb-result-label">Link Margin</span>
              <span className={`lb-result-value ${result.margin > 10 ? 'good' : result.margin > 0 ? 'warn' : 'bad'}`}>
                {result.margin.toFixed(1)} dB
              </span>
            </div>
          </div>
          
          {/* Link status indicator */}
          <div className={`lb-status ${result.margin > 10 ? 'excellent' : result.margin > 0 ? 'marginal' : 'failed'}`}>
            {result.margin > 10 ? '✓ Link Viable — Excellent Margin' : 
             result.margin > 0 ? '⚠ Link Viable — Marginal' : 
             '✗ Link Failed — Insufficient Margin'}
          </div>
        </div>
      </div>
      
      {/* Formula reference */}
      <div className="lb-formula">
        <strong>FSPL Formula:</strong> 20·log₁₀(d) + 20·log₁₀(f) + 32.45 dB, where d = km, f = MHz
      </div>
    </div>
  );
}
