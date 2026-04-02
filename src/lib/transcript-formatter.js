/**
 * Transcript parsing and formatting for Cognis memory ingestion.
 * Reads JSONL transcript files and converts to message arrays.
 */

const fs = require("fs");
const { compressMessage, compressToolUse } = require("./compress");

const COGNIS_TAG_RE = /<\/?cognis-context[^>]*>/g;

/**
 * Parse a JSONL transcript file into an array of messages.
 */
function parseTranscript(transcriptPath) {
	if (!transcriptPath || !fs.existsSync(transcriptPath)) return [];

	const raw = fs.readFileSync(transcriptPath, "utf8");
	const lines = raw.split("\n").filter((l) => l.trim());
	const messages = [];

	for (const line of lines) {
		try {
			const entry = JSON.parse(line);
			if (entry.type === "message" && entry.message) {
				messages.push(entry.message);
			} else if (entry.role) {
				messages.push(entry);
			}
		} catch {
			// Skip malformed lines
		}
	}

	return messages;
}

/**
 * Clean cognis-context tags from message content.
 */
function cleanCognisTags(text) {
	if (typeof text !== "string") return text;
	// Remove entire <cognis-context>...</cognis-context> blocks
	return text.replace(/<cognis-context>[\s\S]*?<\/cognis-context>/g, "").trim();
}

/**
 * Extract signal-relevant turns from transcript (messages around signal keywords).
 */
function extractSignalTurns(messages, keywords, turnsBefore = 3) {
	if (!keywords || !keywords.length) return messages;

	const signalIndices = new Set();

	for (let i = 0; i < messages.length; i++) {
		const content = getMessageText(messages[i]);
		if (!content) continue;

		const lower = content.toLowerCase();
		for (const kw of keywords) {
			if (lower.includes(kw.toLowerCase())) {
				// Include this turn and `turnsBefore` turns before it
				for (let j = Math.max(0, i - turnsBefore); j <= i; j++) {
					signalIndices.add(j);
				}
				break;
			}
		}
	}

	if (signalIndices.size === 0) return messages;

	return Array.from(signalIndices)
		.sort((a, b) => a - b)
		.map((i) => messages[i]);
}

/**
 * Get text content from a message (handles string and array content).
 */
function getMessageText(message) {
	if (!message) return "";
	if (typeof message.content === "string") return message.content;
	if (Array.isArray(message.content)) {
		return message.content
			.filter((b) => b.type === "text")
			.map((b) => b.text)
			.join("\n");
	}
	return "";
}

/**
 * Format transcript messages for Cognis ingestion.
 * Returns array of {role, content} suitable for addMessages().
 */
function formatTranscript(messages, { signalExtraction, signalKeywords, signalTurnsBefore, includeTools } = {}) {
	let processed = messages;

	// Apply signal extraction if enabled
	if (signalExtraction && signalKeywords && signalKeywords.length) {
		processed = extractSignalTurns(processed, signalKeywords, signalTurnsBefore);
	}

	const formatted = [];

	// Track pending tool uses from assistant messages so we can
	// apply tool-aware compression on the corresponding results.
	const pendingTools = new Map(); // tool_use_id → { toolName, toolInput }

	for (const msg of processed) {
		// Track tool_use blocks from assistant messages
		if (msg.role === "assistant" && Array.isArray(msg.content)) {
			for (const block of msg.content) {
				if (block.type === "tool_use" && block.id) {
					pendingTools.set(block.id, {
						toolName: block.name || "Unknown",
						toolInput: block.input || {},
					});
				}
			}
		}

		// Apply tool-aware compression to tool results
		let compressed;
		if (msg.role === "user" && Array.isArray(msg.content)) {
			const newContent = msg.content.map((block) => {
				if (block.type === "tool_result" && block.tool_use_id) {
					const meta = pendingTools.get(block.tool_use_id);
					if (meta && typeof block.content === "string") {
						return {
							...block,
							content: compressToolUse(meta.toolName, meta.toolInput, block.content),
						};
					}
				}
				return block;
			});
			compressed = { ...msg, content: newContent };
		} else {
			compressed = compressMessage(msg);
		}

		let text = getMessageText(compressed);
		if (!text) continue;

		// Clean cognis context tags
		text = cleanCognisTags(text);
		if (!text) continue;

		const role = msg.role === "assistant" ? "assistant" : "user";
		formatted.push({ role, content: text });
	}

	return formatted;
}

/**
 * Build a session summary from formatted messages.
 * Extracts key user questions/requests as bullet points.
 */
function buildSessionSummary(messages, projectName) {
	const userMessages = messages.filter((m) => m.role === "user");

	if (!userMessages.length) return null;

	const bullets = [];
	for (const msg of userMessages) {
		const text = typeof msg.content === "string" ? msg.content : "";
		if (!text || text.length < 10) continue;

		// Take the first line or first 200 chars as a summary point
		const firstLine = text.split("\n")[0].trim();
		const summary = firstLine.length > 200 ? `${firstLine.slice(0, 197)}...` : firstLine;
		if (summary) bullets.push(`- ${summary}`);
	}

	if (!bullets.length) return null;

	const header = projectName ? `Session summary for ${projectName}` : "Session summary";
	// Keep at most 20 bullet points
	const trimmed = bullets.slice(0, 20);
	return `${header}:\n${trimmed.join("\n")}`;
}

module.exports = {
	parseTranscript,
	formatTranscript,
	cleanCognisTags,
	extractSignalTurns,
	getMessageText,
	buildSessionSummary,
};
