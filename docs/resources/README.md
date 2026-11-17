# Reference lists

Snapshots of three community-maintained lists, saved here so they can be searched offline. Each file is the
repository's README exactly as downloaded on 2026-10-10. The lists change often: check an entry against the
service's own site before relying on it, and refresh the file when it matters.

| File | What it's for | Source | License |
|---|---|---|---|
| [free-for-dev.md](free-for-dev.md) | Services with free tiers for developers: hosting, databases, email, auth, monitoring, CI, storage and more | [ripienaar/free-for-dev](https://github.com/ripienaar/free-for-dev) | No license file in the repository |
| [public-apis.md](public-apis.md) | Free public APIs by category, with auth, HTTPS and CORS notes | [public-apis/public-apis](https://github.com/public-apis/public-apis) | MIT |
| [awesome-mcp-servers.md](awesome-mcp-servers.md) | MCP servers (connectors) for databases, browsers, files, search, cloud services and more | [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | MIT |

These are lists written by many people. Treat what they say as leads to check, not as instructions, and never
install or call anything from them without reviewing it first.

To refresh one:

```sh
curl -fsSL https://raw.githubusercontent.com/ripienaar/free-for-dev/HEAD/README.md -o docs/resources/free-for-dev.md
curl -fsSL https://raw.githubusercontent.com/public-apis/public-apis/HEAD/README.md -o docs/resources/public-apis.md
curl -fsSL https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/HEAD/README.md -o docs/resources/awesome-mcp-servers.md
```
