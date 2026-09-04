# Golden queries — the retrieval acceptance test

`golden-queries.yaml` holds 20 retrieval requests written on 2026-09-04,
**before any index, library content, or retrieval code existed** — so the
set cannot have been tuned to what the system happens to do well. Do not
edit queries to make them pass; add new queries in a dated section instead.

## What it is for

Phase 3 of the implementation plan (the library + `problemset` retrieval
skill) is **done** only when the skill produces a *defensible ladder* for
**at least 16 of the 20** queries against the seeded library.

## What "defensible" means

For a given query, the returned set passes if all four hold:

1. **On-topic** — every returned item's annotation concepts match the
   query's intent (spot-checked by a human; a judge agent may pre-screen).
2. **Ordered** — difficulty is non-decreasing where the query asks for a
   ladder.
3. **Grounded in the DAG** — for "build up to X / prepare me for X"
   queries, the sequence respects `requires` edges in the concept
   registry (prerequisites before the target, target's applications only
   at the end or absent).
4. **Honest** — no fabricated items, and if the library lacks coverage the
   skill says so instead of padding (an honest "we only have 2 problems on
   this, here they are" **passes**; padding with off-topic items fails).

## Fields

```yaml
- id: gq-01
  query: "…"          # exactly what a member would type
  lang: en | hr
  kind: problem-ladder | problems | proof | blog | mixed
  probes: [ … ]        # which failure mode this query exists to catch
  hard: true|false     # expected to fail with naive embedding-only search
  expect: "…"          # what a good answer looks like — for the judge
```

`probes` vocabulary: `topical-precision`, `relational-precision`,
`abstraction-gap`, `cross-lingual`, `prerequisite-chain`,
`meta-constraint-stripping`, `negative-constraint`, `difficulty-targeting`,
`diversity`, `honesty-gap`.

The `hard: true` queries are the reason the retrieval protocol is
decompose → registry filter → multi-query → over-retrieve → LLM rerank →
ladder assembly, with annotations embedded at ingest. If they pass with
plain cosine search alone, be suspicious of the judge, not proud of the
model.
