import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const CLAUDE_DIR = process.env.CLAUDE_DIR || join(process.env.HOME, '.claude');

function isRealUserMessage(display) {
  if (!display) return false;
  if (display.startsWith('/')) return false;
  if (display.startsWith('<')) return false;
  return true;
}

app.get('/api/sessions', (_req, res) => {
  const historyPath = join(CLAUDE_DIR, 'history.jsonl');
  if (!existsSync(historyPath)) {
    return res.json([]);
  }

  const lines = readFileSync(historyPath, 'utf-8').trim().split('\n');
  const sessionMap = new Map();

  for (const line of lines) {
    if (!line) continue;
    const entry = JSON.parse(line);
    const { sessionId, timestamp, project, display } = entry;

    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, {
        sessionId,
        project,
        startTime: timestamp,
        lastTime: timestamp,
        firstMessage: null,
        lastMessage: null,
      });
    }

    const session = sessionMap.get(sessionId);
    session.lastTime = Math.max(session.lastTime, timestamp);

    if (isRealUserMessage(display)) {
      if (!session.firstMessage) {
        session.firstMessage = display;
      }
      session.lastMessage = display;
    }
  }

  const sessions = Array.from(sessionMap.values())
    .filter((s) => s.firstMessage)
    .sort((a, b) => b.lastTime - a.lastTime);

  res.json(sessions);
});

// Serve static files in production
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
