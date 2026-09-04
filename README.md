# MatSek spec

The contract of the MatSek tool ecosystem: what every tool reads and writes,
the decisions that bind all repos, and the evaluation set the library's
retrieval must pass.

The ecosystem in one paragraph: tools (paper reader, tutor, problemset,
blog writer) run on **members' machines with members' own AI keys or
subscriptions**, produce **artifact bundles** in the format defined here,
and share one community **library** of problems, proofs and blogs served as
static files from GitHub — target infrastructure cost: **$0/month**.

## What lives here

| Path | What |
|---|---|
| `DECISIONS.md` | The decision log. Binding on every repo in the org. |
| `policies/provenance.md` | Contributor agreement, provenance rules, what may never enter the library. |
| `eval/golden-queries.yaml` | 20 retrieval queries written **before** any index existed — the Phase-3 acceptance test. |
| `eval/README.md` | How the golden set is judged. |
| `schema/` *(Phase 1)* | JSON Schemas for artifact bundles + the validator CLI. |

## Status

Phase 0 (decisions, policies, golden queries) — done.
Phase 1 (bundle spec + validator) — next.
The full plan lives with the maintainer.
