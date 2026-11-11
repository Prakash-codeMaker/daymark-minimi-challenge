import fs from 'node:fs';

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}
loadEnv();

export const config = {
  port: Number(process.env.PORT || 3000),
  timezone: process.env.TIMEZONE || 'Asia/Kolkata',
  databasePath: process.env.DATABASE_PATH || './data/daymark.sqlite',
  openaiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
  model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  tavilyKey: process.env.TAVILY_API_KEY || '',
  exaKey: process.env.EXA_API_KEY || '',
  searchProvider: process.env.SEARCH_PROVIDER || 'auto',
  maxToolRounds: Math.max(1, Math.min(5, Number(process.env.MAX_TOOL_ROUNDS || 3))),
  maxSearchResults: Math.max(1, Math.min(8, Number(process.env.MAX_SEARCH_RESULTS || 5)))
};
