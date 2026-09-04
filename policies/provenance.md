# Provenance policy — what may enter the library, and how we know

Every artifact in the library carries a machine-checked provenance block in
its manifest:

```yaml
author: "Ime Prezime <github-handle>"
license: CC-BY-4.0            # always; see DECISIONS.md D-001
provenance: original          # original | adapted | ai-assisted
# provenance: adapted additionally requires:
# adapted_from: "<url or full citation of the CC-compatible source>"
```

CI rejects any submission whose block is missing or incomplete. This block
is also the contributor agreement (see below) — the file does not merge
without it, so the agreement cannot be skipped.

## The three provenance values

- **`original`** — you wrote the problem/proof/blog yourself. Inspiration
  is fine; text and problem-structure lifted from a source is not.
- **`adapted`** — a transformation of a **named, license-compatible**
  source (CC BY or more permissive, or your own prior work). Attribution
  in `adapted_from` is mandatory. Note math.StackExchange is CC BY-SA and
  therefore **not** compatible — see below.
- **`ai-assisted`** — produced with one of the tools (or any model) and
  verified by a human. Additional rules below.

## Banned, regardless of intent

- Transcriptions or close paraphrases of **textbook, coursebook or
  competition problems** (MAA, IMO, državna/županijska natjecanja, AoPS,
  …). This is not caution, it is precedent: the MIT-labeled Hendrycks MATH
  dataset was DMCA'd off Hugging Face in January 2025 by AoPS at 95% text
  similarity — the "it's educational/research" argument did not save it,
  and Croatian/EU copyright law has **no US-style fair use**, only narrow
  teaching exceptions that do not cover a public dataset.
- **math.StackExchange content** — legally reusable in general (CC BY-SA),
  but share-alike is incompatible with our CC BY license (D-001). One
  merged import would relicense the entire library.
- Content whose license label you cannot personally verify. A permissive
  label on a scraped dataset is not a statement of rights (NuminaMath
  ships exam-sourced problems labeled Apache 2.0 — importing such sets
  imports their liability).

## AI-assisted content — extra rules

Models trained on competition corpora can reproduce known problems
near-verbatim, which would smuggle banned content in under an `original`-
looking label. Therefore:

1. `provenance: ai-assisted` is mandatory for anything a model drafted,
   even if heavily edited.
2. Generation prompts must ask for **new** problems on a concept — never
   "give me a competition problem about X".
3. The maintainer reviews every ai-assisted item before merge; an item
   recognizably matching a known source is rejected, and if merged by
   mistake is removed on discovery.

## The contributor agreement (inbound = outbound)

By submitting, you affirm that:

1. the content is your own writing, or properly attributed adaptation of
   license-compatible material, as declared in the provenance block; and
2. you irrevocably license your contribution to the project under
   **CC BY 4.0**.

This is the Wikimedia/Stack Exchange pattern: the terms you accept going
in are exactly the terms everyone gets going out. No separate CLA, no
signature — the provenance block in your merged submission is the record.

## Enforcement

- **Structural:** CI validates the block on every PR (Phase 3).
- **Human:** the maintainer's merge click is the last gate; tool-side
  review (the submission skill interviews you about provenance) is the
  first.
- **After the fact:** verified copyright complaints lead to removal of the
  item and a decision-log note. One bad merge caught early is a delete,
  not a lawsuit — the point of this policy is keeping it that way.
