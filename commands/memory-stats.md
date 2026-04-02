---
name: memory-stats
description: Show memory statistics — total stored memories, session history, and storage breakdown.
allowed-tools: ["Bash"]
---

# Memory Statistics

Show the user's Cognis memory stats.

## Steps

1. Run the stats script:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/stats.cjs"
```

2. Present the output to the user in a clear format. If there's an error (no API key), guide them to configure it.
