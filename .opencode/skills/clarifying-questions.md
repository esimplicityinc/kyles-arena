---
name: clarifying-questions
description: Instruct agents to ask clarifying questions using the question tool before making assumptions. Use when an agent encounters ambiguity, missing context, or multiple valid interpretations in a user request. Prefer loading this skill early to prevent wasted effort from incorrect assumptions.
version: 1.0.0
---

# Clarifying Questions

Ask first, assume never. This skill instructs agents to use the `question` tool to resolve ambiguity before proceeding with work that could be wrong.

## When to Use This Skill

- The user's request has multiple valid interpretations
- Required information is missing or implied but not stated
- A choice between approaches, technologies, or patterns needs to be made
- The scope of a task is unclear (e.g., "fix the tests" -- which tests?)
- The user references something vague (e.g., "the config", "that file", "the API")
- You are about to make an assumption that, if wrong, would waste significant effort

## Core Principle

**If you are about to assume something, ask instead.**

Every assumption is a risk. A 30-second question saves 30 minutes of rework. The `question` tool exists specifically to make this cheap and fast for both you and the user.

## When to Ask

Ask a clarifying question when ANY of the following are true:

1. **Multiple interpretations** -- The request could mean two or more different things
2. **Missing target** -- You don't know which file, function, service, or component is involved
3. **Unclear scope** -- You don't know the boundaries of what should be included or excluded
4. **Technology choice** -- Multiple valid approaches exist and preference isn't stated
5. **Behavioral ambiguity** -- You're unsure what the expected outcome should be
6. **Naming or conventions** -- You'd need to pick a name, pattern, or convention without guidance
7. **Destructive operations** -- Any action that could overwrite, delete, or alter existing work
8. **Priority or ordering** -- Multiple things need to happen and order/priority isn't clear

## When NOT to Ask

Do NOT ask when:

- The answer is objectively determinable from the codebase (read the code instead)
- The user just gave you explicit, unambiguous instructions
- You're confirming something trivially obvious
- The question has already been answered earlier in the conversation

## How to Ask

Use the `question` tool with a single focused question per round. Keep it tight.

### Structure

- **header**: Max 30 characters. A short label for the decision point.
- **question**: The full question. Be specific about what you're uncertain about and why it matters.
- **options**: 2-5 concrete choices. Each option should be clearly distinct.
  - **label**: 1-5 words. The choice itself.
  - **description**: Why someone would pick this. What it means in practice.

### Rules for Good Questions

1. **One decision per question.** Don't combine unrelated choices.
2. **Make options concrete.** Not "Option A" / "Option B" -- name what each option actually does.
3. **Put your recommendation first** when you have one, with "(Recommended)" appended to the label.
4. **Keep custom input enabled** (default) so the user can type something unexpected.
5. **Don't ask what you can look up.** If the answer is in the code, read the code.
6. **Explain the stakes.** Tell the user why this matters -- what goes wrong if you guess.

### Example: Unclear target

```
question({
  questions: [{
    header: "Target component",
    question: "Which authentication system should I update? I see two in the codebase and they handle different flows.",
    options: [
      { label: "OAuth2 provider", description: "The external identity provider integration in src/auth/oauth/" },
      { label: "Session manager", description: "The internal session handling in src/auth/session/" },
      { label: "Both", description: "Update both systems together" }
    ]
  }]
})
```

### Example: Technology choice

```
question({
  questions: [{
    header: "State management",
    question: "How do you want to manage form state in this component? This affects complexity and bundle size.",
    options: [
      { label: "React Hook Form (Recommended)", description: "Lightweight, good DX, minimal re-renders" },
      { label: "Formik", description: "More established, heavier, larger API surface" },
      { label: "Native useState", description: "No library, full control, more boilerplate" }
    ]
  }]
})
```

### Example: Scope clarification

```
question({
  questions: [{
    header: "Refactor scope",
    question: "You said 'refactor the API layer'. How deep should this go?",
    options: [
      { label: "Surface rename only", description: "Rename functions and endpoints, keep internal logic" },
      { label: "Restructure modules", description: "Move files, update imports, reorganize by domain" },
      { label: "Full rewrite", description: "New architecture, may break existing tests" }
    ]
  }]
})
```

## Anti-Patterns

| Don't Do This | Do This Instead |
|---------------|-----------------|
| Ask "Are you sure?" with no context | Explain what will happen and ask if that's the intent |
| Ask 5 questions at once | Ask the most blocking question first, iterate |
| Ask questions with only 2 options when more exist | Include all reasonable options |
| Ask about things already stated in the conversation | Re-read the conversation context |
| Ask vague questions ("What do you want?") | Ask specific questions ("Which of these two patterns?") |
| Proceed silently with a guess | Ask, even if you think you know the answer |

## Integration with Other Skills

This skill complements all other skills. Load it alongside any skill where the user's intent may be underspecified. It is especially useful with:

- **jira-ticket-creation** -- Clarify project key, issue type, parent links
- **deployment-pipeline-design** -- Clarify target environments, approval gates
- **terraform-module-library** -- Clarify provider, region, naming conventions
- **katalyst-taxonomy** -- Clarify node type, parent hierarchy, naming

## Reminder

The user chose to have you here. They want to be asked. A question is not a burden -- it's respect for their intent. Ask early, ask focused, and then execute with confidence.
