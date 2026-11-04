---
name: apipod-plan-video
description: "Plan a video without generating it: shot list, durations, models and a per-shot price total, ending in an approved plan the user can execute later. Use when the user asks to storyboard, budget or scope a video, or before an expensive multi-shot job. Does not generate clips — use apipod-short-film to produce."
---

# Plan a video

Read [shared rules](../apipod/references/shared-rules.md) once per task. If APIPod tools are missing, follow the "Not connected yet?" steps in the `apipod` skill.

Planning is free: `list_models`, `get_model_params` and `estimate_cost` cost nothing. Producing does not. Keep the two separate unless the user asks for both.

## 1. Settle the scope

Ask only what you cannot infer: total length, aspect ratio, whether it needs audio, and where it will run (feed, story, landing page). If the user gave a reference or a script, use it as-is instead of inventing a new concept.

## 2. Build the shot list

A table, one row per shot:

| # | Beat | Camera | Seconds | Model | Est. USD |
| --- | --- | --- | --- | --- | --- |

Rules that make the list usable:

- 3–5 shots. A single shot is not a plan; ten is a budget nobody approved.
- Every shot states what carries continuity across cuts — the product, the person, the location.
- Durations must be values the model actually accepts: read `get_model_params` for the duration enum, do not round to a number you assume exists.
- Name the model per shot, and say why in one clause when it differs from the default.

## 3. Price the whole thing

Call `estimate_cost` per shot and put the real numbers in the table, then state the total. Call out the shot that dominates the cost — usually the longest or highest resolution one. Compare against `get_balance` and say plainly whether the plan fits.

## 4. Stop and hand over

Deliver the table plus a one-line summary ("4 shots, 20 s, 16:9, ~$2.40"). Say explicitly that nothing has been generated.

If the user approves, `apipod-short-film` executes this plan. If they want it cheaper, change length or resolution first and re-quote — never silently downgrade the model.

## What not to do

- Do not call `generate_video` in this skill, even partially ("just the first shot"). A plan the user has not approved is not authorization to spend.
- Do not invent prices. Every number in the table comes from `estimate_cost`.
