#!/usr/bin/env node
import process from "node:process";
import { validateBundle, validateRegistry } from "../lib/validate.js";

const USAGE = `usage: matsek-validate <bundle-dir> [--concepts <concepts.yaml>] [--lenient]
       matsek-validate --registry-only <concepts.yaml>

  --concepts <file>   check every teaches/requires/section_concepts id against
                      the registry (missing id = error) and validate the
                      registry itself (schema, unique ids, acyclic requires)
  --lenient           downgrade "concept id not in registry" to a warning;
                      registry problems themselves stay errors
  --registry-only     validate just a concepts.yaml, no bundle`;

const args = process.argv.slice(2);
let bundleDir = null;
let conceptsPath = null;
let registryOnly = null;
let lenient = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--help" || a === "-h") {
    console.log(USAGE);
    process.exit(0);
  } else if (a === "--concepts") {
    conceptsPath = args[++i];
    if (conceptsPath === undefined) fail("--concepts needs a path");
  } else if (a === "--registry-only") {
    registryOnly = args[++i];
    if (registryOnly === undefined) fail("--registry-only needs a path");
  } else if (a === "--lenient") {
    lenient = true;
  } else if (a.startsWith("-")) {
    fail(`unknown option "${a}"`);
  } else if (bundleDir === null) {
    bundleDir = a;
  } else {
    fail(`unexpected argument "${a}"`);
  }
}

function fail(message) {
  console.error(`matsek-validate: ${message}\n${USAGE}`);
  process.exit(2);
}

if (registryOnly !== null && (bundleDir !== null || conceptsPath !== null)) {
  fail("--registry-only takes no bundle directory or --concepts");
}
if (registryOnly === null && bundleDir === null) {
  fail("missing bundle directory");
}

const target = registryOnly ?? bundleDir;
const { findings } = registryOnly !== null
  ? validateRegistry(registryOnly)
  : validateBundle(bundleDir, { conceptsPath, lenient });

for (const f of findings) {
  console.log(`${f.level}: ${f.file}: ${f.message}`);
}
const errorCount = findings.filter((f) => f.level === "error").length;
const warningCount = findings.length - errorCount;
if (errorCount === 0) {
  console.log(`ok: ${target}${warningCount > 0 ? ` (${warningCount} warning${warningCount === 1 ? "" : "s"})` : ""}`);
}
process.exit(errorCount > 0 ? 1 : 0);
