/**
 * UserPromptSubmit hook — surfaces relevant memories mid-session.
 * Reads the user's prompt from stdin and searches for related memories.
 * Only injects context when highly relevant results are found.
 */

const { readStdin, writeOutput } = require("./lib/stdin");
const { loadMergedSettings, getApiKey, isPrivateSession } = require("./lib/settings");
const { CognisClient } = require("./lib/cognis-client");
const { getOwnerId, getAgentId, getRepoAgentId } = require("./lib/scoping");

// Prompts that aren't worth searching for
const SKIP_PATTERNS = [
	/^(yes|no|y|n|ok|okay|sure|thanks|thank you|continue|go ahead|do it|looks good|lgtm|👍)$/i,
	/^\//, // slash commands
	/^!/, // shell commands
];

const MIN_PROMPT_LENGTH = 20;

async function main() {
	const input = await readStdin();
	const cwd = input.cwd || process.cwd();
	const prompt = input.prompt || "";

	// Skip short or trivial prompts
	if (!prompt || prompt.length < MIN_PROMPT_LENGTH) return;
	for (const pattern of SKIP_PATTERNS) {
		if (pattern.test(prompt.trim())) return;
	}

	const settings = loadMergedSettings(cwd);
	const apiKey = getApiKey(settings, cwd);
	if (!apiKey || isPrivateSession()) return;

	const client = new CognisClient(apiKey);
	const ownerId = getOwnerId(settings);
	const agentId = getAgentId(cwd, settings);
	const repoAgentId = getRepoAgentId(cwd, settings);

	// Truncate prompt for search query
	const query = prompt.slice(0, 150);

	try {
		// Search personal + team in parallel, limit 2 each for speed
		const [personalRes, teamRes] = await Promise.allSettled([
			client.search(query, { ownerId, agentId, limit: 2 }),
			client.search(query, { agentId: repoAgentId, limit: 2 }),
		]);

		const memories = [];

		const extractMemories = (result) => {
			if (result.status !== "fulfilled") return;
			const data = result.value;
			const items = data.memories || data.results || data.data || [];
			if (!Array.isArray(items)) return;
			for (const m of items) {
				const content = m.content || m.memory || m.text || "";
				const score = m.score || m.relevance || 0;
				if (content && score > 0.5) {
					memories.push(content.length > 200 ? `${content.slice(0, 197)}...` : content);
				}
			}
		};

		extractMemories(personalRes);
		extractMemories(teamRes);

		if (memories.length === 0) return;

		// Deduplicate
		const unique = [...new Set(memories)].slice(0, 3);

		const context = [
			"<cognis-context>",
			"Relevant memories for this task:",
			...unique.map((m) => `- ${m}`),
			"</cognis-context>",
		].join("\n");

		writeOutput({
			hookSpecificOutput: {
				hookEventName: "UserPromptSubmit",
				additionalContext: context,
			},
		});
	} catch {
		// Silently fail — don't block the user's prompt
	}
}

main().catch(() => {
	// Silent failure — this hook should never block
});
