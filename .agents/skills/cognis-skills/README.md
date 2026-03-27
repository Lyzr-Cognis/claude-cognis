# Cognis — Persistent Memory for AI Agents

> Give your AI agents long-term memory across sessions. Personal and team-scoped, with semantic search.

[![Agent Skills](https://img.shields.io/badge/agent-skills-blue)](https://agentskills.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Install

```bash
npx skills add Lyzr-Cognis/cognis-skills
```

## Setup

1. Get your API key at [studio.lyzr.ai](https://studio.lyzr.ai)
2. Set the environment variable:
   ```bash
   export LYZR_API_KEY="your-key"
   ```

## What It Does

- **Save memories** — Personal and team-scoped persistent memory
- **Search memories** — Semantic search across past sessions
- **Auto context** — Assembled context from relevant memories
- **Cross-agent** — Works with Claude Code, Cursor, Copilot, Gemini CLI, and 40+ more

## How It Works

Just talk to your AI agent naturally:

- *"Remember that we use PostgreSQL for the main database"* → saves a personal memory
- *"What database do we use?"* → searches and retrieves the memory
- *"Save for the team: deploy process is merge to main then auto-deploy"* → saves a team memory

Memories persist across sessions and are available in any agent that supports [Agent Skills](https://agentskills.io).

## Scoping

| Scope | Visibility | Use For |
|-------|-----------|---------|
| **Personal** (default) | Only you, in this project | Preferences, notes, personal context |
| **Team** (`--team`) | All repo contributors | Architecture decisions, conventions, processes |

## Supported Agents

Works with any agent that supports the [Agent Skills](https://agentskills.io) standard, including:

- Claude Code
- Cursor
- GitHub Copilot
- Gemini CLI
- Goose
- And 40+ more

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LYZR_API_KEY` | *(required)* | Your Cognis API key |
| `COGNIS_OWNER_ID` | `$(whoami)` | Override user identifier |
| `COGNIS_API_URL` | `https://memory.studio.lyzr.ai` | Override API URL |

## Links

- [Cognis Platform](https://studio.lyzr.ai)
- [Agent Skills Standard](https://agentskills.io)
- [Lyzr](https://lyzr.ai)
