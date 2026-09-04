import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { validateBundle, validateRegistry } from "../lib/validate.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX = path.join(ROOT, "fixtures");
const VALID = (...p) => path.join(FIX, "valid", ...p);
const INVALID = (...p) => path.join(FIX, "invalid", ...p);
const CONCEPTS = VALID("concepts.yaml");

const errors = (r) => r.findings.filter((f) => f.level === "error");
const warnings = (r) => r.findings.filter((f) => f.level === "warning");
const assertError = (r, substring) => {
  const hits = errors(r).filter((f) => f.message.includes(substring));
  assert.ok(hits.length > 0,
    `expected an error containing "${substring}", got:\n${r.findings.map((f) => `${f.level}: ${f.file}: ${f.message}`).join("\n") || "(no findings)"}`);
};

// ---- valid fixtures ---------------------------------------------------------

test("valid problem bundle passes with zero findings (against the registry)", () => {
  const r = validateBundle(VALID("problem", "teleskopski-zbroj"), { conceptsPath: CONCEPTS });
  assert.deepEqual(r.findings, []);
});

test("valid blog bundle passes with zero findings (anchors resolve, checkpoints in range)", () => {
  const r = validateBundle(VALID("blog", "zasto-indukcija-radi"), { conceptsPath: CONCEPTS });
  assert.deepEqual(r.findings, []);
});

test("valid experience bundle passes with zero findings", () => {
  const r = validateBundle(VALID("experience", "ai-learner-calculus-probe"));
  assert.deepEqual(r.findings, []);
});

test("valid concepts.yaml passes registry-only validation", () => {
  const r = validateRegistry(CONCEPTS);
  assert.deepEqual(r.findings, []);
  assert.ok(r.ids.has("telescoping-sums"));
});

// x_ keys appear in every valid fixture at several nesting levels (manifest,
// section_concepts map, checkpoint, if_wrong, experience frontmatter, registry
// entry); the zero-findings assertions above prove they are accepted. This
// test pins the contrast: same shape, non-x_ prefix, rejected.
test("x_ keys are accepted where a non-x_ unknown key is rejected", () => {
  const clean = validateBundle(VALID("problem", "teleskopski-zbroj"));
  assert.deepEqual(errors(clean), []);
  const dirty = validateBundle(INVALID("unknown-key"));
  assertError(dirty, '"dificulty"');
});

// ---- invalid fixtures -------------------------------------------------------

test("missing provenance is an error", () => {
  const r = validateBundle(INVALID("missing-provenance"));
  assertError(r, 'missing required field "provenance"');
});

test("provenance adapted without adapted_from is an error", () => {
  const r = validateBundle(INVALID("adapted-no-source"));
  assertError(r, '"adapted_from" is missing');
});

test("difficulty on an experience report is an error", () => {
  const r = validateBundle(INVALID("difficulty-on-experience"));
  assertError(r, '"difficulty"');
});

test("unknown non-x_ key is an error", () => {
  const r = validateBundle(INVALID("unknown-key"));
  assertError(r, 'unknown key "dificulty"');
});

test("cyclic concepts.yaml is an error", () => {
  const r = validateRegistry(INVALID("cyclic-concepts.yaml"));
  assertError(r, "cycle");
});

test("cyclic registry is an error even when passed via --concepts with --lenient", () => {
  const r = validateBundle(VALID("problem", "teleskopski-zbroj"),
    { conceptsPath: INVALID("cyclic-concepts.yaml"), lenient: true });
  assertError(r, "cycle");
});

test("checkpoint correct index out of range is an error", () => {
  const r = validateBundle(INVALID("checkpoint-out-of-range"));
  assertError(r, "checkpoints[0].correct is 2");
});

// ---- --lenient --------------------------------------------------------------

test("unknown concept id is an error by default, a warning under lenient", () => {
  const strict = validateBundle(INVALID("unknown-concept"), { conceptsPath: CONCEPTS });
  assertError(strict, "is not in the concept registry");

  const lenient = validateBundle(INVALID("unknown-concept"), { conceptsPath: CONCEPTS, lenient: true });
  assert.deepEqual(errors(lenient), []);
  const hits = warnings(lenient).filter((f) => f.message.includes("is not in the concept registry"));
  assert.equal(hits.length, 1);
});

test("without --concepts, concept ids are not checked at all", () => {
  const r = validateBundle(INVALID("unknown-concept"));
  assert.deepEqual(r.findings, []);
});

// ---- CLI --------------------------------------------------------------------

const CLI = path.join(ROOT, "bin", "matsek-validate.js");
const runCli = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });

test("CLI exits 0 on a valid bundle and prints ok", () => {
  const r = runCli(VALID("problem", "teleskopski-zbroj"), "--concepts", CONCEPTS);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^ok: /m);
});

test("CLI exits 1 on an invalid bundle with error: lines", () => {
  const r = runCli(INVALID("adapted-no-source"));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^error: manifest\.json: /m);
});

test("CLI --registry-only validates a lone concepts.yaml", () => {
  const ok = runCli("--registry-only", CONCEPTS);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const bad = runCli("--registry-only", INVALID("cyclic-concepts.yaml"));
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /cycle/);
});

test("CLI --lenient downgrades unknown concepts to warnings (exit 0)", () => {
  const r = runCli(INVALID("unknown-concept"), "--concepts", CONCEPTS, "--lenient");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^warning: manifest\.json: teaches\[0\]/m);
});
