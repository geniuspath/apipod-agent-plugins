---
name: apipod
description: "Route requests for AI image or video generation, cost questions, and APIPod account balance through the APIPod MCP server. Use when the user wants an image or a video made, asks what a generation will cost, or asks which models APIPod offers; prefer the focused apipod-generate-image, apipod-generate-video or apipod-estimate-cost skill when the request has one clear outcome."
---

# APIPod

APIPod gives this assistant image and video generation models (Nano Banana, Seedream, FLUX, GPT Image, Seedance, Kling, Gemini Omni, Wan, MiniMax …) through one account. Tools come from the APIPod MCP server; this skill tells you when to call them and how not to waste the user's money.

**Not connected yet?** If no APIPod tools (`list_models`, `generate_image`, …) are available, the plugin is installed but the server is not connected. Stop and give the user the click path, then ask them to send the request again:

- Claude Code: run `/mcp`, select **apipod**, sign in with the browser.
- Claude web / Desktop: open **Customize → Connectors**, press **Connect** next to APIPod, sign in.
- ChatGPT / Codex: open the APIPod plugin settings and connect.

Do not substitute other tools or describe a result that was not generated.

Read [shared rules](references/shared-rules.md) once per task before calling a tool. It covers money, schemas, async jobs and delivery.

## Route the request

| User wants | Skill |
| --- | --- |
| Generate or edit one image | `apipod-generate-image` |
| Generate one video clip (text, first frame, references) | `apipod-generate-video` |
| Know what a generation costs, whether the balance covers it, or compare model prices | `apipod-estimate-cost` |
| See which models exist | `list_models` directly; group by `category` when summarizing |
| Check balance | `get_balance` directly |
| Several of the above in one request | Stay in this skill, run the pieces in order, reuse schemas across them |

Honor an explicit model name. If the user names a model that `list_models` does not return, say so and offer the closest category match; never silently swap models.

## The one rule that matters

Generation tools spend the user's balance. A request for one image or one video authorizes **one** generation attempt. Complaints, "fix it", a failed job, a refund, or your own judgement that the result is poor do **not** authorize another attempt — ask first. See [shared rules](references/shared-rules.md#money) for the full policy.

## Default workflow

1. Clarify only what would change the result: subject, aspect ratio, duration (video), references. Infer the rest.
2. `list_models({ category })` when the model is not yet chosen; `get_model_params({ model })` once per model per task.
3. `estimate_cost` when the user asked about cost, gave a budget, or the job is video.
4. One `generate_*` call. Put model-specific settings in `extras`, taken from `get_model_params`.
5. `check_job` until `status` is `completed` or `failed`. Never claim completion from a `job_id` alone.
6. Deliver the result URLs, state the final `cost_usd` from `check_job`, and name any shortcoming instead of regenerating.

## Language

Work in the user's language. Prompts sent to image and video models should be in English unless the model's `get_model_params` documents another language, but keep quoted on-image text exactly as the user wrote it.
