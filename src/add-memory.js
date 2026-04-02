/**
 * CLI: Save a personal memory to Cognis.
 * Usage: node add-memory.cjs "content to save"
 *    or: echo "content" | node add-memory.cjs
 */

const { loadMergedSettings, getApiKey } = require("./lib/settings");
const { CognisClient } = require("./lib/cognis-client");
const { getOwnerId, getAgentId } = require("./lib/scoping");

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
		console.error("Usage: add-memory <content>");
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

	try {
		await client.addMessages([{ role: "user", content }], {
			ownerId,
			agentId,
		});
		console.log("Memory saved successfully.");
	} catch (err) {
		console.error("Failed to save memory:", err.message);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Error:", err.message);
	process.exit(1);
});
