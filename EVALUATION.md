# Daymark evaluation plan

## Status at review time

- **27/27 automated tests passed** (`npm test`).
- **4/4 offline architecture scenarios passed** (`npm run eval`).
- **JavaScript syntax checks passed** (`npm run check`).
- The offline suite uses a scripted model and synthetic `.invalid` search results. It is not a factual-accuracy benchmark.
- The live API evaluation has not been run in this workspace because no model/search credentials were configured. Do not report the offline checks as live accuracy or as a result on Minimi's private evaluation.

## Challenge-shaped scenarios

All scenarios run in isolated in-memory SQLite databases with a frozen clock (`2026-11-11`, `Asia/Kolkata`).

1. **Missing history:** no conversation exists for 3 November. Daymark must say no record exists, make zero model/search calls, and invent no prior answer.
2. **Monday CRM shortlist (9 November):** recover HubSpot, Pipedrive, Zoho CRM, Freshsales and Salesforce; replay research; preserve uncertainty where fixtures contain no factual claims.
3. **Explicit date (3 November):** recover the Node.js LTS question and re-check against current and post-baseline results.
4. **Ambiguous weekday:** distinguish 10 November from 3 November. An unrelated React security conversation is seeded on 10 November while the Postgres hosting discussion is on 3 November.

The fixtures are synthetic records and are not claims about the user's real conversations or current vendor prices.

## Commands

```bash
npm ci
npm test
npm run check
npm run eval
npm run eval:live   # requires credentials in .env
npm run dev
```

- `npm test` checks date parsing, ambiguous matching, no-history short-circuit, tool-call closure, concurrent historical rechecks, FTS5 retrieval, migrations, evidence persistence, conservative price support and transient search retry behaviour.
- `npm run eval` replays the four challenge-shaped scenarios with mocked model and search responses. It validates memory retrieval, one-tool wiring, date cutoffs, current/since search replay, source registry output and honest uncertainty. It deliberately uses synthetic URLs and facts.
- `npm run eval:live` runs the same fixtures against the configured OpenAI-compatible chat endpoint and Tavily/Exa. The JSON report is saved under `eval/reports/`. Automated checks are triage signals; inspect each cited page manually.

## Evidence ledger

A source snapshot stores URL, title, provider, search query, publication date (if supplied), retrieval time and SHA-256 of the returned text excerpt. A price claim stores subject, detected plan, amount, currency marker, billing interval, per-user/per-seat unit, source IDs, exact answer sentence and support status. A like-for-like normalized claim is compared with the most recent snippet-confirmed predecessor.

The extractor is intentionally narrow and regex-based. It captures explicit price sentences with recognizable subjects; it is not a general-purpose fact extractor. A citation ID alone is not proof. The snippet audit checks that the excerpt contains the subject, number, interval, unit and currency marker before marking it `snippet-confirmed`. Unsupported values remain unverified and cannot supersede a verified baseline. A bare `$` is `DOLLAR_UNSPECIFIED`, not assumed USD.

## Human review rubric

For every vendor or item, check:

1. Did Daymark recover the correct historical conversation and state the date used?
2. Is the historical value actually in the saved answer and source excerpt?
3. Does the current excerpt support the new claim, including plan, region, currency, interval and user/seat units?
4. Does an alleged change have evidence published after the baseline, or is it only a current-page difference with unknown timing?
5. Does the agent distinguish changed, unchanged/still supported, corrected and unverifiable?
6. Does it disclose conflicting or undated sources and avoid converting a failed search into “unchanged”?
7. Record total latency, visible event latency, search-provider requests, number of receipts, errors and human support judgments.

Do not turn the automated string checks into a percentage accuracy score. A defensible benchmark needs held-out conversation fixtures and human-labelled claim/source support.
