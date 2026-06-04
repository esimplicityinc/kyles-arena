# SHINE Initiative Roadmap — v1.3
**Program:** SHINE (eSimplicity Growth Intelligence Platform)
**Jira Project:** RIC
**Horizon:** Q3–Q4 2026
**Audience:** Leadership
**Created:** 2026-05-19
**Updated:** 2026-05-19
**Author:** PM Roadmapper
**Delivery Model:** Kanban (continuous flow, throughput-based estimation)

---

## What is SHINE?

SHINE is eSimplicity's internal growth intelligence platform — a single destination where staff can ask questions across internal knowledge sources and get AI-synthesized answers, and where the growth team can track opportunities and eventually automate work like RFP review and response drafting. Built on Databricks.

---

## Narrative Summary

Milestone 2 (authentication) closes this week. The team uses agentic AI to accelerate implementation, with BDD test coverage and validation as the consistent quality gate across every milestone — meaning pace is driven by test rigor, not development complexity.

Milestone 3 is next — the chat UI is already built; remaining work is BDD backfill and validation (~1–2 weeks). SharePoint integration (M4) follows immediately: agentic AI handles the connection code, BDD validates it (~1–2 weeks). GitHub integration (M5) follows the same pattern once scoped. At this pace, the full MVP — authenticated, SharePoint-connected AI chat — closes by **mid-to-late June 2026**, with GitHub integration wrapping by **late July**.

Q3 2026 delivers a fully functional multi-source knowledge tool. Q4 and beyond builds toward growth agent capabilities — RFP review, opportunity synthesis, and automated growth workflows.

**Key milestones:**
- **May 20–21, 2026:** Authentication complete
- **~Jun 6, 2026:** Chat interface validated and live
- **~Jun 20, 2026:** SharePoint connected — answers draw from internal documents
- **~Late Jul 2026:** GitHub connected — answers draw from code and repo history
- **~Aug–Sep 2026:** Growth Portal live — opportunity viewer for growth team

---

## Milestone Table

| Milestone | Feature | Nature of Work | Target | Status | Confidence |
|-----------|---------|----------------|--------|--------|------------|
| M1 | Platform foundation (Databricks deploy) | — | Done | Complete | — |
| M2 | Secure login with eSimplicity credentials | Final cleanup | May 20–21 | Closing | High |
| M3 | AI chat interface — ask questions, get synthesized answers | BDD backfill + validation (UI already built) | ~Jun 6 | Up next | High |
| M4 | SharePoint knowledge source — search internal documents | Agentic AI implementation + BDD validation | ~Jun 20 | Not started | Medium |
| M5 | GitHub knowledge source — code patterns & decision history | Needs scoping, then agentic AI + BDD | ~Late Jul | Not started | Low |
| Post-MVP | Growth Portal — opportunity viewer for growth team | 2 stories, low priority | ~Aug–Sep | Backlog | Low |
| Future | Jira integration, Slack integration, Admin analytics | TBD | 2027 | Planned | Low |

**Throughput basis:** ~4 stories/week observed; pace on all milestones is driven by BDD rigor, not implementation complexity (agentic AI accelerates the build side)
**M4/M5 note:** Agentic AI + BDD pattern = ~1–2 weeks per integration milestone, same as M3

---

## Feature Breakdown

### Initiative: SHINE MVP (Q3 2026)

**Epic: M2 — Secure Authentication (RIC-309)**
Status: Closing this week | Priority: Critical
- BDD: Protected routes require authentication — Done
- BDD: Graceful session expiration — Done
- Updating BDD tests for Auth — Done
- *(Final cleanup in progress; closes May 20–21)*

**Epic: M3 — AI Chat Interface (RIC-310)**
Status: Up next | Priority: High
- Note: UI already built — remaining work is BDD backfill and test validation, not net-new development
- US-055: Ask a question and get a synthesized answer — Backlog (Critical) — UNASSIGNED
- US-056: View and continue past conversations — Backlog (Medium) — UNASSIGNED
- US-057: Handle no-results gracefully — Backlog (High) — UNASSIGNED
- US-058: Understand when a source is unavailable — Backlog (High) — UNASSIGNED
- FE/BE Contract for RAG/LLM Calls (RIC-307) — To Do (High) — Fareez Ahmed
- CI/CD Release Pipeline (RIC-486) — Backlog (High) — Thomas Mason

**Epic: M4 — SharePoint Integration (RIC-455)**
Status: To Do | Priority: High
- US-059: Connect SharePoint as a knowledge source — Backlog (Critical) — UNASSIGNED
- US-060: Query SharePoint content through SHINE — Backlog (Critical) — UNASSIGNED
- US-061: Respect SharePoint permissions in results — Backlog (Critical) — UNASSIGNED
- US-062: View SharePoint source attribution in answers — Backlog (High) — UNASSIGNED
- US-063: Handle SharePoint disconnection gracefully — Backlog (High) — UNASSIGNED

### Initiative: SHINE Knowledge Sources (Q4 2026)

**Epic: M5 — GitHub Integration (RIC-456 / RIC-457)**
Status: Backlog | Priority: High
- Stories not yet created — epic scoped but empty
- Key deliverables: pattern synthesis across repos, decision context from commit/PR history, tech stack constraint filtering, proactive risk surfacing, graceful degradation

**Epic: Post-MVP Fixes (RIC-490)**
Status: To Do | Priority: High
- Stories TBD

### Initiative: Growth Portal (Q4 2026)

**Orphaned stories (no parent epic — action required):**
- RIC-384: Add Growth Portal tab to SHINE to display opportunity data — Backlog (Low)
- RIC-381: Add "Generate Report" button and reporting module for opportunities — Backlog (Low)

### Initiative: Future Integrations (2027)

| Epic | Key | Priority | Status |
|------|-----|----------|--------|
| SHINE — Jira Integration | RIC-458 | High | To Do |
| SHINE — GitHub Integration | RIC-457 | High | To Do |
| SHINE — Slack Integration | RIC-496 | Low | To Do |
| SHINE — Analytics | RIC-498 | Low | To Do |

---

## Risk Register

| # | Risk | Severity | Likelihood | Remedy |
|---|------|----------|------------|--------|
| R1 | Mixed capacity — SHINE throughput drops when client delivery heats up | High | High | Track SHINE throughput weekly; if it drops below 2 stories/week for 2+ weeks, escalate |
| R2 | M3 and M4 stories are entirely unassigned — no owners when work starts | Medium | High | Assign stories as each milestone opens; don't let them sit unowned in the queue |
| R3 | M5 (GitHub) epic has zero stories — queue will run dry after M4 | Medium | High | Create M5 stories before M4 completes; scope them during M4 |
| R4 | Growth Portal stories (RIC-384, RIC-381) have no parent epic — orphaned, at risk of being lost | Low | Medium | Create a "SHINE Growth Portal" epic and link them |
| R5 | Throughput estimate based on 5 weeks of mixed work — M4 is first pure-development milestone, pace may differ | Medium | Medium | Revisit throughput after M3 closes; recalibrate M4/M5 targets |

---

## Assumptions

| # | Assumption | Basis |
|---|---|---|
| A1 | M2 (Auth) is ~80% done — most BDD stories are Done/Cancelled | Jira status |
| A2 | M3 (Chat UI) has ~5 open stories, all Backlog/To Do — not yet started in earnest | Jira status |
| A3 | No story point estimates exist — using T-shirt sizing heuristics | No SP data in Jira |
| A4 | Mixed capacity team = ~2 FTE equivalent for SHINE at any given time | PM input |
| A5 | Team operates on kanban (continuous flow) — no sprints | PM input |
| A6 | M5 (GitHub) stories not yet created — epic exists but empty | Jira data |
| A7 | Post-MVP epics (Jira integration, Slack, Analytics) are Q4 2026 at earliest | Sequencing logic |
| A8 | Growth Portal tab (opportunity viewer) is a parallel track, not blocking MVP | Label analysis |
