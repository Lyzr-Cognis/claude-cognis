/**
 * Per-repo project configuration.
 * Config path: .claude/.cognis-claude/config.json
 */

const fs = require("fs");
const path = require("path");
const { getGitRoot } = require("./git-utils");

function getProjectConfigPath(cwd) {
	const gitRoot = getGitRoot(cwd);
	const root = gitRoot || cwd || process.cwd();
	return path.join(root, ".claude", ".cognis-claude", "config.json");
}

function loadProjectConfig(cwd) {
	try {
		const configPath = getProjectConfigPath(cwd);
		if (fs.existsSync(configPath)) {
			const raw = fs.readFileSync(configPath, "utf8");
			return JSON.parse(raw);
		}
	} catch {
		// Return empty config on error
	}
	return {};
}

function saveProjectConfig(cwd, config) {
	const configPath = getProjectConfigPath(cwd);
	const dir = path.dirname(configPath);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
}

module.exports = { getProjectConfigPath, loadProjectConfig, saveProjectConfig };
