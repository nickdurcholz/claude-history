# cc-dash

A personal dashboard for browsing Claude Code conversation history. Reads the `~/.claude/history.jsonl` file and presents sessions as clickable cards showing timestamps, directories, and message previews.

Click any card to copy its `--resume <sessionId>` argument to your clipboard so you can quickly resume a session.

## Running with Docker

Build and run:

```bash
docker build -t cc-dash .
docker run -d \
  --name claude-history \
  --restart unless-stopped \
  -p 3000:3000 \
  -v ~/.claude:/.claude:ro \
  cc-dash
```

Then open http://localhost:3000.

## Local development

```bash
npm install

# Terminal 1: backend (reads ~/.claude/history.jsonl)
npm run server

# Terminal 2: frontend with hot reload (proxies /api to backend)
npm run dev
```

The Vite dev server proxies `/api` requests to the Express backend on port 3001.

## How it works

- **Backend** (`server/index.js`): Express server that reads `history.jsonl`, groups entries by session ID, filters out sessions with no real user messages (slash commands and system messages starting with `<` are excluded), and serves the result via `GET /api/sessions`.
- **Frontend** (`src/App.jsx`): React app that fetches session data and renders a card grid. Each card shows the last activity timestamp, working directory, first/last user messages, and a resume command.
