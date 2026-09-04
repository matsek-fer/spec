# Artifact bundles — format v1

This is the contract for every artifact the MatSek tools produce and the
library accepts: problems, proofs, blogs, and experience reports. A second
validator written from this document alone should agree with the reference
one on every file it accepts or rejects.

The machine-checkable parts live as JSON Schemas (draft 2020-12) in
[`schema/`](schema/). The prose here is normative for everything the
schemas cannot express — cross-file rules, acyclicity, anchor scanning —
and explanatory for everything they can.

## The model: one folder per artifact

An artifact is a **folder**. Machine truth lives in `manifest.json`;
human-readable content lives in Markdown files; images and other media live
in an optional `assets/` subfolder. Nothing about an artifact is stored
outside its folder — copying the folder copies the artifact.

The folder's path mirrors the artifact `id`: an artifact with
`id: "problem/zeta-telescoping"` lives at `problem/zeta-telescoping/`
(relative to the library root). The slug is kebab-case ASCII:
`[a-z0-9]+(-[a-z0-9]+)*`.

```
problem/zeta-telescoping/
├── manifest.json      machine truth (this section)
├── problem.md         the statement, as members read it (Croatian)
├── solution.md        the full solution
├── annotation.md      English retrieval text (see below)
└── assets/            optional; referenced relatively from the .md files
```

The one exception is the **experience** type, which has no `manifest.json`:
its single `experience.md` carries YAML frontmatter that *is* the manifest.
See [Experience reports](#experience-reports).

## manifest.json

A single JSON object. Field by field:

| Field | Type | Rule |
|---|---|---|
| `schema_version` | string | `"MAJOR.MINOR"`, e.g. `"1.0"`. This document describes major version **1**. See [Versioning](#versioning). |
| `type` | string | One of `problem`, `proof`, `blog`, `experience`. (In practice `experience` never appears in a `manifest.json` file — experience bundles have none — but the value is part of the type vocabulary and appears in ids and frontmatter.) |
| `id` | string | `"<type>/<kebab-slug>"`. The `<type>` prefix must equal the `type` field. Ids are permanent: renaming an artifact is a new id, and the library treats it as a new artifact. |
| `title` | string | Member-facing title, in the artifact's `language`. |
| `language` | string | `hr` or `en` — the language of the content files. (`annotation.md` is always English regardless; see below.) |
| `author` | string | `"Name <github-handle>"`, e.g. `"Ivana Ivić <iivic>"`. The angle brackets hold the GitHub handle, not an email. |
| `license` | string | Always exactly `"CC-BY-4.0"` (DECISIONS.md D-001). The schema enforces it as a constant — there is no second valid value. |
| `provenance` | string | `original`, `adapted`, or `ai-assisted`, with the meanings and obligations defined in [`policies/provenance.md`](policies/provenance.md) (D-004). |
| `adapted_from` | string | URL or full citation of the license-compatible source. **Required iff `provenance` is `adapted`; forbidden otherwise.** An `original` or `ai-assisted` manifest carrying `adapted_from` is a validation error, not a harmless extra — it would signal an unreviewed provenance claim. |
| `created` | string | ISO date, `YYYY-MM-DD`. |
| `teaches` | array of concept ids | What working through this artifact teaches. May be empty (rarely should be). Every id must exist in the concept registry — the validator checks this; the schema only checks the kebab pattern. |
| `requires` | array of concept ids | What a member must already know. May be empty. Same registry-existence rule. |
| `difficulty` | integer 1–5 | **Required for `problem` and `proof`; optional for `blog`; forbidden for `experience`.** 1 is a warm-up any member can do; 5 is the hardest thing the library asks of anyone. |

### Unknown keys: `^x_` is yours, everything else is an error

Any key matching `^x_` (e.g. `x_reader_hints`, `x_draft_notes`) is
**allowed in every object at every level** of every bundle file — manifest,
frontmatter, checkpoint entries, registry entries — and every tool that
rewrites a file **must preserve `x_` keys byte-for-byte in meaning** (it may
reformat, it may not drop or alter them). They are the sanctioned scratch
space for tool-private data.

Every *other* unknown key is a **validation error**. This is deliberate and
strict on purpose: forward compatibility in this format happens through
`schema_version`, never through silently tolerated extras. A format that
shrugs at unknown keys rots — typos (`dificulty`) pass validation and
silently vanish from every query, and ad-hoc fields accrete until no two
tools agree on what a manifest means. If a field is worth adding, it is
worth a `schema_version` bump; if it is tool-private, prefix it `x_`.

## Per-type required files

| Type | Required files | |
|---|---|---|
| `problem` | `manifest.json`, `problem.md`, `solution.md`, `annotation.md` | `problem.md` is the statement exactly as a member should first see it — no hints, no solution leakage. `solution.md` is the complete worked solution. |
| `proof` | `manifest.json`, `statement.md`, `proof.md`, `annotation.md` | `statement.md` is the theorem/claim alone; `proof.md` is the proof. Split so a member can attempt the proof before reading it. |
| `blog` | `manifest.json`, `blog.md`, `annotation.md` | `blog.md` carries schema-validated YAML frontmatter — see [Blog hooks](#blog-hooks-frontmatter). |
| `experience` | `experience.md` **only** | No `manifest.json`; the frontmatter is the manifest. See [Experience reports](#experience-reports). |

Extra Markdown files beyond the required set are allowed (a `hints.md`, an
alternative solution); tools that don't recognize them ignore them.
`assets/` is always optional.

### annotation.md — why it exists

`annotation.md` is the **retrieval text**: English prose stating what the
item teaches or tests, the techniques it uses, and the abstract principle
it instantiates. Per D-003, what gets embedded for retrieval is the
statement **plus this annotation**, and the annotation is written in
English because English is the model-facing language of the ecosystem
(member-facing copy stays Croatian).

It exists to close the **abstraction gap**. A member searches for "problems
where you bound a sum by an integral" or "something that tests whether I
really understand why compactness matters" — queries about *technique* and
*principle*. The statement of a good problem deliberately hides its
technique, so embedding statements alone makes exactly the best problems
unfindable. The annotation says out loud what the statement hides:

> Tests whether the solver recognizes a telescoping structure disguised by
> partial fractions. Technique: decompose 1/(k(k+1)), collapse the sum.
> Instantiates the principle that a closed form often comes from rewriting
> a term as a difference. Common failure: attempting induction on the
> closed form without deriving it.

Write it for the retriever, not the member: name techniques, name failure
modes, name the general principle. It is never shown as content.

## Blog hooks (frontmatter)

`blog.md` opens with YAML frontmatter, schema-validated by
[`schema/blog-frontmatter.schema.json`](schema/blog-frontmatter.schema.json).
The frontmatter binds sections to concepts and defines **checkpoints** —
comprehension questions with a remediation jump.

Fields:

- `schema_version` — as in the manifest.
- `section_concepts` — a map from **heading anchor** to an array of concept
  ids: which concepts each section covers. Anchors are `"#kebab-anchor"`,
  derived from the heading text by lowercasing, transliterating Croatian
  diacritics to ASCII (`č ć → c`, `š → s`, `ž → z`, `đ → d`), and replacing
  runs of non-alphanumerics with single hyphens.
- `checkpoints` — an array of:
  - `after` — anchor of the section the question follows.
  - `ask` — the question (Croatian, like the body).
  - `options` — at least 2 answer strings.
  - `correct` — **0-based** index into `options`.
  - `if_wrong` — `{ goto: "#anchor", note?: string }`: where to send the
    reader on a wrong answer, with an optional Croatian note.

v1 validates checkpoint **shape** only. Whether an anchor actually matches
a heading in the body is checked by a best-effort scan and reported as a
**warning**, not an error — Markdown heading→anchor mapping has renderer
edge cases, and a false-positive error would block legitimate posts. The
`correct` index being in range of `options` *is* an error (the validator
checks it; JSON Schema cannot).

### Worked example

`blog/zasto-indukcija-radi/blog.md`:

````markdown
---
schema_version: "1.0"
section_concepts:
  "#baza-indukcije": [mathematical-induction]
  "#korak-indukcije": [mathematical-induction, natural-numbers]
checkpoints:
  - after: "#baza-indukcije"
    ask: "Zašto baza n = 1 sama za sebe nije dokaz tvrdnje?"
    options:
      - "Jer pokriva samo jedan prirodni broj."
      - "Jer se baza uvijek dokazuje na kraju."
    correct: 0
    if_wrong:
      goto: "#baza-indukcije"
      note: "Baza je samo početni slučaj — ponovno pročitaj odjeljak."
---

# Zašto indukcija radi

## Baza indukcije

Dokaz indukcijom počinje provjerom tvrdnje za najmanji prirodni broj,
najčešće $n = 1$. Baza je sidro: bez nje korak indukcije nema od čega
krenuti.

## Korak indukcije

Pretpostavimo da tvrdnja vrijedi za neki $n$ i iz toga izvedimo da vrijedi
za $n + 1$. Zajedno s bazom, to ruši cijeli niz domina.
````

**Degraded rendering (the website).** A static site cannot run the
checkpoint, so it renders it inline after the `#baza-indukcije` section as
a plain question: the `ask` text, the `options` as a visible list (correct
answer *not* marked), and a link built from `if_wrong.goto` — "Nisi
siguran/na? [Ponovno pročitaj Baza indukcije](#baza-indukcije)". The
reader self-assesses; nothing is interactive, nothing is lost as content.

**Activated rendering (the local reader tool).** The tool pauses at the
checkpoint and actually asks. A correct answer (index `correct`) continues
to the next section. A wrong answer shows `if_wrong.note` and navigates to
`if_wrong.goto`, then re-offers the question. Same data, two behaviors —
which is the point of putting the hooks in frontmatter instead of baking
interactivity into the body.

## Experience reports

An experience bundle is a member's report on using one of the tools: what
happened, where the friction was, what should improve. It is the feedback
channel of the ecosystem, not library study content — which is why it is
the one type with no `manifest.json`, no `teaches`/`requires`, no
`difficulty`, and no `annotation.md`: nothing about it is retrieved or
laddered. Its folder is `experience/<kebab-slug>/` holding `experience.md`
(plus optional `assets/`, e.g. screenshots), and the YAML frontmatter is
the whole machine-readable surface, validated by
[`schema/experience-frontmatter.schema.json`](schema/experience-frontmatter.schema.json):

- `schema_version` — as in the manifest.
- `type` — always exactly `"experience"`.
- `tool` — which tool, e.g. `ai-learner`.
- `tool_version` — the version used (string, verbatim from the tool).
- `duration_minutes` — integer, optional.
- `rating` — 1–5, optional.
- `consent_public` — boolean, **default `false`**. Publication gate: only
  reports with `consent_public: true` may appear anywhere public.
- `session_ref` — optional string pointing at the session the report is
  about (e.g. a session bundle name), for the maintainer's reproduction.

Authorship and license are carried by git history and the repository the
report lands in, not by frontmatter — the field list above is exhaustive
(plus `x_` keys, which are allowed here as everywhere).

### Worked example

`experience/ai-learner-calculus-probe/experience.md`:

```markdown
---
schema_version: "1.0"
type: experience
tool: tutor
tool_version: "0.4.1"
duration_minutes: 50
rating: 4
consent_public: true
session_ref: "sessions/calculus"
---

Ran the probe phase on calculus with a high-school-algebra background.
The ladder it built was sensible, but the boundary search asked me two
questions about limits I had already answered during probing — the
session state clearly holds the answers, so the second ask is friction.
Suggested improvement: skip a probe question whose concept is already
marked passed. Rendering of $\lim$ in the terminal was fine.
```

The body is free text in whichever language the author prefers.

## The concept registry: concepts.yaml

One file, `concepts.yaml`, is the shared vocabulary every `teaches`,
`requires`, and `section_concepts` entry must resolve against. It will
live in the `library` repo; this spec defines its format and ships its
schema ([`schema/concepts.schema.json`](schema/concepts.schema.json)).

The document root is an **array** of concept entries:

- `id` — kebab-case, unique across the file.
- `title` — short human name (English; the registry is model-facing).
- `description` — one or two sentences, enough to disambiguate.
- `requires` — array of concept ids: the prerequisite edges. May be empty.
- `msc` — optional Mathematics Subject Classification code
  (e.g. `26A06`, `05A19`).

The `requires` graph **must be acyclic** — the retrieval ladder walks it as
a DAG, and a cycle would make "prerequisites before target" meaningless.
Acyclicity and id-uniqueness are enforced by the validator, not the schema
(JSON Schema cannot express either).

### Worked example — five concepts, a small DAG

```yaml
- id: sets
  title: Sets
  description: Membership, subsets, unions and intersections.
  requires: []
  msc: "03E75"

- id: functions
  title: Functions
  description: Maps between sets; domain, codomain, image, composition.
  requires: [sets]

- id: sequences
  title: Sequences
  description: Functions from the naturals; monotonicity and boundedness.
  requires: [functions]

- id: sequence-limits
  title: Limits of sequences
  description: Epsilon-N convergence; uniqueness and arithmetic of limits.
  requires: [sequences]
  msc: "40A05"

- id: continuity
  title: Continuity
  description: Sequential and epsilon-delta continuity of real functions.
  requires: [functions, sequence-limits]
  msc: "26A15"
```

The edges (`sets → functions → sequences → sequence-limits`, with
`continuity` requiring both `functions` and `sequence-limits`) form a DAG
with one join — enough to exercise a validator's cycle check and a
ladder-builder's topological ordering.

## Session bundles

Tutor session state (`state.json`, the Markdown log, per-session assets)
is **not** part of library submission in v1. Sessions are personal working
state, not community artifacts; their format is defined and maintained by
the tutor itself in `AI_instructor`'s
`.claude/skills/tutor/reference/state-format.md`, kept aligned with its
Python harness. If sessions later become shareable artifacts, that will be
a new bundle type in a new minor version of this spec — until then, the
only spec-level touchpoint is `session_ref` in experience frontmatter,
which is an opaque string.

## Validator behaviour

The schemas carry most of the contract; the reference validator adds the
rules below. A second implementation must match them to agree on every
accept/reject:

- **Detection order.** A folder holding `manifest.json` is validated as the
  manifest's `type`; only a folder without one is treated as an experience
  bundle (via `experience.md`). When both exist, `manifest.json` wins
  detection — and is then rejected, because…
- **Experiences carry no `manifest.json`.** A manifest declaring
  `type: experience` is an ERROR: experience metadata lives entirely in
  `experience.md` frontmatter, and authorship/licensing ride on git history
  at submission time.
- **Required files must be non-empty** — a whitespace-only file counts as
  missing.
- **Folder naming is enforced softly by the CLI.** A leaf folder differing
  from the id's slug is a WARNING, and the `<type>/` parent segment is not
  checked at all — a scratch copy in /tmp must still validate. Placement
  becomes an ERROR in the library's CI, not here.
- **Blog frontmatter requiredness:** `section_concepts` is required;
  `checkpoints` is optional.
- **`correct` must index into `options`** — a validator ERROR, since JSON
  Schema cannot compare across fields.

## Versioning

Every bundle file carries `schema_version: "MAJOR.MINOR"`.

- **MINOR** bumps are backward-compatible: they only add optional fields
  or relax constraints. A file written at `1.0` is valid at `1.1`
  unchanged.
- **MAJOR** bumps may break anything: required fields, renames, semantics.

Rules for tools:

- A tool that sees a **MAJOR it does not implement refuses the file** —
  no read, no best-effort parse, a clear "this bundle is format 2.x,
  update the tool" error. Guessing across a breaking boundary corrupts
  quietly.
- A tool that sees a **MINOR newer than it implements may read** the file
  (minor additions cannot change the meaning of the fields it knows) but
  **must not rewrite it** — it cannot validate fields it doesn't know, and
  rewriting risks emitting a file it can't vouch for. Validators in this
  position report "schema newer than validator" as an error: the fix is
  updating the validator, not loosening the check.
- `x_` keys pass through untouched in all cases (see the unknown-key rule
  above); they are orthogonal to versioning and never a substitute for it.

The schemas in `schema/` are versioned with this repo: the schema files at
a given spec release define exactly one MAJOR.MINOR, and tools vendor or
pin them rather than tracking spec HEAD blindly.
