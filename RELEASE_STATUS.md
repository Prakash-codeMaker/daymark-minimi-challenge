# Daymark v1.1.0 — release verification status

**Verification date:** 11 November 2026  
**Runtime used for local verification:** Node.js 22.16.0, npm 10.9.2

## Local release checks

| Check | Result | Notes |
|---|---:|---|
| `npm ci` | Pass | Clean install; npm audit reported 0 vulnerabilities |
| `npm test` | Pass | 27 tests passed, 0 failed |
| `npm run check` | Pass | All configured JavaScript syntax checks passed |
| `npm run eval` | Pass | 4/4 challenge scenarios and 4/4 ledger checks passed |
| Archive extraction | Pass | Release archive contents listed and verified |

The offline evaluation uses synthetic `.invalid` URLs and a scripted model. It validates architecture and deterministic behaviour only. It does not establish live factual accuracy, live citation support, or a result against Minimi's private evaluation.

## GitHub publication

**Status: published to the public `main` branch.**

Repository: https://github.com/Prakash-codeMaker/daymark-minimi-challenge  
Published commit: https://github.com/Prakash-codeMaker/daymark-minimi-challenge/commit/36efc2bb46e0ea086cce431b26b7e955bafec61c

The published tree includes the app source, static UI, tests, offline/live evaluation runners, evaluation report, one-page design document, competitor review, security notes, environment template, and GitHub Actions workflow.

## Continuous integration

**GitHub Actions: passed** for commit `36efc2bb46e0ea086cce431b26b7e955bafec61c`.

The `Daymark CI` workflow completed successfully on 11 November 2026. Its steps included dependency installation, JavaScript syntax checks, offline tests and challenge-scenario replay.

Workflow run: https://github.com/Prakash-codeMaker/daymark-minimi-challenge/actions/runs/43030269939

## Live evaluation

`npm run eval:live` was attempted in the original build workspace and stopped at credential preflight because `OPENAI_API_KEY` was not configured. No live model or search-provider request was made. A live run needs `OPENAI_API_KEY` and either `TAVILY_API_KEY` or `EXA_API_KEY` in a local `.env` file.

## Remaining release gates

1. Configure API credentials locally and run `npm run eval:live`.
2. Manually inspect each cited page and confirm every citation supports its attached claim.
3. Record the 60-second walkthrough after demonstrating the live flow.
4. Submit the public repository URL and video using the challenge's official submission process.

Do not represent mocked/offline results as live factual accuracy or as a score against Minimi's private benchmark.
