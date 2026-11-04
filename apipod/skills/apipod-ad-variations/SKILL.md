---
name: apipod-ad-variations
description: "Produce several ad variants — one product, different hooks, crops and angles — from a single approved image, with the APIPod MCP server. Use when the user wants options to test, versions for different platforms, or a variant matrix. Not for one image (use apipod-generate-image) or for video."
---

# Ad variations

Read [shared rules](../apipod/references/shared-rules.md) once per task. If APIPod tools are missing, follow the "Not connected yet?" steps in the `apipod` skill.

Variations only make sense against a fixed base. The base is one approved image plus one written angle; a variant changes **one** thing about it.

## Establish the base

1. Ask for or settle the base image — an existing photo, or generate one first (`apipod-generate-image`). Do not start a variant matrix from a prompt you have not seen rendered.
2. Write the base spec in one sentence: subject, surface, light, colour grading, framing, and any on-image text (quote it verbatim).
3. Settle the **axis of variation** — exactly one per matrix:
   - **angle** (front / 3⁄4 / top-down)
   - **hook** (the line of copy or lack of it)
   - **crop** (feed 4:5, story 9:16, banner 16:9)
   - **context** (studio / lifestyle / season)

## Generate the matrix

1. Size it before spending: `estimate_cost` per cell and show the total. Three variants × two crops is six paid generations — say the number out loud.
2. Vary only the chosen axis. Everything from the base spec goes into every prompt unchanged, and the approved base goes in `image_urls`. Changing angle *and* hook *and* crop produces images that cannot be compared, which defeats the point.
3. `check_job` per image. Grid the results by variant so the user can compare like for like.

## Delivery

- Present a grid — one row per variant, one column per channel — with the axis value labelling each cell.
- Report the total `cost_usd` and the cost per variant, so a user can see what testing costs.
- Say which variant looks strongest for the stated channel and why, in one sentence. If you cannot see the images, say that instead.
- Do not silently fill a slot with a different model because one failed; report the failure and its refund.

## Prompt shape

Base, then the single delta: *"[base spec]. Same object, same surface, same light. Change: camera moves to a top-down view. No text."*
