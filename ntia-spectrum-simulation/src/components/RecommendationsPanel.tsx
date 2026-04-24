import { RECOMMENDATIONS } from "../data/mockSpectrumData";
import type { Recommendation } from "../types/spectrum";

export function RecommendationsPanel() {
  const getComplexityClass = (complexity: Recommendation["complexity"]): string => {
    switch (complexity) {
      case "Low":
        return "badge-success";
      case "Medium":
        return "badge-warning";
      case "High":
        return "badge-danger";
    }
  };

  return (
    <div className="output-section">
      <div className="section-header">
        <div>
          <h2>Mitigation Recommendations</h2>
          <p className="section-subtitle">
            Ranked by confidence and expected propagation impact
          </p>
        </div>
      </div>

      <div className="recommendations-list">
        {RECOMMENDATIONS.map((rec) => (
          <div key={rec.rank} className="recommendation-card">
            <div className="rec-rank">#{rec.rank}</div>

            <div className="rec-content">
              <div className="rec-action">{rec.action}</div>
              <div className="rec-impact">{rec.expected_impact}</div>

              <div className="rec-meta">
                <span className={`badge ${getComplexityClass(rec.complexity)}`}>
                  {rec.complexity} Complexity
                </span>

                <div className="confidence-inline">
                  <div className="confidence-bar-small">
                    <div
                      className="confidence-fill"
                      style={{ width: `${rec.confidence}%` }}
                    />
                  </div>
                  <span className="confidence-value">{rec.confidence}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
