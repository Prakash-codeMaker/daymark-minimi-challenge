# Daymark v1.1.0 — release verification status

**Verification date:** 11 November 2026  
**Runtime:** Node.js 22.16.0, npm 10.9.2

## Checks run in this workspace

| Check | Result | Notes |
|---|---:|---|
| `npm ci` | Pass | Clean install; npm audit reported 0 vulnerabilities |
| `npm test` | Pass | 27 tests passed, 0 failed |
| `npm run check` | Pass | All configured JavaScript syntax checks passed |
| `npm run eval` | Pass | 4/4 challenge scenarios and 4/4 ledger checks passed |
| Archive extraction | Pass | Release archive contents listed and verified |

The offline evaluation uses synthetic `.invalid` URLs and a scripted model. It validates architecture and deterministic behaviour only. It does not establish live fact accuracy, live citation support, or a result against Minimi's private evaluation.

## Live evaluation

`npm run eval:live` was attempted and stopped at credential preflight because `OPENAI_API_KEY` is not configured in this workspace. No live model or search-provider request was made. A live run needs `OPENAI_API_KEY` and either `TAVILY_API_KEY` or `EXA_API_KEY` in a local `.env` file.

## GitHub publication state

The public repository exists at <https://github.com/Prakash-codeMaker/daymark-minimi-challenge>. Its current `main` branch contains the repository handoff README only; the full v1.1.0 application source still needs to be copied from the companion archive and pushed. `PUBLISH.md` contains the exact commands. Do not submit the README-only branch as the completed application.

## Remaining release gates

1. Copy the source archive contents into the cloned public repository and push to `main`.
2. Configure API credentials locally and run `npm run eval:live`.
3. Manually inspect each cited page and confirm that every citation supports its attached claim.
4. Confirm GitHub Actions CI is green on `main`.
5. Record the 60-second video only after the live flow has been demonstrated.
