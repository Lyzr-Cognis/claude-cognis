---
name: project-config
description: Configure Cognis settings for the current project (.claude/.cognis-claude/config.json).
allowed-tools: ["Read", "Write"]
---

# Project Configuration

Update the per-project Cognis configuration stored at `.claude/.cognis-claude/config.json`.

## Configurable Keys

- `apiKey` — Lyzr API key for this project (overrides global/env)
- `ownerId` — Owner ID override for this project
- `agentId` — Personal agent ID override
- `repoAgentId` — Team/repo agent ID override
- `signalExtraction` — Enable signal-based transcript filtering (boolean)
- `signalKeywords` — Keywords that trigger signal extraction (array of strings)

## Instructions

1. Ask the user which setting they want to configure.
2. Read the current config from `.claude/.cognis-claude/config.json` (if it exists).
3. Update the requested key(s).
4. Write the updated config back to the file.
5. Confirm the changes.

## Example

To set the API key for this project:
```json
{
  "apiKey": "lyzr-your-api-key-here"
}
```
