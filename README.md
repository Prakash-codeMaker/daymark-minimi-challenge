# Daymark — Minimi hiring challenge

**A temporal research instrument:** one web-search tool, deterministic dated memory, and replayable evidence for checking whether old answers still hold.

Daymark keeps original conversations and research receipts together. When it identifies a historical baseline, it replays the original queries against both current pages and pages published since that date. When no safe baseline exists, it says so instead of guessing.

## Current repository state

This public repository has been created and initialized. The complete v1.1.0 source release is currently available as the companion archive from the project handoff; its files still need to be copied into this repository before using this GitHub URL as the final challenge submission. Do not treat this README-only commit as the completed application.

## Requirements and setup

- Node.js 22.5+ (uses built-in `node:sqlite`)
- An OpenAI-compatible chat-completions API with function/tool calling
- Either a Tavily or Exa search key

Once the application files are added:

```bash
cp .env.example .env
# Add OPENAI_API_KEY and either TAVILY_API_KEY or EXA_API_KEY
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The app binds to localhost by default. Do not expose the server publicly: this challenge MVP has no user authentication or multi-tenant isolation.

## Verify

```bash
npm test
npm run check
npm run eval
npm run eval:live  # real model + real web search; requires credentials
```

The offline evaluation deliberately uses synthetic `.invalid` URLs and cannot establish live factual accuracy. Read `EVALUATION.md` before interpreting its results.

## Architecture

- `src/dates.js` — deterministic timezone-local date resolution, preserving ambiguous readings.
- `src/db.js` — SQLite store, FTS5 retrieval, source snapshots, evidence links and like-for-like price ledger.
- `src/search.js` — normalized `web_search` implementation over Tavily or Exa, with bounded transient retries.
- `src/agent.js` — memory-first harness, historical query replay, dual-mode current/since verification, one-tool model loop, stable citation registry and conservative evidence audit.
- `src/server.js` — local HTTP API and static app.
- `public/index.html` — temporal research interface: memory index, conversation and evidence rail.
- `eval/` — frozen challenge scenarios, offline replay, live runner and JSON reports.
- `.github/workflows/ci.yml` — install, syntax checks, tests and offline challenge replay on push/PR.

The model receives exactly one callable function: `web_search`. Memory lookup, query replay and evidence persistence are application-side code, not extra tools.

## Design and evaluation notes

- `DESIGN.md` — one-page architecture and trade-offs.
- `COMPETITOR_REVIEW.md` — review of public Minimi challenge repositories and design implications.
- `EVALUATION.md` — scenarios, automated checks, evidence model and manual-review rubric.
- `RELEASE_STATUS.md` — verified checks and current blockers.
- `VIDEO_SCRIPT.md` — 60-second walkthrough script.

## Known limitations

- Offline tests and replays validate deterministic architecture behavior, not live factual accuracy.
- The parser supports common explicit dates, weekdays, today/yesterday and N days/weeks ago; it is not a full natural-language temporal parser.
- Claim extraction is conservative, heuristic and price-only. It is not semantic fact extraction or a citation-entailment model.
- Search receipts are provider excerpts and URLs, not guaranteed full-page snapshots. Publication dates can be absent or imperfect.
- The chat-completions loop is non-streaming.
- This is a single-user local MVP without authentication or multi-tenant isolation. Do not deploy it as a public service.
- Live factual quality and Minimi's private benchmark have not been measured. No superiority claim is made based on mocked evaluation results.
