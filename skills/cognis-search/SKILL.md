---
name: cognis-search
description: Search your memory for past work, previous sessions, architectural decisions, and team knowledge stored in Cognis.
version: 1.0.0
---

# Cognis Memory Search

Use this skill when the user asks about past work, previous sessions, what was discussed before, or team knowledge.

## Instructions

1. Determine what the user wants to find. Formulate a clear search query.
2. Choose the scope:
   - `--user` for personal memories (what the user worked on)
   - `--repo` for team/project knowledge (shared across team)
   - `--both` for both (default, best for broad queries)

3. Run the search:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/search-memory.cjs" --both "SEARCH QUERY"
```

4. Present the results to the user in a clear, conversational format. Do NOT just dump the raw output — summarize and organize it naturally.
5. If no results are found, suggest alternative queries or let them know the memory store may not have relevant entries yet.

## Examples

- "What did I work on yesterday?" → `search-memory.cjs --user "recent work session"`
- "What's the authentication architecture?" → `search-memory.cjs --both "authentication architecture"`
- "What bugs did the team fix?" → `search-memory.cjs --repo "bug fixes"`
