# Cognis REST API Reference

Base URL: `https://memory.studio.lyzr.ai`

All requests require the `x-api-key` header with your `LYZR_API_KEY`.

## Authentication

```
x-api-key: <your LYZR_API_KEY>
Content-Type: application/json
```

---

## POST /v1/memories

Add messages to memory. Cognis extracts facts from the messages and stores them.

**Request Body:**

```json
{
  "messages": [
    {"role": "user", "content": "We decided to use PostgreSQL"},
    {"role": "assistant", "content": "Noted, I'll remember that."}
  ],
  "owner_id": "username",
  "agent_id": "claudecode_abc123",
  "session_id": "optional-session-id",
  "sync_extraction": false,
  "extract_assistant_facts": false,
  "use_graph": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | array | yes | Array of `{role, content}` objects |
| `owner_id` | string | no | User identifier |
| `agent_id` | string | no | Project/agent identifier |
| `session_id` | string | no | Session identifier |
| `sync_extraction` | bool | no | Wait for extraction to complete (default: false) |
| `extract_assistant_facts` | bool | no | Also extract facts from assistant messages |
| `use_graph` | bool | no | Store in knowledge graph |

**Response:** `200 OK` with extraction result.

---

## POST /v1/memories/search

Semantic search across stored memories.

**Request Body:**

```json
{
  "query": "what database do we use",
  "owner_id": "username",
  "agent_id": "claudecode_abc123",
  "limit": 10,
  "cross_session": false,
  "include_historical": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | yes | Search query |
| `owner_id` | string | no | Filter by owner |
| `agent_id` | string | no | Filter by agent/project |
| `session_id` | string | no | Filter by session |
| `limit` | int | no | Max results (default: 10) |
| `cross_session` | bool | no | Search across sessions |
| `include_historical` | bool | no | Include superseded memories |
| `use_graph` | bool | no | Search knowledge graph |
| `rerank_provider` | string | no | Reranking provider |

**Response:** `200 OK` with array of matching memories with relevance scores.

---

## GET /v1/memories

List memories with optional filters.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `owner_id` | string | Filter by owner |
| `agent_id` | string | Filter by agent |
| `session_id` | string | Filter by session |
| `limit` | int | Max results |
| `include_historical` | bool | Include superseded |
| `cross_session` | bool | Cross-session results |

**Response:** `200 OK` with array of memories.

---

## GET /v1/memories/{id}

Get a specific memory by ID.

**Response:** `200 OK` with memory object.

---

## PATCH /v1/memories/{id}

Update a specific memory.

**Request Body:**

```json
{
  "content": "Updated memory content",
  "metadata": {"key": "value"}
}
```

**Response:** `200 OK` with updated memory.

---

## DELETE /v1/memories/{id}

Delete a specific memory.

**Response:** `200 OK`.

---

## POST /v1/memories/context

Get assembled context combining short-term and long-term memory.

**Request Body:**

```json
{
  "current_messages": [
    {"role": "user", "content": "Working on the auth module"}
  ],
  "owner_id": "username",
  "agent_id": "claudecode_abc123",
  "enable_long_term_memory": true,
  "cross_session": false,
  "max_short_term_messages": 50
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `current_messages` | array | yes | Current conversation messages |
| `owner_id` | string | no | User identifier |
| `agent_id` | string | no | Project identifier |
| `session_id` | string | no | Session identifier |
| `enable_long_term_memory` | bool | no | Include long-term memories (default: true) |
| `cross_session` | bool | no | Include cross-session context |
| `max_short_term_messages` | int | no | Max short-term messages to include |

**Response:** `200 OK` with assembled context object.

---

## POST /v1/memories/summaries

Store a session summary.

**Request Body:**

```json
{
  "content": "Session summary text",
  "owner_id": "username",
  "agent_id": "claudecode_abc123",
  "session_id": "session-id",
  "messages_covered_count": 42
}
```

---

## GET /v1/memories/summaries/current

Get the current active summary for a session.

**Query Parameters:** `owner_id`, `session_id`

---

## POST /v1/memories/summaries/search

Search across session summaries.

**Request Body:**

```json
{
  "owner_id": "username",
  "query": "what did I work on last week",
  "limit": 5
}
```

---

## DELETE /v1/memories/session

Clear all data for a session.

**Request Body:**

```json
{
  "owner_id": "username",
  "agent_id": "claudecode_abc123",
  "session_id": "session-id"
}
```

---

## GET /v1/memories/messages

Get raw stored messages.

**Query Parameters:** `owner_id`, `agent_id`, `session_id`, `limit`
