const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { mapHttpError, CognisApiError } = require("../src/lib/error-helpers");

describe("error-helpers", () => {
	describe("mapHttpError", () => {
		it("maps 401 to auth error", () => {
			const msg = mapHttpError(401);
			assert.match(msg, /Authentication failed/);
			assert.match(msg, /LYZR_API_KEY/);
		});

		it("maps 403 to access denied", () => {
			const msg = mapHttpError(403);
			assert.match(msg, /Access denied/);
		});

		it("maps 404 to not found", () => {
			const msg = mapHttpError(404);
			assert.match(msg, /not found/);
		});

		it("maps 422 with body details", () => {
			const msg = mapHttpError(422, { detail: "bad field" });
			assert.match(msg, /Validation error/);
			assert.match(msg, /bad field/);
		});

		it("maps 429 to rate limit", () => {
			const msg = mapHttpError(429);
			assert.match(msg, /Rate limited/);
		});

		it("maps 500 to service unavailable", () => {
			const msg = mapHttpError(500);
			assert.match(msg, /temporarily unavailable/);
		});

		it("maps 502 to service unavailable", () => {
			const msg = mapHttpError(502);
			assert.match(msg, /temporarily unavailable/);
		});

		it("maps unknown status with code", () => {
			const msg = mapHttpError(418);
			assert.match(msg, /HTTP 418/);
		});
	});

	describe("CognisApiError", () => {
		it("creates error with status and body", () => {
			const err = new CognisApiError(401, { detail: "invalid key" });
			assert.equal(err.name, "CognisApiError");
			assert.equal(err.status, 401);
			assert.deepEqual(err.body, { detail: "invalid key" });
			assert.match(err.message, /Authentication failed/);
		});

		it("is an instance of Error", () => {
			const err = new CognisApiError(500, "server error");
			assert.ok(err instanceof Error);
		});
	});
});
