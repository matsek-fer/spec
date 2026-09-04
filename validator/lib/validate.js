// Reference validator for the MatSek bundle format v1. ../bundles.md is the
// source of truth: the JSON Schemas in ../../schema carry everything they can
// express, and this file adds the rules they cannot — the adapted_from iff
// rule and per-type difficulty (restated here so the findings are legible
// instead of ajv's raw if/then noise), registry existence, id uniqueness and
// acyclicity, the checkpoint index range, and the best-effort anchor scan.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";

// ajv ships CJS; under Node's ESM interop the class may sit on .default.
const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;
const addFormats = addFormatsModule.default ?? addFormatsModule;

// The validator lives inside the spec repo, so the schemas one directory up
// are exactly the format version it implements — pinning by cohabitation,
// per the Versioning section of bundles.md.
const SCHEMA_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)), "..", "..", "schema"
);
const SUPPORTED = { major: 1, minor: 0 };

const REQUIRED_FILES = {
  problem: ["problem.md", "solution.md", "annotation.md"],
  proof: ["statement.md", "proof.md", "annotation.md"],
  blog: ["blog.md", "annotation.md"],
  experience: ["experience.md"],
};

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const loadSchema = (name) =>
  JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, name), "utf8"));
const validators = {
  manifest: ajv.compile(loadSchema("manifest.schema.json")),
  blog: ajv.compile(loadSchema("blog-frontmatter.schema.json")),
  experience: ajv.compile(loadSchema("experience-frontmatter.schema.json")),
  concepts: ajv.compile(loadSchema("concepts.schema.json")),
};

const err = (file, message) => ({ level: "error", file, message });
const warn = (file, message) => ({ level: "warning", file, message });

// ---------------------------------------------------------------- ajv errors

// The manifest's allOf branches produce "must match then schema" style noise;
// the targeted cross-checks below re-state those rules with readable messages,
// so the if/not plumbing and the adapted_from/difficulty required-errors from
// inside allOf are dropped here rather than reported twice.
function translateAjvErrors(errors, file, findings, skipMissingProps = new Set(), skipUnknownKeys = new Set()) {
  const seen = new Set();
  for (const e of errors ?? []) {
    if (e.keyword === "if" || e.keyword === "not") continue;
    if (e.keyword === "required" && skipMissingProps.has(e.params.missingProperty)) continue;
    if (e.keyword === "additionalProperties" && !e.instancePath && skipUnknownKeys.has(e.params.additionalProperty)) continue;
    const where = e.instancePath ? e.instancePath.slice(1).replaceAll("/", ".") : "";
    let msg;
    if (e.keyword === "additionalProperties") {
      const key = (where ? where + "." : "") + e.params.additionalProperty;
      // A malformed anchor under section_concepts is an anchor bug, not a
      // forward-compat question — say so instead of schema-speak.
      msg = key.includes("section_concepts.#")
        ? `"${key.split(".").pop()}" is not a valid anchor key — anchors are lowercase ASCII kebab ("#moj-odjeljak"): transliterate č/ć→c, š→s, ž→z, đ→d and turn other punctuation into hyphens`
        : `unknown key "${key}" — not in the v${SUPPORTED.major} schema and not x_-prefixed (forward compatibility goes through schema_version, tool-private data through x_ keys)`;
    } else if (e.keyword === "required") {
      msg = `missing required field "${(where ? where + "." : "") + e.params.missingProperty}"`;
    } else if (e.keyword === "pattern" && e.instancePath === "/id" && e.schemaPath.includes("/allOf/")) {
      msg = `id prefix does not match the "type" field (id must be "<type>/<kebab-slug>")`;
    } else {
      msg = `field "${where || "(root)"}" ${e.message}`;
    }
    if (!seen.has(msg)) {
      seen.add(msg);
      findings.push(err(file, msg));
    }
  }
}

// ------------------------------------------------------------- shared pieces

// Returns true when the file must be refused outright (foreign MAJOR).
// A newer MINOR is still an error per bundles.md ("schema newer than
// validator") but the rest of the file is readable, so validation continues.
function checkSchemaVersion(v, file, findings) {
  if (typeof v !== "string") return false; // schema "required" covers absence
  const m = /^([0-9]+)\.([0-9]+)$/.exec(v);
  if (!m) return false; // schema pattern error covers malformed strings
  const major = Number(m[1]);
  const minor = Number(m[2]);
  if (major !== SUPPORTED.major) {
    findings.push(err(file,
      `schema_version "${v}": this bundle is format ${major}.x and this validator implements ${SUPPORTED.major}.${SUPPORTED.minor} — refusing to read it; update the tool`));
    return true;
  }
  if (minor > SUPPORTED.minor) {
    findings.push(err(file,
      `schema_version "${v}" is newer than this validator (${SUPPORTED.major}.${SUPPORTED.minor}) — schema newer than validator; update the validator`));
  }
  return false;
}

function splitFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/.exec(text);
  if (!m) return null;
  return { yaml: m[1], body: m[2] ?? "" };
}

// CORE_SCHEMA: JSON-compatible scalars without implicit timestamp parsing —
// a bundle field must never silently become a Date object.
function parseYaml(text) {
  return yaml.load(text, { schema: yaml.CORE_SCHEMA });
}

function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Anchor derivation per bundles.md: lowercase, Croatian diacritics to ASCII,
// non-alphanumeric runs to single hyphens.
const TRANSLIT = { "č": "c", "ć": "c", "š": "s", "ž": "z", "đ": "d" };
function deriveAnchor(headingText) {
  const s = headingText
    .toLowerCase()
    .replace(/[čćšžđ]/g, (ch) => TRANSLIT[ch])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return "#" + s;
}

// Best-effort: ATX headings outside fenced code blocks. Renderer edge cases
// (setext headings, HTML) are why anchor findings are warnings, never errors.
function scanAnchors(body) {
  const anchors = new Set();
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    const t = line.trimStart();
    if (/^(```|~~~)/.test(t)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(t);
    if (m) anchors.add(deriveAnchor(m[2].replace(/\s+#+$/, "")));
  }
  return anchors;
}

// ------------------------------------------------------------------ registry

function findCycle(graph) {
  const state = new Map(); // undefined = unvisited, 1 = on stack, 2 = done
  const stack = [];
  let cycle = null;
  const dfs = (node) => {
    state.set(node, 1);
    stack.push(node);
    for (const dep of graph.get(node) ?? []) {
      if (cycle) return;
      if (!graph.has(dep)) continue; // dangling edge reported separately
      const s = state.get(dep);
      if (s === 1) {
        cycle = [...stack.slice(stack.indexOf(dep)), dep];
        return;
      }
      if (s === undefined) dfs(dep);
    }
    stack.pop();
    state.set(node, 2);
  };
  for (const node of graph.keys()) {
    if (state.get(node) === undefined) dfs(node);
    if (cycle) break;
  }
  return cycle;
}

export function validateRegistry(regPath) {
  const findings = [];
  const file = regPath;
  let text;
  try {
    text = fs.readFileSync(regPath, "utf8");
  } catch (e) {
    findings.push(err(file, `cannot read registry: ${e.message}`));
    return { findings, ids: null };
  }
  let doc;
  try {
    doc = parseYaml(text);
  } catch (e) {
    findings.push(err(file, `not valid YAML: ${e.reason ?? e.message}`));
    return { findings, ids: null };
  }
  validators.concepts(doc);
  translateAjvErrors(validators.concepts.errors, file, findings);

  const ids = new Set();
  if (Array.isArray(doc)) {
    const graph = new Map();
    for (const c of doc) {
      if (!isPlainObject(c) || typeof c.id !== "string") continue;
      if (ids.has(c.id)) findings.push(err(file, `duplicate concept id "${c.id}"`));
      ids.add(c.id);
      graph.set(c.id, Array.isArray(c.requires)
        ? c.requires.filter((r) => typeof r === "string")
        : []);
    }
    for (const [id, reqs] of graph) {
      for (const r of reqs) {
        if (!ids.has(r)) {
          findings.push(err(file, `concept "${id}" requires "${r}", which is not defined in the registry`));
        }
      }
    }
    const cycle = findCycle(graph);
    if (cycle) {
      findings.push(err(file, `requires graph must be acyclic; found a cycle: ${cycle.join(" -> ")}`));
    }
  }
  return { findings, ids };
}

// ------------------------------------------------------------------- bundles

function checkConceptIds(idList, fieldLabel, file, findings, registryIds, lenient) {
  if (!registryIds || !Array.isArray(idList)) return;
  idList.forEach((id, i) => {
    if (typeof id === "string" && !registryIds.has(id)) {
      const mk = lenient ? warn : err;
      findings.push(mk(file, `${fieldLabel}[${i}] "${id}" is not in the concept registry`));
    }
  });
}

function checkRequiredFiles(dir, type, findings) {
  for (const name of REQUIRED_FILES[type]) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) {
      findings.push(err(name, `required for type "${type}" but missing`));
      continue;
    }
    if (fs.readFileSync(p, "utf8").trim() === "") {
      findings.push(err(name, `required for type "${type}" but empty`));
    }
  }
}

// The rules JSON Schema cannot express, restated with legible messages
// (translateAjvErrors drops the corresponding allOf noise).
function manifestCrossChecks(m, file, findings) {
  if (m.provenance === "adapted" && !("adapted_from" in m)) {
    findings.push(err(file, `provenance is "adapted" but "adapted_from" is missing — adapted content must name its license-compatible source (policies/provenance.md)`));
  }
  if ("adapted_from" in m && m.provenance !== "adapted") {
    findings.push(err(file, `"adapted_from" is only allowed when provenance is "adapted" (an unreviewed provenance claim, not a harmless extra)`));
  }
  if ((m.type === "problem" || m.type === "proof") && !("difficulty" in m)) {
    findings.push(err(file, `"difficulty" is required for type "${m.type}"`));
  }
  if (m.type === "experience" && "difficulty" in m) {
    findings.push(err(file, `"difficulty" is forbidden for type "experience"`));
  }
}

function validateBlogContent(dir, findings, opts, registryIds) {
  const file = "blog.md";
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return; // checkRequiredFiles already reported it
  const text = fs.readFileSync(p, "utf8");
  if (text.trim() === "") return;
  const fm = splitFrontmatter(text);
  if (!fm) {
    findings.push(err(file, "missing YAML frontmatter (blog.md must open with a --- block)"));
    return;
  }
  let data;
  try {
    data = parseYaml(fm.yaml);
  } catch (e) {
    findings.push(err(file, `frontmatter is not valid YAML: ${e.reason ?? e.message}`));
    return;
  }
  if (!isPlainObject(data)) {
    findings.push(err(file, "frontmatter must be a YAML mapping"));
    return;
  }
  if (checkSchemaVersion(data.schema_version, file, findings)) return;
  validators.blog(data);
  translateAjvErrors(validators.blog.errors, file, findings);

  const checkpoints = Array.isArray(data.checkpoints) ? data.checkpoints : [];

  // "correct" in range of options — an error the schema cannot see.
  checkpoints.forEach((cp, i) => {
    if (isPlainObject(cp) && Array.isArray(cp.options)
        && Number.isInteger(cp.correct) && cp.correct >= cp.options.length) {
      const range = cp.options.length
        ? `valid indexes 0..${cp.options.length - 1}`
        : "options is empty — the schema requires at least 2";
      findings.push(err(file, `checkpoints[${i}].correct is ${cp.correct} but options has ${cp.options.length} entries (${range})`));
    }
  });

  // Best-effort anchor scan — warnings only, per bundles.md.
  const anchors = scanAnchors(fm.body);
  const checkAnchor = (anchor, whereLabel) => {
    if (typeof anchor === "string" && anchor.startsWith("#") && !anchors.has(anchor)) {
      findings.push(warn(file, `${whereLabel}: no heading in the body derives anchor "${anchor}" (best-effort scan)`));
    }
  };
  if (isPlainObject(data.section_concepts)) {
    for (const [key, ids] of Object.entries(data.section_concepts)) {
      if (/^x_/.test(key)) continue;
      checkAnchor(key, `section_concepts["${key}"]`);
      checkConceptIds(ids, `section_concepts["${key}"]`, file, findings, registryIds, opts.lenient);
    }
  }
  checkpoints.forEach((cp, i) => {
    if (!isPlainObject(cp)) return;
    checkAnchor(cp.after, `checkpoints[${i}].after`);
    if (isPlainObject(cp.if_wrong)) checkAnchor(cp.if_wrong.goto, `checkpoints[${i}].if_wrong.goto`);
  });
}

function validateManifestBundle(dir, findings, opts, registryIds) {
  const file = "manifest.json";
  let m;
  try {
    m = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  } catch (e) {
    findings.push(err(file, `not valid JSON: ${e.message}`));
    return;
  }
  if (!isPlainObject(m)) {
    findings.push(err(file, "must be a single JSON object"));
    return;
  }
  if (checkSchemaVersion(m.schema_version, file, findings)) return;
  if (m.type === "experience") {
    findings.push(err(file, "experience bundles carry no manifest.json — the experience.md frontmatter is the manifest"));
  }
  validators.manifest(m);
  translateAjvErrors(validators.manifest.errors, file, findings,
    new Set(["adapted_from", "difficulty"]));
  manifestCrossChecks(m, file, findings);

  // The folder path mirrors the id (prose rule in bundles.md). A bundle can
  // be validated from a scratch copy anywhere, so only the leaf folder name
  // is checked, and a mismatch is advisory.
  if (typeof m.id === "string" && /^[a-z]+\/[a-z0-9-]+$/.test(m.id)) {
    const slug = m.id.split("/")[1];
    if (path.basename(dir) !== slug) {
      findings.push(warn(file, `folder name "${path.basename(dir)}" does not mirror id "${m.id}" (expected folder "${slug}")`));
    }
  }

  if (typeof m.type === "string" && REQUIRED_FILES[m.type] && m.type !== "experience") {
    checkRequiredFiles(dir, m.type, findings);
  }
  if (m.type === "blog") validateBlogContent(dir, findings, opts, registryIds);

  checkConceptIds(m.teaches, "teaches", file, findings, registryIds, opts.lenient);
  checkConceptIds(m.requires, "requires", file, findings, registryIds, opts.lenient);
}

function validateExperienceBundle(dir, findings) {
  const file = "experience.md";
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  if (text.trim() === "") {
    findings.push(err(file, `required for type "experience" but empty`));
    return;
  }
  const fm = splitFrontmatter(text);
  if (!fm) {
    findings.push(err(file, "missing YAML frontmatter — for experience bundles the frontmatter is the manifest"));
    return;
  }
  let data;
  try {
    data = parseYaml(fm.yaml);
  } catch (e) {
    findings.push(err(file, `frontmatter is not valid YAML: ${e.reason ?? e.message}`));
    return;
  }
  if (!isPlainObject(data)) {
    findings.push(err(file, "frontmatter must be a YAML mapping"));
    return;
  }
  if (checkSchemaVersion(data.schema_version, file, findings)) return;
  // The schema rejects this as an unknown key; say the actual rule instead —
  // experience reports are not laddered study content (bundles.md).
  const skipUnknownKeys = new Set();
  if ("difficulty" in data) {
    findings.push(err(file, `"difficulty" is forbidden for type "experience" — experience reports carry no difficulty`));
    skipUnknownKeys.add("difficulty");
  }
  validators.experience(data);
  translateAjvErrors(validators.experience.errors, file, findings, new Set(), skipUnknownKeys);
}

export function validateBundle(bundleDir, opts = {}) {
  const findings = [];
  const dir = path.resolve(bundleDir);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    findings.push(err(bundleDir, "not a directory"));
    return { findings };
  }

  // Registry problems are always errors — --lenient softens only the
  // "concept id not found" findings on the bundle side.
  let registryIds = null;
  if (opts.conceptsPath) {
    const reg = validateRegistry(opts.conceptsPath);
    findings.push(...reg.findings);
    registryIds = reg.ids;
  }

  const hasManifest = fs.existsSync(path.join(dir, "manifest.json"));
  const hasExperience = fs.existsSync(path.join(dir, "experience.md"));
  if (hasManifest) {
    validateManifestBundle(dir, findings, opts, registryIds);
  } else if (hasExperience) {
    validateExperienceBundle(dir, findings);
  } else {
    findings.push(err(".", "not a bundle: neither manifest.json nor experience.md found"));
  }
  return { findings };
}
