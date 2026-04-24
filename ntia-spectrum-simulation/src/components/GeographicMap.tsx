import { useState } from "react";
import { TELEMETRY_DATA, INTERFERENCE_EVENTS } from "../data/mockSpectrumData";

interface GeographicMapProps {
  analysisComplete: boolean;
}

export function GeographicMap({ analysisComplete }: GeographicMapProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showCoverage, setShowCoverage] = useState(true);
  const [showInterference, setShowInterference] = useState(true);
  
  // Sector configurations
  const sectors = [
    { id: "Sector_A", name: "Sector A", lat: 39.41, lon: -77.41, color: "#3b82f6", freq: 2450 },
    { id: "Sector_B", name: "Sector B", lat: 39.43, lon: -77.38, color: "#10b981", freq: 5180 },
    { id: "Sector_C", name: "Sector C", lat: 39.39, lon: -77.44, color: "#f59e0b", freq: 900 },
  ];
  
  // Map bounds
  const mapBounds = {
    minLat: 39.35,
    maxLat: 39.48,
    minLon: -77.50,
    maxLon: -77.32
  };
  
  // Convert lat/lon to SVG coordinates
  const toSVG = (lat: number, lon: number) => {
    const x = ((lon - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * 100;
    const y = 100 - ((lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat)) * 100;
    return { x, y };
  };
  
  // Get node status based on SNR
  const getNodeStatus = (snr: number): "good" | "warning" | "critical" => {
    if (snr < 10) return "critical";
    if (snr < 15) return "warning";
    return "good";
  };
  
  // Get affected nodes from interference events
  const affectedNodes = new Set(
    INTERFERENCE_EVENTS.flatMap(e => e.affected_nodes)
  );
  
  // Selected node data
  const selectedNodeData = selectedNode 
    ? TELEMETRY_DATA.find(d => d.device_id === selectedNode) 
    : null;

  return (
    <div className="geographic-map">
      <h3>Geographic Coverage Map</h3>
      
      <div className="map-controls">
        <label className="map-toggle">
          <input 
            type="checkbox" 
            checked={showCoverage} 
            onChange={(e) => setShowCoverage(e.target.checked)} 
          />
          Show Coverage Areas
        </label>
        <label className="map-toggle">
          <input 
            type="checkbox" 
            checked={showInterference} 
            onChange={(e) => setShowInterference(e.target.checked)} 
          />
          Show Interference Zones
        </label>
      </div>
      
      <div className="map-container">
        <svg viewBox="0 0 100 100" className="map-svg">
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e2d45" strokeWidth="0.3"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          
          {/* Coverage areas */}
          {showCoverage && sectors.map(sector => {
            const { x, y } = toSVG(sector.lat, sector.lon);
            return (
              <g key={`coverage-${sector.id}`}>
                <circle 
                  cx={x} 
                  cy={y} 
                  r="18" 
                  fill={sector.color} 
                  opacity="0.15"
                  className="coverage-area"
                />
                <circle 
                  cx={x} 
                  cy={y} 
                  r="12" 
                  fill={sector.color} 
                  opacity="0.25"
                />
              </g>
            );
          })}
          
          {/* Interference zones */}
          {showInterference && analysisComplete && (
            <>
              {/* Sector A interference zone */}
              <circle 
                cx={toSVG(39.41, -77.41).x} 
                cy={toSVG(39.41, -77.41).y} 
                r="10" 
                fill="#ef4444" 
                opacity="0.3"
                className="interference-zone pulse"
              />
            </>
          )}
          
          {/* Sector labels */}
          {sectors.map(sector => {
            const { x, y } = toSVG(sector.lat, sector.lon);
            return (
              <g key={`label-${sector.id}`}>
                <circle 
                  cx={x} 
                  cy={y} 
                  r="5" 
                  fill={sector.color}
                  stroke="#0a0e1a"
                  strokeWidth="1"
                />
                <text 
                  x={x} 
                  y={y - 8} 
                  className="sector-label"
                  textAnchor="middle"
                >
                  {sector.name}
                </text>
                <text 
                  x={x} 
                  y={y + 12} 
                  className="freq-label"
                  textAnchor="middle"
                >
                  {sector.freq} MHz
                </text>
              </g>
            );
          })}
          
          {/* Node markers */}
          {TELEMETRY_DATA.map(node => {
            // Add small random offset for visualization (nodes are at same sector location)
            const sector = sectors.find(s => s.id === node.location);
            if (!sector) return null;
            
            const nodeIndex = TELEMETRY_DATA.filter(n => n.location === node.location).indexOf(node);
            const angleOffset = (nodeIndex / 7) * Math.PI * 2;
            const radiusOffset = 0.02 + (nodeIndex % 3) * 0.01;
            
            const nodeLat = sector.lat + Math.sin(angleOffset) * radiusOffset;
            const nodeLon = sector.lon + Math.cos(angleOffset) * radiusOffset * 1.5;
            const { x, y } = toSVG(nodeLat, nodeLon);
            
            const status = getNodeStatus(node.snr_db);
            const isAffected = affectedNodes.has(node.device_id);
            const isSelected = selectedNode === node.device_id;
            
            return (
              <g 
                key={node.device_id}
                className={`node-marker ${status} ${isAffected ? 'affected' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedNode(isSelected ? null : node.device_id)}
              >
                <circle 
                  cx={x} 
                  cy={y} 
                  r={isSelected ? 3 : 2}
                  className="node-dot"
                />
                {isAffected && analysisComplete && (
                  <circle 
                    cx={x} 
                    cy={y} 
                    r="4"
                    className="affected-ring"
                  />
                )}
              </g>
            );
          })}
          
          {/* Scale bar */}
          <g className="scale-bar">
            <line x1="5" y1="95" x2="25" y2="95" stroke="#94a3b8" strokeWidth="0.5" />
            <line x1="5" y1="94" x2="5" y2="96" stroke="#94a3b8" strokeWidth="0.5" />
            <line x1="25" y1="94" x2="25" y2="96" stroke="#94a3b8" strokeWidth="0.5" />
            <text x="15" y="93" className="scale-text" textAnchor="middle">5 km</text>
          </g>
          
          {/* Compass */}
          <g className="compass" transform="translate(90, 10)">
            <circle cx="0" cy="0" r="5" fill="#1a2235" stroke="#94a3b8" strokeWidth="0.3" />
            <text x="0" y="-1" className="compass-text" textAnchor="middle">N</text>
            <line x1="0" y1="1" x2="0" y2="4" stroke="#94a3b8" strokeWidth="0.5" />
          </g>
        </svg>
        
        {/* Node info panel */}
        {selectedNodeData && (
          <div className="node-info-panel">
            <div className="node-info-header">
              <span className="node-id">{selectedNodeData.device_id}</span>
              <span className={`node-status-badge ${getNodeStatus(selectedNodeData.snr_db)}`}>
                {getNodeStatus(selectedNodeData.snr_db).toUpperCase()}
              </span>
            </div>
            <div className="node-info-grid">
              <div className="node-info-item">
                <span className="info-label">Sector</span>
                <span className="info-value">{selectedNodeData.location.replace('_', ' ')}</span>
              </div>
              <div className="node-info-item">
                <span className="info-label">Frequency</span>
                <span className="info-value">{selectedNodeData.frequency_mhz} MHz</span>
              </div>
              <div className="node-info-item">
                <span className="info-label">Signal</span>
                <span className="info-value">{selectedNodeData.signal_strength_dbm} dBm</span>
              </div>
              <div className="node-info-item">
                <span className="info-label">Noise Floor</span>
                <span className="info-value">{selectedNodeData.noise_floor_dbm} dBm</span>
              </div>
              <div className="node-info-item">
                <span className="info-label">SNR</span>
                <span className={`info-value ${getNodeStatus(selectedNodeData.snr_db)}`}>
                  {selectedNodeData.snr_db} dB
                </span>
              </div>
              <div className="node-info-item">
                <span className="info-label">Modulation</span>
                <span className="info-value">{selectedNodeData.modulation}</span>
              </div>
            </div>
            {affectedNodes.has(selectedNodeData.device_id) && (
              <div className="node-alert">
                ⚠ This node is affected by detected interference
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="map-legend">
        <div className="legend-section">
          <span className="legend-title">Sectors</span>
          {sectors.map(s => (
            <div key={s.id} className="legend-item">
              <span className="legend-dot" style={{ background: s.color }}></span>
              {s.name} ({s.freq} MHz)
            </div>
          ))}
        </div>
        <div className="legend-section">
          <span className="legend-title">Node Status</span>
          <div className="legend-item"><span className="legend-dot good"></span> Good (SNR ≥ 15 dB)</div>
          <div className="legend-item"><span className="legend-dot warning"></span> Warning (SNR 10-15 dB)</div>
          <div className="legend-item"><span className="legend-dot critical"></span> Critical (SNR &lt; 10 dB)</div>
        </div>
      </div>
    </div>
  );
}
