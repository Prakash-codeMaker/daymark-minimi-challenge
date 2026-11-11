# Security notes

Daymark is a local challenge MVP, not a hardened multi-user service.

- The server binds to `127.0.0.1` by default.
- There is no authentication, account isolation, CSRF protection, rate limiting or production deployment boundary. Do not expose the server to an untrusted network.
- Keep API keys in `.env`; never commit `.env`, logs or SQLite databases.
- Recalled conversation text and web excerpts are treated as untrusted data, not instructions.
- The model can call only `web_search`; the harness validates tool name, arguments, dates, parallel-call count, search budget and round count.
- Search providers control their result URLs and snippets. Treat snippets as untrusted text and verify claims at the linked source before relying on them.
- Database migrations are forward-only and preserve local history. Back up the SQLite file before making manual schema changes.

Before any public deployment, add authentication, per-user database isolation, CSRF/rate controls, request logging with redaction, deletion/export controls, dependency scanning, and an explicit retention policy.
