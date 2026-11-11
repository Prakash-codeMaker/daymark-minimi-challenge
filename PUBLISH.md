# Publish Daymark source to the public GitHub repository

The public repository already exists at:

<https://github.com/Prakash-codeMaker/daymark-minimi-challenge>

The companion archive contains the complete Daymark v1.1.0 project. To add those files to the already-initialized remote repository:

1. Download and extract `daymark-minimi-challenge-v1.1.0-ready-to-publish.zip`.
2. Clone the public repository:

```bash
git clone https://github.com/Prakash-codeMaker/daymark-minimi-challenge.git daymark-minimi-challenge-github
```

3. Copy the *contents* of the extracted `daymark-minimi-challenge` folder into the cloned `daymark-minimi-challenge-github` folder. Keep the cloned `.git` directory. Run the appropriate command from the parent directory:

```powershell
Copy-Item -Path .\daymark-minimi-challenge\* -Destination .\daymark-minimi-challenge-github\ -Recurse -Force
```

On macOS/Linux:

```bash
cp -a ./daymark-minimi-challenge/. ./daymark-minimi-challenge-github/
```

4. From inside the cloned repository, commit and push:

```bash
cd daymark-minimi-challenge-github
git add .
git status
git commit -m "Publish Daymark temporal web research agent v1.1.0"
git push origin main
```

Review `git status` before committing. `.gitignore` excludes `.env`, local database files and `node_modules`; do not add API keys or private conversation data.

## Local run

Requirements: Node.js 22.5+ (uses built-in `node:sqlite`).

```bash
cp .env.example .env
# Add OPENAI_API_KEY and either TAVILY_API_KEY or EXA_API_KEY
npm ci
npm run dev
```

Open <http://127.0.0.1:3000>. The app binds to localhost by default. It has no authentication or multi-tenant isolation; do not expose it as a public service.

## Verify before submission

```bash
npm test
npm run check
npm run eval
npm run eval:live
```

`npm run eval:live` requires real API credentials. Inspect every live citation manually. The offline evaluator uses synthetic `.invalid` URLs and is not evidence of live factual accuracy or a private Minimi benchmark score.
