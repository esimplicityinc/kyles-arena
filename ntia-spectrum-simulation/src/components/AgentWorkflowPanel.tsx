import type { AgentStep } from "../types/spectrum";

interface AgentWorkflowPanelProps {
  agentSteps: AgentStep[];
  analysisRunning: boolean;
  analysisComplete: boolean;
  onRunAnalysis: () => void;
  onReset: () => void;
}

export function AgentWorkflowPanel({
  agentSteps,
  analysisRunning,
  analysisComplete,
  onRunAnalysis,
  onReset,
}: AgentWorkflowPanelProps) {
  const getStatusIcon = (status: AgentStep["status"]) => {
    switch (status) {
      case "idle":
        return <span className="status-icon idle">○</span>;
      case "running":
        return <span className="status-icon running">◐</span>;
      case "complete":
        return <span className="status-icon complete">✓</span>;
    }
  };

  return (
    <div className="workflow-panel">
      <h2>Agentic Workflow</h2>

      <div className="stepper">
        {agentSteps.map((step, index) => (
          <div key={step.id} className={`step ${step.status}`}>
            <div className="step-indicator">
              {getStatusIcon(step.status)}
              {index < agentSteps.length - 1 && <div className="connector" />}
            </div>
            <div className="step-content">
              <div className="step-name">{step.name}</div>
              <div className="step-description">{step.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="workflow-actions">
        <button
          className="btn btn-primary btn-full"
          onClick={onRunAnalysis}
          disabled={analysisRunning}
        >
          {analysisRunning ? (
            <>
              <span className="spinner">◐</span> Running Analysis...
            </>
          ) : (
            "Run Agentic Analysis"
          )}
        </button>

        {analysisComplete && (
          <button className="btn btn-outline btn-full" onClick={onReset}>
            Reset Demo
          </button>
        )}
      </div>
    </div>
  );
}
