---
name: apipod-edit-image
description: "Change an existing image — background, lighting, product placement, style — while keeping the subject intact, with the APIPod MCP server. Use when the user supplies an image and asks for a modification rather than a new picture. For text-to-image, use apipod-generate-image."
---

# Edit an image

Read [shared rules](../apipod/references/shared-rules.md) once per task. If APIPod tools are missing, follow the "Not connected yet?" steps in the `apipod` skill.

An edit is a two-part instruction: what changes, and what must not. Most bad edits come from leaving the second part out.

## Identify the source

- The image must be a public HTTPS URL. If the user attached a file instead, say that APIPod takes URLs over MCP and ask for a link (or have them upload it in the console and paste the returned URL). Never send base64.
- If several images are given, the first is the source unless the user says otherwise.

## Choose the model

Call `list_models({ category: "image" })` and pick one whose `input_types` includes `image`. Then `get_model_params` once and read its editing fields — some models want the strength of the change, some take a mask, some take multiple references. Do not assume the field names; copy them exactly into `extras`.

## Build the prompt

Two sentences, in this order:

1. **The change**, concretely: "Replace the background with a beach at golden hour."
2. **What stays**: "Keep the bottle's shape, label text and reflections unchanged."

Then the invariants that matter for this image: framing, colour of the subject, any legible text (quote it verbatim). Add "no additional objects" if the user did not ask for any.

## Generate

1. `estimate_cost` if the user asked about price or set a budget.
2. One `generate_image` with `image_urls: [source]`, the prompt above, and the model's own settings via `extras`.
3. `check_job` every 3–5 s until `completed` or `failed`.
4. Show the result next to the source and name what actually changed. If the subject drifted (different label, wrong proportions), say so directly and propose one corrected prompt. Regenerating needs a yes.

## Limits to state plainly

- Text inside an image can be preserved or replaced well by some models and garbled by others. If the user needs exact typography, check the model list rather than promising it.
- Very large changes (a new pose, a new viewpoint) are closer to generation than editing. Say that, and offer `generate_image` from scratch instead.
