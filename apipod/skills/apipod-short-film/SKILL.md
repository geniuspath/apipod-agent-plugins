---
name: apipod-short-film
description: "Plan and generate a multi-shot short video — storyboard, per-shot quotes, continuity across shots — with the APIPod MCP server. Use when the user asks for a sequence, a scene, an ad, or a short film rather than a single clip. Not for one clip (use apipod-generate-video) or for stills only."
---

# Short film

Read [shared rules](../apipod/references/shared-rules.md) once per task. If APIPod tools are missing, follow the "Not connected yet?" steps in the `apipod` skill.

Video is the expensive surface: a 5-shot sequence at 1080p can cost more than fifty images. The whole job is to agree on the plan before spending.

## Plan first — in text, not in video

1. Turn the request into a shot list of 3–5 shots. For each: **what happens**, camera (angle, movement), duration, and what carries continuity (the character look, wardrobe, prop, location, time of day).
2. Name the continuity anchor explicitly. Pick the one element that must survive across cuts and decide how: a first-frame image reused as `image_urls`, or a fixed description pinned in every prompt.
3. Show the storyboard as a table — shot, beats, seconds, model. Do not generate yet.

## Cost the whole film, then stop

1. `list_models({ category: "video" })` if no model is named. Read `get_model_params` for duration and resolution enums; do not guess which durations a model supports.
2. `estimate_cost` **per shot** and report the total with the shot list. Say which shots dominate the cost (usually the longest or highest-resolution ones).
3. Wait for an explicit yes. A storyboard the user has not approved is not authorization to spend on five generations.

## Generate, in order

1. Shot 1 by itself. When it completes, show it and confirm the look before continuing — a wrong look multiplied by five is the most expensive mistake in this skill.
2. Later shots reuse the approved frame: pass it in `image_urls` as the first frame, and restate the continuity anchor in the prompt.
3. `check_job` every 10 s per shot. Video takes 1–5 minutes.
4. If a shot fails, relay `error_code` and `error_message`, mention the refund, and ask before retrying.

## Delivery

- Return the permanent URL per shot, in order, with its duration and `cost_usd`.
- **APIPod does not stitch clips.** Do not offer a finished single file. Say plainly that the shots are separate and the user (or an editor) assembles them — unless the user explicitly asks how to concatenate, in which case give the ffmpeg command.
- Total the spend. If the result does not hang together, name the specific cut that breaks (colour, motion direction, speed of action) rather than calling it "not good".

## Storyboard shape

| # | Shot | Camera | s | Anchor |
| --- | --- | --- | --- | --- |
| 1 | Bottle on wet slate, rain hits, label readable | slow push in, low angle | 5 | engraved logo, matte black |
| 2 | Hand lifts the bottle out of frame | macro, follow | 4 | same hand, same sleeve |
