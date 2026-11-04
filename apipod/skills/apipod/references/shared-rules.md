# Shared rules

Read once when an APIPod workflow starts; reuse across the focused skills in the same task.

## Money

- Every `generate_*` call reserves the estimated price from the user's balance. `check_job` reports the final `cost_usd` on completion; a failed job is refunded automatically.
- One request authorizes one attempt. Before another take, a model comparison, a higher resolution, or a "repair" that means generating again, require an explicit ask for that additional generation. "Generate another version" or "retry once" covers exactly that one attempt. For "keep trying until it's right", agree on a number first.
- Use `estimate_cost` when the user asks about price, balance or affordability, sets a budget, or before any video job the user has not already costed. Share the estimate, then continue if it fits what they asked for. An estimate alone never authorizes generation.
- If `generate_*` returns an insufficient-balance error, stop and tell the user. On the general MCP surface `get_balance` includes a `topup_url` you may share; on ChatGPT it does not — tell the user to add funds on the APIPod website.
- Never change the user's chosen model, duration or resolution to fit a budget without saying so and getting a yes.

## Schemas

- The tool schema (from `tools/list`) defines top-level fields. `get_model_params({ model })` defines that model's own settings. Use both; neither replaces the other.
- Anything not a top-level field goes in `extras` as an object. Copy field names exactly from `get_model_params`; the server drops unknown keys silently rather than erroring.
- Fetch `get_model_params` once per model per task and reuse it. Refresh after a validation error.
- Do not invent tool names, fields, or REST paths. The server exposes only what `tools/list` returns.

## Async jobs

- `generate_image` and `generate_video` return `{ job_id, status }`. Poll `check_job({ job_id })`: every 3–5 s for images, every 10 s for video. Video typically takes 1–5 minutes.
- `status` values: `pending`, `processing`, `completed`, `failed`. Only `completed` has `results[].url`. `failed` carries `error_code` and `error_message`; relay them, and mention the refund.
- A job id is not a result. Never describe or summarize media you have not seen a `completed` status for.

## References and inputs

- `image_urls`, `video_urls` and `audio_urls` accept three forms: a public HTTPS URL, a `data:<mime>;base64,<payload>` URI, or a bare base64 payload with no prefix. Inline payloads are stored to APIPod object storage before the request is logged, so `check_job` and the console always show a permanent URL regardless of what was sent. Everything downstream — job logs, worker retries, cost reports — sees only that URL.
- Prefer a URL when one exists: it costs nothing to pass. Inline base64 travels through the conversation as text and is billed as tokens on both sides, so keep it to small images. Never paste a multi-megabyte photo as base64 when the user can hand you a link or a file the host already exposes.
- A bare payload must be the raw media itself. The server identifies it by decoding the header and matching a known image/video/audio container; anything else — a token, a JWT, base64 of an HTML page — is passed through unchanged and will fail at the provider. Do not hand-encode documents.
- If the user attached a file and the host exposes a download URL for it (ChatGPT file params do), send that URL rather than re-encoding the bytes.
- `image_urls` carries references. The first entry is the primary (first frame for video, source for edits) unless the model's parameters say otherwise.

## Delivery

- Return the permanent URLs from `check_job`. They do not expire.
- State the final cost from `check_job.cost_usd`, not the estimate.
- Inspect what you can (the host may render the image inline). If you cannot view the output, say so rather than asserting quality.
- Name shortcomings plainly and propose one focused revision; do not run it without a yes.
