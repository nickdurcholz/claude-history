# CLAUDE.md

## Project overview

cc-dash is a single-page React app with an Express backend for browsing Claude Code session history. It is a personal productivity tool, not distributed.

## Architecture

- `server/index.js` — Express server. Reads `$CLAUDE_DIR/history.jsonl` (defaults to `~/.claude`). Single API endpoint: `GET /api/sessions`. In production, also serves the Vite build output from `dist/`.
- `src/App.jsx` — Entire React UI in one file. Card-based layout, click-to-copy resume args.
- `src/index.css` — All styles. Dark theme, IBM Plex fonts via Google Fonts CDN.
- `src/main.jsx` — React entry point. Nothing interesting here.

## Data format

`history.jsonl` has one JSON object per line with fields: `display` (user input text), `timestamp` (epoch ms), `project` (working directory), `sessionId` (UUID), `pastedContents` (object).

A "real user message" is one where `display` does not start with `/` (slash command), `<` (system message), or `!` (bash command). Sessions with no real user messages are filtered out.

## Building and running

```bash
npm install
npm run build          # Vite build → dist/
npm run server         # Express on port 3210 (or $PORT)
npm run dev            # Vite dev server with proxy to :3210
```

Docker:
```bash
docker build -t cc-dash .
docker run -d --name claude-history --restart unless-stopped -p 3210:3210 -v ~/.claude:/.claude:ro cc-dash
```

## Key details

- The Dockerfile uses a multi-stage build. The production image only has Express (no Vite/React dev deps).
- In Docker, `CLAUDE_DIR` is set to `/.claude` (the mount point). Locally it defaults to `$HOME/.claude`.
- The Express server port defaults to 3210 (set via `$PORT` env var) both locally and in Docker.
- Vite dev server proxies `/api` to `http://localhost:3210` (configured in `vite.config.js`).
- No tests exist. To verify changes: `npm run build` and check the API response with `curl http://localhost:3210/api/sessions`.
