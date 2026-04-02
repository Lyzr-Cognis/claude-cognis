/**
 * CLI: Show memory statistics.
 * Usage: node stats.cjs
 */

const { loadMergedSettings, getApiKey } = require("./lib/settings");
const { CognisClient } = require("./lib/cognis-client");
const { getOwnerId, getAgentId, getRepoAgentId, getProjectName } = require("./lib/scoping");

async function main() {
	const cwd = process.cwd();
	const settings = loadMergedSettings(cwd);
	const apiKey = getApiKey(settings, cwd);

	if (!apiKey) {
		console.error("No API key configured. Run /claude-cognis:project-config or set LYZR_API_KEY.");
		process.exit(1);
	}

	const client = new CognisClient(apiKey);
	const ownerId = getOwnerId(settings);
	const agentId = getAgentId(cwd, settings);
	const repoAgentId = getRepoAgentId(cwd, settings);
	const projectName = getProjectName(cwd);

	const results = [];
	results.push(`# Cognis Memory Stats`);
	results.push(`Project: ${projectName || "unknown"}`);
	results.push("");

	// Fetch personal memories
	try {
		const personal = await client.getMemories({ ownerId, agentId, limit: 100 });
		const memories = personal.memories || personal.results || personal.data || [];
		const count = Array.isArray(memories) ? memories.length : 0;
		results.push(`Personal memories: ${count}`);
	} catch (err) {
		results.push(`Personal memories: error (${err.message})`);
	}

	// Fetch team memories
	try {
		const team = await client.getMemories({ agentId: repoAgentId, limit: 100 });
		const memories = team.memories || team.results || team.data || [];
		const count = Array.isArray(memories) ? memories.length : 0;
		results.push(`Team memories: ${count}`);
	} catch (err) {
		results.push(`Team memories: error (${err.message})`);
	}

	results.push("");

	// Fetch recent session summaries
	try {
		const summaries = await client.searchSummaries(ownerId, "", { limit: 5 });
		const items = summaries.summaries || summaries.results || summaries.data || [];
		if (Array.isArray(items) && items.length > 0) {
			results.push("Recent sessions:");
			for (const s of items) {
				const date = s.created_at || s.timestamp || "unknown date";
				const preview = (s.content || s.summary || "").slice(0, 80);
				results.push(`  - ${date}: ${preview}`);
			}
		} else {
			results.push("Recent sessions: none found");
		}
	} catch (err) {
		results.push(`Recent sessions: error (${err.message})`);
	}

	results.push("");
	results.push(`Owner ID: ${ownerId}`);
	results.push(`Personal Agent ID: ${agentId}`);
	results.push(`Team Agent ID: ${repoAgentId}`);

	console.log(results.join("\n"));
}

main().catch((err) => {
	console.error("Stats error:", err.message);
	process.exit(1);
});
