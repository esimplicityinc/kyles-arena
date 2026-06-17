---
name: jira-guidelines
description: Use when creating, updating, transitioning, or closing any Jira issue. Enforces required fields (epic/parent, priority, assignee), mandates comments on all updates and closures, and ensures GitHub PRs are linked in the dev section. Use for all Jira operations including ticket creation, status changes, and lifecycle management.
version: 1.0.0
---

# Jira Guidelines

This skill defines the team standard for all Jira operations — creation, updates, transitions, and closure. Every agent that touches a Jira issue must follow these rules. No exceptions.

---

## Non-Negotiable Rules

These apply to every Jira operation, no matter what:

1. **Epic or parent is required.** Every Story, Task, Bug, and Sub-task must be linked to an Epic or parent issue before creation is complete. Epics must be linked to a parent Initiative. Only Initiatives are exempt from the parent requirement.
2. **Priority is required.** Every issue must have a priority set. Never leave it at default without confirming with the user.
3. **Assignee is required.** Every issue must be assigned to someone. If the user doesn't specify, ask. Do not create or close unassigned issues.
4. **Every update gets a comment.** Any time a status changes, a field is updated, or work is done on an issue, a human-readable comment must be added explaining what changed and why.
5. **Closure requires a comment.** Before transitioning any issue to Done or Cancelled, a closure comment must be written. It must be readable by anyone on the team — not just the person doing the work.
6. **Dev tools must be attached.** Any issue with related development work (PR, branch, commit) must have that work linked in the Jira dev section.

---

## Issue Type Hierarchy

```
Initiative  (strategic-level, long-running programs)
  └── Epic  (large deliverables, groups of related stories)
       └── Story / Task / Bug / Spike  (individual work items)
            └── Sub-task  (breakdown of a single work item)
```

- Sub-tasks use type name `Sub-task` (with hyphen) in the API
- Initiatives are the only type exempt from requiring a parent
- Epics **must** be linked to a parent Initiative
- Everything else **must** have an Epic or parent

---

## Issue Type Definitions

Use these definitions when deciding what type to create or when advising the user on type selection.

**Spike** — Time-boxed research or investigation. The goal is to answer a specific question or reduce uncertainty. Once the question is answered, the Spike closes. No deliverable code or config required. If the Spike surfaces something that needs to be built or changed, that work goes in a new Story — not back into the Spike.

**Story** — Deliverable work that produces a tangible outcome (code merged, config changed, docs written). If a Spike surfaces something that needs to be built or changed, that work lives in a Story. "Actual work" means anything that produces a deliverable artifact.

**Task** — Operational or support work that doesn't fit as a Story (env setup, admin actions, meeting prep, etc.). Discrete and completable but not tied to a product increment.

**Bug** — A defect in existing functionality. Must include what's broken, expected behavior, and steps to reproduce.

**Epic** — A large body of related work spanning multiple sprints. Contains multiple Stories. Represents a feature or initiative — the "why" behind the work.

**Initiative** — A strategic effort that tracks work tied to growth, corporate goals, or program development (e.g., building a capability, writing a whitepaper, pursuing a BD opportunity). Initiatives sit above Epics and group related work that serves a broader organizational objective rather than a direct product deliverable.

### When to Use Which Type

| Situation | Type |
|-----------|------|
| Need to answer a question or reduce uncertainty before building | Spike |
| Building, changing, or shipping something | Story |
| Operational work (env setup, admin, meetings) | Task |
| Something is broken | Bug |
| Grouping multiple related stories across sprints | Epic |
| Grouping work toward a strategic or organizational objective | Initiative |

**Key rule:** If the output is knowledge or a decision → Spike. If acting on that knowledge means changing something in code, config, or docs → Story.

---

## Required Fields by Issue Type

| Field | Initiative | Epic | Story / Task / Bug | Sub-task |
|-------|-----------|------|--------------------|----------|
| Summary | ✅ Required | ✅ Required | ✅ Required | ✅ Required |
| Description | ✅ Required | ✅ Required | ✅ Required | ✅ Required |
| Priority | ✅ Required | ✅ Required | ✅ Required | ✅ Required |
| Assignee | ✅ Required | ✅ Required | ✅ Required | ✅ Required |
| Epic / Parent | ❌ Exempt | ✅ Required | ✅ Required | ✅ Required |
| Labels | Recommended | Recommended | Recommended | Optional |
| User Story | Optional | Optional | ✅ Required | Optional |
| Context | ✅ Required | ✅ Required | ✅ Required | Recommended |

---

## Description Templates by Issue Type

### Initiative

```markdown
[1-2 paragraph summary of what this initiative covers, its strategic goal, and expected outcomes. Include scope boundaries — what programs, teams, or customers are involved.]

## Context
[Timeline, dependencies, strategic drivers, and constraints.]
```

### Epic

```markdown
[1 paragraph summary: what this epic delivers, why it matters, and what's in scope. Mention key deliverables or milestones if known.]

## Context
[Timeline, dependencies, related initiatives or decisions.]
```

### Story

```markdown
As [role/persona], I want [goal] so that [benefit/outcome].

## Problem Statement
[What problem exists today. Be specific about current state, pain points, and why this matters.]

## Scope
[What is included and excluded from this work item.]

## Acceptance Criteria

### Phase 1: [Phase Name]
- [Specific deliverable or verification point]
- [Specific deliverable or verification point]

### Phase 2: [Phase Name]
- [Specific deliverable or verification point]
- [Specific deliverable or verification point]

## Stakeholders
[Who needs to review or approve.]

## Context
[Timeline, dependencies, related decisions, constraints.]
```

### Task

```markdown
## Objective
[What needs to be accomplished.]

## Details
[Additional context, constraints, or implementation notes.]

## Acceptance Criteria
- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

## Context
[Timeline, dependencies, related ADRs or decisions.]
```

### Bug

```markdown
## Summary
[Brief description of the defect.]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen.]

## Actual Behavior
[What actually happens.]

## Environment
- [Browser / OS / Version / Environment details]

## Impact
[Severity and user impact.]

## Screenshots / Logs
[Attach or describe any evidence.]

## Context
[Related tickets, recent changes, or known dependencies.]
```

### Sub-task

```markdown
## Objective
[Specific piece of work to complete.]

## Details
[Implementation notes specific to this sub-task.]

## Acceptance Criteria
- [Criterion 1]
- [Criterion 2]
```

---

## Comment Standards

### When to Add a Comment

A comment is required any time:
- An issue status changes (e.g., moving to In Progress, Reviewing, Done)
- A field is updated (assignee, priority, epic link, etc.)
- Work is completed or paused
- An issue is closed or cancelled

### Comment Format — Status Update

Write comments in plain, readable language. Avoid jargon. Anyone on the team should be able to read it and understand what happened.

```
[What was done or what changed]

[Why it changed, or what triggered the update — optional but recommended]

[Any next steps, blockers, or follow-up items — if applicable]
```

**Good examples:**
- "Completed the API integration for the reporting endpoint. All unit tests passing. Moving to Reviewing for code review."
- "Blocked on access to the staging environment. Waiting on DevOps to provision credentials before we can proceed."
- "Reassigned to Sarah — Kyle is out this week and this needs to move forward."

**Bad examples (do not write these):**
- "done"
- "updated"
- "moved to in progress"
- "see PR"

### Comment Format — Closure

Before transitioning any issue to Done or Cancelled, add a closure comment. It must answer:
1. What was completed or why it was cancelled
2. Who reviewed or validated the work (if applicable)
3. That the issue is now closed

**Closure comment template:**
```
Completed: [Brief description of what was done and the outcome.]

Reviewed by: [Name or "Self-reviewed" if no external review was required.]

Closing this issue. [Any notes for future reference — optional.]
```

**Good closure examples:**
- "Completed: Implemented the new user onboarding flow and deployed to production. All acceptance criteria met and verified in staging. Reviewed by the QA team. Closing this issue."
- "Completed: Migrated the legacy reporting tables to the new schema. No data loss confirmed. Reviewed by the data team lead. Closing this issue."
- "Cancelled: This work is no longer needed following the decision to use the vendor solution instead. No development was done. Closing this issue."

**Bad closure examples (do not write these):**
- "done"
- "closing"
- "completed"
- "no longer needed"

---

## Dev Tools — Linking Development Work

Any issue with related development work must have that work attached in Jira's dev section. This makes it easy for anyone to find the PR, branch, or commit directly from the ticket.

### What to Link

| Development artifact | When to link |
|---------------------|-------------|
| GitHub Pull Request | Always, when a PR exists for this issue |
| Branch | When work is in progress on a dedicated branch |
| Commit | For hotfixes or small changes without a PR |

### How to Link a GitHub PR

Use `jira_jira_add_remote_link` or the equivalent dev panel integration to attach the PR URL to the issue.

```
URL:   https://github.com/[org]/[repo]/pull/[number]
Title: PR #[number]: [PR title]
```

After linking, confirm the PR appears in the issue's dev section before closing the issue.

### Dev Tool Rule

Do not close an issue that has development work without confirming the PR or branch is linked. If the user says "close this ticket" and there's a PR, ask: "Is the GitHub PR linked in the dev section? If not, provide the PR URL and I'll attach it before closing."

---

## Workflow: Creating an Issue

### Step 1 — Gather Required Information

Collect all required fields before drafting the ticket. Do not skip required fields.

Ask the user:
1. **Project key** — Never assume. Always ask.
2. **Issue type** — Initiative, Epic, Story, Task, Bug, or Sub-task
3. **Summary** — Clear, concise title
4. **Epic or parent** — Required for Epic, Story, Task, Bug, Sub-task. Ask: "What epic, initiative, or parent does this belong to?"
5. **Priority** — Ask: "What priority should this be? (Highest, High, Medium, Low, Lowest)"
6. **Assignee** — Ask: "Who should this be assigned to?"
7. **Description details** — Use the appropriate template for the issue type
8. **Labels** — Ask what labels apply (see Label Conventions)
9. **Related issues** — Ask if it blocks, is blocked by, or relates to other tickets

### Step 2 — Search for Context

Before creating, search for:
- Duplicate or similar existing tickets
- The target epic or initiative (if linking)
- Available sprints (if adding to sprint)

```
Use: jira_jira_search with relevant JQL
Use: jira_jira_get_project_issues for recent context
```

### Step 3 — Preview and Confirm

Present the ticket to the user before creating:

```
--- Ticket Preview ---
Project:     [KEY]
Type:        [Issue Type]
Summary:     [Title]
Priority:    [Priority]
Assignee:    [Name]
Labels:      [label1, label2]
Epic / Parent: [KEY or "None — exempt for this type"]

Description:
[Full formatted description]
---

Shall I create this ticket?
```

Wait for explicit user confirmation before proceeding.

### Step 4 — Create the Issue

Use `jira_jira_create_issue` with confirmed details.

For epic links:
```json
{"epicKey": "EPIC-123"}
```

For sub-tasks:
```json
{"parent": "PROJ-456"}
```

For labels:
```json
{"labels": ["BD/Growth", "Corporate"]}
```

### Step 5 — Post-Creation Actions

After successful creation, offer:

1. **Transition status** — Offer to move from Backlog to appropriate status via `jira_jira_transition_issue`
2. **Add to sprint** — Offer to add to active/future sprint via `jira_jira_add_issues_to_sprint`
3. **Link related issues** — Offer to link (blocks, relates to, duplicate) via `jira_jira_create_issue_link`
4. **Attach dev tools** — If a PR or branch already exists, link it now
5. **Create child issues** — For Epics, offer to create child Stories. For Stories, offer Sub-tasks.

Report the created ticket key back to the user.

---

## Workflow: Updating an Issue

Any time an issue is updated:

1. Make the field change using `jira_jira_update_issue`
2. Add a comment using `jira_jira_add_comment` explaining what changed and why
3. If the update involves a status transition, use `jira_jira_transition_issue` and confirm available transitions first with `jira_jira_get_transitions`

**Never update an issue without adding a comment.**

---

## Workflow: Closing an Issue

Before transitioning any issue to Done or Cancelled:

1. **Confirm dev tools are linked** — Ask if there's a PR or branch that needs to be attached
2. **Write the closure comment** — Use the closure comment template above
3. **Add the comment** using `jira_jira_add_comment`
4. **Transition the issue** using `jira_jira_transition_issue`

**Never close an issue without a closure comment.**

Closure checklist:
- [ ] Closure comment written and added
- [ ] GitHub PR linked in dev section (if applicable)
- [ ] All acceptance criteria confirmed met (or cancellation reason documented)
- [ ] Issue transitioned to Done or Cancelled

---

## Label Conventions (RIC Project)

### Tier 1: Domain / Business Unit

| Label | Meaning |
|-------|---------|
| `BD/Growth` | Business development, growth opportunities, proposals |
| `Health` | Health business unit (CMS, HHS, NHLBI) |
| `Corporate` | Internal corporate initiatives |
| `DNS` | Defense & National Security business unit |
| `Civilian` | Civilian agency work (SBA, etc.) |

### Tier 2: Work Category

| Label | Meaning |
|-------|---------|
| `Program` | Active program/contract work |
| `RIC` | RIC team internal work |
| `SHINE` | SHINE product work |
| `CIO_Growth` | CIO growth initiatives |

### Tier 3: Technical / Contextual (optional)

Used for technical context on implementation tickets:
- `frontend`, `api`, `ci`, `security`, `bdd`, `ingestion`
- `adr-XXX` (reference to architecture decision records)
- Product/tool names: `playwright`, `openfeature`, `trivy`

### Labeling Rules

- Most tickets get at least one Tier 1 label (domain) and often a Tier 2 label (category)
- Initiatives and Epics almost always have labels
- Technical Tier 3 labels are used on Stories/Tasks/Bugs that relate to specific technical areas
- Ask: "Which business domain does this relate to?" and "What category of work is this?"

---

## Workflow Statuses (RIC Project)

| Status | Category | Usage |
|--------|----------|-------|
| `Backlog` | To Do | Default for new items not yet prioritized |
| `To Do` | To Do | Prioritized but not started |
| `Ready for Work` | To Do | Groomed and ready to pick up |
| `In Progress` | In Progress | Actively being worked |
| `Blocked` | In Progress | Cannot proceed — dependency or impediment |
| `Reviewing` | In Progress | Under review (code review, stakeholder review) |
| `Reviewed` | In Progress | Review complete, ready for next step |
| `Ready for QA` | In Progress | Implementation done, awaiting QA |
| `Waiting` | In Progress | Waiting on external input |
| `Discovery` | In Progress | Initiatives in early exploration/research |
| `Lead Qualification` | In Progress | BD: qualifying an opportunity |
| `Solution Validation / Proposal` | In Progress | BD: validating solution or writing proposal |
| `Always On` | In Progress | Ongoing work with no end date |
| `Red Review` | In Progress | Flagged for escalation review |
| `Mitigating` | In Progress | Actively mitigating a risk/issue |
| `QUEUED` | In Progress | Queued for processing |
| `Done` | Done | Completed |
| `Cancelled` | Done | No longer needed |

---

## Linking Rules

### Hierarchy Linking

| Situation | Action |
|-----------|--------|
| Epic belongs to an Initiative | Link Epic as child of Initiative |
| Story/Task/Bug belongs to an Epic | Link to Epic via `epicKey` |
| Sub-task belongs to a Story/Task | Set parent via `parent` field |

### Relationship Linking

| Situation | Action |
|-----------|--------|
| Ticket blocks another | Create "Blocks" link |
| Ticket is blocked by another | Create "Blocks" link (reversed) |
| Ticket is related to another | Create "Relates to" link |
| Ticket duplicates another | Create "Duplicate" link |

---

## Batch Creation Patterns

### Pattern 1: Initiative + Epics

1. Create the Initiative first
2. Confirm the list of child Epics with the user
3. Create each Epic linked to the Initiative
4. Report all created ticket keys

### Pattern 2: Epic + Child Stories/Tasks

1. Create the Epic first
2. Confirm the list of child issues with the user
3. Create each child issue linked to the epic
4. Apply consistent labels across the batch
5. Report all created ticket keys

### Pattern 3: Story + Sub-tasks

1. Create the parent Story first
2. Confirm the sub-task breakdown with the user
3. Create each sub-task with the parent reference (type = `Sub-task`)
4. Report all created ticket keys

### Batch Confirmation Format

```
--- Batch Creation Plan ---
Initiative: [INIT-KEY] (existing) or [New: "Title"]
Epic: [EPIC-KEY] (existing) or [New: "Title"]
Labels: [label1, label2]

Tickets to create:
1. [Type] - "Summary" (links to: EPIC-KEY) | Priority: High | Assignee: Name
2. [Type] - "Summary" (links to: EPIC-KEY) | Priority: Medium | Assignee: Name
3. [Type] - "Summary" (blocked by: #1) | Priority: High | Assignee: Name
4. [Sub-task] - "Summary" (parent: #2) | Priority: Low | Assignee: Name

Shall I proceed with creating all [N] tickets?
```

---

## Error Handling

- If creation fails, report the error clearly and suggest fixes
- If a required field is missing, do not proceed — ask the user to provide it
- If the project key is wrong, list available projects with `jira_jira_get_all_projects`
- If an epic key is invalid, search for the correct one with `jira_jira_search`
- If `Sub-task` type fails, verify the exact type name with the project (some use `Subtask`, others `Sub-task`)
- If labels are rejected, check available labels or create without and add via update
- If a transition is unavailable, use `jira_jira_get_transitions` to show the user what transitions are available from the current status
