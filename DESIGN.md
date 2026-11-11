# DESIGN.md — Daymark

## Thesis

Minimi's hard problem is temporal verification: recover what was asked, when, what evidence supported the answer, and whether it still holds. Daymark keeps dates, memory and provenance in deterministic Node code. The model gets exactly one callable tool: `web_search`.

## One turn

1. **Persist and ground.** Save the new turn with an absolute timestamp; resolve common date phrases into timezone-local ranges, retaining ambiguous weekday readings.
2. **Recall in code.** SQLite date indexes and FTS5 retrieve original exchanges before inference. The current question is excluded from its own memory.
3. **Fail safely.** No record for an exact date returns without model/search calls. An ambiguous date that only matches unrelated history asks for clarification.
4. **Replay the old research.** For a unique baseline, replay source-specific title/domain queries, then the original broad query. Search both the current page and pages published since the baseline: this catches edited pricing pages as well as dated announcements.
5. **Use one bounded tool.** The harness validates the sole `web_search` function, runs independent calls concurrently, caps rounds and fourteen provider requests per turn, retries transient search errors once, and closes calls if a provider ignores the final tool cutoff.
6. **Preserve receipts.** Stable citation IDs connect answers to URLs, queries, publication dates, retrieval times and SHA-256 excerpt hashes. A conservative price parser records exact answer sentences and all cited sources; only snippet-confirmed comparable values can supersede a prior ledger entry.

## Why this shape

- Memory is application-side, not a second tool: recall costs no model round-trip.
- Dates are code, not model arithmetic: timezone resolution is deterministic and testable.
- Prior queries are memory too: replay is more reliable than reconstructing an old research plan.
- Current + since is stronger than since alone: current pages reveal edits; dated pages reveal announcements.
- Missing history, ambiguity, unsupported snippets and failed searches have distinct outcomes. No result never means “unchanged.”
- Node built-ins and SQLite keep installation risk and the reviewable runtime surface small.

## Rejected / next

No vector DB before measurable FTS5 failure, no multi-agent graph without measured gains, and no unbounded search loop. Next: streaming/cancellation, full-page snapshots, claim extraction with exact quote spans, semantic citation checks, user isolation and a held-out human-labelled benchmark.

## Honest status

Claim extraction is price-only and heuristic; search returns excerpts, not guaranteed page snapshots. The UI is non-streaming and the local app has no authentication. Keep it on localhost. Tests and mocked scenarios validate architecture, not live factual accuracy or Minimi's private evaluation. See `EVALUATION.md` and `COMPETITOR_REVIEW.md`.
