---
name: cognis-skills
description: >
  Persistent memory and context for AI agents using Cognis by Lyzr. Use this skill when
  the user mentions "remember this", "what did I work on", "save this for later",
  "team knowledge", "project context", "recall", "memory", or needs long-term memory
  across sessions. Also use when the user asks about past decisions, preferences, or
  prior conversations. Supports personal memory (per-user), team memory (shared across
  repo contributors), semantic search, and automatic context assembly.
license: MIT
compatibility: Requires curl and LYZR_API_KEY environment variable (get key at studio.lyzr.ai). Internet access to memory.studio.lyzr.ai.
metadata:
  author: lyzr
  version: "1.0.0"
  category: ai-memory
  tags: "memory, context, personalization, lyzr, cognis, persistent"
---

# Cognis — Persistent Memory for AI Agents

Cognis gives you long-term memory that persists across sessions. Memories are scoped per-user and per-project, with optional team-wide sharing.

## Setup

The `LYZR_API_KEY` environment variable must be set. Get a key at [studio.lyzr.ai](https://studio.lyzr.ai).

```bash
export LYZR_API_KEY="your-key-here"
```

Optionally set `COGNIS_OWNER_ID` to override the default owner (system username).

## Scoping

Cognis uses two levels of scoping to keep memories organized:

- **owner_id**: Identifies the user. Defaults to the system username (`whoami`). Override with `COGNIS_OWNER_ID`.
- **agent_id**: Identifies the project context.
  - **Personal scope**: `claudecode_<sha256(git_root)[:16]>` — unique per user per project.
  - **Team scope**: `repo_<sanitized_repo_name>` — shared across all contributors to a repo.

The scripts detect the git root and remote automatically. No manual configuration needed.

## Saving Memories

Save something the user wants to remember:

```bash
bash scripts/cognis-save.sh "The user prefers PostgreSQL for all new services"
```

Save a team-wide memory (visible to all repo contributors):

```bash
bash scripts/cognis-save.sh "Deploy process: run migrations first, then deploy API, then workers" --team
```

Read `references/api-reference.md` for full parameter details.

## Searching Memories

Search for relevant memories:

```bash
bash scripts/cognis-search.sh "what database do we use"
```

Search only team memories:

```bash
bash scripts/cognis-search.sh "deployment process" --repo
```

Search both personal and team:

```bash
bash scripts/cognis-search.sh "auth setup" --both
```

## Getting Assembled Context

Fetch relevant context (combines short-term and long-term memory):

```bash
bash scripts/cognis-context.sh
```

This returns assembled context for the current project, including relevant personal and team memories.

## When to Use Personal vs Team Scope

- **Personal** (default): User preferences, individual notes, personal workflow details, things the user says about themselves.
- **Team** (`--team`): Architecture decisions, deployment processes, coding conventions, shared knowledge that any contributor would benefit from.

## Gotchas

- Memories are extracted asynchronously by default. Use the search endpoint to verify a memory was stored (it may take a few seconds).
- The `LYZR_API_KEY` must have access to the Cognis memory service. If you get 401/403 errors, read `references/quickstart.md` for troubleshooting.
- Scripts output JSON to stdout and diagnostics to stderr. Parse stdout for programmatic use.
- All scripts are idempotent — safe to retry on transient failures.

## Available Scripts

- **`scripts/cognis-save.sh`** — Save a memory (personal or team scope). Run `bash scripts/cognis-save.sh --help` for usage.
- **`scripts/cognis-search.sh`** — Search memories with semantic matching. Run `bash scripts/cognis-search.sh --help` for usage.
- **`scripts/cognis-context.sh`** — Get assembled context for the current project. Run `bash scripts/cognis-context.sh --help` for usage.

## References

- Read `references/quickstart.md` for first-time setup and verification.
- Read `references/api-reference.md` if you need to call the Cognis API directly or need full parameter details.
- Read `references/architecture.md` to understand how scoping and memory storage works.
- Read `references/use-cases.md` for patterns like session capture, codebase indexing, and team knowledge bases.
