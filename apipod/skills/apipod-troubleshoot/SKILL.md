---
name: apipod-troubleshoot
description: "Diagnose an APIPod MCP problem from the symptoms: tools not listed, sign-in loop, 401, insufficient balance, a job stuck in processing, a rejected parameter. Use when a call failed or the connection looks broken. For a normal generation request use the matching skill."
---

# Troubleshoot

Read [shared rules](../apipod/references/shared-rules.md) once per task.

Work from the symptom to the cause. Ask for the exact error text before theorising, and never ask the user to paste an access token — it is a credential, and you do not need it.

## Symptom: no APIPod tools available

Distinguish two cases:

- **Plugin installed, server not connected.** The host lists the plugin but no tools. Give the click path for that host (see the `apipod` skill) and stop.
- **No plugin at all.** The user added the URL to the wrong place, or never added it. Point at the `/agent` page on the website for their client, or `https://api.apipod.ai/mcp`.

## Symptom: sign-in loop, or a request keeps returning 401

1. Check that the client reached the discovery documents: `GET https://api.apipod.ai/.well-known/oauth-protected-resource/mcp` should return `resource: https://api.apipod.ai/mcp`. If it 404s, the client is on a stale URL.
2. Hosted clients must redirect to an allowlisted domain; a client whose redirect host is not on the list gets `invalid_redirect_uri` at registration. Report the exact host to the user — adding it is an operator change, not something to work around.
3. CLI clients redirect to `localhost` on an ephemeral port. If the browser finishes but the CLI never receives the code, the port was likely taken; retrying the login is the fix.
4. If the sign-in page itself appears every time, the grant may not be persisting. Tell the user to check their console's authorized apps and revoke the stale entry, then reconnect.

## Symptom: generation refused

- **`insufficient balance`.** Say the number, say what was quoted, and that no charge was made. On the general surface `get_balance` includes a `topup_url`; on ChatGPT it does not, so point at the website.
- **`invalid parameter` / a dropped setting.** Fetch `get_model_params` again for that model and compare the field name and enum exactly. Unknown keys are dropped silently by the server, so a setting can vanish without an error: verify it appears in the response, do not assume it applied.
- **Model not in `list_models`.** It is not available on this account. Offer the closest listed model; never silently substitute.

## Symptom: a job stays `processing`

`check_job` returns `pending`, `processing`, `completed` or `failed`. Keep polling (10 s for video, 3–5 s for images). A job that never leaves `processing` eventually times out server-side and is refunded; if the user is waiting, say what the timeout is and that the charge comes back. Do not start a second generation to "unstick" it — that is a second paid attempt.

## Symptom: the result is wrong, not broken

That is not a connection problem. Say what is off, propose one concrete prompt or setting change, and ask before generating again.

## Reporting a suspected server bug

Collect, without credentials: the tool name, the arguments you sent, the exact error text, the `job_id` if any, and the approximate time. Point the user at the APIPod console request log (entries appear with `path=/mcp`) or the support address on the website.
