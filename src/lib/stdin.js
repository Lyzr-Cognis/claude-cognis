/**
 * Hook I/O helpers — reads JSON from stdin, writes JSON to stdout.
 * Claude Code hook protocol: hook receives JSON on stdin, returns JSON on stdout.
 */

function readStdin() {
	return new Promise((resolve, reject) => {
		let data = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk) => {
			data += chunk;
		});
		process.stdin.on("end", () => {
			try {
				resolve(JSON.parse(data));
			} catch {
				resolve({});
			}
		});
		process.stdin.on("error", reject);
	});
}

function writeOutput(obj) {
	console.log(JSON.stringify(obj));
}

module.exports = { readStdin, writeOutput };
