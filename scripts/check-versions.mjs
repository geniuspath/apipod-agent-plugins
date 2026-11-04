#!/usr/bin/env node
// One version string across every host manifest. Run before tagging.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = [
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
  "apipod/.claude-plugin/plugin.json",
  "apipod/.cursor-plugin/plugin.json",
  "apipod/plugin.json",
  "apipod/openclaw.plugin.json",
  "openai/plugin.openai.json",
];

const seen = new Map();
for (const rel of FILES) {
  const doc = JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
  // Marketplaces carry their own version plus one per plugin entry.
  const versions = [doc.version, ...(doc.plugins ?? []).map((p) => p.version)].filter(Boolean);
  for (const v of versions) seen.set(v, [...(seen.get(v) ?? []), rel]);
}

if (seen.size !== 1) {
  console.error("✘ version mismatch:");
  for (const [v, files] of seen) console.error(`  ${v}: ${files.join(", ")}`);
  process.exit(1);
}
console.log(`✔ all manifests at ${[...seen.keys()][0]}`);
