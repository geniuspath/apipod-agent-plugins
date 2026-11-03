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

- Reference images must be public HTTPS URLs. If the user attached a file, upload it to a public location first or ask for a URL; APIPod does not accept base64 through MCP.
- `image_urls` carries references. The first entry is the primary (first frame for video, source for edits) unless the model's parameters say otherwise.

## Delivery

- Return the permanent URLs from `check_job`. They do not expire.
- State the final cost from `check_job.cost_usd`, not the estimate.
- Inspect what you can (the host may render the image inline). If you cannot view the output, say so rather than asserting quality.
- Name shortcomings plainly and propose one focused revision; do not run it without a yes.
