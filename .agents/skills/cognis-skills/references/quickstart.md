# Cognis Quickstart

## 1. Get an API Key

1. Go to [studio.lyzr.ai](https://studio.lyzr.ai)
2. Sign up or log in
3. Navigate to API Keys and create a new key
4. Copy the key

## 2. Set the Environment Variable

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export LYZR_API_KEY="lyzr_your_key_here"
```

Then reload: `source ~/.zshrc` (or restart your terminal).

## 3. Install the Skill

```bash
npx skills add Lyzr-Cognis/cognis-skills
```

This copies the skill into your `.agents/skills/` directory.

## 4. Verify It Works

Start a new agent session and try:

- **Save**: "Remember that we use PostgreSQL for the main database"
- **Search**: "What database do we use?"
- **Context**: The agent will automatically pull in relevant memories

## 5. Optional Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LYZR_API_KEY` | *(required)* | Your Cognis API key |
| `COGNIS_OWNER_ID` | `$(whoami)` | Override the owner identifier |
| `COGNIS_API_URL` | `https://memory.studio.lyzr.ai` | Override the API base URL |

## Troubleshooting

**401 Unauthorized**: Your API key is invalid or expired. Generate a new one at studio.lyzr.ai.

**403 Forbidden**: Your API key doesn't have access to the memory service. Check your account permissions.

**Connection errors**: Ensure you have internet access and can reach `memory.studio.lyzr.ai`.

**Empty search results**: Memories are extracted asynchronously. Wait a few seconds after saving and try again.
