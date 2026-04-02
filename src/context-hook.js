/**
 * SessionStart hook — loads memories from Cognis on session start.
 * Reads hook payload from stdin, queries Cognis for personal + team memories,
 * and returns additionalContext via hookSpecificOutput.
 */

const { readStdin, writeOutput } = require("./lib/stdin");
const { loadMergedSettings, getApiKey, isPrivateSession } = require("./lib/settings");
const { CognisClient } = require("./lib/cognis-client");
const { getOwnerId, getAgentId, getRepoAgentId, getProjectName } = require("./lib/scoping");
const { formatContext } = require("./lib/format-context");

async function main() {
	const input = await readStdin();
	const cwd = input.cwd || process.cwd();

	const settings = loadMergedSettings(cwd);
	const apiKey = getApiKey(settings, cwd);

	if (!apiKey) {
		writeOutput({
			hookSpecificOutput: {
				hookEventName: "SessionStart",
				additionalContext:
					"<cognis-context>\nCognis memory not configured. Run /claude-cognis:project-config to configure, or set LYZR_API_KEY.\n</cognis-context>",
			},
		});
		return;
	}

	if (isPrivateSession()) {
		writeOutput({
			hookSpecificOutput: {
				hookEventName: "SessionStart",
				additionalContext:
					"<cognis-context>\nCognis private mode — cross-session memories disabled for this terminal.\nMCP tools are still available for explicit memory queries.\n</cognis-context>",
			},
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
		// Search personal memories with both project-specific and general profile queries,
		// plus team memories — all in parallel
		const [personalProjectResult, personalProfileResult, teamResult] = await Promise.allSettled([
			client.search(projectName, { ownerId, agentId, limit }),
			client.search("user profile preferences background role", { ownerId, agentId, limit }),
			client.search(projectName, { agentId: repoAgentId, limit }),
		]);

		// Merge personal project + profile results, deduplicate by ID
		const seen = new Set();
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
			...mergeMemories(personalProfileResult),
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
			additionalContext: context,
		},
	});
}

main().catch((err) => {
	console.error("[cognis] Fatal error in context hook:", err.message);
	writeOutput({
		hookSpecificOutput: {
			hookEventName: "SessionStart",
			additionalContext:
				"<cognis-context>\nFailed to load memories from Cognis. The session will continue without memory context.\n</cognis-context>",
		},
	});
});
