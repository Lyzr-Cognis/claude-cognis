---
name: cognis-save
description: Save important information, architectural decisions, patterns, or project knowledge to Cognis persistent memory.
---

# Save to Cognis Memory

Use this skill when the user wants to preserve architectural decisions, important patterns, conventions, or project knowledge for future sessions.

## Instructions

1. Determine what the user wants to save.
2. Format the content clearly with context — include enough detail that the memory will be useful in future sessions.
3. Determine the scope:
   - **Team/project knowledge** (shared across team): use `save-project-memory.cjs`
   - **Personal memory** (only this user): use `add-memory.cjs`

4. Save the memory using a bash command:

**For personal memory:**
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/add-memory.cjs" "CONTENT HERE"
```

**For team/project memory:**
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/save-project-memory.cjs" "CONTENT HERE"
```

**For long content** (over ~2000 chars), pipe via stdin instead:
```bash
echo "LONG CONTENT HERE" | node "${CLAUDE_PLUGIN_ROOT}/scripts/add-memory.cjs"
```

## When to Use Team vs Personal

- **Team**: Architecture decisions, coding conventions, API patterns, project setup notes, known issues
- **Personal**: Personal preferences, individual task notes, debugging approaches

## Examples

- "Remember that we use JWT for auth" → `save-project-memory.cjs "We use JWT for authentication..."`
- "Save that I prefer tabs over spaces" → `add-memory.cjs "User prefers tabs over spaces"`
- "Note: the payment API requires idempotency keys" → `save-project-memory.cjs "Payment API requires idempotency keys..."`
