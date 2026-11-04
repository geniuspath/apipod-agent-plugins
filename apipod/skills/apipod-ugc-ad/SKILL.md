---
name: apipod-ugc-ad
description: "Build a creator-style ad from a product: a persona shot holding the product, then a short clip of it in use, then a few hook variants. Use when the user wants UGC, testimonial or creator-format ad creative. For static marketing images use apipod-product-shoot; for variant testing use apipod-ad-variations."
---

# UGC ad

Read [shared rules](../apipod/references/shared-rules.md) once per task. If APIPod tools are missing, follow the "Not connected yet?" steps in the `apipod` skill.

A UGC ad reads as a person using the product, not as a studio photo. That means two paid stages: a still that establishes the person and the product together, then a clip animated from that still.

## 1. Fix the product

Get the product right before adding a person. If the user has a product photo, use it as the reference in every shot (`image_urls`) so the label, shape and colour survive. Write a one-line product spec: what it is, material, colour, any legible text quoted exactly.

## 2. Cast the persona (image)

One `generate_image`: a person holding or using the product, in a believable setting (kitchen, car, desk, gym), phone-camera framing rather than studio lighting. Vague casting ("someone") produces generic results — settle the essentials: age range, setting, clothing register. Do not invent demographic detail the user did not ask for.

Quote it first (`estimate_cost`) and show the user the still before spending on video.

## 3. Animate it (video)

Take the approved still as the first frame of `generate_video`. Describe only motion: a small hand movement, a turn toward camera, the product being used. Short — 4–5 seconds. Read `get_model_params` for durations; do not assume.

Do not attempt on-screen speech or lip-sync: say plainly that APIPod generates the visual only and that the voiceover belongs in an editor.

## 4. Hooks (optional, one axis)

If the user wants options to test, vary one thing per clip and price the batch before running it: the opening beat, the setting, or the camera distance. This is `apipod-ad-variations`; hand over rather than re-deriving it.

## Delivery

- Still, clip, and any variants, each with its own cost line; a total for the batch.
- Name what reads as an ad and what reads as stock: a person who is clearly posing, a product that looks pasted in, lighting that does not match the room.
- One revision per asset, and only on a yes.

## Do not

- Do not promise a finished ad file: APIPod returns separate assets and does not assemble them.
- Do not put words in the product's mouth. Copy and captions are the user's, or an editor's.
