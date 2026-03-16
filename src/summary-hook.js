/**
 * Stop hook — saves session transcript to Cognis memory.
 * Reads hook payload from stdin (includes transcript_path, session_id, cwd),
 * parses the transcript, and sends formatted messages to Cognis.
 */

const { readStdin, writeOutput } = require("./lib/stdin");
const { loadMergedSettings, getApiKey } = require("./lib/settings");
const { CognisClient } = require("./lib/cognis-client");
const { getOwnerId, getAgentId, getProjectName } = require("./lib/scoping");
const { parseTranscript, formatTranscript, buildSessionSummary } = require("./lib/transcript-formatter");

async function main() {
	const input = await readStdin();
	const cwd = input.cwd || process.cwd();
	const transcriptPath = input.transcript_path || input.transcriptPath;
	const sessionId = input.session_id || input.sessionId;

	if (!transcriptPath) {
		writeOutput({ continue: true });
		return;
	}

	const settings = loadMergedSettings(cwd);
	const apiKey = getApiKey(settings, cwd);

	if (!apiKey) {
		writeOutput({ continue: true });
		return;
	}

	const client = new CognisClient(apiKey);
	const ownerId = getOwnerId(settings);
	const agentId = getAgentId(cwd, settings);

	try {
		const rawMessages = parseTranscript(transcriptPath);

		if (!rawMessages.length) {
			writeOutput({ continue: true });
			return;
		}

		const messages = formatTranscript(rawMessages, {
			signalExtraction: settings.signalExtraction,
			signalKeywords: settings.signalKeywords,
			signalTurnsBefore: settings.signalTurnsBefore,
			includeTools: settings.includeTools,
		});

		if (!messages.length) {
			writeOutput({ continue: true });
			return;
		}

		await client.addMessages(messages, {
			ownerId,
			agentId,
			sessionId: sessionId || undefined,
		});

		if (settings.debug) {
			console.error(`[cognis] Saved ${messages.length} messages to memory`);
		}

		// Store session summary
		const projectName = getProjectName(cwd);
		const summaryText = buildSessionSummary(messages, projectName);
		if (summaryText) {
			try {
				await client.storeSummary(summaryText, {
					ownerId,
					agentId,
					sessionId: sessionId || undefined,
					messagesCoveredCount: messages.length,
				});
				if (settings.debug) {
					console.error("[cognis] Stored session summary");
				}
			} catch (summaryErr) {
				if (settings.debug) {
					console.error("[cognis] Failed to store summary:", summaryErr.message);
				}
			}
		}
	} catch (err) {
		if (settings.debug) {
			console.error("[cognis] Summary hook error:", err.message);
		}
		// Don't block session exit on error
	}

	writeOutput({ continue: true });
}

main().catch((err) => {
	console.error("[cognis] Fatal error in summary hook:", err.message);
	writeOutput({ continue: true });
});
