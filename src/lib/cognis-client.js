/**
 * HTTP client for the Cognis memory REST API.
 * Uses Node 18+ built-in fetch — no external dependencies.
 *
 * Base URL: https://memory.studio.lyzr.ai (configurable via COGNIS_API_URL)
 * Auth: x-api-key header
 */

const { CognisApiError } = require("./error-helpers");

const DEFAULT_BASE_URL = "https://memory.studio.lyzr.ai";

class CognisClient {
	constructor(apiKey, baseUrl) {
		if (!apiKey) throw new Error("CognisClient requires an API key");
		if (typeof apiKey !== "string" || apiKey.trim().length < 8) {
			throw new Error("Invalid API key format — key must be at least 8 characters");
		}
		this.apiKey = apiKey.trim();
		this.baseUrl = (baseUrl || process.env.COGNIS_API_URL || DEFAULT_BASE_URL).replace(
			/\/$/,
			"",
		);
	}

	async _request(method, path, body) {
		const url = `${this.baseUrl}${path}`;
		const headers = {
			"x-api-key": this.apiKey,
			"Content-Type": "application/json",
		};

		const opts = { method, headers };
		if (body !== undefined) {
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
		if (syncExtraction !== undefined) body.sync_extraction = syncExtraction;
		if (extractAssistantFacts !== undefined) body.extract_assistant_facts = extractAssistantFacts;
		if (useGraph !== undefined) body.use_graph = useGraph;

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
		if (crossSession !== undefined) body.cross_session = crossSession;
		if (useGraph !== undefined) body.use_graph = useGraph;
		if (rerankProvider) body.rerank_provider = rerankProvider;
		if (includeHistorical !== undefined) body.include_historical = includeHistorical;

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
		if (includeHistorical !== undefined) params.set("include_historical", String(includeHistorical));
		if (crossSession !== undefined) params.set("cross_session", String(crossSession));

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
		if (content !== undefined) body.content = content;
		if (metadata !== undefined) body.metadata = metadata;

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
		if (messagesCoveredCount !== undefined) body.messages_covered_count = messagesCoveredCount;

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
		if (maxShortTermMessages !== undefined) body.max_short_term_messages = maxShortTermMessages;
		if (enableLongTermMemory !== undefined) body.enable_long_term_memory = enableLongTermMemory;
		if (crossSession !== undefined) body.cross_session = crossSession;

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
}

module.exports = { CognisClient, DEFAULT_BASE_URL };
