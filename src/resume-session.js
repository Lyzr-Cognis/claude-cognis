/**
 * CLI: Load last session context for resuming work.
 * Usage: node resume-session.cjs
 */

const { loadMergedSettings, getApiKey } = require("./lib/settings");
const { CognisClient } = require("./lib/cognis-client");
const { getOwnerId, getAgentId, getProjectName } = require("./lib/scoping");

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
	const projectName = getProjectName(cwd);

	const output = [];

	// Get last session summary
	try {
		const summaries = await client.searchSummaries(ownerId, "", { limit: 1 });
		const items = summaries.summaries || summaries.results || summaries.data || [];
		if (Array.isArray(items) && items.length > 0) {
			const last = items[0];
			const date = last.created_at || last.timestamp || "";
			output.push("## Last Session Summary");
			if (date) output.push(`Date: ${date}`);
			output.push("");
			output.push(last.content || last.summary || "No summary content available.");
		} else {
			output.push("No previous sessions found for this project.");
			console.log(output.join("\n"));
			return;
		}
	} catch (err) {
		output.push(`Failed to load session summary: ${err.message}`);
	}

	output.push("");

	// Get recent memories for context
	try {
		const query = projectName ? `recent work on ${projectName}` : "recent work session";
		const res = await client.search(query, { ownerId, agentId, limit: 3 });
		const memories = res.memories || res.results || res.data || [];
		if (Array.isArray(memories) && memories.length > 0) {
			output.push("## Recent Memories");
			for (const m of memories) {
				const content = m.content || m.memory || m.text || "";
				if (content) {
					const preview = content.length > 300 ? `${content.slice(0, 297)}...` : content;
					output.push(`- ${preview}`);
				}
			}
		}
	} catch (err) {
		output.push(`Failed to load recent memories: ${err.message}`);
	}

	console.log(output.join("\n"));
}

main().catch((err) => {
	console.error("Resume error:", err.message);
	process.exit(1);
});
