---
name: logout
description: Remove stored Cognis API credentials from global settings.
allowed-tools: ["Read", "Write"]
---

# Logout / Clear Credentials

Remove the API key from the global Cognis settings file at `~/.cognis-claude/settings.json`.

## Instructions

1. Read `~/.cognis-claude/settings.json`
2. Remove the `apiKey` field
3. Write the updated settings back
4. Inform the user that their credentials have been cleared
5. Remind them that `LYZR_API_KEY` environment variable and per-project configs are not affected
