#!/usr/bin/env node
/**
 * Build the ZIP the OpenAI plugin portal accepts (platform.openai.com/plugins).
 *
 * The portal wants a portable Agent Plugins package: plugin.json, mcp.json,
 * skills/ and assets/ at the ZIP root, nothing else. The default manifest in
 * apipod/plugin.json serves every other host (Claude, Cursor, OpenClaw,
 * Codex-from-git); openai/plugin.openai.json overlays the ChatGPT listing over
 * it so the two copies cannot drift. Rules are checked here rather than after
 * an upload rejects the package.
 *
 *   node scripts/build-openai-zip.mjs          # writes dist/apipod-<version>.zip
 *   node scripts/build-openai-zip.mjs --check  # validate only (CI)
 *
 * The reviewer demo recording is private: set OPENAI_DEMO_RECORDING_URL, or put
 * local/submission/openai-private.json { "demo_recording_url": "..." }. It is
 * never committed.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "apipod");
const OPENAI_DIR = join(ROOT, "openai");
const OPENAI_MCP = join(OPENAI_DIR, "mcp.json");
const DIST = join(ROOT, "dist");
const STAGE = join(DIST, "stage");
const PRIVATE_FILE = join(ROOT, "local/submission/openai-private.json");
const CHECK_ONLY = process.argv.includes("--check");

// Portal limits (developers.openai.com/plugins/deploy/submission)
const LIMITS = {
  name: 64,
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
  iconBytes: 5 * 1024 * 1024,
};
const REQUIRED_URLS = ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"];
// Listing copy may not advertise pricing, trials or promotions.
const BANNED_LISTING = /\b(free trial|discount|promo(tion)?|\$\d)/i;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
// chars() counts code points, so an emoji costs 1 as the portal counts it.
const chars = (v) => Array.from(typeof v === "string" ? v : "").length;

function readJSON(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`${path}: ${err.message}`);
    return null;
  }
}

function checkLen(label, value, max, { required = true } = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    if (required) fail(`${label} is required`);
    return;
  }
  if (chars(value) > max) fail(`${label} is ${chars(value)} chars; limit ${max}`);
}

// Icons ship inside the OpenAI package, so paths resolve against openai/.
function checkIcon(label, rel) {
  if (typeof rel !== "string" || !rel.startsWith("./")) {
    return fail(`${label} must be a ./-prefixed path, got ${JSON.stringify(rel)}`);
  }
  const abs = join(OPENAI_DIR, rel);
  if (!existsSync(abs)) return fail(`${label} points at a missing file under openai/: ${rel}`);

  // The portal wants a square PNG; other formats and sizes are rejected at
  // upload, so read the IHDR instead of trusting the extension.
  const png = readFileSync(abs);
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) return fail(`${label} must be a PNG: ${rel}`);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== height) fail(`${label} must be square (got ${width}x${height})`);
  if (width < 48 || width > 4096) fail(`${label} must be 48-4096 px (got ${width})`);
  if (png.length > LIMITS.iconBytes) fail(`${label} exceeds 5 MiB`);
}

/**
 * Merge the ChatGPT overlay onto the portable manifest. openai/plugin.openai.json
 * owns version, keywords and extensions.com.openai; everything else comes from
 * apipod/plugin.json so the two never disagree.
 */
function buildManifest() {
  const base = readJSON(join(SRC, "plugin.json"));
  const overlay = readJSON(join(OPENAI_DIR, "plugin.openai.json"));
  if (!base || !overlay) return null;

  const openaiExt = overlay.extensions?.["com.openai"];
  if (!openaiExt) {
    fail("openai/plugin.openai.json needs extensions.com.openai");
    return null;
  }

  const manifest = {
    ...base,
    name: overlay.name ?? base.name,
    version: overlay.version ?? base.version,
    keywords: overlay.keywords ?? base.keywords,
    extensions: { ...base.extensions, "com.openai": structuredClone(openaiExt) },
  };

  // The reviewer demo link is private; inject it from the environment or an
  // untracked file rather than committing a URL that goes stale.
  const demoUrl =
    process.env.OPENAI_DEMO_RECORDING_URL ||
    (existsSync(PRIVATE_FILE) ? readJSON(PRIVATE_FILE)?.demo_recording_url : undefined);
  const review = manifest.extensions["com.openai"].review ?? {};
  if (demoUrl) {
    review.demo_recording_url = demoUrl;
  } else {
    // Required for MCP review, but a missing private value must not break CI.
    warnings.push(
      "No demo recording URL: set OPENAI_DEMO_RECORDING_URL or local/submission/openai-private.json before submitting for review."
    );
  }
  manifest.extensions["com.openai"].review = review;

  return manifest;
}

function checkManifest(manifest) {
  const name = manifest.name ?? "";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) fail("plugin name must be lowercase-hyphenated");
  if (chars(name) > LIMITS.name) fail(`plugin name exceeds ${LIMITS.name} characters`);
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? "")) fail("version must be semantic (x.y.z)");
  checkLen("plugin description", manifest.description, LIMITS.longDescription);

  const ext = manifest.extensions["com.openai"];
  const ui = ext.interface ?? {};

  checkLen("interface.displayName", ui.displayName, LIMITS.displayName);
  checkLen("interface.shortDescription", ui.shortDescription, LIMITS.shortDescription);
  if (typeof ui.shortDescription === "string" && /\n/.test(ui.shortDescription)) {
    fail("interface.shortDescription must be one line");
  }
  checkLen("interface.longDescription", ui.longDescription, LIMITS.longDescription);
  checkLen("interface.developerName", ui.developerName, LIMITS.developerName);
  if (!ui.category) fail("interface.category is required");

  if (BANNED_LISTING.test(`${ui.shortDescription ?? ""} ${ui.longDescription ?? ""}`)) {
    fail("listing text must not advertise pricing, trials, discounts or promotions");
  }

  for (const key of REQUIRED_URLS) {
    const url = ui[key];
    if (typeof url !== "string" || !/^https:\/\/[^\s@]+$/.test(url)) {
      fail(`interface.${key} must be an https URL (required for MCP review)`);
    } else if (chars(url) > LIMITS.urlLength) {
      fail(`interface.${key} exceeds ${LIMITS.urlLength} chars`);
    }
  }

  const caps = ui.capabilities ?? [];
  if (!Array.isArray(caps)) fail("interface.capabilities must be an array");
  else {
    if (caps.length > LIMITS.capabilitiesCount) fail(`interface.capabilities has ${caps.length}; limit ${LIMITS.capabilitiesCount}`);
    caps.forEach((c, i) => chars(c) > LIMITS.capabilityLength && fail(`interface.capabilities[${i}] exceeds ${LIMITS.capabilityLength} chars`));
  }

  const prompts = Array.isArray(ui.defaultPrompt) ? ui.defaultPrompt : ui.defaultPrompt ? [ui.defaultPrompt] : [];
  if (prompts.length > LIMITS.defaultPromptCount) fail(`interface.defaultPrompt has ${prompts.length}; limit ${LIMITS.defaultPromptCount}`);
  prompts.forEach((p, i) => chars(p) > LIMITS.defaultPromptLength && fail(`interface.defaultPrompt[${i}] exceeds ${LIMITS.defaultPromptLength} chars`));
  if (new Set(prompts).size !== prompts.length) fail("interface.defaultPrompt entries must be unique");
  if (prompts.some((p) => p.includes("@"))) fail("interface.defaultPrompt must not contain @mentions");

  for (const key of ["brandColor", "brandColorDark"]) {
    if (ui[key] !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(ui[key])) fail(`interface.${key} must be #RRGGBB`);
  }

  if (!ui.logo) fail("interface.logo (primary icon) is required for submission");
  for (const key of ["logo", "logoDark", "composerIcon", "composerIconDark"]) {
    if (ui[key]) checkIcon(`interface.${key}`, ui[key]);
  }
  (ui.screenshots ?? []).forEach((s, i) => checkIcon(`interface.screenshots[${i}]`, s));

  // Allowed to point at skills/ (a directory) or a SKILL.md; validate either.
  if (ext.onboardingSkill) {
    const rel = ext.onboardingSkill;
    if (typeof rel !== "string" || rel.startsWith("/") || rel.includes("..")) {
      fail("onboardingSkill must be a package-relative path");
    } else {
      const abs = join(SRC, rel);
      if (!existsSync(abs)) fail(`onboardingSkill not found in the package: ${rel}`);
    }
  }

  const review = ext.review ?? {};
  if (typeof review.commerce !== "boolean") fail("review.commerce must be true or false");
  if (review.commerce === true) checkLen("review.commerce_description", review.commerce_description, LIMITS.longDescription);
  checkLen("review.demo_recording_url", review.demo_recording_url, LIMITS.urlLength, { required: false });

  const cases = review.test_cases;
  if (!cases) {
    fail("review.test_cases is required for initial MCP review");
  } else {
    const pos = cases.positive ?? [];
    const neg = cases.negative ?? [];
    if (pos.length !== LIMITS.positiveCases) fail(`review.test_cases.positive has ${pos.length}; exactly ${LIMITS.positiveCases} required`);
    if (neg.length !== LIMITS.negativeCases) fail(`review.test_cases.negative has ${neg.length}; exactly ${LIMITS.negativeCases} required`);
    pos.forEach((c, i) => {
      for (const k of ["description", "prompt", "tools_triggered", "expected_behavior"]) {
        if (typeof c[k] !== "string" || !c[k].trim()) fail(`review.test_cases.positive[${i}].${k} is required and must be a string`);
      }
      if (chars(c.description) > LIMITS.longDescription) fail(`review.test_cases.positive[${i}].description exceeds ${LIMITS.longDescription} chars`);
    });
    neg.forEach((c, i) => {
      for (const k of ["description", "prompt"]) {
        if (typeof c[k] !== "string" || !c[k].trim()) fail(`review.test_cases.negative[${i}].${k} is required`);
      }
    });
  }

  if ("test_credentials" in review || "reviewer_instructions" in review) {
    fail("review must not contain test_credentials or reviewer_instructions (enter them in the dashboard)");
  }
  if (ext.hooks || existsSync(join(SRC, "hooks"))) fail("lifecycle hooks make a plugin ineligible for the public directory");

  if (!ext.publication?.release_notes) fail("publication.release_notes is required");
}

function checkMcp() {
  const mcp = readJSON(OPENAI_MCP);
  if (!mcp) return;
  const servers = Object.entries(mcp.mcpServers ?? {});
  if (servers.length !== 1) return fail(`openai/mcp.json must declare exactly one server; found ${servers.length}`);
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
    // The portal matches the declared name to the directory name.
    if (!new RegExp(`^name:\\s*${n}\\s*$`, "m").test(fm[1])) {
      fail(`skills/${n}/SKILL.md frontmatter name must be "${n}"`);
    }
    if (!/^description:\s*\S/m.test(fm[1])) fail(`skills/${n}/SKILL.md lacks a description`);
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
  // Ship the icons that were validated, not the portable copy.
  if (existsSync(join(OPENAI_DIR, "assets"))) {
    cpSync(join(OPENAI_DIR, "assets"), join(STAGE, "assets"), { recursive: true });
  }
  writeFileSync(join(STAGE, "plugin.json"), JSON.stringify(manifest, null, 2) + "\n");

  // The MCP server must ship on the first upload: the portal cannot attach one
  // to an existing skills-only plugin, and MCP review cases need it present.
  cpSync(OPENAI_MCP, join(STAGE, "mcp.json"));

  for (const entry of readdirRecursive(STAGE)) {
    const name = entry.split("/").pop();
    if (name.endsWith(".app.json") || name === "hooks" || name === "hooks.json") {
      fail(`package must not contain app references or lifecycle hooks: ${entry}`);
    }
  }

  const zip = join(DIST, `${manifest.name}-${manifest.version}.zip`);
  rmSync(zip, { force: true });
  execFileSync("zip", ["-qr", "-X", zip, "."], { cwd: STAGE });
  rmSync(STAGE, { recursive: true, force: true });

  const listing = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" });
  writeFileSync(join(DIST, "MANIFEST.txt"), listing);
  return { zip, files: listing.trim().split("\n").length };
}

function readdirRecursive(dir) {
  const out = [];
  for (const entry of execFileSync("find", [dir, "-type", "f"], { encoding: "utf8" }).trim().split("\n")) {
    if (entry) out.push(entry.slice(dir.length + 1));
  }
  return out;
}

const ZERO_MANIFEST = readJSON(join(SRC, "plugin.json"));
if (ZERO_MANIFEST) {
  const version = readJSON(join(OPENAI_DIR, "plugin.openai.json"))?.version;
  if (version && ZERO_MANIFEST.version !== version) {
    fail(`apipod/plugin.json version ${ZERO_MANIFEST.version} != openai/plugin.openai.json version ${version}`);
  }
}

const manifest = buildManifest();
if (manifest) checkManifest(manifest);
checkMcp();
checkSkills();

for (const warning of warnings) console.warn(`warning: ${warning}`);

if (errors.length) {
  console.error(`✘ ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("✔ package passes portal checks");

if (!CHECK_ONLY) {
  mkdirSync(DIST, { recursive: true });
  const { zip, files } = build(manifest);
  if (errors.length) {
    console.error(`✘ ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`✔ wrote ${zip} (${files} files)`);
}
