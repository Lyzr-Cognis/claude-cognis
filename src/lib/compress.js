/**
 * Tool-aware compression — intelligently compresses tool outputs in transcripts.
 * Each tool type gets a specialized compressor that extracts the essential info.
 */

const MAX_TOOL_RESULT_LENGTH = 500;
const MAX_OUTPUT_PREVIEW = 200;

/**
 * Compress a tool result based on the tool type.
 */
function compressToolUse(toolName, toolInput, toolResult) {
	if (!toolResult || typeof toolResult !== "string") return toolResult || "";
	const input = toolInput || {};

	switch (toolName) {
		case "Edit":
		case "MultiEdit": {
			const file = input.file_path || "file";
			const old = input.old_string
				? truncate(input.old_string, 60)
				: "";
			const nw = input.new_string
				? truncate(input.new_string, 60)
				: "";
			if (old && nw) return `Edited ${file}: "${old}" → "${nw}"`;
			return `Edited ${file}`;
		}

		case "Write": {
			const file = input.file_path || "file";
			const lines = (input.content || "").split("\n").length;
			return `Wrote ${file} (${lines} lines)`;
		}

		case "Read": {
			const file = input.file_path || "file";
			const lines = toolResult.split("\n").length;
			return `Read ${file} (${lines} lines)`;
		}

		case "Bash": {
			const cmd = input.command
				? truncate(input.command, 120)
				: "command";
			const preview = truncate(toolResult, MAX_OUTPUT_PREVIEW);
			return `Ran: ${cmd}\n${preview}`;
		}

		case "Glob": {
			const pattern = input.pattern || "pattern";
			const files = toolResult.split("\n").filter((l) => l.trim());
			return `Found ${files.length} files matching "${pattern}"`;
		}

		case "Grep": {
			const pattern = input.pattern || "pattern";
			const matches = toolResult.split("\n").filter((l) => l.trim());
			return `Searched for "${pattern}": ${matches.length} matches`;
		}

		case "Agent": {
			const desc = input.description || "task";
			const summary = truncate(toolResult, MAX_OUTPUT_PREVIEW);
			return `Agent (${desc}): ${summary}`;
		}

		case "TaskCreate":
		case "TaskUpdate":
		case "TaskList":
		case "TaskGet":
			return truncate(toolResult, MAX_OUTPUT_PREVIEW);

		case "WebFetch":
		case "WebSearch": {
			const url = input.url || input.query || "";
			return `${toolName}: ${url}\n${truncate(toolResult, MAX_OUTPUT_PREVIEW)}`;
		}

		default:
			return truncate(toolResult, MAX_TOOL_RESULT_LENGTH);
	}
}

/**
 * Compress a full message, handling both string and array content blocks.
 * If toolMeta is provided ({ toolName, toolInput }), uses tool-aware compression.
 */
function compressMessage(message, toolMeta) {
	if (!message || !message.content) return message;

	if (typeof message.content === "string") {
		if (toolMeta) {
			return {
				...message,
				content: compressToolUse(toolMeta.toolName, toolMeta.toolInput, message.content),
			};
		}
		return {
			...message,
			content: truncate(message.content, MAX_TOOL_RESULT_LENGTH),
		};
	}

	if (Array.isArray(message.content)) {
		return {
			...message,
			content: message.content.map((block) => {
				if (block.type === "tool_result" && typeof block.content === "string") {
					return {
						...block,
						content: truncate(block.content, MAX_TOOL_RESULT_LENGTH),
					};
				}
				return block;
			}),
		};
	}

	return message;
}

function truncate(str, max) {
	if (!str || typeof str !== "string") return str || "";
	if (str.length <= max) return str;
	return `${str.slice(0, max)}... [+${str.length - max} chars]`;
}

module.exports = { compressToolUse, compressMessage, truncate, MAX_TOOL_RESULT_LENGTH };
