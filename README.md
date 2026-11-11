# Daymark — Minimi hiring challenge

[![Daymark CI](https://github.com/Prakash-codeMaker/daymark-minimi-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/Prakash-codeMaker/daymark-minimi-challenge/actions/workflows/ci.yml)

**A temporal research instrument:** one web-search tool, deterministic dated memory, and replayable evidence for checking whether old answers still hold.

Daymark keeps original conversations and research receipts together. When it identifies a historical baseline, it replays the original queries against both current pages and pages published since that date. When no safe baseline exists, it says so instead of guessing.

## Requirements and setup

- Node.js 22.5+ (uses built-in `node:sqlite`)
- An OpenAI-compatible chat-completions API with function/tool calling
- Either a Tavily or Exa search key

```bash
cp .env.example .env
# Add OPENAI_API_KEY and either TAVILY_API_KEY or EXA_API_KEY
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The app binds to localhost by default. Do not expose the server publicly: this challenge MVP has no user authentication or multi-tenant isolation.

## Verify

```bash
npm test       # 27 deterministic unit/integration checks
npm run check  # syntax checks
npm run eval   # four mocked challenge-shaped replays
npm run eval:live  # real model + real web search; requires credentials
```

The offline evaluation deliberately uses synthetic `.invalid` URLs and cannot establish live factual accuracy. Read `EVALUATION.md` before interpreting its results.

## Architecture

- `src/dates.js` — deterministic timezone-local date resolution, preserving ambiguous readings.
- `src/db.js` — SQLite store, FTS5 retrieval, source snapshots, evidence links and like-for-like price ledger.
- `src/search.js` — a normalized `web_search` implementation over Tavily or Exa, with bounded transient retries.
- `src/agent.js` — memory-first harness, historical query replay, dual-mode current/since verification, one-tool model loop, stable citation registry and conservative evidence audit.
- `src/server.js` — local HTTP API and static app.
- `public/index.html` — three-panel temporal research interface: memory index, conversation and evidence rail.
- `eval/` — frozen challenge scenarios, offline replay, live runner and JSON reports.
- `.github/workflows/ci.yml` — installs, syntax checks, tests and offline challenge replay on push/PR.

The model receives exactly one callable function: `web_search`. Memory lookup, query replay and evidence persistence are application-side code, not extra tools.

## Release status

The offline release checks are documented in `RELEASE_STATUS.md`. The live evaluation requires your own API keys in `.env`; the maintainers of this project should manually inspect every source in the generated live report. The source is published at <https://github.com/Prakash-codeMaker/daymark-minimi-challenge>; see `PUBLISH.md` for the final submission checklist.

## Research and design notes

- `DESIGN.md` — one-page architecture and trade-offs.
- `COMPETITOR_REVIEW.md` — comparison of public Minimi challenge repositories and design implications.
- `EVALUATION.md` — scenarios, automated checks, evidence model and manual-review rubric.
- `PUBLISH.md` — local run instructions and final challenge-submission checklist.
- `RELEASE_STATUS.md` — verified checks and current blockers.
- `VIDEO_SCRIPT.md` — 60-second walkthrough script.

## API

- `GET /api/health` — reports whether model and search credentials are configured.
- `GET /api/history?conversationId=...` — returns recent conversation turns and sources.
- `GET /api/claims?subject=...` — lists captured price claims and their provenance.
- `GET /api/evidence?turnId=...` — lists source/claim evidence associated with a turn.
- `POST /api/chat` — accepts `{ "message": "...", "conversationId": "optional" }`.

## Environment

See `.env.example`. `SEARCH_PROVIDER=auto` prefers Exa when configured; otherwise it uses Tavily. Keep `.env`, database files and API keys out of Git.

## Known limitations

- The parser supports common explicit dates, weekdays, today/yesterday and N days/weeks ago; it is not a full natural-language temporal parser.
- Claim extraction is conservative, heuristic and price-only. It is not semantic fact extraction or a citation-entailment model.
- Search receipts are provider excerpts and URLs, not guaranteed full-page snapshots. Publication dates can be absent or imperfect.
- The chat-completions loop is non-streaming. Streaming, cancellation and richer progress updates remain future work.
- This is a single-user local MVP without authentication or multi-tenant isolation. Do not deploy it as a public service.
- Live factual quality and Minimi's private benchmark have not been measured here. No superiority claim is made based on mocked evaluation results.
