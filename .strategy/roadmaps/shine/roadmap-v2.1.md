# SHINE Initiative Roadmap — v2.1
**Program:** SHINE (eSimplicity Growth Intelligence Platform)
**Jira Project:** RIC (reference only)
**Horizon:** Q3–Q4 2026
**Audience:** Leadership
**Created:** 2026-05-19
**Updated:** 2026-05-19
**Author:** PM Roadmapper
**Delivery Model:** Kanban (continuous flow)

---

## What is SHINE?

SHINE is eSimplicity's internal growth intelligence platform — a single destination where any eSimplicity employee can ask questions across internal knowledge sources and get AI-synthesized answers. For the growth team specifically, it surfaces opportunities, eventually automates RFP review and response drafting, and becomes the operating hub for capture work. Built on Databricks, accelerated by agentic AI development, validated through rigorous BDD testing.

---

## Narrative Summary

SHINE is moving fast on two parallel tracks.

**Track 1 — AI Chat & Knowledge Sources:** Authentication closes this week. The chat interface (already built) moves into BDD validation immediately after, followed by SharePoint and GitHub integrations. Each milestone takes roughly 1–2 weeks using agentic AI for implementation and BDD as the quality gate. By end of July, SHINE will answer questions synthesized from SharePoint, GitHub, and internal documents.

**Track 2 — Growth Opportunities Pipeline:** Running in parallel, a separate team is building the data ingestion pipeline that pulls opportunity postings from the growth team's shared mailbox (GovWin IQ, GSA eBuy, Seaport NxG, FedConnect). Once the pipeline is live and normalized, the Growth Portal milestone surfaces that data directly in SHINE — giving the growth team a single place to view, search, and report on all incoming opportunities.

The two tracks converge at **M5 — Growth Opportunities**, when the pipeline data becomes visible inside SHINE. M6 (TBD) follows with additional data surfaced in the same platform.

---

## Milestone Roadmap

### Track 1: AI Chat & Knowledge Sources

---

#### M1 — Foundation ✅ Complete
**What it delivered:** A running Databricks application — the infrastructure layer that everything else is built on.

---

#### M2 — Secure Access ✅ Closing This Week
**What it delivers:** Every eSimplicity employee can log in to SHINE using their existing company credentials. Access is secure, sessions are managed gracefully, and the platform is ready for real users.

**Target:** May 20–21, 2026
**Confidence:** 🟢 High

---

#### M3 — AI Chat Interface 🔜 Up Next
**What it delivers:** The core SHINE experience. Users open SHINE, type a question, and get a synthesized answer. Conversation history is preserved so users can pick up where they left off. The system handles edge cases gracefully — no results, unavailable sources — without breaking the experience.

**Note:** The UI is already built. This milestone is BDD validation end-to-end, not net-new development.

**Target:** ~Jun 6, 2026
**Confidence:** 🟢 High

---

#### M4 — SharePoint Integration
**What it delivers:** SHINE's first live knowledge source. Users can ask questions and get answers synthesized from eSimplicity's SharePoint content. Results respect SharePoint permissions — users only see what they're authorized to see. Source attribution shows where each answer came from.

**Note:** Agentic AI handles the implementation; BDD validates the integration.

**Target:** ~Jun 20, 2026
**Confidence:** 🟡 Medium

---

#### M5 (Chat Track) — GitHub Integration
**What it delivers:** SHINE's second knowledge source. Engineers can ask questions and get answers synthesized from eSimplicity's GitHub repositories — code patterns, design decisions, PR history, and architectural context. Replaces manual repo archaeology with synthesized, actionable guidance.

**Note:** Stories not yet written. Will be scoped during M4. Same agentic AI + BDD pattern.

**Target:** ~Late Jul 2026
**Confidence:** 🔴 Low (unscoped)

---

### Track 2: Growth Opportunities Pipeline

*Running in parallel with Track 1. Work is independent until the Growth Portal milestone, where it surfaces inside SHINE.*

---

#### Pipeline Step 1 — Ingestion Spike (RIC-357) 🔄 In Progress
**What it delivers:** Validated approach for connecting to the shared mailbox (Microsoft Graph API vs. IMAP), attachment scanning strategy, schema design for the quarantine table and raw intake store. Owned by Lada.

**Target:** TBD (currently in progress)
**Confidence:** 🟡 Medium

---

#### Pipeline Step 2 — Ingestion Pipeline (RIC-380)
**What it delivers:** A live pipeline that connects to the growth team's shared mailbox, fetches opportunity postings from GovWin IQ, GSA eBuy, Seaport NxG, and FedConnect, and stores them reliably. Zero messages dropped. Full audit trail. Quarantine handling for malformed or unscannable attachments.

**Depends on:** Pipeline Step 1 complete
**Target:** TBD (blocked until spike resolves)
**Confidence:** 🔴 Low

---

#### Pipeline Step 3 — Data Normalization (RIC-487)
**What it delivers:** Raw opportunity postings normalized into a consistent schema regardless of source — agency, solicitation number, deadline, set-aside type, and other common fields extracted and mapped. Downstream consumers (the Growth Portal UI) have a reliable data model to work with.

**Depends on:** Pipeline Step 2 complete
**Target:** TBD
**Confidence:** 🔴 Low

---

### Convergence Milestone

---

#### M5 — Growth Opportunities Portal
**What it delivers:** The growth team's command center inside SHINE. A dedicated tab displays all ingested opportunity postings — searchable and filterable by agency, source, date, and status. Members can generate on-demand reports summarizing the opportunity pipeline and share them with leadership without requiring direct platform access.

**Depends on:** Pipeline Steps 1–3 complete AND SHINE chat track stable (M3+)
**Target:** ~Aug–Sep 2026 (pipeline-dependent — will update when spike resolves)
**Confidence:** 🔴 Low

---

#### M6 — TBD (Defects / Second Data Initiative)
**What it delivers:** To be defined. A second data source or initiative surfaced inside SHINE following the Growth Opportunities pattern.

**Target:** Q4 2026
**Confidence:** 🔴 Low (not yet scoped)

---

### Future Vision (2027)
**What it delivers:** SHINE moves from surfacing information to doing work. Planned capabilities:
- **Jira integration** — synthesize project history, blocker patterns, and decision context
- **Slack integration** — surface capture and growth conversations
- **Admin analytics** — usage metrics and engagement data for administrators
- **Growth agents** — automated RFP review, response drafting, opportunity qualification

---

## Timeline View

```mermaid
gantt
    title SHINE Roadmap — Q3–Q4 2026
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d

    section Track 1 — Chat & Knowledge Sources
    M1 Foundation (Done)               :done,   m1, 2026-01-01, 2026-04-30
    M2 Secure Access (Done)            :done,   m2, 2026-05-01, 2026-05-21
    M3 AI Chat Interface               :active, m3, 2026-05-21, 2026-06-06
    M4 SharePoint Integration          :        m4, 2026-06-06, 2026-06-20
    M5c GitHub Integration             :        m5c, 2026-06-20, 2026-07-25

    section Track 2 — Growth Opportunities Pipeline
    Spike: Mailbox Ingestion (In Progress) :active, sp, 2026-05-01, 2026-06-06
    Ingestion Pipeline                 :        ip, 2026-06-06, 2026-07-11
    Data Normalization                 :        dn, 2026-07-11, 2026-07-25

    section Convergence
    M5 Growth Opportunities Portal     :        m5g, 2026-07-25, 2026-09-05
    M6 TBD                             :        m6,  2026-09-05, 2026-10-17

    section Future (2027)
    Jira Integration                   :        ji, 2027-01-01, 2027-02-28
    Slack Integration                  :        si, 2027-01-01, 2027-03-31
    Growth Agents                      :        ga, 2027-03-01, 2027-06-30
```

---

## Risk Register

| # | Risk | Severity | Remedy |
|---|------|----------|--------|
| R1 | Mixed capacity — SHINE throughput drops when client delivery surges | 🔴 High | Monitor weekly; escalate if pace drops for 2+ consecutive weeks |
| R2 | Growth Opportunities Pipeline is blocked on the ingestion spike — M5 target is a placeholder until it resolves | 🔴 High | Get a completion date from Lada on RIC-357; M5 target cannot be confirmed until then |
| R3 | GitHub integration (M5 chat track) has no stories written yet — queue runs dry after M4 | 🟡 Medium | Scope M5 GitHub stories during M4; don't let the queue go empty |
| R4 | M6 is undefined — scope it before M5 closes or it will slip to 2027 by default | 🟡 Medium | Define M6 scope as soon as M5 is underway |
| R5 | BDD rigor is the pace-setter — if test standards slip, quality debt accumulates fast | 🟡 Medium | Keep BDD as a non-negotiable gate; don't close milestones without passing tests |
| R6 | Growth Portal stories (RIC-384, RIC-381) have no parent epic in Jira — orphaned | 🟡 Medium | Create a Growth Portal epic and link them |

---

## Assumptions

| # | Assumption | Basis |
|---|---|---|
| A1 | M3 is fast — UI exists, work is BDD validation not development | PM input |
| A2 | M4 and M5 (chat track) follow agentic AI + BDD pattern — ~1–2 weeks each | PM input |
| A3 | ~4 stories/week throughput observed over last 5 weeks — baseline, not a hard constraint | Jira history |
| A4 | Mixed capacity team; SHINE is not 100% of anyone's time | PM input |
| A5 | Track 1 and Track 2 are independent — no blocking dependency between them until M5 Growth Portal | Architecture review |
| A6 | M5 Growth Portal target (~Aug–Sep) assumes spike resolves by early June and pipeline takes ~6 weeks | Estimate — validate with Lada |
| A7 | M6 scope is TBD — placeholder target of Q4 2026 | PM input |
| A8 | Future integrations (Jira, Slack, growth agents) are 2027 work | Sequencing logic |
