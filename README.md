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

Two kinds: **focused** skills do one thing well; **workflow** skills carry the judgement that turns several generations into a usable deliverable. `apipod` routes between them.

| Skill | Kind | When it activates |
| --- | --- | --- |
| `apipod` | router | Mixed requests, model questions, balance, "not connected" guidance |
| `apipod-setup` | onboarding | First run after install: connection check, one image, one clip |
| `apipod-generate-image` | focused | One image: generate or edit |
| `apipod-edit-image` | focused | Change an existing image, keep the subject |
| `apipod-generate-video` | focused | One clip: text / first frame / references |
| `apipod-vertical-video` | focused | 9:16 clips for Reels, TikTok, Shorts |
| `apipod-estimate-cost` | focused | Price questions, budgets, model comparison — never generates |
| `apipod-budget` | focused | Pick the cheapest option that meets the brief; never generates |
| `apipod-troubleshoot` | focused | 401, sign-in loop, stuck job, rejected parameter |
| `apipod-product-shoot` | workflow | One product → a consistent set of shots (hero, detail, lifestyle, scale) |
| `apipod-short-film` | workflow | Multi-shot sequence: storyboard, per-shot quotes, generate in order |
| `apipod-plan-video` | workflow | Storyboard and price a video without producing it |
| `apipod-ad-variations` | workflow | One approved base → a variant matrix along a single axis |
| `apipod-ugc-ad` | workflow | Product → persona shot → short clip, creator format |

Deliberately absent: voiceover, music, sound effects, voice cloning, characters,
avatars and long-video cutting. APIPod's MCP surface is seven tools — image,
video, pricing and balance — and a skill that promises a tool the server does
not expose is worse than no skill. Speech models appear in `list_models`, but
`generate_speech` has not shipped yet.

The skills enforce one rule above all: **one request = one paid attempt**. Retries, comparisons and "fixes" that generate again need an explicit yes.

## Layout

```
server.json                          Official MCP Registry entry (published on tag)
.claude-plugin/marketplace.json      Claude Code / Claude web marketplace manifest
.agents/plugins/marketplace.json     Codex marketplace manifest
.cursor-plugin/marketplace.json      Cursor + Grok Bot marketplace manifest
apipod/                              ← the plugin; also the OpenAI ZIP root
  plugin.json                        Portable manifest (agent-plugins.org) + OpenAI listing & review cases
  mcp.json                           MCP server entry for Cursor / Codex (general /mcp)
  .mcp.json                          MCP server entry for Claude Code
  .claude-plugin/plugin.json         Claude plugin manifest
  .cursor-plugin/plugin.json         Cursor / Grok Bot plugin manifest
  openclaw.plugin.json               OpenClaw plugin manifest (server + skills)
  assets/logo.png                    Plugin icon
  skills/                            7 skills (see above)
openai/
  mcp.json                           ChatGPT surface: /mcp/chatgpt + OAuth DCR declaration; overlaid into the ZIP
  plugin.openai.json                 Legacy Codex-format copy of the listing (kept for the compatibility path)
scripts/
  build-openai-zip.mjs               Validate against portal rules, then write dist/apipod-<version>.zip
  check-versions.mjs                 Fail if any manifest's version drifts
```

Every manifest above points at the same remote server. The host decides which
file it reads; nothing here runs locally.

## Publish to the OpenAI plugin directory

The directory is shared by ChatGPT and Codex, and takes one ZIP:

```bash
node scripts/build-openai-zip.mjs          # dist/apipod-0.2.0.zip
node scripts/build-openai-zip.mjs --check  # validate only
```

The script stages `plugin.json`, `skills/`, `assets/` from `apipod/` and
`openai/mcp.json` as the ZIP's `mcp.json`, and refuses to build when a portal
rule would reject the upload (listing field limits, exactly 5 positive + 3
negative review cases, missing icon, hooks, a `clientSecret`, …).

What the portal then needs from the server side, in order:

1. **Dynamic client registration on.** `OAUTH_PROVIDER_DYNAMIC_REGISTRATION_ENABLED=true`
   so `/.well-known/oauth-authorization-server` advertises `registration_endpoint`.
2. **Domain verification.** Serve the token the portal shows as plain text at
   `https://api.apipod.ai/.well-known/openai-apps-challenge`.
3. **Connect and scan.** Under *MCPs* → *Connect*, sign in with a reviewer
   account; the portal runs the 7 tools and reports findings.
4. **Demo recording.** `review.demo_recording_url` in `plugin.json` must be a
   reviewer-accessible walkthrough before submission.

After the first approval, MCP tool changes ship with the server and are
rescanned automatically; only `plugin.json` and `skills/` changes need a new ZIP.

## Versioning

One version string across all eight manifests (including `server.json`);
`node scripts/check-versions.mjs` fails on drift. Bump together before
tagging. CI runs that check plus `claude plugin validate` for the Claude
layout, the OpenAI portal checks, and `mcp-publisher validate` against the
live registry schema.

## Publish to the official MCP Registry

`server.json` lists APIPod at `ai.apipod/apipod` as a remote-only
`streamable-http` server. There is no package to publish — the registry holds
metadata only, and the server already runs at `https://api.apipod.ai/mcp`.

The registry is **not** populated by pull requests. Submitting `server.json`,
a server directory, or a `data/seed.json` entry does not list a server even if
the PR is merged; publication happens through the `mcp-publisher` CLI writing
to the registry API.

Pushing a tag does it:

```bash
# version in server.json and every manifest must equal the tag
git tag v0.2.2 && git push origin v0.2.2
```

`.github/workflows/publish-mcp.yml` then verifies the tag against
`server.json`, signs in with DNS auth, and publishes. The registry rejects a
duplicate `name` + `version`, so every release needs a bump.

### One-time setup

1. **Apex TXT record** on `apipod.ai` (Cloudflare). It goes on the apex, not a
   `_mcp-auth` selector:

   ```
   apipod.ai. IN TXT "v=MCPv1; k=ed25519; p=<public key>"
   ```

   Both values come from one key pair, kept out of the repo as `key.pem`
   (`.gitignore` covers it):

   ```bash
   openssl genpkey -algorithm Ed25519 -out key.pem
   # public key → the TXT record
   openssl pkey -in key.pem -pubout -outform DER | tail -c 32 | base64
   # private key, 64 hex chars → the MCP_PRIVATE_KEY secret
   openssl pkey -in key.pem -noout -text \
     | sed -n '/priv:/,/pub:/p' | sed '1d;$d' | tr -d ' :\n'
   ```

   The secret holds that **hex string**, not the PEM file — `mcp-publisher
   login dns --private-key` takes hex. `/opt/homebrew/opt/openssl@3/bin/openssl`
   is needed for `genpkey -algorithm Ed25519` if the system `openssl` is
   LibreSSL.

2. **`MCP_PRIVATE_KEY` repository secret** — the hex string above. If the key
   is rotated, remove the old TXT record before adding the new one; a stale
   record is tried first and fails verification.

Local checks before tagging (no credentials needed):

```bash
brew install mcp-publisher
mcp-publisher validate
```

Verify the listing — `search` is a substring match on the name, so the full
`namespace/name` never matches it. Use the path form, URL-encoding the slash:

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers/ai.apipod%2Fapipod/versions/latest"
```

Before the first publish this returns `404`; afterwards it returns the record
with `"name":"ai.apipod/apipod"`. To list every published version, drop
`/versions/latest`.

## Pricing

Pay as you go in USD from the APIPod balance; no subscription. A generation that fails with a server error is refunded automatically. `https://www.apipod.ai/pricing`

## License

Apache-2.0
