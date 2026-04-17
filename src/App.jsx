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
  const [copied, setCopied] = useState(false);
  const hasDistinctLast = session.lastMessage
    && session.firstMessage
    && session.lastMessage !== session.firstMessage;

  const resumeText = `--resume ${session.sessionId}`;

  const handleCardClick = async () => {
    await navigator.clipboard.writeText(resumeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className={`card ${copied ? 'card--copied' : ''}`} onClick={handleCardClick}>
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
        <code className="resume-cmd">{copied ? 'Copied!' : resumeText}</code>
      </div>
    </div>
  );
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cutoff, setCutoff] = useState(Date.now() - SEVEN_DAYS);
  const [project, setProject] = useState('');

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
          <SessionCard key={s.sessionId} session={s} />
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
