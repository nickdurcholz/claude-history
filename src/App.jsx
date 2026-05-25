import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function shortenDir(path) {
  if (!path) return '';
  return path
    .replace(/^\/home\/[^/]+/, '~')
    .replace(/^C:\\Users\\[^\\]+/, '~');
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return null;
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return '<1m';
  if (totalMin < 60) return `${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatTokens(n) {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function SessionCard({ session, onOpen }) {
  const [copied, setCopied] = useState(false);
  const hasDistinctLast = session.lastMessage
    && session.firstMessage
    && session.lastMessage !== session.firstMessage;

  const resumeText = `(cd ${session.project} && claude --resume ${session.sessionId})`;

  const handleResumeClick = async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(resumeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="card" onClick={() => onOpen(session)}>
      <div className="card-header">
        <span className="card-time">{formatTime(session.lastTime)}</span>
        <span className="card-dir">{shortenDir(session.project)}</span>
      </div>

      <div className="card-stats">
        {formatDuration(session.durationMs) && (
          <span className="stat">{formatDuration(session.durationMs)}</span>
        )}
        {session.maxContext > 0 && (
          <span className="stat">{formatTokens(session.maxContext)} context</span>
        )}
      </div>

      <div className="card-body">
        {session.firstMessage && (
          <p className="card-msg card-msg--first">
            <span className="msg-label">{hasDistinctLast ? 'First:' : 'User message:'}</span>
            {session.firstMessage}
          </p>
        )}
        {hasDistinctLast && (
          <p className="card-msg card-msg--last">
            <span className="msg-label">Last:</span> {session.lastMessage}
          </p>
        )}
      </div>

      <div className="card-footer">
        <code
          className={`resume-cmd resume-cmd--clickable ${copied ? 'resume-cmd--copied' : ''}`}
          onClick={handleResumeClick}
          title="Click to copy"
        >
          {copied ? 'Copied!' : resumeText}
        </code>
      </div>
    </div>
  );
}

function summarizeToolInput(name, input) {
  if (!input || typeof input !== 'object') return '';
  if (name === 'Bash') return input.command || '';
  if (name === 'Read' || name === 'Write' || name === 'Edit' || name === 'MultiEdit') {
    return input.file_path || '';
  }
  if (name === 'Glob') return input.pattern || '';
  if (name === 'Grep') return input.pattern || '';
  if (name === 'WebFetch') return input.url || '';
  if (name === 'WebSearch') return input.query || '';
  if (name === 'Agent' || name === 'Task') return input.description || '';
  const firstKey = Object.keys(input)[0];
  if (firstKey) {
    const v = input[firstKey];
    if (typeof v === 'string') return v;
  }
  return '';
}

function truncate(s, n) {
  if (s.length <= n) return s;
  return s.slice(0, n) + `\n[…truncated, ${s.length - n} more chars]`;
}

function Block({ block }) {
  if (block.type === 'text') {
    return (
      <div className="conv-text">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.text}</ReactMarkdown>
      </div>
    );
  }
  if (block.type === 'tool_use') {
    const summary = summarizeToolInput(block.name, block.input);
    return (
      <div className="conv-tool-use">
        <span className="conv-tool-name">{block.name}</span>
        {summary && <pre className="conv-tool-summary">{summary}</pre>}
      </div>
    );
  }
  if (block.type === 'tool_result') {
    if (!block.text) return null;
    return (
      <details className={`conv-tool-result ${block.isError ? 'conv-tool-result--error' : ''}`}>
        <summary>{block.isError ? 'tool error' : 'tool result'} ({block.text.length} chars)</summary>
        <pre>{truncate(block.text, 8000)}</pre>
      </details>
    );
  }
  if (block.type === 'thinking') {
    return (
      <details className="conv-thinking">
        <summary>thinking</summary>
        <pre>{block.text}</pre>
      </details>
    );
  }
  return null;
}

function ConversationView({ session, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const resumeText = `(cd ${session.project} && claude --resume ${session.sessionId})`;

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = `/api/sessions/${session.sessionId}/messages?project=${encodeURIComponent(session.project)}`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session.sessionId, session.project]);

  const handleCopyResume = async () => {
    await navigator.clipboard.writeText(resumeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="conv-container">
      <header className="conv-header">
        <button className="conv-back" onClick={onBack} title="Back to list">← Back</button>
        <div className="conv-header-meta">
          <div className="conv-header-time">{formatTime(session.lastTime)}</div>
          <div className="conv-header-dir">{shortenDir(session.project)}</div>
        </div>
        <code
          className={`resume-cmd resume-cmd--clickable ${copied ? 'resume-cmd--copied' : ''}`}
          onClick={handleCopyResume}
          title="Click to copy"
        >
          {copied ? 'Copied!' : resumeText}
        </code>
      </header>

      {loading && <div className="status">Loading…</div>}
      {error && <div className="status error">Error: {error}</div>}

      {data && (
        <div className="conv-messages">
          {data.messages.length === 0 && (
            <div className="status">No messages.</div>
          )}
          {data.messages.map((m, i) => (
            <div key={i} className={`conv-msg conv-msg--${m.role}`}>
              <div className="conv-msg-role">{m.role}</div>
              <div className="conv-msg-body">
                {m.blocks.map((b, j) => <Block key={j} block={b} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function parseHash() {
  const m = window.location.hash.match(/^#\/session\/([^/?]+)$/);
  return m ? m[1] : null;
}

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cutoff, setCutoff] = useState(Date.now() - SEVEN_DAYS);
  const [project, setProject] = useState('');
  const [selectedId, setSelectedId] = useState(parseHash);

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setSessions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onPop = () => setSelectedId(parseHash());
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  const openSession = (session) => {
    window.history.pushState({}, '', `#/session/${session.sessionId}`);
    setSelectedId(session.sessionId);
  };

  const closeSession = () => {
    window.history.pushState({}, '', '#/');
    setSelectedId(null);
  };

  if (loading) return <div className="status">Loading...</div>;
  if (error) return <div className="status error">Error: {error}</div>;
  if (!sessions.length) return <div className="status">No sessions found.</div>;

  if (selectedId) {
    const session = sessions.find((s) => s.sessionId === selectedId);
    if (session) {
      return <ConversationView session={session} onBack={closeSession} />;
    }
  }

  const projectCounts = sessions.reduce((acc, s) => {
    const key = shortenDir(s.project) || '(unknown)';
    acc.set(key, (acc.get(key) || 0) + 1);
    return acc;
  }, new Map());
  const projectOptions = [...projectCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const projectFiltered = project
    ? sessions.filter((s) => (shortenDir(s.project) || '(unknown)') === project)
    : sessions;
  const visible = projectFiltered.filter((s) => s.lastTime >= cutoff);
  const hasMore = visible.length < projectFiltered.length;

  return (
    <div className="container">
      <header className="page-header">
        <img src="/favicon.png" alt="" className="page-logo" />
        <h1>Claude Code History</h1>
        <span className="subtitle">{visible.length} of {projectFiltered.length} sessions</span>
        <select
          className="project-filter"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        >
          <option value="">All projects</option>
          {projectOptions.map(([name, count]) => (
            <option key={name} value={name}>{name} ({count})</option>
          ))}
        </select>
      </header>
      <div className="card-grid">
        {visible.map((s) => (
          <SessionCard key={s.sessionId} session={s} onOpen={openSession} />
        ))}
      </div>
      {hasMore && (
        <button className="load-more" onClick={() => setCutoff(cutoff - SEVEN_DAYS)}>
          Load more
        </button>
      )}
    </div>
  );
}
