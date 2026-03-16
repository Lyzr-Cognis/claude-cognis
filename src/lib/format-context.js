/**
 * Format Cognis search results for injection into Claude's context.
 */

function formatMemoryResults(memories, label) {
	if (!memories || !memories.length) return "";

	const items = memories
		.map((m, i) => {
			const content = m.memory || m.content || m.text || JSON.stringify(m);
			return `${i + 1}. ${content}`;
		})
		.join("\n");

	return `### ${label}\n${items}`;
}

function formatContext(personalMemories, teamMemories, projectName) {
	const sections = [];

	if (personalMemories && personalMemories.length) {
		sections.push(formatMemoryResults(personalMemories, "Your Previous Work"));
	}

	if (teamMemories && teamMemories.length) {
		sections.push(formatMemoryResults(teamMemories, "Team Knowledge"));
	}

	if (!sections.length) {
		return `<cognis-context>
No previous memories found for project "${projectName}". This appears to be a new session.
</cognis-context>`;
	}

	return `<cognis-context>
## Memories for "${projectName}"

${sections.join("\n\n")}

---
IMPORTANT: These memories were loaded from the user's Cognis memory store at session start. Use them to answer questions about the user (name, role, preferences, past work) WITHOUT making additional tool calls. Only use search_memories or other MCP tools if the user explicitly asks for something not covered here.
</cognis-context>`;
}

function formatSearchResults(results, query) {
	if (!results || !results.length) {
		return `No memories found for query: "${query}"`;
	}

	const items = results
		.map((m, i) => {
			const content = m.memory || m.content || m.text || JSON.stringify(m);
			const score = m.score ? ` (relevance: ${(m.score * 100).toFixed(0)}%)` : "";
			return `${i + 1}. ${content}${score}`;
		})
		.join("\n");

	return `Found ${results.length} memories for "${query}":\n\n${items}`;
}

module.exports = { formatContext, formatSearchResults, formatMemoryResults };
