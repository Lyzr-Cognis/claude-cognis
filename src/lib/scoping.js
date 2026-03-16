/**
 * Cognis scoping: derives owner_id, agent_id, session_id from environment.
 *
 * owner_id  — identifies the user (system username by default)
 * agent_id  — identifies the project context (hash of git root for personal, repo name for team)
 * session_id — identifies the session (from Claude hook payload)
 */

const crypto = require("crypto");
const os = require("os");
const path = require("path");
const { getGitRoot, getGitRepoName } = require("./git-utils");

function sha256(input) {
	return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function sanitize(str) {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "");
}

/**
 * Owner ID: system username, overridable via env or config.
 */
function getOwnerId(settings = {}) {
	return process.env.COGNIS_OWNER_ID || settings.ownerId || os.userInfo().username;
}

/**
 * Agent ID (personal): sha256 hash of git root (unique per project per user).
 */
function getAgentId(cwd, settings = {}) {
	if (settings.agentId) return settings.agentId;
	const gitRoot = getGitRoot(cwd);
	return `claudecode_${sha256(gitRoot || cwd)}`;
}

/**
 * Agent ID (repo/team): sanitized repo name (shared across team).
 */
function getRepoAgentId(cwd, settings = {}) {
	if (settings.repoAgentId) return settings.repoAgentId;
	const repoName = getGitRepoName(cwd) || path.basename(cwd);
	return `repo_${sanitize(repoName)}`;
}

/**
 * Human-readable project name for display / search queries.
 */
function getProjectName(cwd) {
	const repoName = getGitRepoName(cwd);
	if (repoName) return repoName;
	const gitRoot = getGitRoot(cwd);
	return path.basename(gitRoot || cwd);
}

module.exports = { getOwnerId, getAgentId, getRepoAgentId, getProjectName, sha256, sanitize };
