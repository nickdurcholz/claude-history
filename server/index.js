import express from 'express';
import { readFileSync, existsSync, readdirSync } from 'fs';
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
  if (display.startsWith('!')) return false;
  return true;
}

function projectToSlug(project) {
  return project.replace(/\//g, '-');
}

function getSessionContext(project, sessionId) {
  const slug = projectToSlug(project);
  const convPath = join(CLAUDE_DIR, 'projects', slug, `${sessionId}.jsonl`);
  if (!existsSync(convPath)) return null;

  let maxContext = 0;

  const lines = readFileSync(convPath, 'utf-8').split('\n');
  for (const line of lines) {
    if (!line) continue;
    try {
      const entry = JSON.parse(line);
      const usage = entry.message?.usage;
      if (usage) {
        const context = (usage.input_tokens || 0)
          + (usage.cache_creation_input_tokens || 0)
          + (usage.cache_read_input_tokens || 0);
        if (context > maxContext) maxContext = context;
      }
    } catch {
      // skip malformed lines
    }
  }

  return maxContext;
}

app.get('/api/sessions', (_req, res) => {
  const historyPath = join(CLAUDE_DIR, 'history.jsonl');
  if (!existsSync(historyPath)) {
    return res.json([]);
  }

  const lines = readFileSync(historyPath, 'utf-8').trim().split('\n');
  const entries = [];
  const bashEchoes = new Map();

  for (const line of lines) {
    if (!line) continue;
    const entry = JSON.parse(line);
    entries.push(entry);
    if (entry.display && entry.display.startsWith('!')) {
      if (!bashEchoes.has(entry.sessionId)) {
        bashEchoes.set(entry.sessionId, new Set());
      }
      bashEchoes.get(entry.sessionId).add(entry.display.slice(1));
    }
  }

  const sessionMap = new Map();

  for (const entry of entries) {
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
    session.startTime = Math.min(session.startTime, timestamp);

    if (!isRealUserMessage(display)) continue;
    if (bashEchoes.get(sessionId)?.has(display)) continue;

    if (!session.firstMessage) {
      session.firstMessage = display;
    }
    session.lastMessage = display;
  }

  const sessions = Array.from(sessionMap.values())
    .filter((s) => s.firstMessage)
    .sort((a, b) => b.lastTime - a.lastTime);

  for (const session of sessions) {
    session.durationMs = session.lastTime - session.startTime;
    const maxContext = getSessionContext(session.project, session.sessionId);
    if (maxContext) {
      session.maxContext = maxContext;
    }
  }

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
