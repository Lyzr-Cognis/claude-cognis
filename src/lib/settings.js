/**
 * Global settings management.
 * Settings dir: ~/.cognis-claude/
 * Settings file: ~/.cognis-claude/settings.json
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { loadProjectConfig } = require("./project-config");

const SETTINGS_DIR = path.join(os.homedir(), ".cognis-claude");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");

const DEFAULT_SETTINGS = {
	includeTools: [],
	maxMemoryItems: 5,
	debug: false,
	signalExtraction: false,
	signalKeywords: [
		"remember",
		"architecture",
		"bug",
		"fix",
		"pattern",
		"convention",
		"decision",
		"important",
		"note",
		"todo",
		"caveat",
		"workaround",
	],
	signalTurnsBefore: 3,
};

function loadSettings() {
	let settings = { ...DEFAULT_SETTINGS };

	// Load global settings
	try {
		if (fs.existsSync(SETTINGS_FILE)) {
			const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
			const parsed = JSON.parse(raw);
			settings = { ...settings, ...parsed };
		}
	} catch {
		// Use defaults on error
	}

	return settings;
}

function saveSettings(settings) {
	fs.mkdirSync(SETTINGS_DIR, { recursive: true });
	fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
}

/**
 * Resolve API key from multiple sources.
 * Priority: settings.apiKey > LYZR_API_KEY env > project config > error
 */
function getApiKey(settings, cwd) {
	if (settings.apiKey) return settings.apiKey;
	if (process.env.LYZR_API_KEY) return process.env.LYZR_API_KEY;

	// Try project config
	const projConfig = loadProjectConfig(cwd);
	if (projConfig.apiKey) return projConfig.apiKey;

	return null;
}

/**
 * Load settings merged with project config overrides.
 */
function loadMergedSettings(cwd) {
	const settings = loadSettings();
	const projConfig = loadProjectConfig(cwd);

	// Project config can override certain keys
	if (projConfig.ownerId) settings.ownerId = projConfig.ownerId;
	if (projConfig.agentId) settings.agentId = projConfig.agentId;
	if (projConfig.repoAgentId) settings.repoAgentId = projConfig.repoAgentId;
	if (projConfig.signalExtraction !== undefined)
		settings.signalExtraction = projConfig.signalExtraction;
	if (projConfig.signalKeywords) settings.signalKeywords = projConfig.signalKeywords;

	return settings;
}

/**
 * Check if the current session is in private mode (no cross-session memories).
 * Set COGNIS_PRIVATE=True in the terminal to enable.
 */
function isPrivateSession() {
	const val = process.env.COGNIS_PRIVATE;
	return val !== undefined && val.toLowerCase() === "true";
}

module.exports = {
	SETTINGS_DIR,
	SETTINGS_FILE,
	DEFAULT_SETTINGS,
	loadSettings,
	saveSettings,
	getApiKey,
	loadMergedSettings,
	isPrivateSession,
};
