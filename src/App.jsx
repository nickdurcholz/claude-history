import React, { useEffect, useState } from 'react';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    + ' \u00b7 ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function shortenDir(path) {
  if (!path) return '';
  return path
    .replace(/^\/home\/[^/]+/, '~')
    .replace(/^C:\\Users\\[^\\]+/, '~');
}

function ClickToCopy({ text }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <code
      className={`resume-cmd ${copied ? 'resume-cmd--copied' : ''}`}
      onClick={handleClick}
      title="Click to copy"
    >
      {copied ? 'Copied!' : text}
    </code>
  );
}

function SessionCard({ session }) {
  const hasDistinctLast = session.lastMessage
    && session.firstMessage
    && session.lastMessage !== session.firstMessage;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-time">{formatTime(session.lastTime)}</span>
        <span className="card-dir">{shortenDir(session.project)}</span>
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
        <ClickToCopy text={`--resume ${session.sessionId}`} />
      </div>
    </div>
  );
}

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) return <div className="status">Loading...</div>;
  if (error) return <div className="status error">Error: {error}</div>;
  if (!sessions.length) return <div className="status">No sessions found.</div>;

  return (
    <div className="container">
      <header className="page-header">
        <h1>Claude Code History</h1>
        <span className="subtitle">{sessions.length} sessions</span>
      </header>
      <div className="card-grid">
        {sessions.map((s) => (
          <SessionCard key={s.sessionId} session={s} />
        ))}
      </div>
    </div>
  );
}
