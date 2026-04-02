/**
 * HTTP error mapping for Cognis API responses.
 */

function mapHttpError(status, body) {
	switch (status) {
		case 401:
			return "Authentication failed — run /claude-cognis:project-config to re-configure, or check your LYZR_API_KEY.";
		case 403:
			return "Access denied — your API key may not have permissions for this resource.";
		case 404:
			return "Resource not found — the Cognis API endpoint may have changed.";
		case 422:
			return `Validation error — ${typeof body === "object" ? JSON.stringify(body) : body}`;
		case 429:
			return "Rate limited — will retry next session.";
		default:
			if (status >= 500) {
				return "Cognis service temporarily unavailable — memories will sync next session.";
			}
			return `Unexpected error (HTTP ${status})`;
	}
}

class CognisApiError extends Error {
	constructor(status, body) {
		super(mapHttpError(status, body));
		this.name = "CognisApiError";
		this.status = status;
		this.body = body;
	}
}

module.exports = { mapHttpError, CognisApiError };
