/**
 * Cognis MCP Server — gives Claude direct tool access to memory.
 * Stdio-based MCP server using @modelcontextprotocol/sdk.
 * Reuses cognis-client.js, settings.js, scoping.js.
 */

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { CognisClient } = require("./lib/cognis-client");
const { loadMergedSettings, getApiKey, isPrivateSession } = require("./lib/settings");
const { getOwnerId, getAgentId, getRepoAgentId } = require("./lib/scoping");
const { formatSearchResults } = require("./lib/format-context");

function getClient() {
	const cwd = process.cwd();
	const settings = loadMergedSettings(cwd);
	const apiKey = getApiKey(settings, cwd);
	if (!apiKey) {
		throw new Error("Cognis API key not configured. Set LYZR_API_KEY or run /claude-cognis:project-config.");
	}
	return { client: new CognisClient(apiKey), settings, cwd, isPrivate: isPrivateSession() };
}

function resolveScope(cwd, settings, scope) {
	const ownerId = getOwnerId(settings);
	const personalAgentId = getAgentId(cwd, settings);
	const teamAgentId = getRepoAgentId(cwd, settings);

	if (scope === "team") {
		return { ownerId, agentId: teamAgentId };
	}
	return { ownerId, agentId: personalAgentId };
}

const server = new McpServer({
	name: "cognis",
	version: "0.0.1",
});

// Tool 1: add_memory
server.tool(
	"add_memory",
	"Store information in long-term memory. Use this when the user says 'remember this', shares preferences, makes decisions, or when you observe important patterns worth preserving.",
	{
		content: z.string().describe("The memory content to store (e.g. 'User prefers TypeScript over JavaScript')"),
		scope: z.enum(["personal", "team"]).default("personal").describe("personal = only you see it; team = shared across all users on this repo"),
		role: z.enum(["user", "assistant"]).default("user").describe("Who originated this memory"),
		session_id: z.string().optional().describe("Session ID to associate with this memory"),
		sync_extraction: z.boolean().optional().describe("Wait for fact extraction to complete before returning"),
		use_graph: z.boolean().optional().describe("Enable knowledge graph storage"),
	},
	async ({ content, scope, role, session_id, sync_extraction, use_graph }) => {
		const { client, settings, cwd } = getClient();
		const { ownerId, agentId } = resolveScope(cwd, settings, scope);
		const messages = [{ role, content }];
		await client.addMessages(messages, {
			ownerId,
			agentId,
			sessionId: session_id,
			syncExtraction: sync_extraction,
			useGraph: use_graph,
		});
		const label = scope === "team" ? "Team" : "Personal";
		return { content: [{ type: "text", text: `${label} memory saved successfully.` }] };
	},
);

// Tool 2: search_memories
server.tool(
	"search_memories",
	"Search through stored memories using semantic search. Use this to find relevant past context, decisions, preferences, or patterns.",
	{
		query: z.string().describe("What to search for (natural language query)"),
		scope: z.enum(["personal", "team", "both"]).default("both").describe("Which memories to search: personal, team, or both"),
		limit: z.number().optional().default(5).describe("Maximum number of results"),
		cross_session: z.boolean().optional().describe("Search across all sessions"),
		use_graph: z.boolean().optional().describe("Include knowledge graph results"),
		rerank_provider: z.string().optional().describe("Reranking provider for better result ordering"),
	},
	async ({ query, scope, limit, cross_session, use_graph, rerank_provider }) => {
		const { client, settings, cwd, isPrivate } = getClient();
		const ownerId = getOwnerId(settings);
		const personalAgentId = getAgentId(cwd, settings);
		const teamAgentId = getRepoAgentId(cwd, settings);
		const effectiveCrossSession = cross_session ?? (isPrivate ? false : undefined);

		const sections = [];

		if (scope === "personal" || scope === "both") {
			try {
				const r = await client.search(query, {
					ownerId,
					agentId: personalAgentId,
					limit,
					crossSession: effectiveCrossSession,
					useGraph: use_graph,
					rerankProvider: rerank_provider,
				});
				const memories = r.memories || r.results || r.data || [];
				if (Array.isArray(memories) && memories.length) {
					sections.push(`## Personal Memories\n${formatSearchResults(memories, query)}`);
				}
			} catch (err) {
				sections.push(`## Personal Memories\nError: ${err.message}`);
			}
		}

		if (scope === "team" || scope === "both") {
			try {
				const r = await client.search(query, {
					agentId: teamAgentId,
					limit,
					crossSession: effectiveCrossSession,
					useGraph: use_graph,
					rerankProvider: rerank_provider,
				});
				const memories = r.memories || r.results || r.data || [];
				if (Array.isArray(memories) && memories.length) {
					sections.push(`## Team Memories\n${formatSearchResults(memories, query)}`);
				}
			} catch (err) {
				sections.push(`## Team Memories\nError: ${err.message}`);
			}
		}

		const output = sections.length
			? sections.join("\n\n")
			: `No memories found for: "${query}"`;
		return { content: [{ type: "text", text: output }] };
	},
);

// Tool 3: get_memories
server.tool(
	"get_memories",
	"List all stored memories. Use this to browse what has been remembered without a specific search query.",
	{
		scope: z.enum(["personal", "team"]).default("personal").describe("Which memories to list"),
		limit: z.number().optional().default(10).describe("Maximum number of results"),
		session_id: z.string().optional().describe("Filter to a specific session"),
		cross_session: z.boolean().optional().describe("Include memories from all sessions"),
		include_historical: z.boolean().optional().describe("Include historical/superseded memories"),
	},
	async ({ scope, limit, session_id, cross_session, include_historical }) => {
		const { client, settings, cwd, isPrivate } = getClient();
		const { ownerId, agentId } = resolveScope(cwd, settings, scope);
		const effectiveCrossSession = cross_session ?? (isPrivate ? false : undefined);
		const result = await client.getMemories({
			ownerId,
			agentId,
			sessionId: session_id,
			limit,
			crossSession: effectiveCrossSession,
			includeHistorical: include_historical,
		});
		const memories = result.memories || result.results || result.data || [];
		if (!Array.isArray(memories) || !memories.length) {
			return { content: [{ type: "text", text: `No ${scope} memories found.` }] };
		}
		const label = scope === "team" ? "Team" : "Personal";
		const items = memories.map((m, i) => {
			const content = m.memory || m.content || m.text || JSON.stringify(m);
			return `${i + 1}. ${content}`;
		}).join("\n");
		return { content: [{ type: "text", text: `## ${label} Memories\n\n${items}` }] };
	},
);

// Tool 4: update_memory
server.tool(
	"update_memory",
	"Update an existing memory's content or metadata.",
	{
		memory_id: z.string().describe("The ID of the memory to update"),
		content: z.string().optional().describe("New content for the memory"),
		metadata: z.record(z.unknown()).optional().describe("Metadata to update"),
	},
	async ({ memory_id, content, metadata }) => {
		const { client } = getClient();
		await client.updateMemory(memory_id, { content, metadata });
		return { content: [{ type: "text", text: `Memory ${memory_id} updated successfully.` }] };
	},
);

// Tool 5: delete_memory
server.tool(
	"delete_memory",
	"Delete a specific memory by ID.",
	{
		memory_id: z.string().describe("The ID of the memory to delete"),
	},
	async ({ memory_id }) => {
		const { client } = getClient();
		await client.deleteMemory(memory_id);
		return { content: [{ type: "text", text: `Memory ${memory_id} deleted.` }] };
	},
);

// Tool 6: delete_all_memories
server.tool(
	"delete_all_memories",
	"Delete all memories for a session. Requires explicit confirmation.",
	{
		confirm: z.boolean().describe("Must be true to proceed with deletion"),
		session_id: z.string().optional().describe("Session ID to clear (clears current scope if omitted)"),
	},
	async ({ confirm, session_id }) => {
		if (!confirm) {
			return { content: [{ type: "text", text: "Deletion cancelled — confirm must be true." }] };
		}
		const { client, settings, cwd } = getClient();
		const ownerId = getOwnerId(settings);
		const agentId = getAgentId(cwd, settings);
		await client.clearSession({
			ownerId,
			agentId,
			sessionId: session_id,
		});
		return { content: [{ type: "text", text: "All memories deleted successfully." }] };
	},
);

// Tool 7: get_context
server.tool(
	"get_context",
	"Get assembled context combining short-term and long-term memory. Cognis-unique feature that provides intelligent context assembly.",
	{
		current_messages: z.array(z.object({
			role: z.string(),
			content: z.string(),
		})).describe("Recent conversation messages to use as context for retrieval"),
		max_short_term_messages: z.number().optional().describe("Max short-term messages to include"),
		enable_long_term_memory: z.boolean().optional().describe("Whether to include long-term memory results"),
		cross_session: z.boolean().optional().describe("Include context from other sessions"),
	},
	async ({ current_messages, max_short_term_messages, enable_long_term_memory, cross_session }) => {
		const { client, settings, cwd, isPrivate } = getClient();
		const ownerId = getOwnerId(settings);
		const agentId = getAgentId(cwd, settings);
		const effectiveCrossSession = cross_session ?? (isPrivate ? false : undefined);
		const result = await client.getContext(current_messages, {
			ownerId,
			agentId,
			maxShortTermMessages: max_short_term_messages,
			enableLongTermMemory: enable_long_term_memory,
			crossSession: effectiveCrossSession,
		});
		// get_context is a programmatic tool — return structured data
		const context = result.context || result;
		if (typeof context === "string") {
			return { content: [{ type: "text", text: context }] };
		}
		return { content: [{ type: "text", text: JSON.stringify(context, null, 2) }] };
	},
);

// Tool 8: search_summaries
server.tool(
	"search_summaries",
	"Search session summaries. Cognis-unique feature for finding past session overviews and key decisions.",
	{
		query: z.string().describe("What to search for in summaries"),
		limit: z.number().optional().default(5).describe("Maximum number of results"),
		session_id: z.string().optional().describe("Filter to a specific session"),
	},
	async ({ query, limit, session_id }) => {
		const { client, settings } = getClient();
		const ownerId = getOwnerId(settings);
		const result = await client.searchSummaries(ownerId, query, {
			sessionId: session_id,
			limit,
		});
		const summaries = result.summaries || result.results || result.data || [];
		if (!Array.isArray(summaries) || !summaries.length) {
			return { content: [{ type: "text", text: `No session summaries found for: "${query}"` }] };
		}
		const items = summaries.map((s, i) => {
			const content = s.summary || s.content || s.text || JSON.stringify(s);
			return `${i + 1}. ${content}`;
		}).join("\n\n");
		return { content: [{ type: "text", text: `## Session Summaries\n\n${items}` }] };
	},
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((err) => {
	console.error("[cognis-mcp] Fatal error:", err.message);
	process.exit(1);
});
