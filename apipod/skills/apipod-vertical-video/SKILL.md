---
name: apipod-vertical-video
description: "Generate a vertical 9:16 clip for Reels, TikTok, Shorts or a story with the APIPod MCP server: framing that survives the UI, safe areas, and a duration that loops. Use when the target is a vertical feed. For horizontal footage or a sequence, use apipod-generate-video or apipod-short-film."
---

# Vertical video

Read [shared rules](../apipod/references/shared-rules.md) once per task. If APIPod tools are missing, follow the "Not connected yet?" steps in the `apipod` skill.

Vertical is not a crop of horizontal. The subject has to be composed for a tall frame, and the platforms cover the bottom of it with captions and buttons.

## Before generating

1. Confirm the surface: Reels, TikTok, Shorts or Story. They differ in safe area, and a Story usually wants 15 s or less.
2. Confirm whether the clip needs to loop. A loop changes the last frame as much as the first: it should end where it started.
3. Check the model supports the aspect: `get_model_params` and read the `aspect_ratio` enum. If `9:16` is absent, say which ratios exist and let the user choose — do not silently produce 16:9.

## Compose for the frame

- Put the subject in the **middle third** vertically. The bottom ~20% and top ~10% get covered by platform UI.
- No thin text near the edges: it will be clipped or hidden. If the user wants on-screen text, generate it without text and add the text in an editor.
- Movement direction: vertical pans and push-ins read better than horizontal wipes in a tall frame.
- One idea per clip. Vertical feeds are watched without sound and without context.

## Generate

1. `estimate_cost({ model, dimensions: { duration: "5", resolution: "1080p" } })` — vertical often costs more pixels per frame; quote it.
2. One `generate_video` with `aspect_ratio: "9:16"`, duration from the model's allowed values, the composed prompt.
3. `check_job` every 10 s. Video takes 1–5 minutes.
4. Deliver the URL with its real duration and cost.

## What this skill does not do

Editing an existing long video into vertical clips is not supported: APIPod generates clips, it does not cut or reframe footage. If the user has a long video and wants highlights, say so plainly and offer to generate new vertical footage instead.
