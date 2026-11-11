# Daymark — publication and submission checklist

## Public source repository

The complete Daymark v1.1.0 source is published on the `main` branch:

https://github.com/Prakash-codeMaker/daymark-minimi-challenge

The publication commit is:
https://github.com/Prakash-codeMaker/daymark-minimi-challenge/commit/36efc2bb46e0ea086cce431b26b7e955bafec61c

The CI run for that commit passed:
https://github.com/Prakash-codeMaker/daymark-minimi-challenge/actions/runs/43030269939

## Run locally

Requirements: Node.js 22.5+ (uses built-in `node:sqlite`).

```bash
git clone https://github.com/Prakash-codeMaker/daymark-minimi-challenge.git
cd daymark-minimi-challenge
cp .env.example .env
# Add OPENAI_API_KEY and either TAVILY_API_KEY or EXA_API_KEY
npm ci
npm test
npm run check
npm run eval
npm run dev
```

Open http://127.0.0.1:3000. The app binds to localhost by default. It has no authentication or multi-tenant isolation; do not expose it as a public service.

For a real-provider run, add API credentials to the local `.env` and run:

```bash
npm run eval:live
```

The offline evaluator uses synthetic `.invalid` URLs and does not establish live factual accuracy or a private Minimi benchmark score. Inspect live citations manually before submission.

## Before submitting

- [ ] Confirm the repository remains public and the latest `main` commit is present.
- [ ] Configure real API credentials locally and run `npm run eval:live`.
- [ ] Manually inspect representative citations and verify claim support.
- [ ] Record the 60-second walkthrough demonstrating the live app.
- [ ] Submit the repository URL and video through the official challenge process.

Do not commit `.env`, API keys, local database files or private conversation data. `.gitignore` excludes these local artifacts.
