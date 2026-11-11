# Minimi public-solution review

**Review date:** 11 November 2026  
**Scope:** Public GitHub repositories discoverable through repository-name and README searches for the Minimi hiring challenge. Public source files (`README.md`, `DESIGN.md`, and selected package manifests) were inspected where available.

## Important limits

This is a public-repository sample, not a list of applicants. GitHub search is incomplete and can return unrelated repositories, empty starter repositories, forks, or projects that mention Minimi without being complete challenge submissions. We found 11 repositories in an exact-phrase search for "Minimi hiring challenge" and 24 repositories in a `minimi-chat-agent` name search during this review; neither number is a verified applicant count. No public Minimi leaderboard or independently validated submission ranking was found. Reported benchmark scores in individual READMEs/DESIGN files are author-reported unless explicitly reproduced by us.

## Selected public implementations

| Repository | Design observed in its public documentation | Useful lesson | Daymark's response |
|---|---|---|---|
| [BhaveshKukreja29/minimi-hiring-challenge](https://github.com/BhaveshKukreja29/minimi-hiring-challenge) — Verbatim | SQLite/FTS5 memory, deterministic dates, parallel Exa search, sentence IDs for verbatim quotations, temporal fact graph | Make evidence inspectable; exact source text is harder to fabricate than free-form quotes | We retain source snippets and hashes and attach sources to claims. Exact sentence-ID quotation rendering remains a possible next feature. |
| [ashusnapx/minimi-hiring-challenge](https://github.com/ashusnapx/minimi-hiring-challenge) | Explicit ambiguity for "last Tuesday", FTS/IDF recall, Exa freshness and `published_after`, background claims/profile/open-loop extraction, due nudges and Memory MCP | Date ambiguity and edited-in-place pages are central failure modes; Minimi's wider product cares about commitments | Daymark now refuses unrelated ambiguous matches and replays historical searches against both current pages and post-baseline pages. It intentionally does not add reminders/MCP outside the one-tool brief. |
| [harshsinha-12/minimi-web-universe](https://github.com/harshsinha-12/minimi-web-universe) | SQLite WAL, versioned memory snapshots, durable consolidation outbox, optional Redis/Pinecone, source-linked memory, bounded conditional rechecks | Memory needs provenance, versioning and recovery semantics as it grows | Daymark prioritizes a small single-user SQLite system. Durable background consolidation and multi-user isolation are deferred until justified by evaluation. |
| [somuai/minimi-agent](https://github.com/somuai/minimi-agent) — Chronos | Describes temporal anchors, relational episodic memory, concurrent search fan-out and a delta matrix. Its README references `aiosqlite`, Pydantic, `httpx` and `rank_bm25`, so it appears to be a Python implementation: useful as a design reference, but not evidence of compliance with the challenge's Node.js rule. | Search work for independent entities should be parallel and results compared explicitly | Daymark batches model tool calls and runs current/since rechecks concurrently, with a request budget. |
| [Harsh-karn/web-search-chat-agent](https://github.com/Harsh-karn/web-search-chat-agent) | SQLite, timezone-aware dates, a strict `web_search` tool, bounded parallel Tavily search and explicit no-history handling | Keep the tool boundary simple and test missing-history cases | Daymark has one exposed tool, a deterministic no-history path and zero-call tests. |
| [Anu27n/minimi-chat-agent](https://github.com/Anu27n/minimi-chat-agent) | SQLite FTS5/BM25, chrono-node, stable citation IDs, typed streaming events and bounded provider adapters | Fast, inspectable retrieval and transport-independent agent logic | Daymark uses FTS5 and deterministic date retrieval. Streaming remains a known gap. |
| [Prajit-22/minimi-chat-agent](https://github.com/Prajit-22/minimi-chat-agent) | Minimal runtime dependencies, custom model client, node:sqlite and lexical recall | Avoid adding frameworks for a small, readable tool loop | Daymark uses Node built-ins and no runtime dependencies. |
| [SanyamWadhwa07/minimi-chat-agent](https://github.com/SanyamWadhwa07/minimi-chat-agent) | Current-page and since-date checks, deterministic recall, provider fallback, reliability tests | A publication-date filter alone misses pages edited in place | Daymark replays previous search queries in both modes. Their self-reported live/offline metrics are not independently verified by this review. |
| [HarshdipSaha/minimi-chat-agent](https://github.com/HarshdipSaha/minimi-chat-agent) | Stores previous query/results; replays current and since-date searches; exact price figure guard; offline and live scenario suites | A price is not unchanged just because the model says so; compare numbers and sources | Daymark normalizes amount, currency, interval and seat/user unit; only snippet-confirmed values can supersede an old ledger claim. |
| [GAURAV-1313/minimi-chat-agent](https://github.com/GAURAV-1313/minimi-chat-agent) | Distinctive cat persona, staged planning/writing, a number/citation guard, separate judge eval | Product personality can make the demo memorable; guards and evals matter more than styling alone | Daymark uses a distinctive "temporal research instrument" interface, without adding serial planner calls to the critical path. |
| [saksham1341/minimi-chat-agent](https://github.com/saksham1341/minimi-chat-agent) | Domain-driven layers, runtime/backend separation, MCP transport, quote/citation/evidence services | Clear ports/adapters make future growth easier | Daymark keeps fewer layers for a one-user challenge MVP; its API and agent core remain separated. |
| [MORYASSHAN/minimi-agent](https://github.com/MORYASSHAN/minimi-agent) — Scout | Cross-session memory, bounded multi-query search, provider fallbacks, caching and structured background claim extraction | Search fan-out and extraction should be budgeted and isolated from answer latency | Daymark sets a fourteen-request per-turn provider budget and retries transient provider errors once. |
| [Aryan1982/minimi-search-agent](https://github.com/Aryan1982/minimi-search-agent) | Stores claims and follow-up searches so rechecks can avoid replanning | The previous research plan is valuable memory, not just the previous prose | Daymark persists original queries and replays them when a clear baseline is recovered. |
| [ritwik-mukherjee/minimi-chat-agent](https://github.com/ritwik-mukherjee/minimi-chat-agent) | Built-in SQLite, direct date routing, explicit no-record responses and a small streaming implementation | Never let a date-recall question become a guessing exercise | Daymark now short-circuits exact missing-history and ambiguous-baseline failures deterministically. |

## What Minimi itself signals

Minimi's public product framing is broader than a web-search chatbot: it emphasizes personal memory, commitments/open loops, and timely nudges. Its site describes the goal as AI that can come to the user, rather than requiring the user to prompt every time. See [Minimi](https://www.projectminimi.com/), [Memory](https://www.projectminimi.com/memory), and [About](https://www.projectminimi.com/about).

The hiring brief is narrower: the submitted agent has one callable tool, web search, and is judged on speed, correctness, memory and architecture. Daymark therefore borrows the *principle* of closing temporal loops—remember the prior decision and verify it—without adding background watchers, reminders, a second tool or an external MCP surface that would distract from the exact brief.

## Competitive synthesis

Most reviewed implementations converge on the same sound baseline:

1. Resolve dates and retrieve history in deterministic application code, not through a second model tool.
2. Store timestamped exchanges and source records together.
3. Use lexical/date retrieval before considering embeddings.
4. Expose one web-search tool, run independent queries concurrently, and bound rounds.
5. Preserve the distinction between changed, unchanged and not verifiable.
6. Test fresh installs, missing memory, ambiguous weekdays, changing facts and failed search.

The design space is not won by adding the most agents or infrastructure. A stronger submission needs a precise failure policy and reproducible evaluation evidence.

## Daymark's intended differentiation

Daymark's differentiator is a **temporal evidence replay protocol**:

- When a unique historical baseline is identified, recover the queries that produced it.
- Re-run those same queries against the present page *and* against pages published since the baseline. This covers both edited-in-place pages and newly published announcements.
- Preserve each receipt with query, publication date, retrieval time and a SHA-256 hash of the returned excerpt.
- Keep price comparison conservative: amount, currency marker, billing interval and per-seat/per-user unit are normalized; an unsupported new claim cannot supersede a supported historical claim.
- If no baseline exists, do not guess. An absent dated record returns without a model or search call; an ambiguous unrelated match asks for clarification.
- Use bounded concurrency and a one-retry policy for transient provider errors, not unbounded agent loops.

This is a specific engineering claim, not a claim that Daymark is already better than every public submission. The evidence needed to make that claim is a held-out live benchmark with manually labelled source support and measured latency. Until API-backed runs are recorded, Daymark's current passing results establish local architecture and deterministic behaviour only.

## Deliberately not copied

- No multi-agent graph just to make the architecture look larger.
- No vector database until FTS5 recall shows measurable misses.
- No Redis/worker/Pinecone deployment complexity for a single-user local challenge app.
- No open-loop reminder service or Memory MCP endpoint in the challenge submission; those belong to a larger product direction, not the specified single-tool agent.
- No broad semantic claim extractor pretending a regex is an entailment model. The current ledger captures a narrow class of explicit prices and labels its support conservatively.

## Sources reviewed

All repositories above were public at the time of review. The analysis is based on their public repository files and docs, not on private Minimi evaluation results or any claimed hiring decisions.
