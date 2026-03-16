var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/lib/stdin.js
var require_stdin = __commonJS({
  "src/lib/stdin.js"(exports2, module2) {
    function readStdin2() {
      return new Promise((resolve, reject) => {
        let data = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (chunk) => {
          data += chunk;
        });
        process.stdin.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({});
          }
        });
        process.stdin.on("error", reject);
      });
    }
    function writeOutput2(obj) {
      console.log(JSON.stringify(obj));
    }
    module2.exports = { readStdin: readStdin2, writeOutput: writeOutput2 };
  }
});

// src/lib/git-utils.js
var require_git_utils = __commonJS({
  "src/lib/git-utils.js"(exports2, module2) {
    var { execSync } = require("child_process");
    var path = require("path");
    function getGitRoot(cwd) {
      try {
        const root = execSync("git rev-parse --show-toplevel", {
          cwd: cwd || process.cwd(),
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"]
        }).trim();
        if (process.env.COGNIS_ISOLATE_WORKTREES) {
          return root;
        }
        try {
          const commonDir = execSync("git rev-parse --git-common-dir", {
            cwd: root,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"]
          }).trim();
          if (commonDir && !commonDir.endsWith(".git")) {
            const mainRoot = path.resolve(root, commonDir, "..");
            return mainRoot;
          }
        } catch {
        }
        return root;
      } catch {
        return null;
      }
    }
    function getGitRepoName(cwd) {
      try {
        const remoteUrl = execSync("git remote get-url origin", {
          cwd: cwd || process.cwd(),
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"]
        }).trim();
        const match = remoteUrl.match(/\/([^/]+?)(?:\.git)?$/);
        return match ? match[1] : null;
      } catch {
        return null;
      }
    }
    module2.exports = { getGitRoot, getGitRepoName };
  }
});

// src/lib/project-config.js
var require_project_config = __commonJS({
  "src/lib/project-config.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var { getGitRoot } = require_git_utils();
    function getProjectConfigPath(cwd) {
      const gitRoot = getGitRoot(cwd);
      const root = gitRoot || cwd || process.cwd();
      return path.join(root, ".claude", ".cognis-claude", "config.json");
    }
    function loadProjectConfig(cwd) {
      try {
        const configPath = getProjectConfigPath(cwd);
        if (fs.existsSync(configPath)) {
          const raw = fs.readFileSync(configPath, "utf8");
          return JSON.parse(raw);
        }
      } catch {
      }
      return {};
    }
    function saveProjectConfig(cwd, config) {
      const configPath = getProjectConfigPath(cwd);
      const dir = path.dirname(configPath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    }
    module2.exports = { getProjectConfigPath, loadProjectConfig, saveProjectConfig };
  }
});

// src/lib/settings.js
var require_settings = __commonJS({
  "src/lib/settings.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var os = require("os");
    var { loadProjectConfig } = require_project_config();
    var SETTINGS_DIR = path.join(os.homedir(), ".cognis-claude");
    var SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");
    var DEFAULT_SETTINGS = {
      includeTools: [],
      maxMemoryItems: 5,
      debug: false,
      signalExtraction: false,
      signalKeywords: [
        "remember",
        "architecture",
        "bug",
        "fix",
        "pattern",
        "convention",
        "decision",
        "important",
        "note",
        "todo",
        "caveat",
        "workaround"
      ],
      signalTurnsBefore: 3
    };
    function loadSettings() {
      let settings = { ...DEFAULT_SETTINGS };
      try {
        if (fs.existsSync(SETTINGS_FILE)) {
          const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
          const parsed = JSON.parse(raw);
          settings = { ...settings, ...parsed };
        }
      } catch {
      }
      return settings;
    }
    function saveSettings(settings) {
      fs.mkdirSync(SETTINGS_DIR, { recursive: true });
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
    }
    function getApiKey2(settings, cwd) {
      if (settings.apiKey) return settings.apiKey;
      if (process.env.LYZR_API_KEY) return process.env.LYZR_API_KEY;
      const projConfig = loadProjectConfig(cwd);
      if (projConfig.apiKey) return projConfig.apiKey;
      return null;
    }
    function loadMergedSettings2(cwd) {
      const settings = loadSettings();
      const projConfig = loadProjectConfig(cwd);
      if (projConfig.ownerId) settings.ownerId = projConfig.ownerId;
      if (projConfig.agentId) settings.agentId = projConfig.agentId;
      if (projConfig.repoAgentId) settings.repoAgentId = projConfig.repoAgentId;
      if (projConfig.signalExtraction !== void 0)
        settings.signalExtraction = projConfig.signalExtraction;
      if (projConfig.signalKeywords) settings.signalKeywords = projConfig.signalKeywords;
      return settings;
    }
    function isPrivateSession2() {
      const val = process.env.COGNIS_PRIVATE;
      return val !== void 0 && val.toLowerCase() === "true";
    }
    module2.exports = {
      SETTINGS_DIR,
      SETTINGS_FILE,
      DEFAULT_SETTINGS,
      loadSettings,
      saveSettings,
      getApiKey: getApiKey2,
      loadMergedSettings: loadMergedSettings2,
      isPrivateSession: isPrivateSession2
    };
  }
});

// src/lib/error-helpers.js
var require_error_helpers = __commonJS({
  "src/lib/error-helpers.js"(exports2, module2) {
    function mapHttpError(status, body) {
      switch (status) {
        case 401:
          return "Authentication failed \u2014 check your LYZR_API_KEY or settings.json apiKey.";
        case 403:
          return "Access denied \u2014 your API key may not have permissions for this resource.";
        case 404:
          return "Resource not found \u2014 the Cognis API endpoint may have changed.";
        case 422:
          return `Validation error \u2014 ${typeof body === "object" ? JSON.stringify(body) : body}`;
        case 429:
          return "Rate limited \u2014 will retry next session.";
        default:
          if (status >= 500) {
            return "Cognis service temporarily unavailable \u2014 memories will sync next session.";
          }
          return `Unexpected error (HTTP ${status})`;
      }
    }
    var CognisApiError = class extends Error {
      constructor(status, body) {
        super(mapHttpError(status, body));
        this.name = "CognisApiError";
        this.status = status;
        this.body = body;
      }
    };
    module2.exports = { mapHttpError, CognisApiError };
  }
});

// src/lib/cognis-client.js
var require_cognis_client = __commonJS({
  "src/lib/cognis-client.js"(exports2, module2) {
    var { CognisApiError } = require_error_helpers();
    var DEFAULT_BASE_URL = "https://memory.studio.lyzr.ai";
    var CognisClient2 = class {
      constructor(apiKey, baseUrl) {
        if (!apiKey) throw new Error("CognisClient requires an API key");
        this.apiKey = apiKey;
        this.baseUrl = (baseUrl || process.env.COGNIS_API_URL || DEFAULT_BASE_URL).replace(
          /\/$/,
          ""
        );
      }
      async _request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json"
        };
        const opts = { method, headers };
        if (body !== void 0) {
          opts.body = JSON.stringify(body);
        }
        const res = await fetch(url, opts);
        if (!res.ok) {
          let errBody;
          try {
            errBody = await res.json();
          } catch {
            errBody = await res.text().catch(() => "");
          }
          throw new CognisApiError(res.status, errBody);
        }
        const text = await res.text();
        if (!text) return {};
        try {
          return JSON.parse(text);
        } catch {
          return { raw: text };
        }
      }
      /**
       * Add messages to memory.
       * POST /v1/memories
       */
      async addMessages(messages, { ownerId, agentId, sessionId, syncExtraction, extractAssistantFacts, useGraph } = {}) {
        const body = { messages };
        if (ownerId) body.owner_id = ownerId;
        if (agentId) body.agent_id = agentId;
        if (sessionId) body.session_id = sessionId;
        if (syncExtraction !== void 0) body.sync_extraction = syncExtraction;
        if (extractAssistantFacts !== void 0) body.extract_assistant_facts = extractAssistantFacts;
        if (useGraph !== void 0) body.use_graph = useGraph;
        return this._request("POST", "/v1/memories", body);
      }
      /**
       * Search memories.
       * POST /v1/memories/search
       */
      async search(query, { ownerId, agentId, sessionId, limit, crossSession, useGraph, rerankProvider, includeHistorical } = {}) {
        const body = { query };
        if (ownerId) body.owner_id = ownerId;
        if (agentId) body.agent_id = agentId;
        if (sessionId) body.session_id = sessionId;
        if (limit) body.limit = limit;
        if (crossSession !== void 0) body.cross_session = crossSession;
        if (useGraph !== void 0) body.use_graph = useGraph;
        if (rerankProvider) body.rerank_provider = rerankProvider;
        if (includeHistorical !== void 0) body.include_historical = includeHistorical;
        return this._request("POST", "/v1/memories/search", body);
      }
      /**
       * Get memories list.
       * GET /v1/memories?owner_id=...&agent_id=...&limit=...
       */
      async getMemories({ ownerId, agentId, sessionId, limit, includeHistorical, crossSession } = {}) {
        const params = new URLSearchParams();
        if (ownerId) params.set("owner_id", ownerId);
        if (agentId) params.set("agent_id", agentId);
        if (sessionId) params.set("session_id", sessionId);
        if (limit) params.set("limit", String(limit));
        if (includeHistorical !== void 0) params.set("include_historical", String(includeHistorical));
        if (crossSession !== void 0) params.set("cross_session", String(crossSession));
        const qs = params.toString();
        return this._request("GET", `/v1/memories${qs ? `?${qs}` : ""}`);
      }
      /**
       * Get a specific memory by ID.
       * GET /v1/memories/{id}
       */
      async getMemoryById(memoryId) {
        return this._request("GET", `/v1/memories/${encodeURIComponent(memoryId)}`);
      }
      /**
       * Update a specific memory.
       * PATCH /v1/memories/{id}
       */
      async updateMemory(memoryId, { content, metadata } = {}) {
        const body = {};
        if (content !== void 0) body.content = content;
        if (metadata !== void 0) body.metadata = metadata;
        return this._request("PATCH", `/v1/memories/${encodeURIComponent(memoryId)}`, body);
      }
      /**
       * Delete a specific memory.
       * DELETE /v1/memories/{id}
       */
      async deleteMemory(memoryId) {
        return this._request("DELETE", `/v1/memories/${encodeURIComponent(memoryId)}`);
      }
      /**
       * Clear all session data.
       * DELETE /v1/memories/session
       */
      async clearSession({ ownerId, agentId, sessionId } = {}) {
        const body = {};
        if (ownerId) body.owner_id = ownerId;
        if (agentId) body.agent_id = agentId;
        if (sessionId) body.session_id = sessionId;
        return this._request("DELETE", "/v1/memories/session", body);
      }
      /**
       * Get raw messages.
       * GET /v1/memories/messages
       */
      async getMessages({ ownerId, agentId, sessionId, limit } = {}) {
        const params = new URLSearchParams();
        if (ownerId) params.set("owner_id", ownerId);
        if (agentId) params.set("agent_id", agentId);
        if (sessionId) params.set("session_id", sessionId);
        if (limit) params.set("limit", String(limit));
        const qs = params.toString();
        return this._request("GET", `/v1/memories/messages${qs ? `?${qs}` : ""}`);
      }
      /**
       * Store a session summary.
       * POST /v1/memories/summaries
       */
      async storeSummary(content, { ownerId, sessionId, agentId, messagesCoveredCount } = {}) {
        const body = { content };
        if (ownerId) body.owner_id = ownerId;
        if (sessionId) body.session_id = sessionId;
        if (agentId) body.agent_id = agentId;
        if (messagesCoveredCount !== void 0) body.messages_covered_count = messagesCoveredCount;
        return this._request("POST", "/v1/memories/summaries", body);
      }
      /**
       * Get current active summary.
       * GET /v1/memories/summaries/current
       */
      async getCurrentSummary({ ownerId, sessionId } = {}) {
        const params = new URLSearchParams();
        if (ownerId) params.set("owner_id", ownerId);
        if (sessionId) params.set("session_id", sessionId);
        const qs = params.toString();
        return this._request("GET", `/v1/memories/summaries/current${qs ? `?${qs}` : ""}`);
      }
      /**
       * Get assembled context (short-term + long-term).
       * POST /v1/memories/context
       */
      async getContext(currentMessages, { ownerId, sessionId, agentId, maxShortTermMessages, enableLongTermMemory, crossSession } = {}) {
        const body = { current_messages: currentMessages };
        if (ownerId) body.owner_id = ownerId;
        if (sessionId) body.session_id = sessionId;
        if (agentId) body.agent_id = agentId;
        if (maxShortTermMessages !== void 0) body.max_short_term_messages = maxShortTermMessages;
        if (enableLongTermMemory !== void 0) body.enable_long_term_memory = enableLongTermMemory;
        if (crossSession !== void 0) body.cross_session = crossSession;
        return this._request("POST", "/v1/memories/context", body);
      }
      /**
       * Search summaries.
       * POST /v1/memories/summaries/search
       */
      async searchSummaries(ownerId, query, { sessionId, limit } = {}) {
        const body = { owner_id: ownerId, query };
        if (sessionId) body.session_id = sessionId;
        if (limit) body.limit = limit;
        return this._request("POST", "/v1/memories/summaries/search", body);
      }
    };
    module2.exports = { CognisClient: CognisClient2, DEFAULT_BASE_URL };
  }
});

// src/lib/scoping.js
var require_scoping = __commonJS({
  "src/lib/scoping.js"(exports2, module2) {
    var crypto = require("crypto");
    var os = require("os");
    var path = require("path");
    var { getGitRoot, getGitRepoName } = require_git_utils();
    function sha256(input) {
      return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
    }
    function sanitize(str) {
      return str.toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    }
    function getOwnerId2(settings = {}) {
      return process.env.COGNIS_OWNER_ID || settings.ownerId || os.userInfo().username;
    }
    function getAgentId2(cwd, settings = {}) {
      if (settings.agentId) return settings.agentId;
      const gitRoot = getGitRoot(cwd);
      return `claudecode_${sha256(gitRoot || cwd)}`;
    }
    function getRepoAgentId2(cwd, settings = {}) {
      if (settings.repoAgentId) return settings.repoAgentId;
      const repoName = getGitRepoName(cwd) || path.basename(cwd);
      return `repo_${sanitize(repoName)}`;
    }
    function getProjectName2(cwd) {
      const repoName = getGitRepoName(cwd);
      if (repoName) return repoName;
      const gitRoot = getGitRoot(cwd);
      return path.basename(gitRoot || cwd);
    }
    module2.exports = { getOwnerId: getOwnerId2, getAgentId: getAgentId2, getRepoAgentId: getRepoAgentId2, getProjectName: getProjectName2, sha256, sanitize };
  }
});

// src/lib/format-context.js
var require_format_context = __commonJS({
  "src/lib/format-context.js"(exports2, module2) {
    function formatMemoryResults(memories, label) {
      if (!memories || !memories.length) return "";
      const items = memories.map((m, i) => {
        const content = m.memory || m.content || m.text || JSON.stringify(m);
        return `${i + 1}. ${content}`;
      }).join("\n");
      return `### ${label}
${items}`;
    }
    function formatContext2(personalMemories, teamMemories, projectName) {
      const sections = [];
      if (personalMemories && personalMemories.length) {
        sections.push(formatMemoryResults(personalMemories, "Your Previous Work"));
      }
      if (teamMemories && teamMemories.length) {
        sections.push(formatMemoryResults(teamMemories, "Team Knowledge"));
      }
      if (!sections.length) {
        return `<cognis-context>
No previous memories found for project "${projectName}". This appears to be a new session.
</cognis-context>`;
      }
      return `<cognis-context>
## Memories for "${projectName}"

${sections.join("\n\n")}

---
IMPORTANT: These memories were loaded from the user's Cognis memory store at session start. Use them to answer questions about the user (name, role, preferences, past work) WITHOUT making additional tool calls. Only use search_memories or other MCP tools if the user explicitly asks for something not covered here.
</cognis-context>`;
    }
    function formatSearchResults(results, query) {
      if (!results || !results.length) {
        return `No memories found for query: "${query}"`;
      }
      const items = results.map((m, i) => {
        const content = m.memory || m.content || m.text || JSON.stringify(m);
        const score = m.score ? ` (relevance: ${(m.score * 100).toFixed(0)}%)` : "";
        return `${i + 1}. ${content}${score}`;
      }).join("\n");
      return `Found ${results.length} memories for "${query}":

${items}`;
    }
    module2.exports = { formatContext: formatContext2, formatSearchResults, formatMemoryResults };
  }
});

// src/context-hook.js
var { readStdin, writeOutput } = require_stdin();
var { loadMergedSettings, getApiKey, isPrivateSession } = require_settings();
var { CognisClient } = require_cognis_client();
var { getOwnerId, getAgentId, getRepoAgentId, getProjectName } = require_scoping();
var { formatContext } = require_format_context();
async function main() {
  const input = await readStdin();
  const cwd = input.cwd || process.cwd();
  const settings = loadMergedSettings(cwd);
  const apiKey = getApiKey(settings, cwd);
  if (!apiKey) {
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: "<cognis-context>\nCognis memory not configured. Set LYZR_API_KEY environment variable or run /claude-cognis:project-config to configure.\n</cognis-context>"
      }
    });
    return;
  }
  if (isPrivateSession()) {
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: "<cognis-context>\nCognis private mode \u2014 cross-session memories disabled for this terminal.\nMCP tools are still available for explicit memory queries.\n</cognis-context>"
      }
    });
    return;
  }
  const client = new CognisClient(apiKey);
  const ownerId = getOwnerId(settings);
  const agentId = getAgentId(cwd, settings);
  const repoAgentId = getRepoAgentId(cwd, settings);
  const projectName = getProjectName(cwd);
  const limit = settings.maxMemoryItems || 5;
  let personalMemories = [];
  let teamMemories = [];
  try {
    const [personalProjectResult, personalProfileResult, teamResult] = await Promise.allSettled([
      client.search(projectName, { ownerId, agentId, limit }),
      client.search("user profile preferences background role", { ownerId, agentId, limit }),
      client.search(projectName, { agentId: repoAgentId, limit })
    ]);
    const seen = /* @__PURE__ */ new Set();
    const mergeMemories = (result) => {
      if (result.status !== "fulfilled") return [];
      const data = result.value;
      const memories = data.memories || data.results || data.data || [];
      if (!Array.isArray(memories)) return [];
      return memories.filter((m) => {
        const id = m.id || m.memory_id;
        if (id && seen.has(id)) return false;
        if (id) seen.add(id);
        return true;
      });
    };
    personalMemories = [
      ...mergeMemories(personalProjectResult),
      ...mergeMemories(personalProfileResult)
    ];
    if (teamResult.status === "fulfilled") {
      const data = teamResult.value;
      teamMemories = data.memories || data.results || data.data || [];
      if (!Array.isArray(teamMemories)) teamMemories = [];
    }
  } catch (err) {
    if (settings.debug) {
      console.error("[cognis] Context hook error:", err.message);
    }
  }
  const context = formatContext(personalMemories, teamMemories, projectName);
  writeOutput({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: context
    }
  });
}
main().catch((err) => {
  console.error("[cognis] Fatal error in context hook:", err.message);
  writeOutput({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: "<cognis-context>\nFailed to load memories from Cognis. The session will continue without memory context.\n</cognis-context>"
    }
  });
});
