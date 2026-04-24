import { useState, useEffect } from "react";

interface SpectrumVisualizationProps {
  selectedSector: string;
  isAnimating: boolean;
}

// Generate mock FFT data for spectrum display
function generateSpectrumData(centerFreq: number, noiseFloor: number, hasInterference: boolean) {
  const points: { freq: number; power: number }[] = [];
  const span = 100; // MHz span
  const startFreq = centerFreq - span / 2;
  
  for (let i = 0; i < 512; i++) {
    const freq = startFreq + (i / 512) * span;
    // Base noise floor with some variation
    let power = noiseFloor + (Math.random() - 0.5) * 4;
    
    // Add main signal peak at center frequency
    const distFromCenter = Math.abs(freq - centerFreq);
    if (distFromCenter < 10) {
      power += (10 - distFromCenter) * 3;
    }
    
    // Add interference if present
    if (hasInterference && distFromCenter > 5 && distFromCenter < 20) {
      power += Math.random() * 15 + 5;
    }
    
    points.push({ freq, power });
  }
  
  return points;
}

// Generate spectrogram data (time vs frequency)
function generateSpectrogramData(centerFreq: number, hasInterference: boolean) {
  const rows = 50; // time bins
  const cols = 128; // frequency bins
  const data: number[][] = [];
  
  for (let t = 0; t < rows; t++) {
    const row: number[] = [];
    for (let f = 0; f < cols; f++) {
      const freq = centerFreq - 50 + (f / cols) * 100;
      const distFromCenter = Math.abs(freq - centerFreq);
      
      // Base noise
      let power = -95 + Math.random() * 5;
      
      // Signal at center
      if (distFromCenter < 8) {
        power += 25 - distFromCenter * 2;
      }
      
      // Interference bursts (intermittent)
      if (hasInterference && t > 20 && t < 40 && distFromCenter > 10 && distFromCenter < 25) {
        power += 15 + Math.random() * 10;
      }
      
      row.push(power);
    }
    data.push(row);
  }
  
  return data;
}

export function SpectrumVisualization({ selectedSector, isAnimating }: SpectrumVisualizationProps) {
  const [spectrumData, setSpectrumData] = useState<{ freq: number; power: number }[]>([]);
  const [spectrogramData, setSpectrogramData] = useState<number[][]>([]);
  const [viewMode, setViewMode] = useState<"spectrum" | "spectrogram">("spectrum");
  
  const sectorConfig: Record<string, { centerFreq: number; noiseFloor: number; hasInterference: boolean }> = {
    "Sector_A": { centerFreq: 2450, noiseFloor: -88, hasInterference: true },
    "Sector_B": { centerFreq: 5180, noiseFloor: -92, hasInterference: true },
    "Sector_C": { centerFreq: 900, noiseFloor: -95, hasInterference: false },
  };
  
  const config = sectorConfig[selectedSector] || sectorConfig["Sector_A"];
  
  useEffect(() => {
    const updateData = () => {
      setSpectrumData(generateSpectrumData(config.centerFreq, config.noiseFloor, config.hasInterference));
      setSpectrogramData(generateSpectrogramData(config.centerFreq, config.hasInterference));
    };
    
    updateData();
    
    if (isAnimating) {
      const interval = setInterval(updateData, 500);
      return () => clearInterval(interval);
    }
  }, [selectedSector, isAnimating, config.centerFreq, config.noiseFloor, config.hasInterference]);
  
  // Find max/min for scaling
  const maxPower = Math.max(...spectrumData.map(d => d.power));
  const minPower = Math.min(...spectrumData.map(d => d.power));
  const powerRange = maxPower - minPower || 1;
  
  // Create SVG path for spectrum
  const pathD = spectrumData.map((d, i) => {
    const x = (i / spectrumData.length) * 100;
    const y = 100 - ((d.power - minPower) / powerRange) * 90;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  
  // Color scale for spectrogram
  const getColor = (power: number) => {
    const normalized = (power + 100) / 50; // -100 to -50 dBm range
    const clamped = Math.max(0, Math.min(1, normalized));
    
    if (clamped < 0.3) return `rgb(0, 0, ${Math.floor(clamped * 255 / 0.3)})`;
    if (clamped < 0.6) return `rgb(0, ${Math.floor((clamped - 0.3) * 255 / 0.3)}, 255)`;
    if (clamped < 0.8) return `rgb(${Math.floor((clamped - 0.6) * 255 / 0.2)}, 255, ${255 - Math.floor((clamped - 0.6) * 255 / 0.2)})`;
    return `rgb(255, ${255 - Math.floor((clamped - 0.8) * 255 / 0.2)}, 0)`;
  };

  return (
    <div className="spectrum-viz">
      <div className="viz-header">
        <h3>Spectrum Analyzer</h3>
        <div className="viz-controls">
          <button 
            className={`viz-btn ${viewMode === 'spectrum' ? 'active' : ''}`}
            onClick={() => setViewMode('spectrum')}
          >
            Spectrum
          </button>
          <button 
            className={`viz-btn ${viewMode === 'spectrogram' ? 'active' : ''}`}
            onClick={() => setViewMode('spectrogram')}
          >
            Spectrogram
          </button>
        </div>
      </div>
      
      <div className="viz-info">
        <span>Center: {config.centerFreq} MHz</span>
        <span>Span: 100 MHz</span>
        <span>RBW: 195 kHz</span>
        {config.hasInterference && <span className="interference-warn">INTERFERENCE DETECTED</span>}
      </div>
      
      {viewMode === "spectrum" ? (
        <div className="spectrum-plot">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(y => (
              <line key={`h-${y}`} x1="0" y1={y} x2="100" y2={y} className="grid-line" />
            ))}
            {[0, 25, 50, 75, 100].map(x => (
              <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="100" className="grid-line" />
            ))}
            
            {/* Noise floor reference */}
            <line x1="0" y1="75" x2="100" y2="75" className="noise-floor-line" />
            
            {/* Spectrum trace */}
            <path d={pathD} className="spectrum-trace" />
            
            {/* Fill under curve */}
            <path d={`${pathD} L 100 100 L 0 100 Z`} className="spectrum-fill" />
          </svg>
          
          {/* Y-axis labels */}
          <div className="y-axis">
            <span>{maxPower.toFixed(0)} dBm</span>
            <span>{((maxPower + minPower) / 2).toFixed(0)} dBm</span>
            <span>{minPower.toFixed(0)} dBm</span>
          </div>
          
          {/* X-axis labels */}
          <div className="x-axis">
            <span>{config.centerFreq - 50} MHz</span>
            <span>{config.centerFreq} MHz</span>
            <span>{config.centerFreq + 50} MHz</span>
          </div>
        </div>
      ) : (
        <div className="spectrogram-plot">
          <div className="spectrogram-canvas">
            {spectrogramData.map((row, t) => (
              <div key={t} className="spectrogram-row">
                {row.map((power, f) => (
                  <div 
                    key={f} 
                    className="spectrogram-cell"
                    style={{ backgroundColor: getColor(power) }}
                  />
                ))}
              </div>
            ))}
          </div>
          
          {/* Axis labels */}
          <div className="spectrogram-y-label">Time →</div>
          <div className="x-axis">
            <span>{config.centerFreq - 50} MHz</span>
            <span>{config.centerFreq} MHz</span>
            <span>{config.centerFreq + 50} MHz</span>
          </div>
          
          {/* Color scale legend */}
          <div className="color-scale">
            <span>-100 dBm</span>
            <div className="color-bar" />
            <span>-50 dBm</span>
          </div>
        </div>
      )}
      
      {/* Measurements panel */}
      <div className="measurements">
        <div className="measurement">
          <span className="meas-label">Peak</span>
          <span className="meas-value">{maxPower.toFixed(1)} dBm</span>
        </div>
        <div className="measurement">
          <span className="meas-label">Noise Floor</span>
          <span className="meas-value">{config.noiseFloor} dBm</span>
        </div>
        <div className="measurement">
          <span className="meas-label">SNR</span>
          <span className="meas-value">{(maxPower - config.noiseFloor).toFixed(1)} dB</span>
        </div>
        <div className="measurement">
          <span className="meas-label">Channel BW</span>
          <span className="meas-value">20 MHz</span>
        </div>
      </div>
    </div>
  );
}
