#!/bin/bash
# cognis-save.sh — Save a memory via the Cognis REST API
# Usage: bash scripts/cognis-save.sh "content to remember" [--team]
# Env:   LYZR_API_KEY (required), COGNIS_OWNER_ID (optional), COGNIS_API_URL (optional)

set -euo pipefail

COGNIS_API_URL="${COGNIS_API_URL:-https://studio.lyzr.ai}"

# --- Help ---
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat >&2 <<'USAGE'
cognis-save.sh — Save a memory to Cognis

USAGE:
  bash scripts/cognis-save.sh "memory content" [OPTIONS]
  echo "memory content" | bash scripts/cognis-save.sh - [OPTIONS]

OPTIONS:
  --team        Save as team/repo-scoped memory (visible to all contributors)
  --help, -h    Show this help message

ENVIRONMENT:
  LYZR_API_KEY      (required) Your Cognis API key
  COGNIS_OWNER_ID   (optional) Override owner ID (default: system username)
  COGNIS_API_URL    (optional) Override API base URL

EXAMPLES:
  bash scripts/cognis-save.sh "User prefers TypeScript over JavaScript"
  bash scripts/cognis-save.sh "Deploy with: make deploy-prod" --team
  echo "Long content here" | bash scripts/cognis-save.sh - --team
USAGE
  exit 0
fi

# --- Validate ---
if [[ -z "${LYZR_API_KEY:-}" ]]; then
  echo "Error: LYZR_API_KEY environment variable is not set." >&2
  echo "Get your API key at https://studio.lyzr.ai" >&2
  exit 1
fi

# --- Parse args ---
CONTENT=""
TEAM_MODE=false

for arg in "$@"; do
  case "$arg" in
    --team) TEAM_MODE=true ;;
    -) CONTENT="$(cat)" ;;
    *) [[ -z "$CONTENT" ]] && CONTENT="$arg" ;;
  esac
done

if [[ -z "$CONTENT" ]]; then
  echo "Error: No content provided. Usage: bash scripts/cognis-save.sh \"content\" [--team]" >&2
  exit 1
fi

# --- Scoping ---

get_git_root() {
  git rev-parse --show-toplevel 2>/dev/null || echo ""
}

get_repo_name() {
  local remote_url
  remote_url="$(git remote get-url origin 2>/dev/null || echo "")"
  if [[ -n "$remote_url" ]]; then
    echo "$remote_url" | sed -E 's|.*/([^/]+?)(\.git)?$|\1|'
  else
    basename "$(get_git_root)" 2>/dev/null || basename "$(pwd)"
  fi
}

sanitize() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_-]/_/g; s/_+/_/g; s/^_//; s/_$//'
}

sha256_short() {
  echo -n "$1" | shasum -a 256 | cut -c1-16
}

OWNER_ID="${COGNIS_OWNER_ID:-$(whoami)}"
GIT_ROOT="$(get_git_root)"

if [[ "$TEAM_MODE" == true ]]; then
  REPO_NAME="$(get_repo_name)"
  AGENT_ID="repo_$(sanitize "$REPO_NAME")"
else
  if [[ -n "$GIT_ROOT" ]]; then
    AGENT_ID="claudecode_$(sha256_short "$GIT_ROOT")"
  else
    AGENT_ID="claudecode_$(sha256_short "$(pwd)")"
  fi
fi

# --- Build JSON payload ---
# Escape content for JSON
JSON_CONTENT="$(echo "$CONTENT" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))')"

PAYLOAD=$(cat <<EOF
{
  "messages": [{"role": "user", "content": ${JSON_CONTENT}}],
  "owner_id": "${OWNER_ID}",
  "agent_id": "${AGENT_ID}"
}
EOF
)

# --- API call ---
echo "Saving memory (scope: $([ "$TEAM_MODE" = true ] && echo "team" || echo "personal"), agent_id: ${AGENT_ID})..." >&2

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${COGNIS_API_URL}/v1/memories" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${LYZR_API_KEY}" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  echo "Memory saved successfully." >&2
  echo "$BODY"
else
  echo "Error: API returned HTTP ${HTTP_CODE}" >&2
  echo "$BODY" >&2
  exit 1
fi
