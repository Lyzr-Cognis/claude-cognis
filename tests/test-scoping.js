const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const os = require("os");
const { getOwnerId, getAgentId, getRepoAgentId, getProjectName, sha256, sanitize } = require("../src/lib/scoping");

describe("scoping", () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	describe("sha256", () => {
		it("returns a 16-char hex string", () => {
			const hash = sha256("test-input");
			assert.equal(hash.length, 16);
			assert.match(hash, /^[a-f0-9]{16}$/);
		});

		it("returns consistent results for same input", () => {
			assert.equal(sha256("hello"), sha256("hello"));
		});

		it("returns different results for different inputs", () => {
			assert.notEqual(sha256("hello"), sha256("world"));
		});
	});

	describe("sanitize", () => {
		it("lowercases input", () => {
			assert.equal(sanitize("MyRepo"), "myrepo");
		});

		it("replaces special characters with underscores", () => {
			assert.equal(sanitize("my.repo@name"), "my_repo_name");
		});

		it("collapses multiple underscores", () => {
			assert.equal(sanitize("my...repo"), "my_repo");
		});

		it("strips leading and trailing underscores", () => {
			assert.equal(sanitize("_repo_"), "repo");
		});
	});

	describe("getOwnerId", () => {
		it("returns system username by default", () => {
			delete process.env.COGNIS_OWNER_ID;
			const id = getOwnerId({});
			assert.equal(id, os.userInfo().username);
		});

		it("prefers COGNIS_OWNER_ID env var", () => {
			process.env.COGNIS_OWNER_ID = "env-owner";
			const id = getOwnerId({ ownerId: "settings-owner" });
			assert.equal(id, "env-owner");
		});

		it("uses settings.ownerId when env is not set", () => {
			delete process.env.COGNIS_OWNER_ID;
			const id = getOwnerId({ ownerId: "settings-owner" });
			assert.equal(id, "settings-owner");
		});
	});

	describe("getAgentId", () => {
		it("returns claudecode_ prefix with hash", () => {
			const id = getAgentId("/tmp/fake-project");
			assert.match(id, /^claudecode_[a-f0-9]{16}$/);
		});

		it("uses settings.agentId override when provided", () => {
			const id = getAgentId("/tmp/fake", { agentId: "custom-agent" });
			assert.equal(id, "custom-agent");
		});

		it("returns consistent IDs for same cwd", () => {
			const id1 = getAgentId("/tmp/test-project");
			const id2 = getAgentId("/tmp/test-project");
			assert.equal(id1, id2);
		});

		it("returns different IDs for different cwds", () => {
			const id1 = getAgentId("/tmp/project-a");
			const id2 = getAgentId("/tmp/project-b");
			assert.notEqual(id1, id2);
		});
	});

	describe("getRepoAgentId", () => {
		it("returns repo_ prefix with sanitized name", () => {
			// For non-git dirs, falls back to basename
			const id = getRepoAgentId("/tmp/my-project");
			assert.equal(id, "repo_my-project");
		});

		it("uses settings.repoAgentId override when provided", () => {
			const id = getRepoAgentId("/tmp/fake", { repoAgentId: "repo_custom" });
			assert.equal(id, "repo_custom");
		});
	});

	describe("getProjectName", () => {
		it("returns basename for non-git directories", () => {
			const name = getProjectName("/tmp/my-project");
			assert.equal(name, "my-project");
		});
	});
});
