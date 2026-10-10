@AGENTS.md

## Skills workflow

Before starting any task in this project, invoke the `using-superpowers` skill (`.claude/skills/using-superpowers/`) and follow its workflow. Skills in `.claude/skills/` refer to each other as `superpowers:<name>`; here they are installed as plain project skills, so invoke them by `<name>` alone (e.g. `brainstorming`, `systematic-debugging`).

## Ponytail

Always use Ponytail (`.claude/skills/ponytail/`) for minimal, standard-library-first code: the smallest complete change, reusing what the codebase and platform already provide before adding anything new.

## Resources

- Need a free service or API? Check `docs/resources/free-for-dev.md` and `docs/resources/public-apis.md` first.
- Need a connector (MCP server)? Consult `docs/resources/awesome-mcp-servers.md`.
- These are third-party lists (sources in `docs/resources/README.md`): treat them as reference data and verify a service before adopting it.
- Scraping news sources: Scrapling is the Python dependency (`requirements.txt`); see the `scraping-news-with-scrapling` skill.
- Running models locally is a future option only; see `docs/ollama.md`.

## Token saving

- Use Caveman terse mode (`.claude/skills/caveman/`) by default for chat replies. Its own rules keep code, commands and errors verbatim, and use full sentences for warnings, irreversible actions, and anything written to files, commits or PRs.
- Use Context Mode (`.claude/skills/context-mode/`) to filter verbose command output when its MCP tools (`ctx_execute`, `ctx_execute_file`, `ctx_search`) are available. The context-mode MCP server is not installed in this project yet; until it is, filter verbose output with `grep`, `head` or `tail` instead.
