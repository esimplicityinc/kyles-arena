# Jira Team Process

This document defines who is responsible for what in Jira — from ticket creation through closure. We operate on a **Kanban** model: there are no sprints. Work flows continuously through the board. The team pulls from a prioritized backlog as capacity opens up.

Every member of the team is expected to follow this process. No exceptions.

---

## Roles Referenced in This Document

| Role | Responsibility Summary |
|------|----------------------|
| **Product Manager (PM)** | Owns backlog priority order, ticket quality, and requirements |
| **Tech Lead (TL)** | Owns technical direction, code review, and dev-readiness of tickets |
| **Developer / Engineer** | Executes work, transitions status, links PRs, and closes tickets |

---

## How Kanban Works on This Team

- There are no sprints, sprint planning, or sprint reviews.
- The backlog is a continuously prioritized queue. **The PM owns the priority order.**
- Developers pull from the top of the backlog when they have capacity — they do not wait to be assigned.
- When someone finishes a ticket, the team decides together (as-needed, no ceremony) what moves into active work next.
- Work-in-progress limits are enforced per person. **The team owns its own WIP limit** — agree on a number and hold to it. When in doubt, default to 2 In Progress tickets per person.
- A ticket in `Blocked` status does not count toward a developer's WIP limit. If you are blocked, add a comment explaining the blocker and pull the next prioritized item.

---

## Issue Type Hierarchy

All work lives in a hierarchy. Every issue must be linked to its parent before it is considered complete.

```
Initiative  (strategic programs — only type exempt from requiring a parent)
  └── Epic  (must be linked to a parent Initiative)
       └── Story / Task / Bug / Spike  (must be linked to an Epic or parent)
            └── Sub-task  (must be linked to a parent Story, Task, or Bug)
```

If you are creating a ticket and you do not know what epic or initiative it belongs to, stop and ask the PM before creating it.

---

## Ticket Quality Standards

Every ticket — regardless of type — must have the following fields populated before work begins:

| Field | Requirement |
|-------|------------|
| Summary | Clear, concise title |
| Description | Filled using the appropriate template |
| Priority | Must be set explicitly — never left at default without discussion |
| Assignee | Must be assigned to a specific person — never unassigned |
| Epic / Parent | Required for all types except Initiative |
| Labels | At minimum one Tier 1 domain label |

---

## Responsibilities by Workflow Stage

### 1. Ticket Creation

| Who | What They Create |
|-----|-----------------|
| PM | Initiatives, Epics, Stories |
| TL | Spikes, technically-scoped Tasks, Sub-tasks for engineering breakdown |
| Developer | Sub-tasks when breaking down their own assigned work |
| Anyone | Bugs — anyone who finds a defect should file it immediately |

**Rules:**
- The creator is responsible for filling out all required fields at creation time.
- If you cannot fill a required field, do not create the ticket — resolve the blocker first.
- Bugs must always include steps to reproduce, expected behavior, and actual behavior.

---

### 2. Backlog Grooming and Refinement

**Owner: Product Manager**

Grooming happens on a **weekly cadence**. The PM prepares tickets before the session; the team reviews together to ensure everything at the top of the backlog is ready to pull.

A ticket is eligible to pull into `In Progress` only if:

- All required fields are populated
- Acceptance criteria are written and specific
- The epic or parent link is confirmed
- Priority reflects current team priorities
- Assignee is confirmed (not just defaulted)

The TL confirms technical completeness:

- Acceptance criteria are technically achievable and unambiguous
- Sub-tasks have been created if the story is large enough to warrant breakdown
- Any blocking dependencies are identified and linked

There is no formal `Ready for Work` status gate. Once a ticket is groomed and confirmed by PM and TL, it sits at the top of the prioritized backlog — developers pull it when they have capacity.

---

### 3. Pulling Work and Status Transitions

**Owner: Developer (the assignee)**

The assignee is responsible for moving a ticket through the workflow. Do not wait for someone else to transition your tickets.

| Transition | Who Does It | When |
|-----------|-------------|------|
| Backlog → To Do | PM | When ticket is prioritized and groomed |
| To Do → In Progress | Developer | When you pull it from the backlog |
| In Progress → Blocked | Developer | When you hit a blocker — immediately |
| In Progress → Reviewing | Developer | When you open a PR or send for review |
| Reviewing → Reviewed | TL / Reviewer | When review is complete and changes are addressed |
| Reviewed → Ready for QA | Developer | When approved and merged, if QA is required |
| Ready for QA → Done | Developer | When all acceptance criteria are met and PR is merged |
| Any → Cancelled | PM | When work is no longer needed |

**Every transition must have a comment.** See the comment standards below.

**WIP reminder:** Before pulling a new ticket into `In Progress`, check your current WIP. If you are at or above the team's agreed limit, finish or unblock existing work first. Exception: a ticket in `Blocked` does not count — you may pull new work while waiting on a blocker.

---

### 4. Writing Comments

**Owner: Whoever makes the change**

A comment is required any time:
- A status changes
- A field is updated (assignee, priority, epic link, etc.)
- Work is completed or paused
- An issue is closed or cancelled
- **You are actively working on a ticket — once per business day, every day**

**Daily update rule:** If a ticket is in `In Progress` and you worked on it today, you must leave a comment before the end of the day. This keeps the team informed, surfaces blockers early, and eliminates the need to chase people for status updates. A ticket with no comment in 3+ business days is considered stale and will be flagged.

**Comment format:**

```
[What was done or what changed]

[Why it changed, or what triggered the update — optional but helpful]

[Any next steps, blockers, or follow-up items — if applicable]
```

**Good daily update examples:**
- "Completed the API integration for the reporting endpoint. All unit tests passing. Moving to Reviewing for code review."
- "Made progress on the auth middleware — core logic is working, still need to wire up the token refresh flow. On track."
- "Blocked on access to the staging environment. Waiting on DevOps to provision credentials before we can proceed."
- "Reassigned to Sarah — Kyle is out this week and this needs to move forward."

**Not acceptable:**
- "done"
- "updated"
- "moved to in progress"
- "see PR"
- No comment at all on a day you worked the ticket

---

### 5. Linking GitHub PRs and Dev Work

**Owner: Developer who opens the PR**

Any ticket with related development work must have that work linked in the Jira dev section. This is the developer's responsibility at the time the PR is opened — not at closure, not during code review.

| Artifact | When to Link |
|----------|-------------|
| Pull Request | When you open the PR |
| Branch | When you start a dedicated branch for the work |
| Commit | For hotfixes or small changes without a PR |

**Rule:** Do not transition a ticket to `Reviewing` without a linked PR. Do not close a ticket with development work if the PR is not linked.

---

### 6. Closing Tickets

**Owner: Developer (assignee)**

A ticket is Done when:
1. All acceptance criteria are met
2. The PR is merged to main

Before transitioning any ticket to `Done` or `Cancelled`, the following checklist must be complete:

- [ ] All acceptance criteria are met and the PR is merged to main
- [ ] GitHub PR is linked in the dev section (if development work was done)
- [ ] Closure comment is written and added
- [ ] Any sub-tasks are also closed

**Closure comment format:**

```
Completed: [Brief description of what was done and the outcome.]

Reviewed by: [Name, or "Self-reviewed" if no external review was required.]

Closing this issue. [Any notes for future reference — optional.]
```

**Good examples:**
- "Completed: Implemented the new user onboarding flow and deployed to production. All acceptance criteria met and PR merged to main. Reviewed by the TL. Closing this issue."
- "Cancelled: This work is no longer needed following the decision to use the vendor solution instead. No development was done. Closing this issue."

**Not acceptable:**
- "done"
- "closing"
- "completed"
- "no longer needed"

---

## Quick Reference: Who Does What

| Action | Responsible Party |
|--------|------------------|
| Create Initiatives and Epics | PM |
| Create Stories | PM |
| Create Spikes and Tasks | TL |
| Create Bugs | Anyone who finds one |
| Create Sub-tasks | Developer (assignee) |
| Own backlog priority order | PM |
| Groom tickets weekly | PM (story quality) + TL (technical completeness) |
| Decide what moves into active work | Team (as-needed, when someone has capacity) |
| Pull ticket into In Progress | Developer |
| Enforce WIP limits | Developer (self) + Team |
| Transition ticket to Reviewing | Developer |
| Approve and transition to Reviewed | TL / Reviewer |
| Link GitHub PR to ticket | Developer (when PR is opened) |
| Write status change comments | Whoever makes the change |
| Write daily progress comment on active tickets | Developer (every business day) |
| Write closure comment | Developer (assignee) |
| Close (transition to Done) | Developer (assignee) |
| Cancel a ticket | PM |

---

## Kanban Flow Health

These are the team's flow health rules. If a ticket is violating one, it should be flagged at standup or directly to the TL.

| Situation | Rule |
|-----------|------|
| Ticket in `In Progress` | Developer must leave a comment every business day they work the ticket |
| Ticket in `Blocked` | Developer must add a comment immediately explaining the blocker and what is needed |
| Ticket in `Blocked` | Does NOT count toward WIP limit — developer may pull new work |
| Ticket in `In Progress` with no comment for 3+ business days | Flagged as stale — developer must update with current status |
| Ticket in `Reviewing` with no reviewer engaged | Developer flags the TL directly |
| Developer at WIP limit | Must finish or escalate existing work before pulling new tickets |

There is no fixed escalation SLA — use judgment. When in doubt, flag it to the TL sooner rather than later.

---

## References

- Full Jira guidelines (internal): `.opencode/skills/jira-guidelines/SKILL.md`
- Issue type definitions, description templates, label conventions, and workflow statuses are all documented in the skill above.
