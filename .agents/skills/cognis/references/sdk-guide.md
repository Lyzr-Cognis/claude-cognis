# Cognis SDK Guide

For advanced use cases beyond the shell scripts, you can use the Cognis API directly via the `claude-cognis` npm package or raw HTTP calls.

## npm Package

Install:

```bash
npm install claude-cognis
```

### CognisClient

```javascript
const { CognisClient } = require("claude-cognis");

const client = new CognisClient(process.env.LYZR_API_KEY);

// Add memories
await client.addMessages(
  [{ role: "user", content: "We use PostgreSQL" }],
  { ownerId: "username", agentId: "claudecode_abc123" }
);

// Search
const results = await client.search("database", {
  ownerId: "username",
  agentId: "claudecode_abc123",
  limit: 5,
});

// Get context
const context = await client.getContext(
  [{ role: "user", content: "Working on auth" }],
  { ownerId: "username", agentId: "claudecode_abc123" }
);
```

### Scoping Helpers

```javascript
const { getOwnerId, getAgentId, getRepoAgentId } = require("claude-cognis/scoping");

const ownerId = getOwnerId();           // system username
const agentId = getAgentId(process.cwd()); // claudecode_<hash>
const repoId = getRepoAgentId(process.cwd()); // repo_<name>
```

## Direct HTTP (curl)

All API calls can be made directly with curl. See `references/api-reference.md` for the full endpoint reference.

```bash
# Save a memory
curl -X POST https://studio.lyzr.ai/v1/memories \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LYZR_API_KEY" \
  -d '{"messages":[{"role":"user","content":"Remember this"}],"owner_id":"me","agent_id":"my_project"}'

# Search
curl -X POST https://studio.lyzr.ai/v1/memories/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LYZR_API_KEY" \
  -d '{"query":"what to remember","owner_id":"me","agent_id":"my_project"}'
```

## Python

No official Python SDK yet, but the REST API is straightforward with `requests`:

```python
import requests
import os

API_KEY = os.environ["LYZR_API_KEY"]
BASE_URL = "https://studio.lyzr.ai"

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
}

# Save
requests.post(f"{BASE_URL}/v1/memories", headers=headers, json={
    "messages": [{"role": "user", "content": "Important fact"}],
    "owner_id": "username",
    "agent_id": "my_project",
})

# Search
response = requests.post(f"{BASE_URL}/v1/memories/search", headers=headers, json={
    "query": "important fact",
    "owner_id": "username",
})
print(response.json())
```
