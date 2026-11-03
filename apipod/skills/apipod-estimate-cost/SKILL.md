---
name: apipod-estimate-cost
description: "Quote what an APIPod image or video generation will cost, check whether the account balance covers it, or compare models by price — without generating anything. Use when the user asks \"how much\", sets a budget, or wants the cheapest option."
---

# Estimate Cost

Read [shared rules](../apipod/references/shared-rules.md) once per task. This skill never calls `generate_*`.

## Workflow

1. Resolve the model: an explicit name, or `list_models({ category })` and pick the candidates the user is choosing between.
2. `get_model_params({ model })` to learn which fields drive price (`duration`, `resolution`, `quality`, `n`, audio flags). Dimensions you omit take the model's defaults.
3. `estimate_cost({ model, dimensions, has_video_input })`:
   - `dimensions` is a string map of the planned settings, e.g. `{"duration":"10","resolution":"1080p"}` or `{"n":"4","quality":"2K"}`.
   - `has_video_input: true` when a reference video will be supplied; some models bill it extra.
4. Read the result: `estimated_usd`, `balance_usd`, `sufficient`, and `is_pre_deduct` (true means the model bills by actual usage; the estimate is reserved and settled after completion — say so).
5. Answer in one line per option: model, settings, price, and whether the balance covers it. For comparisons, list from cheapest and note what the cheaper option gives up (resolution, duration cap, audio).

## When the balance is short

Say the shortfall plainly. On the general MCP surface `get_balance` returns a `topup_url` you may share. On ChatGPT it does not; tell the user to add funds on the APIPod website, then ask again.

## Do not

- Do not generate "to check the real price". The estimate uses the same pricing as generation.
- Do not invent prices for models or settings that `estimate_cost` rejected; report the error and ask what to adjust.
- Do not quote `pricing.md` or memory when the tool is available — the tool applies the user's own discounts.
