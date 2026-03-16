---
name: index
description: Index the current codebase and save a summary to Cognis memory for future reference.
---

# Codebase Indexing

Analyze the current project and save a structured summary to Cognis memory.

## Steps

1. **Detect the project ecosystem** by examining files in the current directory:
   - Check for `package.json` (Node.js/JavaScript)
   - Check for `requirements.txt`, `pyproject.toml`, `setup.py` (Python)
   - Check for `go.mod` (Go)
   - Check for `Cargo.toml` (Rust)
   - Check for `pom.xml`, `build.gradle` (Java/Kotlin)
   - Check for `Gemfile` (Ruby)
   - Check for `*.sln`, `*.csproj` (C#/.NET)

2. **Examine project structure**: List key directories, entry points, config files.

3. **Identify key patterns**: Framework, architecture (MVC, microservices, etc.), testing approach, CI/CD setup.

4. **Create a structured summary** covering:
   - Project name and description
   - Tech stack and ecosystem
   - Directory structure overview
   - Key entry points and modules
   - Build/run/test commands
   - Notable patterns and conventions

5. **Save to Cognis** using the bash script:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/save-project-memory.cjs" "THE SUMMARY CONTENT"
```

For long summaries, pipe via stdin:
```bash
echo "THE SUMMARY CONTENT" | node "${CLAUDE_PLUGIN_ROOT}/scripts/save-project-memory.cjs"
```

6. Confirm what was indexed and saved.
