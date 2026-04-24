import { INTERFERENCE_EVENTS } from "../data/mockSpectrumData";
import type { InterferenceEvent } from "../types/spectrum";

interface InterferenceFindingsCardProps {
  analysisComplete: boolean;
}

export function InterferenceFindingsCard({ analysisComplete }: InterferenceFindingsCardProps) {
  const getPriorityClass = (priority: InterferenceEvent["priority"]): string => {
    switch (priority) {
      case "P1":
        return "badge-danger";
      case "P2":
        return "badge-warning";
      case "P3":
        return "badge-muted";
    }
  };

  const getLevelClass = (level: InterferenceEvent["interference_level"]): string => {
    switch (level) {
      case "Critical":
        return "badge-critical";
      case "High":
        return "badge-danger";
      case "Medium":
        return "badge-warning";
      case "Low":
        return "badge-muted";
    }
  };

  return (
    <div className="findings-panel">
      <h2>Interference Findings</h2>

      {!analysisComplete ? (
        <div className="empty-state">
          <p>Interference findings will appear here after analysis runs.</p>
        </div>
      ) : (
        <div className="findings-list">
          {INTERFERENCE_EVENTS.map((event) => (
            <div key={event.event_id} className="finding-card">
              <div className="finding-header">
                <span className="event-id">{event.event_id}</span>
                <span className={`badge ${getPriorityClass(event.priority)}`}>
                  {event.priority}
                </span>
              </div>

              <div className="finding-location">
                {event.sector.replace("_", " ")} • {event.frequency_mhz} MHz
              </div>

              <div className="finding-level">
                <span className={`badge ${getLevelClass(event.interference_level)}`}>
                  {event.interference_level}
                </span>
              </div>

              <div className="confidence-row">
                <span className="confidence-label">Confidence</span>
                <div className="confidence-bar">
                  <div
                    className="confidence-fill"
                    style={{ width: `${event.confidence}%` }}
                  />
                </div>
                <span className="confidence-value">{event.confidence}%</span>
              </div>

              <div className="finding-cause">
                <strong>Suspected Cause:</strong> {event.suspected_cause}
              </div>

              <div className="affected-nodes">
                {event.affected_nodes.map((node) => (
                  <span key={node} className="node-chip">
                    {node}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
