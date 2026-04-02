import React, { useEffect, useState, useMemo } from 'react';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
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

const SORT_KEYS = {
  time: (s) => s.startTime,
  directory: (s) => (s.project || '').toLowerCase(),
  resume: (s) => s.sessionId,
  first: (s) => (s.firstMessage || '').toLowerCase(),
  last: (s) => (s.lastMessage || '').toLowerCase(),
};

function SortHeader({ label, sortKey, currentSort, onSort }) {
  const active = currentSort.key === sortKey;
  const arrow = active ? (currentSort.asc ? ' \u25B2' : ' \u25BC') : '';

  return (
    <th onClick={() => onSort(sortKey)} className="sortable-th">
      {label}{arrow}
    </th>
  );
}

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState({ key: 'time', asc: false });

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

  const sorted = useMemo(() => {
    const fn = SORT_KEYS[sort.key];
    return [...sessions].sort((a, b) => {
      const av = fn(a), bv = fn(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.asc ? cmp : -cmp;
    });
  }, [sessions, sort]);

  const handleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, asc: !prev.asc } : { key, asc: true }
    );
  };

  if (loading) return <div className="status">Loading...</div>;
  if (error) return <div className="status error">Error: {error}</div>;
  if (!sessions.length) return <div className="status">No sessions found.</div>;

  return (
    <div className="container">
      <header className="page-header">
        <h1>Claude Code History</h1>
        <span className="subtitle">{sessions.length} sessions</span>
      </header>
      <table>
        <thead>
          <tr>
            <SortHeader label="Time" sortKey="time" currentSort={sort} onSort={handleSort} />
            <SortHeader label="Directory" sortKey="directory" currentSort={sort} onSort={handleSort} />
            <SortHeader label="Resume" sortKey="resume" currentSort={sort} onSort={handleSort} />
            <SortHeader label="First Message" sortKey="first" currentSort={sort} onSort={handleSort} />
            <SortHeader label="Last Message" sortKey="last" currentSort={sort} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.sessionId}>
              <td className="cell-time">{formatTime(s.startTime)}</td>
              <td className="cell-dir">{shortenDir(s.project)}</td>
              <td className="cell-session">
                <ClickToCopy text={`--resume ${s.sessionId}`} />
              </td>
              <td className="cell-msg">{s.firstMessage || '\u2014'}</td>
              <td className="cell-msg">{s.lastMessage || '\u2014'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
