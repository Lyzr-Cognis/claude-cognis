/**
 * Git root detection with worktree support.
 */

const { execSync } = require("child_process");
const path = require("path");

function getGitRoot(cwd) {
	try {
		const root = execSync("git rev-parse --show-toplevel", {
			cwd: cwd || process.cwd(),
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();

		// Check for worktree isolation
		if (process.env.COGNIS_ISOLATE_WORKTREES) {
			return root;
		}

		// If inside a worktree, use the main repo root
		try {
			const commonDir = execSync("git rev-parse --git-common-dir", {
				cwd: root,
				encoding: "utf8",
				stdio: ["pipe", "pipe", "pipe"],
			}).trim();

			if (commonDir && !commonDir.endsWith(".git")) {
				const mainRoot = path.resolve(root, commonDir, "..");
				return mainRoot;
			}
		} catch {
			// Not a worktree, use the root as-is
		}

		return root;
	} catch {
		return null;
	}
}

function getGitRepoName(cwd) {
	try {
		const remoteUrl = execSync("git remote get-url origin", {
			cwd: cwd || process.cwd(),
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();

		// Extract repo name from URL
		// git@github.com:org/repo.git → repo
		// https://github.com/org/repo.git → repo
		const match = remoteUrl.match(/\/([^/]+?)(?:\.git)?$/);
		return match ? match[1] : null;
	} catch {
		return null;
	}
}

module.exports = { getGitRoot, getGitRepoName };
