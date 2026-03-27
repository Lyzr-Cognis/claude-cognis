const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const SRC_DIR = path.join(__dirname, "src");
const OUT_DIR = path.join(__dirname, "scripts");

// Each top-level .js in src/ becomes an entry point
const entryPoints = fs
	.readdirSync(SRC_DIR)
	.filter((f) => f.endsWith(".js") && !fs.statSync(path.join(SRC_DIR, f)).isDirectory())
	.map((f) => path.join(SRC_DIR, f));

async function build() {
	// Ensure output directory exists
	fs.mkdirSync(OUT_DIR, { recursive: true });

	await esbuild.build({
		entryPoints,
		bundle: true,
		platform: "node",
		target: "node18",
		format: "cjs",
		outdir: OUT_DIR,
		outExtension: { ".js": ".cjs" },
		minify: false,
		sourcemap: false,
		conditions: ["node", "import"],
	});

	console.log(
		`Built ${entryPoints.length} scripts → ${path.relative(process.cwd(), OUT_DIR)}/`,
	);
}

build().catch((err) => {
	console.error(err);
	process.exit(1);
});
