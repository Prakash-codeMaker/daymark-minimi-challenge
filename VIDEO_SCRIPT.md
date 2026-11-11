# 60-second Minimi challenge video script

**0–8 sec — The problem**  
"I built Daymark for the hard part of this challenge: remembering not just what was asked, but when it was asked and what evidence supported the answer."

**8–20 sec — Architecture**  
"Dates and memory are handled in deterministic Node code with SQLite and FTS5. The model gets exactly one tool: web search. No memory tool, no multi-agent graph and no guessing when a date is ambiguous."

**20–37 sec — Differentiator**  
"When Daymark finds an old research exchange, it replays the original searches twice: once against the current page, and once for pages published since the old answer. That matters because pricing pages are often edited in place. Each receipt is stored with its query, publication date and a hash of the excerpt."

**37–49 sec — Evidence discipline**  
"A price only enters the ledger when its cited excerpt contains the subject, amount, interval, unit and currency marker. A failed search is not an unchanged result. An unsupported claim cannot overwrite a supported baseline."

**49–60 sec — Reliability and close**  
"I added deterministic tests for missing history, ambiguous dates, tool-loop failures and transient search errors, plus a CI workflow. The offline fixtures are explicitly synthetic; live factual accuracy still needs a credential-backed run. That's Daymark: a small agent that can show its work."

**Recording note:** show the live UI, then one successful re-check with actual configured providers. Do not present mocked `.invalid` citations as real search results or claim live benchmark accuracy unless you have run and manually reviewed it.
