#!/bin/bash
# cognis-context.sh — Get assembled context from the Cognis API
# Usage: bash scripts/cognis-context.sh [OPTIONS]
# Env:   LYZR_API_KEY (required), COGNIS_OWNER_ID (optional), COGNIS_API_URL (optional)

set -euo pipefail

COGNIS_API_URL="${COGNIS_API_URL:-https://studio.lyzr.ai}"

# --- Help ---
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat >&2 <<'USAGE'
cognis-context.sh — Get assembled context from Cognis

Fetches relevant context for the current project, combining short-term
conversation context with long-term memories.

USAGE:
  bash scripts/cognis-context.sh [OPTIONS]

OPTIONS:
  --message "msg"     Add a current message for context assembly (can be repeated)
  --long-term         Enable long-term memory in context (default: true)
  --no-long-term      Disable long-term memory in context
  --cross-session     Include cross-session context
  --help, -h          Show this help message

ENVIRONMENT:
  LYZR_API_KEY      (required) Your Cognis API key
  COGNIS_OWNER_ID   (optional) Override owner ID (default: system username)
  COGNIS_API_URL    (optional) Override API base URL

EXAMPLES:
  bash scripts/cognis-context.sh
  bash scripts/cognis-context.sh --message "Working on the auth module"
  bash scripts/cognis-context.sh --cross-session
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
MESSAGES=()
LONG_TERM=true
CROSS_SESSION=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --message) MESSAGES+=("$2"); shift 2 ;;
    --long-term) LONG_TERM=true; shift ;;
    --no-long-term) LONG_TERM=false; shift ;;
    --cross-session) CROSS_SESSION=true; shift ;;
    --help|-h) exit 0 ;;
    *) shift ;;
  esac
done

# --- Scoping ---

get_git_root() {
  git rev-parse --show-toplevel 2>/dev/null || echo ""
}

sha256_short() {
  echo -n "$1" | shasum -a 256 | cut -c1-16
}

OWNER_ID="${COGNIS_OWNER_ID:-$(whoami)}"
GIT_ROOT="$(get_git_root)"

if [[ -n "$GIT_ROOT" ]]; then
  AGENT_ID="claudecode_$(sha256_short "$GIT_ROOT")"
else
  AGENT_ID="claudecode_$(sha256_short "$(pwd)")"
fi

# --- Build messages array ---
MESSAGES_JSON="[]"
if [[ ${#MESSAGES[@]} -gt 0 ]]; then
  MESSAGES_JSON="["
  for i in "${!MESSAGES[@]}"; do
    MSG_ESCAPED="$(echo "${MESSAGES[$i]}" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))')"
    if [[ $i -gt 0 ]]; then
      MESSAGES_JSON+=","
    fi
    MESSAGES_JSON+="{\"role\":\"user\",\"content\":${MSG_ESCAPED}}"
  done
  MESSAGES_JSON+="]"
fi

# --- Build payload ---
PAYLOAD=$(cat <<EOF
{
  "current_messages": ${MESSAGES_JSON},
  "owner_id": "${OWNER_ID}",
  "agent_id": "${AGENT_ID}",
  "enable_long_term_memory": ${LONG_TERM},
  "cross_session": ${CROSS_SESSION}
}
EOF
)

# --- API call ---
echo "Fetching context (agent_id: ${AGENT_ID})..." >&2

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${COGNIS_API_URL}/v1/memories/context" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${LYZR_API_KEY}" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  echo "$BODY"
else
  echo "Error: API returned HTTP ${HTTP_CODE}" >&2
  echo "$BODY" >&2
  exit 1
fi
