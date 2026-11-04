---
name: apipod-product-shoot
description: "Turn one product photo into a consistent set of commercial images — hero, detail, lifestyle, scale — with the APIPod MCP server. Use when the user supplies a product image (or a product description) and wants multiple marketing shots that show the same object. Not for a single picture, unrelated illustrations, or video."
---

# Product shoot

Read [shared rules](../apipod/references/shared-rules.md) once per task. If APIPod tools are missing, follow the "Not connected yet?" steps in the `apipod` skill.

One product, several angles, one budget. The hard problem is not making a nice picture — it is making four pictures of **the same object**.

## Before anything

1. Identify the product from the user's photo or description: what it is, material, colour, distinguishing details (logo placement, cap shape, seam). Write these down as a short spec — it becomes the continuity anchor for every shot.
2. Settle the shot list. Default to four, and say which you are doing:
   - **hero** — clean studio, product fills the frame, 1:1
   - **detail** — macro on the material or a feature the user cares about
   - **lifestyle** — the product in use, in a plausible setting
   - **scale** — held, on a shelf, or next to a known object
   Ask which channels it is for if the user has not said (that fixes aspect ratio and whether text is allowed).
3. One quote for the set, not four surprises: `estimate_cost` per shot, then present the total before generating anything.

## Generate

1. **The hero first, alone.** Get one image the user approves. Everything after this reuses it.
2. For the remaining shots, pass the approved hero in `image_urls` and describe **only what changes** — new angle, new surface, new light — while restating the invariant details from the spec. This is what keeps the object identical; a fresh prompt without a reference will drift.
3. Never put two products in one shot unless asked. Never add text or logos the user did not ask for.
4. `check_job` every 3–5 s. Approve shot by shot: if shot 2 drifts, fix it before spending on shots 3 and 4.

## Delivery

- Present the set together with one line each on what it shows, and the total `cost_usd`.
- State plainly if any shot drifted from the hero (different colour, wrong proportions) — do not call a set "consistent" you cannot verify.
- Offer one revision per shot; generating a replacement costs again and needs a yes.

## Prompt shape

Anchor with the spec, then the delta: *"Matte black stainless water bottle, brushed lid, engraved logo on the lower third. Same bottle as the reference. Now on a wet slate surface, low angle, soft top light, 85mm, no text."*
