---
name: apipod-budget
description: "Answer what a job will cost and pick the cheapest option that meets the brief: compare models and settings with real quotes from the APIPod MCP server, check the balance, and report the trade-off. Use when the user gives a budget, asks for the cheapest option, or wants a cost comparison. Never generates."
---

# Budget

Read [shared rules](../apipod/references/shared-rules.md) once per task. If APIPod tools are missing, follow the "Not connected yet?" steps in the `apipod` skill.

Every number here comes from `estimate_cost`. This skill never generates, and an estimate never authorizes a generation.

## 1. Turn the brief into parameters

From what the user asked for, extract: modality (image or video), duration or resolution, count, and any model they named. If a parameter is genuinely unknown and changes the price materially (a 5 s vs 30 s clip), ask once — one question, not a form.

## 2. Enumerate real options

`list_models` for the modality, then `get_model_params` for each candidate you intend to quote. Only quote models whose enums actually accept the requested settings; a price for a duration the model does not support is fiction.

Quote at least two options when they exist, and no more than four — a wall of prices does not help anyone choose.

## 3. Report the trade-off, not just the number

A short table: option, key settings, price, and one clause on what you give up ("cheaper, but no native audio"). Then a recommendation in one sentence.

Check `get_balance` and state whether the recommended option fits. If nothing fits, say the shortfall and name the cheapest option that does.

## 4. Hand over

If the user then wants it made, that is a separate request: the matching generate skill prices it again at the moment of generation, which is the number that counts.

## Answering cost questions without a purchase

- "How much would X cost?" → quote X, and say nothing was generated.
- "What did that last job cost?" → the final figure comes from `check_job`, not from the estimate. If you do not have it, say so rather than quoting the estimate as fact.
- "Is it cheaper on the other model?" → quote both, same settings, and state the difference.
