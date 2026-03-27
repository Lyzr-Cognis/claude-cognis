# Cognis Architecture

## Overview

Cognis is a persistent memory layer for AI agents. It stores, retrieves, and assembles context from past interactions so that agents can maintain continuity across sessions.

## Scoping System

Cognis uses a three-level scoping hierarchy:

### owner_id

Identifies the user. This is the top-level scope.

- Default: system username (`whoami`)
- Override: `COGNIS_OWNER_ID` environment variable
- Purpose: ensures memories are isolated per user

### agent_id

Identifies the project context. Two variants:

**Personal agent_id** (`claudecode_<hash>`):
- Derived from: `sha256(git_root_path)[:16]`
- Unique per user per project directory
- Used for personal memories, preferences, and notes
- Even if the same repo is cloned to two locations, each gets a separate personal scope

**Repo/team agent_id** (`repo_<name>`):
- Derived from: sanitized git remote origin name (e.g., `repo_my-project`)
- Shared across all contributors to the same repository
- Used for team knowledge: architecture decisions, conventions, deployment docs

### session_id

Identifies a single conversation session.

- Typically assigned by the agent client (e.g., Claude Code session ID)
- Used for short-term context and session summaries
- Optional — memories can be stored without a session

## Memory Storage Flow

1. **Input**: Agent sends messages (user + assistant turns) to `POST /v1/memories`
2. **Extraction**: Cognis asynchronously extracts facts from the messages
3. **Deduplication**: New facts are compared against existing memories. Duplicates are merged; contradictions update the existing memory (old version kept as historical)
4. **Storage**: Facts are stored as vector embeddings for semantic search
5. **Retrieval**: `POST /v1/memories/search` performs semantic similarity search

## Context Assembly

The `POST /v1/memories/context` endpoint combines:

1. **Short-term context**: Recent messages from the current session
2. **Session summary**: Rolling summary of the current session
3. **Long-term memories**: Semantically relevant memories from past sessions

This assembled context is injected into the agent's system prompt or conversation.

## Memory Lifecycle

- **Active**: Current version of a fact
- **Historical**: Superseded version (kept for audit, excluded from search by default)
- **Deleted**: Removed via API (permanent)

## Cross-Session Memory

By default, searches are scoped to the current agent_id. Setting `cross_session: true` allows searching across all sessions for the same owner_id + agent_id combination.

## Knowledge Graph (Optional)

When `use_graph: true` is set, Cognis also stores relationships between entities in a knowledge graph. This enables relationship-based queries in addition to semantic search.
