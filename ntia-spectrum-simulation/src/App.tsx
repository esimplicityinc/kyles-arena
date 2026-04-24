import { useState } from "react";
import { AGENT_STEPS, SIMULATION_SCENARIO, INTERFERENCE_EVENTS } from "./data/mockSpectrumData";
import type { AgentStep } from "./types/spectrum";
import { KPICards } from "./components/KPICards";
import { TelemetryTable } from "./components/TelemetryTable";
import { AgentWorkflowPanel } from "./components/AgentWorkflowPanel";
import { InterferenceFindingsCard } from "./components/InterferenceFindingsCard";
import { SimulationOutputPanel } from "./components/SimulationOutputPanel";
import { RecommendationsPanel } from "./components/RecommendationsPanel";
import { SpectrumVisualization } from "./components/SpectrumVisualization";
import { LinkBudgetCalculator } from "./components/LinkBudgetCalculator";
import { AntennaPatternViewer } from "./components/AntennaPatternViewer";
import { PropagationModel } from "./components/PropagationModel";
import { GeographicMap } from "./components/GeographicMap";
import { IntermediateCalculations } from "./components/IntermediateCalculations";
import "./App.css";

type TabId = "overview" | "telemetry" | "spectrum" | "analysis" | "tools" | "output";

function App() {
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>(
    AGENT_STEPS.map((step) => ({ ...step, status: "idle" as const }))
  );
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedSector, setSelectedSector] = useState("Sector_A");
  const [isAnimating, setIsAnimating] = useState(true);

  const runAnalysis = async () => {
    setAnalysisRunning(true);

    for (let i = 0; i < agentSteps.length; i++) {
      setAgentSteps((prev) =>
        prev.map((step, idx) =>
          idx === i ? { ...step, status: "running" as const } : step
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 1400));

      setAgentSteps((prev) =>
        prev.map((step, idx) =>
          idx === i ? { ...step, status: "complete" as const } : step
        )
      );
    }

    setAnalysisRunning(false);
    setAnalysisComplete(true);
  };

  const resetDemo = () => {
    setAgentSteps(AGENT_STEPS.map((step) => ({ ...step, status: "idle" as const })));
    setAnalysisComplete(false);
  };

  return (
    <div className="app">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-left">
          <span className="brand">SPECTRUM AI</span>
          <span className="brand-subtitle">Modeling & Simulation Relay</span>
        </div>
        <div className="nav-right">
          <span className="org-label">eSimplicity | Rapid Innovation Center</span>
        </div>
      </nav>

      {/* Tab Bar */}
      <div className="tab-bar">
        {(
          [
            { id: "overview", label: "Overview" },
            { id: "spectrum", label: "Spectrum" },
            { id: "telemetry", label: "Telemetry" },
            { id: "tools", label: "RF Tools" },
            { id: "analysis", label: "Analysis" },
            { id: "output", label: "Output" },
          ] as { id: TabId; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="main-content">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="tab-content">
            <p className="intro-text">
              Agentic AI turns distributed spectrum telemetry into simulation-ready
              scenarios — reducing manual analysis from hours to seconds.
            </p>

            <KPICards analysisComplete={analysisComplete} />

            {!analysisComplete ? (
              <div className="prompt-box">
                <p>
                  Run Agentic Analysis to generate interference findings, simulation
                  parameters, and mitigation recommendations.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setActiveTab("analysis");
                    setTimeout(runAnalysis, 300);
                  }}
                >
                  Run Agentic Analysis
                </button>
              </div>
            ) : (
              <div className="summary-cards">
                <div className="summary-card critical">
                  <div className="summary-label">Critical Event Detected</div>
                  <div className="summary-value">
                    {INTERFERENCE_EVENTS[0].event_id}, Sector A, 2450 MHz
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Simulation Scenario Ready</div>
                  <div className="summary-value">{SIMULATION_SCENARIO.simulation_id}</div>
                </div>
                <div className="summary-card success">
                  <div className="summary-label">Top Recommendation</div>
                  <div className="summary-value">Shift to 2470 MHz, 94% confidence</div>
                </div>
              </div>
            )}
            
            {/* Geographic Map */}
            <GeographicMap analysisComplete={analysisComplete} />
          </div>
        )}

        {/* Spectrum Tab - NEW */}
        {activeTab === "spectrum" && (
          <div className="tab-content">
            <div className="spectrum-header">
              <h2>Real-Time Spectrum Analysis</h2>
              <div className="spectrum-controls">
                <select 
                  value={selectedSector} 
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="sector-select"
                >
                  <option value="Sector_A">Sector A (2450 MHz)</option>
                  <option value="Sector_B">Sector B (5180 MHz)</option>
                  <option value="Sector_C">Sector C (900 MHz)</option>
                </select>
                <label className="animate-toggle">
                  <input 
                    type="checkbox" 
                    checked={isAnimating} 
                    onChange={(e) => setIsAnimating(e.target.checked)} 
                  />
                  Live Update
                </label>
              </div>
            </div>
            
            <SpectrumVisualization 
              selectedSector={selectedSector} 
              isAnimating={isAnimating} 
            />
          </div>
        )}

        {/* Telemetry Tab */}
        {activeTab === "telemetry" && (
          <div className="tab-content">
            <TelemetryTable />
          </div>
        )}

        {/* RF Tools Tab - NEW */}
        {activeTab === "tools" && (
          <div className="tab-content tools-layout">
            <div className="tools-grid">
              <LinkBudgetCalculator />
              <PropagationModel />
              <AntennaPatternViewer />
            </div>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === "analysis" && (
          <div className="tab-content">
            <div className="analysis-layout">
              <div className="analysis-left">
                <AgentWorkflowPanel
                  agentSteps={agentSteps}
                  analysisRunning={analysisRunning}
                  analysisComplete={analysisComplete}
                  onRunAnalysis={runAnalysis}
                  onReset={resetDemo}
                />
              </div>
              <div className="analysis-right">
                <InterferenceFindingsCard analysisComplete={analysisComplete} />
              </div>
            </div>
            
            {/* Intermediate Calculations */}
            <IntermediateCalculations analysisComplete={analysisComplete} />
          </div>
        )}

        {/* Output Tab */}
        {activeTab === "output" && (
          <div className="tab-content">
            {!analysisComplete ? (
              <div className="empty-state">
                <p>Run Agentic Analysis to generate simulation output and recommendations.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setActiveTab("analysis");
                    setTimeout(runAnalysis, 300);
                  }}
                >
                  Run Agentic Analysis
                </button>
              </div>
            ) : (
              <>
                <SimulationOutputPanel />
                <RecommendationsPanel />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
