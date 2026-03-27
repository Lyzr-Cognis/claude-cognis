#!/bin/bash
# cognis-search.sh — Search memories via the Cognis REST API
# Usage: bash scripts/cognis-search.sh "query" [--user|--repo|--both]
# Env:   LYZR_API_KEY (required), COGNIS_OWNER_ID (optional), COGNIS_API_URL (optional)

set -euo pipefail

COGNIS_API_URL="${COGNIS_API_URL:-https://memory.studio.lyzr.ai}"

# --- Help ---
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat >&2 <<'USAGE'
cognis-search.sh — Search Cognis memories

USAGE:
  bash scripts/cognis-search.sh "search query" [OPTIONS]

OPTIONS:
  --user        Search only personal/user-scoped memories (default)
  --repo        Search only team/repo-scoped memories
  --both        Search both personal and team memories
  --limit N     Maximum number of results (default: 10)
  --help, -h    Show this help message

ENVIRONMENT:
  LYZR_API_KEY      (required) Your Cognis API key
  COGNIS_OWNER_ID   (optional) Override owner ID (default: system username)
  COGNIS_API_URL    (optional) Override API base URL

EXAMPLES:
  bash scripts/cognis-search.sh "what database do we use"
  bash scripts/cognis-search.sh "deployment process" --repo
  bash scripts/cognis-search.sh "auth setup" --both --limit 5
USAGE
  exit 0
fi

# --- Validate ---
if [[ -z "${LYZR_API_KEY:-}" ]]; then
  echo "Error: LYZR_API_KEY environment variable is not set." >&2
  echo "Get your API key at https://memory.studio.lyzr.ai" >&2
  exit 1
fi

# --- Parse args ---
QUERY=""
SCOPE="user"
LIMIT=10

while [[ $# -gt 0 ]]; do
  case "$1" in
    --user) SCOPE="user"; shift ;;
    --repo) SCOPE="repo"; shift ;;
    --both) SCOPE="both"; shift ;;
    --limit) LIMIT="$2"; shift 2 ;;
    --help|-h) exit 0 ;;
    *) [[ -z "$QUERY" ]] && QUERY="$1"; shift ;;
  esac
done

if [[ -z "$QUERY" ]]; then
  echo "Error: No query provided. Usage: bash scripts/cognis-search.sh \"query\" [--user|--repo|--both]" >&2
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

get_personal_agent_id() {
  if [[ -n "$GIT_ROOT" ]]; then
    echo "claudecode_$(sha256_short "$GIT_ROOT")"
  else
    echo "claudecode_$(sha256_short "$(pwd)")"
  fi
}

get_repo_agent_id() {
  local repo_name
  repo_name="$(get_repo_name)"
  echo "repo_$(sanitize "$repo_name")"
}

# --- Search function ---
do_search() {
  local agent_id="$1"
  local label="$2"

  JSON_QUERY="$(echo "$QUERY" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))')"

  PAYLOAD=$(cat <<EOF
{
  "query": ${JSON_QUERY},
  "owner_id": "${OWNER_ID}",
  "agent_id": "${agent_id}",
  "limit": ${LIMIT}
}
EOF
)

  echo "Searching ${label} memories (agent_id: ${agent_id})..." >&2

  RESPONSE=$(curl -sL -w "\n%{http_code}" \
    -X POST "${COGNIS_API_URL}/v1/memories/search" \
    -H "Content-Type: application/json" \
    -H "x-api-key: ${LYZR_API_KEY}" \
    -d "$PAYLOAD")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
    echo "$BODY"
  else
    echo "Error: API returned HTTP ${HTTP_CODE} for ${label} search" >&2
    echo "$BODY" >&2
    return 1
  fi
}

# --- Execute search based on scope ---
case "$SCOPE" in
  user)
    do_search "$(get_personal_agent_id)" "personal"
    ;;
  repo)
    do_search "$(get_repo_agent_id)" "team"
    ;;
  both)
    echo '{"personal":'
    do_search "$(get_personal_agent_id)" "personal"
    echo ',"team":'
    do_search "$(get_repo_agent_id)" "team"
    echo '}'
    ;;
esac
