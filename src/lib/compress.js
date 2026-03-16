/**
 * Tool result compression — truncates long tool outputs in transcripts.
 */

const MAX_TOOL_RESULT_LENGTH = 2000;

function compressToolResult(content) {
	if (!content || typeof content !== "string") return content;
	if (content.length <= MAX_TOOL_RESULT_LENGTH) return content;
	return `${content.slice(0, MAX_TOOL_RESULT_LENGTH)}\n... [truncated ${content.length - MAX_TOOL_RESULT_LENGTH} chars]`;
}

function compressMessage(message) {
	if (!message || !message.content) return message;

	if (typeof message.content === "string") {
		return { ...message, content: compressToolResult(message.content) };
	}

	if (Array.isArray(message.content)) {
		return {
			...message,
			content: message.content.map((block) => {
				if (block.type === "tool_result" && typeof block.content === "string") {
					return { ...block, content: compressToolResult(block.content) };
				}
				return block;
			}),
		};
	}

	return message;
}

module.exports = { compressToolResult, compressMessage, MAX_TOOL_RESULT_LENGTH };
