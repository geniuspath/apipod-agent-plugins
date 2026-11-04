#!/usr/bin/env node
/**
 * Build the ZIP the OpenAI plugin portal accepts (platform.openai.com/plugins).
 *
 * The portal wants a portable Agent Plugins package: plugin.json, mcp.json,
 * skills/ and assets/ at the ZIP root, nothing else. We assemble that from
 * apipod/ and overlay the ChatGPT-specific mcp.json from openai/, then check
 * the rules the portal enforces at submission so a rejection shows up here
 * rather than after upload.
 *
 *   node scripts/build-openai-zip.mjs          # writes dist/apipod-<version>.zip
 *   node scripts/build-openai-zip.mjs --check  # validate only (CI)
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "apipod");
const OPENAI_MCP = join(ROOT, "openai", "mcp.json");
const DIST = join(ROOT, "dist");
const STAGE = join(DIST, "stage");
const CHECK_ONLY = process.argv.includes("--check");

// Portal limits (developers.openai.com/plugins/deploy/submission#listing-metadata)
const LIMITS = {
  displayName: 30,
  shortDescription: 30,
  longDescription: 4000,
  developerName: 80,
  capabilitiesCount: 20,
  capabilityLength: 120,
  defaultPromptCount: 3,
  defaultPromptLength: 128,
  urlLength: 1024,
  positiveCases: 5,
  negativeCases: 3,
};
const REQUIRED_URLS = ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"];
const IMAGE_EXT = /\.(png|jpe?g|webp|svg)$/i;

const errors = [];
const fail = (msg) => errors.push(msg);

function readJSON(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`${path}: ${err.message}`);
    return null;
  }
}

function checkLen(label, value, max) {
  if (typeof value !== "string" || value.trim() === "") return fail(`${label} is required`);
  if (value.length > max) fail(`${label} is ${value.length} chars; limit ${max}`);
}

function checkRelativeFile(label, rel) {
  if (typeof rel !== "string" || !rel.startsWith("./")) return fail(`${label} must be a ./-prefixed path, got ${JSON.stringify(rel)}`);
  const abs = join(SRC, rel);
  if (!existsSync(abs)) return fail(`${label} points at a missing file: ${rel}`);
  return abs;
}

function checkImage(label, rel) {
  const abs = checkRelativeFile(label, rel);
  if (!abs) return;
  if (!IMAGE_EXT.test(rel)) fail(`${label} must be PNG, JPEG, WebP or SVG`);
  if (statSync(abs).size > 5 * 1024 * 1024) fail(`${label} exceeds 5 MiB`);
}

function checkPlugin() {
  const manifest = readJSON(join(SRC, "plugin.json"));
  if (!manifest) return null;

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest.name ?? "")) fail("plugin.json name must be kebab-case");
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? "")) fail("plugin.json version must be semver");
  checkLen("plugin.json description", manifest.description, LIMITS.longDescription);

  const ext = manifest.extensions?.["com.openai"];
  if (!ext) {
    fail("plugin.json needs extensions.com.openai");
    return manifest;
  }
  const ui = ext.interface ?? {};
  checkLen("interface.displayName", ui.displayName, LIMITS.displayName);
  checkLen("interface.shortDescription", ui.shortDescription, LIMITS.shortDescription);
  checkLen("interface.longDescription", ui.longDescription, LIMITS.longDescription);
  checkLen("interface.developerName", ui.developerName, LIMITS.developerName);
  if (!ui.category) fail("interface.category is required");

  for (const key of REQUIRED_URLS) {
    const url = ui[key];
    if (typeof url !== "string" || !url.startsWith("https://")) fail(`interface.${key} must be an https URL (required for MCP review)`);
    else if (url.length > LIMITS.urlLength) fail(`interface.${key} exceeds ${LIMITS.urlLength} chars`);
  }

  const caps = ui.capabilities ?? [];
  if (caps.length > LIMITS.capabilitiesCount) fail(`interface.capabilities has ${caps.length}; limit ${LIMITS.capabilitiesCount}`);
  caps.forEach((c, i) => c.length > LIMITS.capabilityLength && fail(`interface.capabilities[${i}] exceeds ${LIMITS.capabilityLength} chars`));

  const prompts = Array.isArray(ui.defaultPrompt) ? ui.defaultPrompt : ui.defaultPrompt ? [ui.defaultPrompt] : [];
  if (prompts.length > LIMITS.defaultPromptCount) fail(`interface.defaultPrompt has ${prompts.length}; limit ${LIMITS.defaultPromptCount}`);
  prompts.forEach((p, i) => p.length > LIMITS.defaultPromptLength && fail(`interface.defaultPrompt[${i}] exceeds ${LIMITS.defaultPromptLength} chars`));
  if (new Set(prompts).size !== prompts.length) fail("interface.defaultPrompt entries must be unique");
  if (prompts.some((p) => /@\w/.test(p))) fail("interface.defaultPrompt must not contain @mentions");

  if (ui.brandColor && !/^#[0-9A-Fa-f]{6}$/.test(ui.brandColor)) fail("interface.brandColor must be #RRGGBB");
  checkImage("interface.logo", ui.logo);
  checkImage("interface.composerIcon", ui.composerIcon);
  for (const key of ["logoDark", "composerIconDark"]) if (ui[key]) checkImage(`interface.${key}`, ui[key]);
  (ui.screenshots ?? []).forEach((s, i) => checkImage(`interface.screenshots[${i}]`, s));

  if (ext.onboardingSkill) {
    const abs = checkRelativeFile("onboardingSkill", ext.onboardingSkill);
    if (abs && !abs.endsWith("SKILL.md")) fail("onboardingSkill must point at a SKILL.md");
  }

  const cases = ext.review?.test_cases;
  if (!cases) fail("review.test_cases is required for initial MCP review");
  else {
    const pos = cases.positive ?? [];
    const neg = cases.negative ?? [];
    if (pos.length !== LIMITS.positiveCases) fail(`review.test_cases.positive has ${pos.length}; exactly ${LIMITS.positiveCases} required`);
    if (neg.length !== LIMITS.negativeCases) fail(`review.test_cases.negative has ${neg.length}; exactly ${LIMITS.negativeCases} required`);
    pos.forEach((c, i) => {
      for (const k of ["description", "prompt", "tools_triggered", "expected_behavior"]) {
        if (typeof c[k] !== "string" || !c[k].trim()) fail(`review.test_cases.positive[${i}].${k} is required and must be a string`);
      }
    });
    neg.forEach((c, i) => {
      for (const k of ["description", "prompt"]) {
        if (typeof c[k] !== "string" || !c[k].trim()) fail(`review.test_cases.negative[${i}].${k} is required`);
      }
    });
  }
  if (!ext.review?.demo_recording_url) fail("review.demo_recording_url is required for MCP review");
  if ("test_credentials" in (ext.review ?? {}) || "reviewer_instructions" in (ext.review ?? {})) {
    fail("review must not contain test_credentials or reviewer_instructions (enter them in the dashboard)");
  }
  if (ext.hooks || existsSync(join(SRC, "hooks"))) fail("lifecycle hooks make a plugin ineligible for the public directory");

  return manifest;
}

function checkMcp() {
  const mcp = readJSON(OPENAI_MCP);
  if (!mcp) return;
  const servers = Object.entries(mcp.mcpServers ?? {});
  if (servers.length !== 1) return fail(`openai/mcp.json must declare exactly one server for plugin-level review cases; found ${servers.length}`);
  const [name, server] = servers[0];
  if (server.type !== "streamable-http") fail(`mcpServers.${name}.type must be streamable-http`);
  if (!/^https:\/\//.test(server.url ?? "")) fail(`mcpServers.${name}.url must be https`);
  if (server.headers && Object.keys(server.headers).length) fail(`mcpServers.${name}.headers must be empty for public submission`);
  const auth = server.extensions?.["com.openai"]?.auth;
  if (!auth) return fail(`mcpServers.${name} needs extensions.com.openai.auth`);
  if (!["none", "oauth", "mixed"].includes(auth.type)) fail(`auth.type ${auth.type} is not accepted by the portal connection form`);
  if (auth.client?.mode === "provided" && !auth.client.clientId) fail("auth.client.clientId is required for mode provided");
  if (["dcr", "cimd"].includes(auth.client?.mode) && auth.client.clientId) fail("auth.client.clientId must be omitted for dcr/cimd");
  if ("clientSecret" in (auth.client ?? {}) || "clientSecret" in auth) fail("never put clientSecret in mcp.json");
}

function checkSkills() {
  const dir = join(SRC, "skills");
  if (!existsSync(dir)) return fail("skills/ directory is missing");
  const names = execFileSync("ls", [dir], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  if (!names.length) fail("skills/ has no skills");
  for (const n of names) {
    const skill = join(dir, n, "SKILL.md");
    if (!existsSync(skill)) {
      fail(`skills/${n}/SKILL.md is missing`);
      continue;
    }
    const body = readFileSync(skill, "utf8");
    const fm = body.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) {
      fail(`skills/${n}/SKILL.md has no frontmatter block`);
      continue;
    }
    if (!/^name:\s*\S/m.test(fm[1])) fail(`skills/${n}/SKILL.md lacks a name in its frontmatter`);
    if (!/^description:\s*\S/m.test(fm[1])) fail(`skills/${n}/SKILL.md lacks a description in its frontmatter`);
    // The portal asks for provider-neutral skill text.
    const claudeRefs = body.match(/\bClaude(?! Code| web)\b/g);
    if (claudeRefs) fail(`skills/${n}/SKILL.md refers to "Claude" ${claudeRefs.length}×; use neutral wording ("the assistant") unless the sentence is about Claude specifically`);
  }
}

function build(manifest) {
  rmSync(STAGE, { recursive: true, force: true });
  mkdirSync(STAGE, { recursive: true });

  // Only the portable layout goes in: host-specific overlays stay out of the ZIP.
  for (const entry of ["plugin.json", "skills", "assets"]) {
    const from = join(SRC, entry);
    if (existsSync(from)) cpSync(from, join(STAGE, entry), { recursive: true });
  }
  cpSync(OPENAI_MCP, join(STAGE, "mcp.json"));

  const zip = join(DIST, `${manifest.name}-${manifest.version}.zip`);
  rmSync(zip, { force: true });
  execFileSync("zip", ["-qr", "-X", zip, "."], { cwd: STAGE });
  rmSync(STAGE, { recursive: true, force: true });

  const listing = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" });
  writeFileSync(join(DIST, "MANIFEST.txt"), listing);
  return { zip, files: listing.trim().split("\n").length };
}

const manifest = checkPlugin();
checkMcp();
checkSkills();

if (errors.length) {
  console.error(`✘ ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("✔ package passes portal checks");

if (!CHECK_ONLY) {
  mkdirSync(DIST, { recursive: true });
  const { zip, files } = build(manifest);
  console.log(`✔ wrote ${zip} (${files} files)`);
}
