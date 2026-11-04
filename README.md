# APIPod for AI assistants

Generate images and video inside Claude, Claude Code, ChatGPT, Codex, Cursor, Grok and OpenClaw through one APIPod account — no provider API keys.

This repository is a **plugin marketplace**: it holds the manifests and skills that point an assistant at APIPod's remote MCP server. There is no runtime code here; every tool lives on the server.

## Install

### Claude Code

```bash
claude plugin marketplace add geniuspath/apipod-agent-plugins
claude plugin install apipod@apipod-agent-plugins
```

Then run `/mcp`, select **apipod**, and sign in with the browser.

### Claude web / Desktop

Add a custom connector with the URL `https://api.apipod.ai/mcp` (Customize → Connectors), sign in, and start a new chat. The skills in this repo are optional there; the server's own instructions cover the basics.

### ChatGPT

Add a custom connector with the URL `https://api.apipod.ai/mcp/chatgpt` (Settings → Connectors → Advanced, developer mode), sign in, then start a chat. The `/chatgpt` surface keeps top-up links out of the conversation.

### Codex

```bash
codex plugin marketplace add geniuspath/apipod-agent-plugins
codex plugin add apipod@apipod-agent-plugins
```

Or register the server directly:

```bash
codex mcp add apipod --url https://api.apipod.ai/mcp
codex mcp login apipod
```

### Cursor

Add the server to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (all projects):

```json
{ "mcpServers": { "apipod": { "url": "https://api.apipod.ai/mcp" } } }
```

Then open Settings → MCP, click **apipod**, and sign in. Cursor completes OAuth in the app; no client ID to paste.

### Grok

At `grok.com` → Settings → Connectors → **New connector → Custom**, paste `https://api.apipod.ai/mcp` and sign in. Grok Bot accepts remote MCP servers only.

### OpenClaw

```bash
openclaw mcp set apipod '{"url":"https://api.apipod.ai/mcp","transport":"streamable-http","auth":"oauth"}'
openclaw mcp login apipod
```

### Any MCP client

```json
{ "mcpServers": { "apipod": { "type": "http", "url": "https://api.apipod.ai/mcp" } } }
```

OAuth 2.1 with PKCE; scopes `profile email`. Metadata: `https://api.apipod.ai/.well-known/oauth-authorization-server`.

## What you get

| Tool | Purpose |
| --- | --- |
| `list_models` | Image / video / speech models available on the account |
| `get_model_params` | A model's request schema (enums, defaults) |
| `estimate_cost` | Price a generation before running it; compares against balance |
| `get_balance` | Remaining balance |
| `generate_image` | Text-to-image and image editing → `job_id` |
| `generate_video` | Text / image / reference → video → `job_id` |
| `check_job` | Poll a job until `completed`; returns permanent URLs and final cost |

Live catalog: `https://api.apipod.ai/mcp/catalog`. Prices: `https://www.apipod.ai/pricing.md`.

## Skills

| Skill | When it activates |
| --- | --- |
| `apipod` | Router: mixed requests, model questions, balance, "not connected" guidance |
| `apipod-generate-image` | One image: generate or edit |
| `apipod-generate-video` | One clip: text / first frame / references, reference-first workflow |
| `apipod-estimate-cost` | Price questions, budgets, model comparison — never generates |

The skills enforce one rule above all: **one request = one paid attempt**. Retries, comparisons and "fixes" that generate again need an explicit yes.

## Layout

```
.claude-plugin/marketplace.json      Claude Code / Claude web marketplace manifest
.agents/plugins/marketplace.json     Codex marketplace manifest
.cursor-plugin/marketplace.json      Cursor + Grok Bot marketplace manifest
apipod/
  .claude-plugin/plugin.json         Claude plugin manifest
  .cursor-plugin/plugin.json         Cursor / Grok Bot plugin manifest
  plugin.json                        Codex plugin manifest (agent-plugins.org schema)
  openclaw.plugin.json               OpenClaw plugin manifest (server + skills)
  .mcp.json                          MCP server entry for Claude Code / Codex
  mcp.json                           MCP server entry for Cursor (streamable-http)
  assets/logo.png                    Plugin icon used by Cursor and Codex
  skills/apipod/SKILL.md             Router skill + references/shared-rules.md
  skills/apipod-generate-image/
  skills/apipod-generate-video/
  skills/apipod-estimate-cost/
openai/
  mcp.json                           ChatGPT surface (record only; the portal binds the server)
  plugin.openai.json                 Listing + review cases for the OpenAI portal
```

Every manifest above points at the same remote server. The host decides which
file it reads; nothing here runs locally.

## Versioning

One version string, repeated in all six manifests. Bump them together before
tagging; `claude plugin validate .` and `claude plugin validate apipod` are the
two local checks.

## Pricing

Pay as you go in USD from the APIPod balance; no subscription. A generation that fails with a server error is refunded automatically. `https://www.apipod.ai/pricing`

## License

Apache-2.0
