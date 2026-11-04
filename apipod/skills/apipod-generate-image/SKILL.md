---
name: apipod-generate-image
description: "Generate one image from a prompt, or edit reference images, with the APIPod MCP server. Use for a clear single-image request: product shot, illustration, social graphic, background swap, style transfer. Not for video or for cost-only questions."
---

# Generate Image

Read [shared rules](../apipod/references/shared-rules.md) once per task. If APIPod tools are missing, follow the "Not connected yet?" steps in the `apipod` skill.

## Choose a model

- Call `list_models({ category: "image" })` when the user has not named a model. Pick by the job:
  - **Default / fast / cheap:** a Nano Banana model (`nano-banana-2`, `nano-banana-2-lite`).
  - **Typography, logos, exact text in the image:** GPT Image or Recraft if listed.
  - **Premium product, fashion, commercial photoreal:** Seedream if listed.
  - **Editing an existing image:** a model whose `input_types` includes `image`; pass the source in `image_urls`.
- Honor an explicit model name. If it is not in `list_models`, say so and offer the closest listed one.
- Call `get_model_params({ model })` once. Read its `input_schema` for resolution/quality enums, `n`, seed, and editing fields.

## Workflow

1. Settle the brief in one pass: subject, style, aspect ratio, on-image text (quote it exactly), and whether references should be edited or only guide the look. Do not turn this into a questionnaire; infer defaults.
2. `estimate_cost({ model, dimensions })` if the user asked about price or gave a budget. Map the planned settings into `dimensions` as strings, e.g. `{"n":"2","resolution":"2K"}`.
3. One `generate_image` call:
   - `model`, `prompt` (English, one scene, concrete nouns, lighting, lens or medium, composition).
   - `aspect_ratio` when the host or platform implies one (`1:1` social, `16:9` thumbnail, `9:16` story).
   - `n` only when the user asked for variants; each costs separately.
   - `image_urls` for references or edit sources — public HTTPS URLs, or inline `data:image/...;base64,...` (the server stores those and swaps in a permanent URL).
   - `extras` for everything else from `get_model_params`: `resolution`, `quality`, `seed`, `output_format`, `background`, …
4. `check_job({ job_id })` every 3–5 s until `completed` or `failed`.
5. Show the result URLs, report `cost_usd`, and name what is off. Propose one targeted change; generate again only on a yes.

## Prompt shape

Describe the picture, not the request: *"Studio product photo of a matte black water bottle on a wet slate surface, soft top light, shallow depth of field, 85mm, no text."* Put negatives at the end as "no …". Keep quoted text verbatim and say where it goes.

## Edits

For "change X, keep everything else": put the source in `image_urls`, describe the change and what must stay, and prefer a model with an editing mode. If the user wants transparency or a cut-out, check `get_model_params` for a `background` or similar field before reaching for a separate tool.
