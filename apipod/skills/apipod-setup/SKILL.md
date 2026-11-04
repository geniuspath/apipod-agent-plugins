---
name: apipod-setup
description: "Guided first run for APIPod: confirm the server is connected, show what the seven tools can do, and make one image and one short clip so the user sees the whole loop. Use when the user has just installed or connected the plugin, runs setup, or asks how to get started. For a specific image or video request, use the matching skill instead."
---

# Set up APIPod

Read [shared rules](../apipod/references/shared-rules.md) once before the first tool call.

**Not connected yet?** If no APIPod tools (`list_models`, `generate_image`, …) are available, the plugin is installed but the server is not connected. Stop and give the click path, then ask the user to send the request again:

- Claude Code: run `/mcp`, select **apipod**, sign in with the browser.
- Claude web / Desktop: **Customize → Connectors**, press **Connect** next to APIPod.
- ChatGPT / Codex: open the APIPod plugin settings and connect.

Do not substitute other tools or describe a result that was not generated.

## What to do

One step per message, one question at a time, in the user's language. Never paste this outline at them, and never name tools unless they ask.

1. **Confirm the connection.** Call `list_models({ category: "image" })` once. If it returns models, say the number and that generation works. If it fails, use the "Not connected" path above and stop.
2. **Ask what they want to make.** Do not offer a menu of features; ask for one real thing ("a product shot", "a five-second clip of…").
3. **Price it before making it.** `estimate_cost` with the settings you intend to use, and say the number in one line. A first run should be cheap: one image, one short low-resolution clip.
4. **Make one image.** Follow `apipod-generate-image`. Show the URL and the final cost.
5. **Offer one short clip of the same subject.** Only if they want it — this is the second paid call. Animate the image they just approved (`image_urls` as the first frame) rather than starting from text.
6. **Hand over.** Point at the workflow skills for the next real task: `apipod-product-shoot` for a set, `apipod-short-film` for a sequence, `apipod-ad-variations` for options.

## Rules for the first run

- Small: no variations, no comparisons, no retakes unless the user asks.
- Every generation is priced before it runs, and one approval covers one attempt.
- If the user asks for something specific at any point, do that with the matching skill and drop this outline.
