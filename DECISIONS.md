# Decision log

Binding on every repo in the `matsek-fer` org. One entry per decision;
overturning a decision is a new entry that references the old one, never an
edit.

---

## D-001 · Library license: CC BY 4.0

**Date:** 2026-09-04 · **Status:** locked

All library content (problems, proofs, blogs) is published under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Locked before
the first submission because relicensing later needs every contributor's
consent.

**Why not BY-SA:** share-alike is viral — it would lock every derived work,
and it is the license of math.StackExchange, whose content we therefore
**do not import** (see D-004 consequences). **Why not NC:** the
commercial/noncommercial line is ambiguous, NC fails the Open Definition,
and it would forbid members using library problems in paid tutoring.

**Consequences:** attribution required on reuse; math.SE imports ruled out;
anyone (including companies and paying tutors) may reuse with credit.

---

## D-002 · Home: GitHub org `matsek-fer`

**Date:** 2026-09-04 · **Status:** locked

Repos live under a new org `matsek-fer` (`matsek` is taken by an unrelated
user). Planned repos: `spec`, `plugins`, `library`, `reader`, plus the
existing tutor (`AI_instructor`, currently local-only — to be pushed under
the org). Public repos only: GitHub Actions minutes are unlimited-free on
public repos, which is what keeps CI at $0.

**Open:** whether `AI_instructor` is renamed `tutor` when it moves.

---

## D-003 · Embedding convention (ecosystem-wide)

**Date:** 2026-09-04 · **Status:** locked

- Model: `intfloat/multilingual-e5-small` (via the `Xenova` ONNX
  conversion), quantized **q8**, **384 dimensions**.
- Prefixes are mandatory and added centrally, never by callers:
  `query: ` for queries, `passage: ` for indexed text.
- What gets embedded for a problem/proof is **statement + annotation**
  (`annotation.md`, the "what this tests" prose) — the annotation is what
  makes abstraction-gap queries answerable. Annotations are written in
  **English** (the model-facing language of the ecosystem; member-facing
  copy stays Croatian).

Every tool that indexes anything uses this convention so all indexes are
mutually queryable. Changing the model or dimension means re-embedding the
entire ecosystem — that is a spec-level decision, not a tool-level one.

---

## D-004 · Originality and AI-assistance policy

**Date:** 2026-09-04 · **Status:** locked

The library is **original-authorship-only**. Transcribed or closely
paraphrased problems from textbooks, coursebooks, or competitions are
banned regardless of how they were obtained. Rationale and rules:
`policies/provenance.md`. AI-generated content is allowed only marked
`provenance: ai-assisted` and human-verified before merge.

---

## D-005 · Infrastructure ground rules ($0/month)

**Date:** 2026-09-04 · **Status:** locked

1. Public repos for all tools and data.
2. Large downloadable artifacts ship as **GitHub Releases**, never Git LFS
   (LFS bandwidth bills the org for every clone; Releases are uncapped).
3. **No member-run tool may depend on the club's Supabase** — the free
   tier pauses after 7 quiet days. Supabase runs the MatSekApp website
   only; everything tools consume is a static GitHub artifact.
4. Index and site builds trigger **on PR merge, not on cron** — scheduled
   workflows auto-disable after 60 quiet days.

Owner-paid infrastructure beyond this is a cost that must be justified in a
new decision entry, never a default.

---

## D-006 · Tool code is MIT; library content is CC BY 4.0

**Date:** 2026-09-04 · **Status:** locked

D-001's CC BY 4.0 governs library CONTENT (problems, proofs, blogs, and
submitted experience reports). The tools themselves (AI_instructor,
validator, reader, …) are MIT-licensed code. An experience report enters
the library as content, under CC BY 4.0 like everything else — its
`consent_public: true` is the member's act of submission, not a license
choice.
