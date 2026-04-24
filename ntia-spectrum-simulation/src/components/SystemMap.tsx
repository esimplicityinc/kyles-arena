import { useMemo } from "react";
import type { Transmitter, Receiver, PropagationParams, InterferenceAnalysisResult } from "../types/rfSystems";
import { calculateInterferenceAnalysis } from "../utils/rfCalculations";

interface SystemMapProps {
  transmitters: Transmitter[];
  receivers: Receiver[];
  propagation: PropagationParams;
  selectedTx?: string | null;
  selectedRx?: string | null;
  onSelectTx?: (id: string | null) => void;
  onSelectRx?: (id: string | null) => void;
}

export function SystemMap({ 
  transmitters, 
  receivers, 
  propagation,
  selectedTx,
  selectedRx,
  onSelectTx,
  onSelectRx
}: SystemMapProps) {
  // Calculate I/N results for coloring
  const interferenceResults = useMemo(() => {
    if (receivers.length === 0 || transmitters.length === 0) return new Map();
    
    const results = new Map<string, InterferenceAnalysisResult>();
    receivers.forEach(rx => {
      results.set(rx.id, calculateInterferenceAnalysis(rx, null, transmitters, propagation));
    });
    return results;
  }, [transmitters, receivers, propagation]);

  // Calculate map bounds
  const bounds = useMemo(() => {
    const allPoints = [...transmitters, ...receivers];
    if (allPoints.length === 0) {
      return { minLat: 38.85, maxLat: 38.95, minLon: -77.1, maxLon: -77.0 };
    }
    
    const lats = allPoints.map(p => p.latitude);
    const lons = allPoints.map(p => p.longitude);
    const padding = 0.01;
    
    return {
      minLat: Math.min(...lats) - padding,
      maxLat: Math.max(...lats) + padding,
      minLon: Math.min(...lons) - padding,
      maxLon: Math.max(...lons) + padding
    };
  }, [transmitters, receivers]);

  // Convert lat/lon to SVG coordinates
  const toSvg = (lat: number, lon: number): { x: number; y: number } => {
    const width = 600;
    const height = 400;
    const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width;
    const y = height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height;
    return { x, y };
  };

  // Generate interference lines
  const interferenceLines = useMemo(() => {
    const lines: { txId: string; rxId: string; x1: number; y1: number; x2: number; y2: number; status: string }[] = [];
    
    transmitters.forEach(tx => {
      receivers.forEach(rx => {
        const txPos = toSvg(tx.latitude, tx.longitude);
        const rxPos = toSvg(rx.latitude, rx.longitude);
        const result = interferenceResults.get(rx.id);
        const intfResult = result?.interferers.find((i: { interferer_id: string }) => i.interferer_id === tx.id);
        
        // Only show lines where interference is significant
        if (intfResult && intfResult.interference_power_dBm > (result?.noise_floor_dBm || -120) - 10) {
          lines.push({
            txId: tx.id,
            rxId: rx.id,
            x1: txPos.x,
            y1: txPos.y,
            x2: rxPos.x,
            y2: rxPos.y,
            status: result?.status || 'compliant'
          });
        }
      });
    });
    
    return lines;
  }, [transmitters, receivers, interferenceResults, bounds]);

  // Generate antenna beam wedges
  const antennaBeams = useMemo(() => {
    return transmitters.map(tx => {
      const pos = toSvg(tx.latitude, tx.longitude);
      const beamLength = 50; // pixels
      const halfBeam = tx.antenna.beamwidth_deg / 2;
      const az = tx.antenna.azimuth_deg;
      
      // Convert azimuth to SVG angle (0° = up, clockwise)
      const startAngle = (90 - az - halfBeam) * Math.PI / 180;
      const endAngle = (90 - az + halfBeam) * Math.PI / 180;
      
      const x1 = pos.x + beamLength * Math.cos(startAngle);
      const y1 = pos.y - beamLength * Math.sin(startAngle);
      const x2 = pos.x + beamLength * Math.cos(endAngle);
      const y2 = pos.y - beamLength * Math.sin(endAngle);
      
      return {
        id: tx.id,
        path: `M ${pos.x},${pos.y} L ${x1},${y1} A ${beamLength},${beamLength} 0 0,1 ${x2},${y2} Z`
      };
    });
  }, [transmitters, bounds]);

  if (transmitters.length === 0 && receivers.length === 0) {
    return (
      <div className="system-map empty">
        <p>No systems defined. Add transmitters and receivers to view the map.</p>
      </div>
    );
  }

  return (
    <div className="system-map">
      <svg viewBox="0 0 600 400" className="map-svg">
        {/* Grid */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="var(--border)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="600" height="400" fill="var(--bg)" />
        <rect width="600" height="400" fill="url(#grid)" />

        {/* Interference Lines */}
        {interferenceLines.map((line, idx) => (
          <line
            key={`line-${idx}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            className={`interference-line ${line.status}`}
            strokeWidth={line.status === 'exceeded' ? 2 : 1}
          />
        ))}

        {/* Antenna Beams */}
        {antennaBeams.map(beam => (
          <path
            key={`beam-${beam.id}`}
            d={beam.path}
            className={`antenna-beam ${selectedTx === beam.id ? 'selected' : ''}`}
          />
        ))}

        {/* Transmitters */}
        {transmitters.map(tx => {
          const pos = toSvg(tx.latitude, tx.longitude);
          return (
            <g 
              key={tx.id} 
              className={`tx-marker ${selectedTx === tx.id ? 'selected' : ''}`}
              onClick={() => onSelectTx?.(selectedTx === tx.id ? null : tx.id)}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={pos.x} cy={pos.y} r="12" className="marker-bg" />
              <text x={pos.x} y={pos.y + 1} className="marker-icon">📡</text>
              <text x={pos.x} y={pos.y + 25} className="marker-label">{tx.id}</text>
            </g>
          );
        })}

        {/* Receivers */}
        {receivers.map(rx => {
          const pos = toSvg(rx.latitude, rx.longitude);
          const result = interferenceResults.get(rx.id);
          const status = result?.status || 'compliant';
          
          return (
            <g 
              key={rx.id} 
              className={`rx-marker ${status} ${selectedRx === rx.id ? 'selected' : ''}`}
              onClick={() => onSelectRx?.(selectedRx === rx.id ? null : rx.id)}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={pos.x} cy={pos.y} r="12" className="marker-bg" />
              <text x={pos.x} y={pos.y + 1} className="marker-icon">📻</text>
              <text x={pos.x} y={pos.y + 25} className="marker-label">{rx.id}</text>
              {status === 'exceeded' && (
                <circle cx={pos.x} cy={pos.y} r="18" className="warning-ring" />
              )}
            </g>
          );
        })}

        {/* Scale */}
        <g className="map-scale" transform="translate(20, 380)">
          <line x1="0" y1="0" x2="50" y2="0" stroke="var(--text-muted)" strokeWidth="2" />
          <line x1="0" y1="-5" x2="0" y2="5" stroke="var(--text-muted)" strokeWidth="2" />
          <line x1="50" y1="-5" x2="50" y2="5" stroke="var(--text-muted)" strokeWidth="2" />
          <text x="25" y="-8" textAnchor="middle" className="scale-text">
            ~{((bounds.maxLon - bounds.minLon) * 111 * 50 / 600).toFixed(1)} km
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-icon">📡</span>
          <span>Transmitter</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon">📻</span>
          <span>Receiver</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot compliant"></span>
          <span>Compliant</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot marginal"></span>
          <span>Marginal</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot exceeded"></span>
          <span>Exceeded</span>
        </div>
      </div>
    </div>
  );
}
