/**
 * CLI: Search memories in Cognis.
 * Usage: node search-memory.cjs [--user|--repo|--both] "query"
 */

const { loadMergedSettings, getApiKey } = require("./lib/settings");
const { CognisClient } = require("./lib/cognis-client");
const { getOwnerId, getAgentId, getRepoAgentId } = require("./lib/scoping");
const { formatSearchResults } = require("./lib/format-context");

async function main() {
	const args = process.argv.slice(2);
	let mode = "both";
	let query = "";

	for (const arg of args) {
		if (arg === "--user") mode = "user";
		else if (arg === "--repo") mode = "repo";
		else if (arg === "--both") mode = "both";
		else query += (query ? " " : "") + arg;
	}

	if (!query) {
		console.error("Usage: search-memory [--user|--repo|--both] <query>");
		process.exit(1);
	}

	const cwd = process.cwd();
	const settings = loadMergedSettings(cwd);
	const apiKey = getApiKey(settings, cwd);

	if (!apiKey) {
		console.error(
			"No API key configured. Run /claude-cognis:project-config or set LYZR_API_KEY.",
		);
		process.exit(1);
	}

	const client = new CognisClient(apiKey);
	const ownerId = getOwnerId(settings);
	const agentId = getAgentId(cwd, settings);
	const repoAgentId = getRepoAgentId(cwd, settings);
	const limit = settings.maxMemoryItems || 5;

	const results = [];

	if (mode === "user" || mode === "both") {
		try {
			const res = await client.search(query, { ownerId, agentId, limit });
			const memories = res.memories || res.results || res.data || [];
			if (Array.isArray(memories) && memories.length) {
				results.push(`## Personal Memories\n${formatSearchResults(memories, query)}`);
			}
		} catch (err) {
			results.push(`## Personal Memories\nError: ${err.message}`);
		}
	}

	if (mode === "repo" || mode === "both") {
		try {
			const res = await client.search(query, { agentId: repoAgentId, limit });
			const memories = res.memories || res.results || res.data || [];
			if (Array.isArray(memories) && memories.length) {
				results.push(`## Team Memories\n${formatSearchResults(memories, query)}`);
			}
		} catch (err) {
			results.push(`## Team Memories\nError: ${err.message}`);
		}
	}

	if (results.length) {
		console.log(results.join("\n\n"));
	} else {
		console.log(`No memories found for: "${query}"`);
	}
}

main().catch((err) => {
	console.error("Search failed:", err.message);
	process.exit(1);
});
