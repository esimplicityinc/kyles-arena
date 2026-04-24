import { useState } from "react";

interface PropagationModelProps {
  selectedSector?: string;
}

export function PropagationModel({ selectedSector: _selectedSector }: PropagationModelProps) {
  const [model, setModel] = useState<"fspl" | "hata" | "cost231">("fspl");
  const [frequency, setFrequency] = useState(2450); // MHz
  const [distance, setDistance] = useState(5); // km
  const [txHeight, setTxHeight] = useState(30); // meters
  const [rxHeight, setRxHeight] = useState(1.5); // meters
  const [environment, setEnvironment] = useState<"urban" | "suburban" | "rural">("suburban");
  
  // Free Space Path Loss
  const calculateFSPL = (d: number, f: number): number => {
    return 20 * Math.log10(d) + 20 * Math.log10(f) + 32.45;
  };
  
  // Okumura-Hata Model (simplified)
  const calculateHata = (d: number, f: number, hb: number, hm: number, env: string): number => {
    // Valid for 150-1500 MHz, we'll extrapolate
    const aHm = (1.1 * Math.log10(f) - 0.7) * hm - (1.56 * Math.log10(f) - 0.8);
    
    let pathLoss = 69.55 + 26.16 * Math.log10(f) - 13.82 * Math.log10(hb) - aHm +
                   (44.9 - 6.55 * Math.log10(hb)) * Math.log10(d);
    
    // Environment corrections
    if (env === "suburban") {
      pathLoss -= 2 * Math.pow(Math.log10(f / 28), 2) + 5.4;
    } else if (env === "rural") {
      pathLoss -= 4.78 * Math.pow(Math.log10(f), 2) + 18.33 * Math.log10(f) - 40.94;
    }
    
    return pathLoss;
  };
  
  // COST-231 Hata Model (for higher frequencies)
  const calculateCOST231 = (d: number, f: number, hb: number, hm: number, env: string): number => {
    const aHm = (1.1 * Math.log10(f) - 0.7) * hm - (1.56 * Math.log10(f) - 0.8);
    const cm = env === "urban" ? 3 : 0;
    
    return 46.3 + 33.9 * Math.log10(f) - 13.82 * Math.log10(hb) - aHm +
           (44.9 - 6.55 * Math.log10(hb)) * Math.log10(d) + cm;
  };
  
  // Calculate all models
  const results = {
    fspl: calculateFSPL(distance, frequency),
    hata: calculateHata(distance, Math.min(frequency, 1500), txHeight, rxHeight, environment),
    cost231: calculateCOST231(distance, frequency, txHeight, rxHeight, environment)
  };
  
  const selectedLoss = results[model];
  
  // Generate path loss vs distance curve
  const generateCurve = (calcFn: (d: number) => number) => {
    const points: { distance: number; loss: number }[] = [];
    for (let d = 0.1; d <= 20; d += 0.2) {
      points.push({ distance: d, loss: calcFn(d) });
    }
    return points;
  };
  
  const fsplCurve = generateCurve(d => calculateFSPL(d, frequency));
  const hataCurve = generateCurve(d => calculateHata(d, Math.min(frequency, 1500), txHeight, rxHeight, environment));
  const cost231Curve = generateCurve(d => calculateCOST231(d, frequency, txHeight, rxHeight, environment));
  
  // SVG path generation
  const generateSVGPath = (curve: { distance: number; loss: number }[], color: string) => {
    const maxDist = 20;
    const maxLoss = 180;
    const minLoss = 40;
    
    const pathD = curve.map((point, i) => {
      const x = (point.distance / maxDist) * 100;
      const y = ((point.loss - minLoss) / (maxLoss - minLoss)) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    return <path d={pathD} stroke={color} fill="none" strokeWidth="2" />;
  };

  return (
    <div className="propagation-model">
      <h3>Propagation Model Analysis</h3>
      
      <div className="prop-layout">
        {/* Controls */}
        <div className="prop-controls">
          <h4>Model Parameters</h4>
          
          <div className="prop-input-group">
            <label>Propagation Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value as typeof model)}>
              <option value="fspl">Free Space Path Loss</option>
              <option value="hata">Okumura-Hata</option>
              <option value="cost231">COST-231 Hata</option>
            </select>
          </div>
          
          <div className="prop-input-group">
            <label>Frequency (MHz)</label>
            <input 
              type="number" 
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              min="100"
              max="6000"
            />
          </div>
          
          <div className="prop-input-group">
            <label>Distance (km)</label>
            <input 
              type="range" 
              min="0.1" 
              max="20" 
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
            />
            <span className="prop-value">{distance.toFixed(1)} km</span>
          </div>
          
          <div className="prop-input-group">
            <label>Tx Antenna Height (m)</label>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={txHeight}
              onChange={(e) => setTxHeight(Number(e.target.value))}
            />
            <span className="prop-value">{txHeight} m</span>
          </div>
          
          <div className="prop-input-group">
            <label>Rx Antenna Height (m)</label>
            <input 
              type="range" 
              min="1" 
              max="10" 
              step="0.5"
              value={rxHeight}
              onChange={(e) => setRxHeight(Number(e.target.value))}
            />
            <span className="prop-value">{rxHeight} m</span>
          </div>
          
          <div className="prop-input-group">
            <label>Environment</label>
            <select value={environment} onChange={(e) => setEnvironment(e.target.value as typeof environment)}>
              <option value="urban">Urban</option>
              <option value="suburban">Suburban</option>
              <option value="rural">Rural / Open</option>
            </select>
          </div>
        </div>
        
        {/* Results and chart */}
        <div className="prop-results">
          {/* Model comparison */}
          <div className="model-comparison">
            <div className={`model-result ${model === 'fspl' ? 'selected' : ''}`} onClick={() => setModel('fspl')}>
              <div className="model-name">Free Space</div>
              <div className="model-loss">{results.fspl.toFixed(1)} dB</div>
            </div>
            <div className={`model-result ${model === 'hata' ? 'selected' : ''}`} onClick={() => setModel('hata')}>
              <div className="model-name">Okumura-Hata</div>
              <div className="model-loss">{results.hata.toFixed(1)} dB</div>
            </div>
            <div className={`model-result ${model === 'cost231' ? 'selected' : ''}`} onClick={() => setModel('cost231')}>
              <div className="model-name">COST-231</div>
              <div className="model-loss">{results.cost231.toFixed(1)} dB</div>
            </div>
          </div>
          
          {/* Path loss chart */}
          <div className="prop-chart">
            <h4>Path Loss vs Distance</h4>
            <svg viewBox="0 0 100 100" className="prop-svg">
              {/* Grid */}
              {[20, 40, 60, 80].map(y => (
                <line key={`h-${y}`} x1="0" y1={y} x2="100" y2={y} className="grid-line" />
              ))}
              {[20, 40, 60, 80].map(x => (
                <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="100" className="grid-line" />
              ))}
              
              {/* Curves */}
              {generateSVGPath(fsplCurve, '#3b82f6')}
              {generateSVGPath(hataCurve, '#10b981')}
              {generateSVGPath(cost231Curve, '#f59e0b')}
              
              {/* Current point marker */}
              <circle 
                cx={(distance / 20) * 100} 
                cy={((selectedLoss - 40) / 140) * 100} 
                r="4" 
                className="current-point"
              />
            </svg>
            
            {/* Axis labels */}
            <div className="chart-x-axis">
              <span>0</span>
              <span>5 km</span>
              <span>10 km</span>
              <span>15 km</span>
              <span>20 km</span>
            </div>
            <div className="chart-y-axis">
              <span>40 dB</span>
              <span>75 dB</span>
              <span>110 dB</span>
              <span>145 dB</span>
              <span>180 dB</span>
            </div>
            
            {/* Legend */}
            <div className="chart-legend">
              <div className="legend-item"><span className="legend-color fspl"></span> FSPL</div>
              <div className="legend-item"><span className="legend-color hata"></span> Hata</div>
              <div className="legend-item"><span className="legend-color cost231"></span> COST-231</div>
            </div>
          </div>
          
          {/* Model info */}
          <div className="model-info">
            {model === 'fspl' && (
              <p><strong>Free Space Path Loss:</strong> Theoretical minimum loss. Assumes no obstructions, reflections, or atmospheric effects. L = 20·log(d) + 20·log(f) + 32.45</p>
            )}
            {model === 'hata' && (
              <p><strong>Okumura-Hata:</strong> Empirical model for urban/suburban propagation (150-1500 MHz). Accounts for building clutter and terrain.</p>
            )}
            {model === 'cost231' && (
              <p><strong>COST-231 Hata:</strong> Extended Hata model for 1500-2000 MHz. Adds correction for metropolitan areas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
