/**
 * CLI: Save team/project knowledge to Cognis.
 * Usage: node save-project-memory.cjs "content to save"
 *    or: echo "content" | node save-project-memory.cjs
 * Uses repoAgentId (shared across team) instead of personal agentId.
 */

const { loadMergedSettings, getApiKey } = require("./lib/settings");
const { CognisClient } = require("./lib/cognis-client");
const { getRepoAgentId } = require("./lib/scoping");

function readStdinContent() {
	return new Promise((resolve) => {
		if (process.stdin.isTTY) return resolve("");
		let data = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk) => { data += chunk; });
		process.stdin.on("end", () => resolve(data.trim()));
		setTimeout(() => resolve(data.trim()), 3000);
	});
}

async function main() {
	let content = process.argv.slice(2).join(" ");

	if (!content) {
		content = await readStdinContent();
	}

	if (!content) {
		console.error("Usage: save-project-memory <content>");
		process.exit(1);
	}

	const cwd = process.cwd();
	const settings = loadMergedSettings(cwd);
	const apiKey = getApiKey(settings, cwd);

	if (!apiKey) {
		console.error(
			"No API key configured. Set LYZR_API_KEY environment variable or run /claude-cognis:project-config.",
		);
		process.exit(1);
	}

	const client = new CognisClient(apiKey);
	const repoAgentId = getRepoAgentId(cwd, settings);

	try {
		await client.addMessages([{ role: "user", content }], {
			agentId: repoAgentId,
		});
		console.log("Project memory saved successfully.");
	} catch (err) {
		console.error("Failed to save project memory:", err.message);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Error:", err.message);
	process.exit(1);
});
