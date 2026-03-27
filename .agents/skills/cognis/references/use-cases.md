# Cognis Use Cases

## Personal Memory

Store individual preferences, notes, and context that follow you across sessions.

**Examples:**
- "I prefer functional style over OOP"
- "My team uses Slack for async and meets on Tuesdays"
- "The staging environment URL is staging.example.com"

**How**: Default scope (no `--team` flag). Memories are tied to your owner_id + personal agent_id.

## Team Knowledge Base

Share architectural decisions, conventions, and processes with all repo contributors.

**Examples:**
- "We use PostgreSQL 15 with pgvector for embeddings"
- "All API endpoints must have rate limiting middleware"
- "Deploy process: merge to main → CI builds → auto-deploy to staging → manual promote to prod"

**How**: Use `--team` flag. Memories are tied to the repo agent_id, visible to anyone with the same repo.

## Session Capture

Automatically save session summaries so future sessions can pick up where you left off.

**Pattern:**
1. At session end, the agent summarizes what was done
2. Summary is stored via `POST /v1/memories/summaries`
3. Next session, the agent fetches context via `POST /v1/memories/context`
4. Agent continues with full awareness of prior work

## Code Review Context

Before reviewing code, search for relevant memories about the module being changed.

**Pattern:**
1. Agent identifies which files/modules are in the diff
2. Searches team memories: "What are the conventions for the auth module?"
3. Uses retrieved context to inform review comments

## Onboarding Acceleration

New team members get the benefit of accumulated team knowledge.

**Pattern:**
1. Team members save architectural decisions and conventions as team memories
2. New contributor installs the skill
3. Agent automatically retrieves relevant team context when working on any part of the codebase

## Cross-Agent Consistency

Because Cognis memories are stored server-side, they work across different AI agents.

**Pattern:**
1. Save a memory in Claude Code: "We use ESLint with the Airbnb config"
2. Switch to Cursor or Copilot (with the cognis skill installed)
3. The same memory is available — consistent context regardless of which agent you use

## Project Handoff

When handing off a project, team memories serve as institutional knowledge.

**Pattern:**
1. Throughout development, save key decisions as team memories
2. New maintainer installs the skill and searches: "How does deployment work?"
3. Relevant memories surface without needing to read through months of Slack history
