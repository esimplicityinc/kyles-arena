# Spectrum AI — Modeling & Simulation Relay

A demo-ready local application showing how agentic AI ingests spectrum telemetry, detects interference, builds simulation-ready parameters, and recommends mitigation — replacing a manual process that currently takes hours with an AI workflow that runs in seconds.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Demo Script

> "We start on the **Overview tab** — you can see we have 20 RF nodes active across three sectors, monitoring three frequency bands. The system has already flagged four interference events.
>
> Move to the **Telemetry tab**. This is raw spectrum telemetry from distributed RF nodes. The rows highlighted in red are the problem areas — NODE_02 and NODE_05 in Sector A are showing SNR as low as 6 dB with an elevated noise floor, which is a strong signal of interference.
>
> Move to the **Analysis tab**. Hit **Run Agentic Analysis**. Watch the agents work through the problem — ingestion, detection, scenario building, relay packaging, and recommendations. This entire workflow replaces what a spectrum engineer would previously do manually over several hours.
>
> Once complete, you can see the interference findings on the right — EVT-001 in Sector A is flagged Critical at 94% confidence, suspected emitter overlap affecting two nodes.
>
> Move to the **Output tab**. Here is the simulation-ready JSON payload — structured and ready to relay directly to an RF modeling tool like MATLAB or STK. No manual translation required. Below that, the predicted impact: before mitigation, Sector A is experiencing 28% packet loss and 35% coverage reduction. After the recommended mitigation, those numbers drop to 9% and 12%.
>
> The top recommendation is a frequency shift from 2450 MHz to 2470 MHz — low complexity, 94% confidence, estimated 68% reduction in co-channel interference. The team can act on this immediately or relay the full scenario to the simulation environment for further modeling."

## What This Demonstrates

- **Agentic AI** replacing manual spectrum analysis workflows
- **Structured relay** of real-world RF observations to modeling and simulation tools
- **Decision support** for spectrum engineers and program leadership
- Applicable to **NTIA spectrum management**, **DoD spectrum operations**, and **federal spectrum sharing programs**

## Stack

- React + Vite + TypeScript
- No backend, no external APIs, no authentication
- Dark theme command center aesthetic

## Project Structure

```
/src
  /data
    mockSpectrumData.ts       ← all mock data
  /types
    spectrum.ts               ← TypeScript interfaces
  /components
    TelemetryTable.tsx
    AgentWorkflowPanel.tsx
    InterferenceFindingsCard.tsx
    SimulationOutputPanel.tsx
    RecommendationsPanel.tsx
    KPICards.tsx
  App.tsx
  App.css
  main.tsx
```

## Key Features

| Tab | Description |
|-----|-------------|
| **Overview** | KPI cards, analysis prompt, summary after completion |
| **Telemetry** | RF node observations with filtering, row highlighting for anomalies |
| **Analysis** | Agentic workflow stepper, interference findings |
| **Output** | Simulation JSON payload, before/after impact, ranked recommendations |

---

Built by **eSimplicity | Rapid Innovation Center**
