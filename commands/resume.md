---
name: resume
description: Load context from your last session to pick up where you left off.
allowed-tools: ["Bash"]
---

# Resume Last Session

Load the summary and key memories from the most recent session so the user can continue where they left off.

## Steps

1. Run the resume script:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/resume-session.cjs"
```

2. Present the output conversationally:
   - Show the last session summary
   - Show any recent relevant memories
   - If no previous session exists, let the user know
