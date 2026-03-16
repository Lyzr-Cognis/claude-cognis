/**
 * Live integration test for Cognis plugin.
 * Tests actual API calls: save memories, search, context hook, summary hook.
 *
 * Usage: LYZR_API_KEY=your-key node tests/test-cognis-live.js
 */

const path = require("path");
const { CognisClient } = require("../src/lib/cognis-client");
const { getOwnerId, getAgentId, getRepoAgentId, getProjectName } = require("../src/lib/scoping");
const { loadMergedSettings, getApiKey } = require("../src/lib/settings");
const { formatContext, formatSearchResults } = require("../src/lib/format-context");

const cwd = process.cwd();
const settings = loadMergedSettings(cwd);
const apiKey = getApiKey(settings, cwd);

if (!apiKey) {
	console.error("❌ No API key found. Set LYZR_API_KEY env var or configure settings.");
	process.exit(1);
}

const client = new CognisClient(apiKey);
const ownerId = getOwnerId(settings);
const agentId = getAgentId(cwd, settings);
const repoAgentId = getRepoAgentId(cwd, settings);
const projectName = getProjectName(cwd);
const sessionId = `test_session_${Date.now()}`;

let passed = 0;
let failed = 0;

function log(label, msg) {
	console.log(`\n${"=".repeat(60)}\n${label}\n${"=".repeat(60)}`);
	if (msg) console.log(msg);
}

function pass(name) {
	passed++;
	console.log(`  ✅ ${name}`);
}

function fail(name, err) {
	failed++;
	console.log(`  ❌ ${name}: ${err.message || err}`);
}

async function testAddPersonalMemory() {
	log("TEST 1: Add personal memory");
	try {
		const result = await client.addMessages(
			[
				{ role: "user", content: "We decided to use JWT tokens for authentication in the API." },
				{ role: "assistant", content: "Noted. The API will use JWT tokens for auth. I'll keep this in mind for future sessions." },
			],
			{ ownerId, agentId, sessionId },
		);
		console.log("  Response:", JSON.stringify(result, null, 2));
		pass("Added personal memory");
		return result;
	} catch (err) {
		fail("Add personal memory", err);
	}
}

async function testAddTeamMemory() {
	log("TEST 2: Add team/project memory");
	try {
		const result = await client.addMessages(
			[
				{
					role: "user",
					content:
						"[SAVE:test:2026-03-10] Architecture Decision: The claude-cognis plugin uses owner_id/agent_id scoping. Personal memories use sha256(git_root), team memories use repo name.",
				},
			],
			{ agentId: repoAgentId, sessionId },
		);
		console.log("  Response:", JSON.stringify(result, null, 2));
		pass("Added team memory");
		return result;
	} catch (err) {
		fail("Add team memory", err);
	}
}

async function testSearchPersonal() {
	log("TEST 3: Search personal memories");
	try {
		const result = await client.search("JWT authentication", {
			ownerId,
			agentId,
			limit: 5,
		});
		console.log("  Response:", JSON.stringify(result, null, 2));
		const memories = result.memories || result.results || result.data || [];
		console.log(`  Found ${Array.isArray(memories) ? memories.length : 0} memories`);
		if (Array.isArray(memories)) {
			console.log("  Formatted:\n", formatSearchResults(memories, "JWT authentication"));
		}
		pass("Searched personal memories");
		return result;
	} catch (err) {
		fail("Search personal memories", err);
	}
}

async function testSearchTeam() {
	log("TEST 4: Search team memories");
	try {
		const result = await client.search("architecture scoping", {
			agentId: repoAgentId,
			limit: 5,
		});
		console.log("  Response:", JSON.stringify(result, null, 2));
		const memories = result.memories || result.results || result.data || [];
		console.log(`  Found ${Array.isArray(memories) ? memories.length : 0} memories`);
		pass("Searched team memories");
		return result;
	} catch (err) {
		fail("Search team memories", err);
	}
}

async function testGetMemories() {
	log("TEST 5: Get memories list");
	try {
		const result = await client.getMemories({
			ownerId,
			agentId,
			limit: 10,
		});
		console.log("  Response:", JSON.stringify(result, null, 2));
		pass("Got memories list");
		return result;
	} catch (err) {
		fail("Get memories list", err);
	}
}

async function testContextHookFlow() {
	log("TEST 6: Simulate context hook (SessionStart)");
	try {
		const [personalResult, teamResult] = await Promise.allSettled([
			client.search(projectName, { ownerId, agentId, limit: 5 }),
			client.search(projectName, { agentId: repoAgentId, limit: 5 }),
		]);

		let personalMemories = [];
		let teamMemories = [];

		if (personalResult.status === "fulfilled") {
			const data = personalResult.value;
			personalMemories = data.memories || data.results || data.data || [];
			if (!Array.isArray(personalMemories)) personalMemories = [];
		} else {
			console.log("  Personal search failed:", personalResult.reason?.message);
		}

		if (teamResult.status === "fulfilled") {
			const data = teamResult.value;
			teamMemories = data.memories || data.results || data.data || [];
			if (!Array.isArray(teamMemories)) teamMemories = [];
		} else {
			console.log("  Team search failed:", teamResult.reason?.message);
		}

		const context = formatContext(personalMemories, teamMemories, projectName);
		console.log("  Generated context:\n");
		console.log(context);
		pass("Context hook simulation");
	} catch (err) {
		fail("Context hook simulation", err);
	}
}

async function testSummaryHookFlow() {
	log("TEST 7: Simulate summary hook (Stop)");
	try {
		const messages = [
			{ role: "user", content: "Can you add error handling to the API client?" },
			{ role: "assistant", content: "I added try-catch blocks and mapped HTTP status codes to user-friendly error messages in error-helpers.js." },
			{ role: "user", content: "Looks good. Remember that we should always return { continue: true } from the stop hook." },
			{ role: "assistant", content: "Noted — the stop hook must always return { continue: true } to avoid blocking session exit." },
		];

		const result = await client.addMessages(messages, {
			ownerId,
			agentId,
			sessionId,
		});
		console.log("  Response:", JSON.stringify(result, null, 2));
		pass("Summary hook simulation");
	} catch (err) {
		fail("Summary hook simulation", err);
	}
}

async function testSearchAfterSave() {
	log("TEST 8: Search for just-saved content");
	// Small delay to allow indexing
	await new Promise((r) => setTimeout(r, 2000));
	try {
		const result = await client.search("error handling API client", {
			ownerId,
			agentId,
			limit: 5,
		});
		console.log("  Response:", JSON.stringify(result, null, 2));
		const memories = result.memories || result.results || result.data || [];
		console.log(`  Found ${Array.isArray(memories) ? memories.length : 0} memories`);
		pass("Search after save");
	} catch (err) {
		fail("Search after save", err);
	}
}

async function run() {
	log("COGNIS LIVE INTEGRATION TEST");
	console.log(`  API URL: ${client.baseUrl}`);
	console.log(`  Owner ID: ${ownerId}`);
	console.log(`  Agent ID (personal): ${agentId}`);
	console.log(`  Agent ID (team): ${repoAgentId}`);
	console.log(`  Project Name: ${projectName}`);
	console.log(`  Session ID: ${sessionId}`);

	await testAddPersonalMemory();
	await testAddTeamMemory();

	// Brief pause to let memories index
	console.log("\n  ⏳ Waiting 2s for indexing...");
	await new Promise((r) => setTimeout(r, 2000));

	await testSearchPersonal();
	await testSearchTeam();
	await testGetMemories();
	await testContextHookFlow();
	await testSummaryHookFlow();
	await testSearchAfterSave();

	log("RESULTS");
	console.log(`  ✅ Passed: ${passed}`);
	console.log(`  ❌ Failed: ${failed}`);
	console.log(`  Total: ${passed + failed}`);

	process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
