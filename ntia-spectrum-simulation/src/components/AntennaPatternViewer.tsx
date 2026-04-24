import { useState } from "react";

interface AntennaPatternViewerProps {
  selectedSector?: string;
}

export function AntennaPatternViewer({ selectedSector: _selectedSector }: AntennaPatternViewerProps) {
  const [patternType, setPatternType] = useState<"azimuth" | "elevation" | "3d">("azimuth");
  const [beamwidth, setBeamwidth] = useState(65); // degrees
  const [gain, setGain] = useState(12); // dBi
  const [tilt, setTilt] = useState(0); // degrees
  const [azimuth, setAzimuth] = useState(0); // degrees
  
  // Generate antenna pattern points (simplified cosine pattern)
  const generatePattern = (bw: number, peakGain: number, angleOffset: number = 0) => {
    const points: { angle: number; gain: number }[] = [];
    
    for (let angle = 0; angle < 360; angle += 2) {
      const adjustedAngle = angle - angleOffset;
      const normalizedAngle = Math.abs(((adjustedAngle + 180) % 360) - 180);
      
      // Main lobe using cosine approximation
      let g = peakGain;
      
      if (normalizedAngle <= bw / 2) {
        // Main lobe
        g = peakGain * Math.cos((normalizedAngle / (bw / 2)) * (Math.PI / 4));
      } else if (normalizedAngle <= bw) {
        // First sidelobe region
        g = peakGain - 15 - (normalizedAngle - bw / 2) * 0.3;
      } else {
        // Back lobe and far sidelobes
        g = peakGain - 25 - Math.random() * 5;
      }
      
      points.push({ angle, gain: Math.max(g, peakGain - 40) });
    }
    
    return points;
  };
  
  const patternData = generatePattern(beamwidth, gain, azimuth);
  
  // Convert polar to cartesian for SVG
  const polarToCartesian = (angle: number, radius: number, centerX: number, centerY: number) => {
    const radians = (angle - 90) * Math.PI / 180;
    return {
      x: centerX + radius * Math.cos(radians),
      y: centerY + radius * Math.sin(radians)
    };
  };
  
  // Generate SVG path for polar plot
  const generatePolarPath = () => {
    const centerX = 150;
    const centerY = 150;
    const maxRadius = 120;
    const minGain = gain - 40;
    const gainRange = 40;
    
    return patternData.map((point, i) => {
      const normalizedGain = (point.gain - minGain) / gainRange;
      const radius = normalizedGain * maxRadius;
      const { x, y } = polarToCartesian(point.angle, radius, centerX, centerY);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ') + ' Z';
  };
  
  // Generate 3D visualization (simplified isometric)
  const generate3DPattern = () => {
    const points: { x: number; y: number; z: number; gain: number }[] = [];
    
    for (let el = -90; el <= 90; el += 10) {
      for (let az = 0; az < 360; az += 10) {
        // Simplified 3D pattern
        const elRad = el * Math.PI / 180;
        const azRad = az * Math.PI / 180;
        
        // Pattern gain
        const azOffset = Math.abs(((az - azimuth + 180) % 360) - 180);
        const elOffset = Math.abs(el - tilt);
        
        let g = gain;
        const totalOffset = Math.sqrt(azOffset * azOffset + elOffset * elOffset);
        
        if (totalOffset <= beamwidth / 2) {
          g = gain * (1 - (totalOffset / beamwidth) * 0.5);
        } else {
          g = gain - 20 - totalOffset * 0.2;
        }
        
        const r = Math.max(0.1, (g + 40) / 50);
        
        points.push({
          x: r * Math.cos(elRad) * Math.sin(azRad),
          y: r * Math.sin(elRad),
          z: r * Math.cos(elRad) * Math.cos(azRad),
          gain: g
        });
      }
    }
    
    return points;
  };
  
  const points3D = generate3DPattern();

  return (
    <div className="antenna-viewer">
      <h3>Antenna Pattern Viewer</h3>
      
      <div className="antenna-layout">
        {/* Controls */}
        <div className="antenna-controls">
          <h4>Pattern Parameters</h4>
          
          <div className="antenna-input-group">
            <label>View Mode</label>
            <div className="view-mode-btns">
              <button 
                className={patternType === 'azimuth' ? 'active' : ''} 
                onClick={() => setPatternType('azimuth')}
              >
                Azimuth
              </button>
              <button 
                className={patternType === 'elevation' ? 'active' : ''} 
                onClick={() => setPatternType('elevation')}
              >
                Elevation
              </button>
              <button 
                className={patternType === '3d' ? 'active' : ''} 
                onClick={() => setPatternType('3d')}
              >
                3D
              </button>
            </div>
          </div>
          
          <div className="antenna-input-group">
            <label>Peak Gain (dBi)</label>
            <input 
              type="range" 
              min="0" 
              max="30" 
              value={gain}
              onChange={(e) => setGain(Number(e.target.value))}
            />
            <span className="antenna-value">{gain}</span>
          </div>
          
          <div className="antenna-input-group">
            <label>3dB Beamwidth (°)</label>
            <input 
              type="range" 
              min="10" 
              max="120" 
              value={beamwidth}
              onChange={(e) => setBeamwidth(Number(e.target.value))}
            />
            <span className="antenna-value">{beamwidth}</span>
          </div>
          
          <div className="antenna-input-group">
            <label>Azimuth Pointing (°)</label>
            <input 
              type="range" 
              min="0" 
              max="360" 
              value={azimuth}
              onChange={(e) => setAzimuth(Number(e.target.value))}
            />
            <span className="antenna-value">{azimuth}</span>
          </div>
          
          <div className="antenna-input-group">
            <label>Electrical Tilt (°)</label>
            <input 
              type="range" 
              min="-45" 
              max="45" 
              value={tilt}
              onChange={(e) => setTilt(Number(e.target.value))}
            />
            <span className="antenna-value">{tilt}</span>
          </div>
          
          {/* Metrics */}
          <div className="antenna-metrics">
            <div className="antenna-metric">
              <span className="metric-label">Peak Gain</span>
              <span className="metric-value">{gain} dBi</span>
            </div>
            <div className="antenna-metric">
              <span className="metric-label">HPBW</span>
              <span className="metric-value">{beamwidth}°</span>
            </div>
            <div className="antenna-metric">
              <span className="metric-label">Front-to-Back</span>
              <span className="metric-value">{gain + 25} dB</span>
            </div>
            <div className="antenna-metric">
              <span className="metric-label">First Sidelobe</span>
              <span className="metric-value">-{15 + Math.floor(Math.random() * 3)} dB</span>
            </div>
          </div>
        </div>
        
        {/* Pattern display */}
        <div className="antenna-display">
          {(patternType === 'azimuth' || patternType === 'elevation') && (
            <svg viewBox="0 0 300 300" className="polar-plot">
              {/* Grid circles */}
              {[0.25, 0.5, 0.75, 1].map(r => (
                <circle 
                  key={r} 
                  cx="150" 
                  cy="150" 
                  r={r * 120} 
                  className="grid-circle" 
                />
              ))}
              
              {/* Grid lines (cardinal directions) */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
                const { x, y } = polarToCartesian(angle, 120, 150, 150);
                return (
                  <line 
                    key={angle} 
                    x1="150" 
                    y1="150" 
                    x2={x} 
                    y2={y} 
                    className="grid-line" 
                  />
                );
              })}
              
              {/* Angle labels */}
              {[0, 90, 180, 270].map(angle => {
                const { x, y } = polarToCartesian(angle, 135, 150, 150);
                return (
                  <text key={angle} x={x} y={y} className="angle-label">
                    {angle}°
                  </text>
                );
              })}
              
              {/* Gain labels */}
              <text x="152" y="35" className="gain-label">{gain} dBi</text>
              <text x="152" y="65" className="gain-label">{gain - 10}</text>
              <text x="152" y="95" className="gain-label">{gain - 20}</text>
              <text x="152" y="125" className="gain-label">{gain - 30}</text>
              
              {/* Pattern */}
              <path d={generatePolarPath()} className="antenna-pattern" />
              
              {/* Center point */}
              <circle cx="150" cy="150" r="3" className="center-point" />
            </svg>
          )}
          
          {patternType === '3d' && (
            <div className="pattern-3d">
              <svg viewBox="0 0 300 300" className="isometric-plot">
                {/* Axes */}
                <line x1="150" y1="250" x2="150" y2="50" className="axis-line" />
                <line x1="50" y1="200" x2="250" y2="200" className="axis-line" />
                <line x1="75" y1="225" x2="225" y2="125" className="axis-line" />
                
                {/* 3D points */}
                {points3D.map((p, i) => {
                  // Isometric projection
                  const screenX = 150 + (p.x - p.z) * 50;
                  const screenY = 150 - p.y * 50 + (p.x + p.z) * 25;
                  
                  const normalizedGain = (p.gain + 40) / 50;
                  const hue = 240 - normalizedGain * 240; // Blue to red
                  
                  return (
                    <circle 
                      key={i} 
                      cx={screenX} 
                      cy={screenY} 
                      r="2"
                      fill={`hsl(${hue}, 80%, 50%)`}
                      opacity="0.7"
                    />
                  );
                })}
                
                {/* Labels */}
                <text x="150" y="40" className="axis-label">Z</text>
                <text x="260" y="200" className="axis-label">X</text>
                <text x="230" y="115" className="axis-label">Y</text>
              </svg>
              
              <div className="pattern-3d-info">
                Rotate controls to change pointing direction
              </div>
            </div>
          )}
          
          <div className="pattern-title">
            {patternType === 'azimuth' && 'Azimuth Pattern (H-Plane)'}
            {patternType === 'elevation' && 'Elevation Pattern (E-Plane)'}
            {patternType === '3d' && '3D Radiation Pattern'}
          </div>
        </div>
      </div>
    </div>
  );
}
