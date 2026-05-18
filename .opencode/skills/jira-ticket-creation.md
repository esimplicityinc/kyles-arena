---
name: jira-ticket-creation
description: Guide agents through creating well-structured Jira tickets with proper descriptions, linking, labeling, and post-creation workflow. Use when creating Jira issues, breaking work into tickets, or managing ticket relationships.
version: 2.0.0
---

# Jira Ticket Creation

Guide agents through creating well-structured Jira tickets with structured descriptions, proper hierarchy, labeling, and full post-creation workflow.

## When to Use This Skill

- User requests creation of a Jira ticket or issue
- User asks to break work into multiple Jira tickets
- User wants to log an initiative, epic, story, task, bug, or sub-task in Jira
- User wants to create and link issues to an existing epic, initiative, or parent

## Core Rules

1. **Always ask for the project key.** Never assume or guess a project key.
2. **Always confirm ticket details with the user before creating.** Present a preview of the ticket (summary, type, description, labels, links) and get explicit approval.
3. **Use structured templates** for descriptions based on issue type (see below).
4. **Check for related issues** before creating. Search for duplicates or related tickets when context allows.
5. **Link tickets appropriately.** Always ask if the ticket should be linked to an epic, initiative, or related issue.
6. **Apply labels.** Always ask about labels -- most projects use them for filtering and board views.
7. **Use the Jira MCP tools** (`jira_jira_create_issue`, `jira_jira_search`, etc.) for all operations.

## Issue Type Hierarchy

The standard hierarchy from highest to lowest:

```
Initiative  (strategic-level work, long-running programs)
  └── Epic  (large deliverables, groups of related stories)
       └── Story / Task / Bug  (individual work items)
            └── Sub-task  (breakdown of a single work item)
```

**Important:** Sub-tasks use type name `Sub-task` (with hyphen) in the API.

## Required Information Gathering

Before creating any ticket, collect:

| Field | Required | Notes |
|-------|----------|-------|
| Project key | Yes | Always ask, never assume |
| Summary | Yes | Clear, concise title |
| Issue type | Yes | Initiative, Epic, Story, Task, Bug, or Sub-task |
| Description | Yes | Use structured template for the type |
| Labels | Yes* | Ask what labels apply (see Label Conventions) |
| Assignee | No | Ask if user wants to assign |
| Priority | No | Ask if user has a preference |
| Epic link | No | Ask if it belongs to an epic |
| Parent issue | Yes (Sub-task) | Required for sub-tasks |
| Initiative link | No | Ask if it belongs to an initiative |

*Labels are technically optional in Jira but should be treated as expected for most projects.

## Label Conventions (RIC Project)

RIC uses a structured labeling taxonomy. When creating tickets for the RIC project, always ask which labels apply:

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

- Most tickets get **at least one Tier 1 label** (domain) and often a **Tier 2 label** (category)
- Initiatives and Epics almost always have labels
- Technical Tier 3 labels are used on Stories/Tasks/Bugs that relate to specific technical areas
- Ask: "Which business domain does this relate to?" and "What category of work is this?"

## Workflow Statuses

### Available Statuses

Projects may have complex workflows. For RIC, the full status set is:

| Status | Category | Usage |
|--------|----------|-------|
| `Backlog` | To Do | Default for new items not yet prioritized |
| `To Do` | To Do | Prioritized but not started |
| `Lead Qualification` | In Progress | BD: qualifying an opportunity |
| `Discovery` | In Progress | Initiatives in early exploration/research |
| `Ready for Work` | To Do | Groomed and ready to pick up |
| `In Progress` | In Progress | Actively being worked |
| `Blocked` | In Progress | Cannot proceed, dependency or impediment |
| `Reviewing` | In Progress | Under review (code review, stakeholder review) |
| `Solution Validation / Proposal` | In Progress | BD: validating solution or writing proposal |
| `Reviewed` | In Progress | Review complete, ready for next step |
| `Ready for QA` | In Progress | Implementation done, awaiting QA |
| `Always On` | In Progress | Ongoing work with no end date (used for Initiatives) |
| `Waiting` | In Progress | Waiting on external input |
| `Red Review` | In Progress | Flagged for escalation review |
| `QUEUED` | In Progress | Queued for processing |
| `Mitigating` | In Progress | Actively mitigating a risk/issue |
| `Done` | Done | Completed |
| `Cancelled` | Done | No longer needed |

### Status Transition Guidance

- New tickets default to `Backlog`
- After creation, offer to transition if the user wants it in a different state
- Use `jira_jira_get_transitions` to check available transitions for the specific issue
- Common post-creation transitions:
  - `Backlog` → `To Do` (prioritized)
  - `Backlog` → `In Progress` (starting immediately)
  - `Backlog` → `Discovery` (for Initiatives beginning exploration)

## Description Templates by Issue Type

### Initiative

Initiatives are strategic-level, long-running. Keep descriptions concise -- 1-2 paragraphs summarizing the program of work. Details live in child Epics/Stories.

```markdown
[1-2 paragraph summary of what this initiative covers, its strategic goal, and expected outcomes. Include scope boundaries -- what programs, teams, or customers are involved.]
```

**Real examples of Initiative descriptions:**
- "Advance eSimplicity from Registered to Select tier in the Snowflake Partner Network. Starting from scratch — need to complete partner onboarding, earn 4 SnowPro Core certifications..."
- "Advance eSimplicity's Salesforce partnership under Salesforce's new competency-based model..."

### Epic

Epics group related stories. Descriptions are brief -- 1 paragraph covering scope and goal. Child stories carry the detail.

```markdown
[1 paragraph summary: what this epic delivers, why it matters, and what's in scope. Mention key deliverables or milestones if known.]
```

**Real examples of Epic descriptions:**
- "Advance eSimplicity from Registered to Select tier in the Snowflake Partner Network..."
- "Shut down all prima-prod workloads on the katalyst-platform-eks-prod-cluster indefinitely..."

### Story

Stories are the primary work item type in RIC. They use a detailed, phased structure:

```markdown
As [role/persona], I want [goal] so that [benefit/outcome].

## Problem Statement
[What problem exists today. Be specific about current state, pain points, and why this matters.]

## Scope
[What is included and excluded from this work item]

## Acceptance Criteria

### Phase 1: [Phase Name]
- [Specific deliverable or verification point]
- [Specific deliverable or verification point]
- [Specific deliverable or verification point]

### Phase 2: [Phase Name]
- [Specific deliverable or verification point]
- [Specific deliverable or verification point]

### Phase 3: [Phase Name]
- [Specific deliverable or verification point]
- [Specific deliverable or verification point]

## Stakeholders
[Who needs to review or approve]

## Context
[Timeline, dependencies, related decisions, constraints]
```

**Notes on Story format:**
- The "As a..." opener is optional -- some stories start directly with the problem statement
- Acceptance Criteria should be **phased** when the work spans multiple stages
- Include a `Stakeholders` section when review/sign-off is needed
- Include a `Context` section for timeline, dependencies, and constraints
- Be detailed -- RIC stories tend to be comprehensive, not skeletal

### Task

Tasks are smaller, more tactical work items without the full story structure:

```markdown
## Objective
[What needs to be accomplished]

## Details
[Additional context, constraints, or implementation notes]

## Acceptance Criteria
- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

## Context
[Timeline, dependencies, related ADRs or decisions]
```

### Bug

```markdown
## Summary
[Brief description of the defect]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- [Browser/OS/Version/Environment details]

## Impact
[Severity and user impact]

## Screenshots / Logs
[Attach or describe any evidence]
```

### Sub-task

Sub-tasks are concise -- they inherit context from their parent:

```markdown
## Objective
[Specific piece of work to complete]

## Details
[Implementation notes specific to this sub-task]

## Acceptance Criteria
- [Criterion 1]
- [Criterion 2]
```

## Workflow

### Step 1: Gather Requirements

Ask the user for:
1. What project? (project key)
2. What type of issue? (Initiative, Epic, Story, Task, Bug, Sub-task)
3. What's the summary/title?
4. Collect description details using the appropriate template
5. What labels apply? (domain, category, technical)
6. Any assignments or priority?
7. Should it link to an epic, initiative, or other issues?

### Step 2: Search for Context (when applicable)

Before creating, optionally search for:
- Duplicate or similar existing tickets
- The target epic or initiative (if linking)
- Available sprints (if adding to sprint)

```
Use: jira_jira_search with relevant JQL
Use: jira_jira_get_project_issues for recent context
```

### Step 3: Preview and Confirm

Present the ticket to the user in this format:

```
--- Ticket Preview ---
Project:     [KEY]
Type:        [Issue Type]
Summary:     [Title]
Priority:    [Priority or "Default"]
Assignee:    [Name or "Unassigned"]
Labels:      [label1, label2]
Epic Link:   [EPIC-KEY or "None"]
Parent:      [PARENT-KEY or "None"]

Description:
[Full formatted description]
---

Shall I create this ticket?
```

Wait for explicit user confirmation before proceeding.

### Step 4: Create the Ticket

Use `jira_jira_create_issue` with the confirmed details.

For epic links, use the `additional_fields` parameter:
```json
{"epicKey": "EPIC-123"}
```

For sub-tasks, include the parent and use the correct type name:
```json
// issue_type must be "Sub-task" (with hyphen)
{"parent": "PROJ-456"}
```

For labels, include in `additional_fields`:
```json
{"labels": ["BD/Growth", "Corporate"]}
```

### Step 5: Post-Creation Workflow

After successful creation, offer these follow-up actions:

1. **Link to Epic** - If not already linked, offer to link via `jira_jira_link_to_epic`
2. **Transition Status** - Offer to move from Backlog to appropriate status via `jira_jira_transition_issue`
3. **Add to Sprint** - Offer to add to active/future sprint via `jira_jira_add_issues_to_sprint`
4. **Assign** - If unassigned, offer to assign via `jira_jira_update_issue`
5. **Create Related Links** - Offer to link to other issues (blocks, relates to) via `jira_jira_create_issue_link`
6. **Create Child Issues** - For Epics, offer to create child Stories. For Stories, offer Sub-tasks.

Report the created ticket key back to the user.

## Linking Rules

### Hierarchy Linking

| Situation | Action |
|-----------|--------|
| Epic belongs to an Initiative | Link Epic as child of Initiative |
| Story/Task belongs to an Epic | Link to Epic via `epicKey` |
| Sub-task belongs to a Story/Task | Set parent via `parent` field |

### Relationship Linking

| Situation | Action |
|-----------|--------|
| Ticket blocks another | Create "Blocks" link |
| Ticket is blocked by another | Create "Blocks" link (reversed) |
| Ticket is related to another | Create "Relates to" link |
| Ticket duplicates another | Create "Duplicate" link |

### How to Link

1. **Epic linking** - Use `epicKey` in `additional_fields` during creation, or `jira_jira_link_to_epic` after creation
2. **Parent/Sub-task** - Use `parent` in `additional_fields` during creation (type must be `Sub-task`)
3. **Issue links** - Use `jira_jira_create_issue_link` with the appropriate link type

Always ask the user:
- "Does this belong to an existing epic or initiative?"
- "Is this related to or blocked by any other tickets?"

## Batch Creation Patterns

When the user wants to create multiple related tickets:

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

### Pattern 4: Implementation Plan -> Tickets

When breaking a plan into tickets:
1. Present the proposed ticket breakdown to the user
2. Confirm issue types, summaries, labels, and relationships
3. Use `jira_jira_batch_create_issues` for bulk creation when all tickets are independent
4. Add linking after batch creation
5. Offer to add all to a sprint

### Batch Confirmation Format

```
--- Batch Creation Plan ---
Initiative: [INIT-KEY] (existing) or [New: "Title"]
Epic: [EPIC-KEY] (existing) or [New: "Title"]
Labels: [label1, label2]

Tickets to create:
1. [Type] - "Summary" (links to: EPIC-KEY)
2. [Type] - "Summary" (links to: EPIC-KEY)
3. [Type] - "Summary" (blocked by: #1)
4. [Sub-task] - "Summary" (parent: #2)

Shall I proceed with creating all [N] tickets?
```

## Error Handling

- If creation fails, report the error clearly and suggest fixes
- If a field is invalid, help the user correct it
- If the project key is wrong, list available projects with `jira_jira_get_all_projects`
- If an epic key is invalid, search for the correct one
- If `Sub-task` type fails, verify the exact type name with the project (some use `Subtask`, others `Sub-task`)
- If labels are rejected, check available labels or create without and add via update

## Examples

### Single Story Creation (RIC)

User: "Create a Jira ticket for implementing AWS governance best practices"

Agent flow:
1. Ask: "What project should this be in?"
2. User says: "RIC"
3. Ask: "Should this be a Story, Task, Epic, or Initiative?"
4. User says: "Story"
5. Collect details using Story template (problem statement, phased AC)
6. Ask: "What labels apply? Common RIC labels include BD/Growth, Health, Corporate, DNS, Civilian for domain and Program, RIC, SHINE for category."
7. Ask: "Does this belong to an existing epic?"
8. Preview the ticket with full description and labels
9. Create on confirmation
10. Offer post-creation actions (transition, assign, sprint)

### Initiative Creation

User: "Create an initiative for our Databricks partnership advancement"

Agent flow:
1. Ask: "What project?"
2. User says: "RIC"
3. Set type to Initiative
4. Collect 1-2 paragraph summary description
5. Ask: "What labels? This sounds like BD/Growth and Corporate."
6. Preview the ticket
7. Create on confirmation
8. Ask: "Should I transition this to Discovery, or leave it in Backlog?"
9. Ask: "Would you like to create child Epics for this initiative?"

### Batch Breakdown with Labels

User: "Break the monitoring work into Jira tickets"

Agent flow:
1. Ask: "What project?" → RIC
2. Propose hierarchy: Epic + phased Stories
3. Ask: "What labels apply to all of these?" → suggest `RIC`, `Corporate`
4. Draft each ticket description using appropriate templates
5. Present batch confirmation with labels
6. Create Epic first, then child Stories linked to it
7. Offer to transition Epic to "In Progress"
