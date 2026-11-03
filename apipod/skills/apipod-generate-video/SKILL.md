---
name: apipod-generate-video
description: "Generate one video clip with the APIPod MCP server: text-to-video, animate a still (first frame), first+last frame, or reference-guided clips. Use for a single-clip request. Not for images or for cost-only questions."
---

# Generate Video

Read [shared rules](../apipod/references/shared-rules.md) once per task. If APIPod tools are missing, follow the "Not connected yet?" steps in the `apipod` skill.

Video is the most expensive thing this plugin does. Unless the user already approved a cost, run `estimate_cost` first and show the number before `generate_video`.

## Choose a model

- Call `list_models({ category: "video" })` when the user has not named a model. Pick by the job:
  - **Default, native audio, general scenes:** Gemini Omni if listed, otherwise Seedance.
  - **Premium cinematic, long clips, many references:** Seedance 2.x.
  - **Multi-shot, element references, motion control:** Kling.
  - **Cheap drafts / iteration:** a "lite", "fast" or "flash" variant from the same family.
- Honor an explicit model name. If it is not listed, say so and offer the closest listed one.
- `get_model_params({ model })` once. Read `duration` enum, `resolution` enum, `aspect_ratio`, audio flags (`generate_audio`), reference arrays (`video_urls`, `audio_urls`), and draft options.

## Reference-first for new footage

A still the user has seen is a better start than a prompt the model interprets. Unless the user asked for direct text-to-video, supplied a ready first frame, or is editing footage:

1. Make one keyframe with `apipod-generate-image` at the video's aspect ratio (identity, product, location locked in).
2. Show it; on approval pass it as `image_urls[0]` to `generate_video`.

Tell the user this adds one image generation before the video; skip it when they say go.

## Workflow

1. Define: purpose, aspect ratio, duration, subject, one primary action, one camera move, sound or dialogue, how it ends.
2. `estimate_cost({ model, dimensions: { duration: "5", resolution: "720p" }, has_video_input })`. Show it. Proceed only if it fits what the user asked for.
3. One `generate_video` call:
   - `model`, `prompt` (chronological: opening frame → action → camera → environment motion → audio → ending; exclusions last).
   - `duration`, `aspect_ratio`, `resolution` from the model's enums.
   - `image_urls` for first frame / first+last / references; `extras.video_urls`, `extras.audio_urls` when the model supports them.
   - `extras` for `generate_audio`, `camera_fixed`, `seed`, draft flags, Kling multi-shot fields, …
4. `check_job({ job_id })` every 10 s. Video takes 1–5 minutes; say so once, then keep polling.
5. Deliver the URL, the final `cost_usd`, and a plain note on identity, motion, timing, audio sync. One take per request — propose a revision, run it only on a yes.

## Prompt shape

One subject action and one camera idea per clip. Describe what happens over time, not adjectives. Quote dialogue exactly and only when the model generates speech; keep scene numbers and production notes out of the prompt (speech models read them aloud). About 2.5 words per clip second for dialogue.

## Drafts

When the model exposes a lower-resolution or "draft" option (see `get_model_params`), offer it for the first take on long or expensive clips; finalize at full resolution only after the user approves the draft.
