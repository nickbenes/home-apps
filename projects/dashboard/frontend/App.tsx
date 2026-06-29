import React from 'react';
import { createRoot } from 'react-dom/client';

interface IssueItem { status: string; text: string; raisedBy?: string; priority?: string }
interface ReminderItem { status: string; text: string; nextSurfaced?: string }
interface Todo { id: number; title: string; completed: boolean }
interface RecentNote { filename: string; path: string; firstLine: string }
interface Tiles {
  issuesBacklog: { count: number; items: IssueItem[] };
  reminders: { count: number; items: ReminderItem[] };
  todos: { count: number; items: Todo[] };
  inbox: { backlogCount: number };
  research: { recent: RecentNote[] };
  newsletterDigest: { latest: RecentNote | null };
  emailTriage: { latest: RecentNote | null };
  xo: { latestSessionLog: RecentNote | null };
}

interface Issue {
  id: string;
  section: 'open' | 'resolved';
  status: string;
  text: string;
  raisedBy?: string;
  raised?: string;
  priority?: string;
  statusField?: string;
  resolved?: { date: string; note?: string };
  notes?: string;
}

function Tile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px',
      background: '#fff', minHeight: '140px',
    }}>
      <h3 style={{ margin: '0 0 10px', fontSize: '15px', color: '#1e293b' }}>{title}</h3>
      <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

const PRIORITIES = ['high', 'medium', 'low'];
const STATUSES = ['open', 'discussing', 'resolved'];

const priorityColor: Record<string, string> = {
  high: '#b91c1c',
  medium: '#b45309',
  low: '#475569',
};

function StatusBadge({ status }: { status: string }) {
  const bg = status === 'resolved' ? '#dcfce7' : status === 'discussing' ? '#fef3c7' : '#e0e7ff';
  const fg = status === 'resolved' ? '#166534' : status === 'discussing' ? '#92400e' : '#3730a3';
  return (
    <span style={{
      display: 'inline-block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
      padding: '2px 8px', borderRadius: '10px', background: bg, color: fg, marginRight: '8px',
    }}>
      {status}
    </span>
  );
}

function IssueRow({
  issue, onMoveUp, onMoveDown, onUpdate, onResolve, isFirst, isLast,
}: {
  issue: Issue;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onUpdate?: (updates: { priority?: string; status?: string }) => void;
  onResolve?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const isOpen = issue.section === 'open';
  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px',
      background: '#fff', display: 'flex', gap: '12px', alignItems: 'flex-start',
    }}>
      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button
            disabled={isFirst}
            onClick={onMoveUp}
            style={{ cursor: isFirst ? 'default' : 'pointer', opacity: isFirst ? 0.3 : 1, border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', fontSize: '11px', padding: '2px 6px' }}
          >▲</button>
          <button
            disabled={isLast}
            onClick={onMoveDown}
            style={{ cursor: isLast ? 'default' : 'pointer', opacity: isLast ? 0.3 : 1, border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', fontSize: '11px', padding: '2px 6px' }}
          >▼</button>
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '6px' }}>
          <StatusBadge status={issue.status} />
          <span style={{ fontSize: '13px', color: '#1e293b' }}>{issue.text}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
          {issue.raisedBy && <span>raised by {issue.raisedBy} </span>}
          {issue.raised && <span>· {issue.raised}</span>}
        </div>
        {isOpen ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '12px', color: '#475569' }}>
              priority:{' '}
              <select
                value={issue.priority ?? 'medium'}
                onChange={e => onUpdate?.({ priority: e.target.value })}
                style={{ color: priorityColor[issue.priority ?? 'medium'], fontSize: '12px' }}
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label style={{ fontSize: '12px', color: '#475569' }}>
              status:{' '}
              <select
                value={issue.statusField ?? 'open'}
                onChange={e => onUpdate?.({ status: e.target.value })}
                style={{ fontSize: '12px' }}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <button
              onClick={onResolve}
              style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', color: '#1e293b' }}
            >
              Resolve
            </button>
          </div>
        ) : (
          issue.resolved && (
            <div style={{ fontSize: '12px', color: '#475569' }}>
              resolved: {issue.resolved.date}{issue.resolved.note ? ` (${issue.resolved.note})` : ''}
            </div>
          )
        )}
        {issue.notes && (
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>{issue.notes}</div>
        )}
      </div>
    </div>
  );
}

function IssuesView() {
  const [issues, setIssues] = React.useState<Issue[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    fetch('/dashboard/api/issues')
      .then(res => res.json())
      .then(setIssues)
      .catch(() => setError('Failed to load issues'));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  if (error) return <div style={{ color: '#b91c1c' }}>{error}</div>;
  if (!issues) return <div>Loading…</div>;

  const open = issues.filter(i => i.section === 'open');
  const resolved = issues.filter(i => i.section === 'resolved');

  function moveOpen(index: number, dir: -1 | 1) {
    const newOpen = [...open];
    const target = index + dir;
    if (target < 0 || target >= newOpen.length) return;
    [newOpen[index], newOpen[target]] = [newOpen[target], newOpen[index]];
    const orderedIds = newOpen.map(i => i.id);
    fetch('/dashboard/api/issues/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    }).then(load);
  }

  function update(id: string, updates: { priority?: string; status?: string }) {
    fetch(`/dashboard/api/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(load);
  }

  function resolve(id: string) {
    const note = window.prompt('Resolution note:');
    if (note === null || !note.trim()) return;
    fetch(`/dashboard/api/issues/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    }).then(load);
  }

  return (
    <div>
      <h2 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '10px' }}>Open ({open.length})</h2>
      {open.length === 0 && <em style={{ color: '#94a3b8' }}>No open issues.</em>}
      {open.map((issue, idx) => (
        <IssueRow
          key={issue.id}
          issue={issue}
          isFirst={idx === 0}
          isLast={idx === open.length - 1}
          onMoveUp={() => moveOpen(idx, -1)}
          onMoveDown={() => moveOpen(idx, 1)}
          onUpdate={updates => update(issue.id, updates)}
          onResolve={() => resolve(issue.id)}
        />
      ))}

      <h2 style={{ fontSize: '16px', color: '#0f172a', marginTop: '24px', marginBottom: '10px' }}>Resolved ({resolved.length})</h2>
      {resolved.length === 0 && <em style={{ color: '#94a3b8' }}>Nothing resolved yet.</em>}
      {resolved.map(issue => <IssueRow key={issue.id} issue={issue} />)}
    </div>
  );
}

interface ActiveListItem {
  id: string;
  section: 'active' | 'archived';
  text: string;
  agent?: string;
  dateValue?: string;
  archivedNote?: string;
}

interface BriefingResult {
  timestamp: string;
  text: string;
}

function ActiveListSection({
  title, dateLabel, items, onAdd, onArchive,
}: {
  title: string;
  dateLabel: string;
  items: ActiveListItem[] | null;
  onAdd: (input: { text: string; agent?: string; dateValue?: string }) => void;
  onArchive: (id: string) => void;
}) {
  const [text, setText] = React.useState('');
  const [agent, setAgent] = React.useState('');
  const [dateValue, setDateValue] = React.useState('');

  if (!items) return <div>Loading…</div>;
  const active = items.filter(i => i.section === 'active');
  const archived = items.filter(i => i.section === 'archived');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd({ text, agent: agent || undefined, dateValue: dateValue || undefined });
    setText('');
    setAgent('');
    setDateValue('');
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '10px' }}>{title} ({active.length})</h2>
      {active.length === 0 && <em style={{ color: '#94a3b8' }}>None active.</em>}
      {active.map(item => (
        <div key={item.id} style={{
          border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px',
          background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px',
        }}>
          <div>
            <div style={{ fontSize: '13px', color: '#1e293b' }}>{item.text}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {item.agent && <span>agent: {item.agent} </span>}
              {item.dateValue && <span>· {dateLabel}: {item.dateValue}</span>}
            </div>
          </div>
          <button
            onClick={() => onArchive(item.id)}
            style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', color: '#1e293b', whiteSpace: 'nowrap' }}
          >
            Archive
          </button>
        </div>
      ))}

      <form onSubmit={submit} style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="New item text"
          style={{ flex: 2, minWidth: '200px', fontSize: '13px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
        />
        <input
          value={agent}
          onChange={e => setAgent(e.target.value)}
          placeholder="agent (optional)"
          style={{ flex: 1, minWidth: '100px', fontSize: '13px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
        />
        <input
          value={dateValue}
          onChange={e => setDateValue(e.target.value)}
          placeholder={`${dateLabel} (optional)`}
          style={{ flex: 1, minWidth: '100px', fontSize: '13px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
        />
        <button type="submit" style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '4px', border: '1px solid #0f172a', background: '#0f172a', color: '#fff', cursor: 'pointer' }}>
          Add
        </button>
      </form>

      {archived.length > 0 && (
        <details style={{ marginTop: '12px' }}>
          <summary style={{ fontSize: '13px', color: '#64748b', cursor: 'pointer' }}>Archived ({archived.length})</summary>
          {archived.map(item => (
            <div key={item.id} style={{ fontSize: '12px', color: '#94a3b8', padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
              {item.text}{item.archivedNote ? ` (${item.archivedNote})` : ''}
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

function BriefingView() {
  const [briefing, setBriefing] = React.useState<BriefingResult | null>(null);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ccirs, setCcirs] = React.useState<ActiveListItem[] | null>(null);
  const [standingOrders, setStandingOrders] = React.useState<ActiveListItem[] | null>(null);

  const loadBriefing = React.useCallback(() => {
    fetch('/dashboard/api/briefing/latest').then(res => res.json()).then(setBriefing).catch(() => {});
  }, []);
  const loadCcirs = React.useCallback(() => {
    fetch('/dashboard/api/ccirs').then(res => res.json()).then(setCcirs).catch(() => {});
  }, []);
  const loadStandingOrders = React.useCallback(() => {
    fetch('/dashboard/api/standing-orders').then(res => res.json()).then(setStandingOrders).catch(() => {});
  }, []);

  React.useEffect(() => {
    loadBriefing();
    loadCcirs();
    loadStandingOrders();
  }, [loadBriefing, loadCcirs, loadStandingOrders]);

  function runNow() {
    setRunning(true);
    setError(null);
    fetch('/dashboard/api/briefing/run', { method: 'POST' })
      .then(res => {
        if (!res.ok) return res.json().then(body => Promise.reject(new Error(body.error)));
        return res.json();
      })
      .then(setBriefing)
      .catch(err => setError(err.message))
      .finally(() => setRunning(false));
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '10px' }}>Latest Briefing</h2>
        {error && <div style={{ color: '#b91c1c', marginBottom: '8px' }}>{error}</div>}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#fff', marginBottom: '10px', whiteSpace: 'pre-wrap', fontSize: '13px', color: '#1e293b' }}>
          {briefing ? briefing.text : <em style={{ color: '#94a3b8' }}>No briefing run yet.</em>}
        </div>
        {briefing && <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>{briefing.timestamp}</div>}
        <button
          onClick={runNow}
          disabled={running}
          style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '4px', border: '1px solid #0f172a', background: running ? '#94a3b8' : '#0f172a', color: '#fff', cursor: running ? 'default' : 'pointer' }}
        >
          {running ? 'Running…' : 'Run Briefing'}
        </button>
      </div>

      <ActiveListSection
        title="CCIRs"
        dateLabel="review"
        items={ccirs}
        onAdd={input => fetch('/dashboard/api/ccirs', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input.text, agent: input.agent, review: input.dateValue }),
        }).then(loadCcirs)}
        onArchive={id => fetch(`/dashboard/api/ccirs/${id}/archive`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
        }).then(loadCcirs)}
      />

      <ActiveListSection
        title="Standing Orders"
        dateLabel="effective"
        items={standingOrders}
        onAdd={input => fetch('/dashboard/api/standing-orders', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input.text, agent: input.agent, effective: input.dateValue }),
        }).then(loadStandingOrders)}
        onArchive={id => fetch(`/dashboard/api/standing-orders/${id}/archive`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
        }).then(loadStandingOrders)}
      />
    </div>
  );
}

function App() {
  const [view, setView] = React.useState<'dashboard' | 'issues' | 'briefing'>('dashboard');
  const [tiles, setTiles] = React.useState<Tiles | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/dashboard/api/tiles')
      .then(res => res.json())
      .then(setTiles)
      .catch(() => setError('Failed to load dashboard data'));
  }, []);

  const navButtonStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '13px', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
    border: active ? '1px solid #0f172a' : '1px solid #e2e8f0',
    background: active ? '#0f172a' : '#fff',
    color: active ? '#fff' : '#475569',
    marginRight: '8px',
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px', fontFamily: 'Inter, Arial, sans-serif' }}>
      <h1 style={{ fontSize: '22px', color: '#0f172a', marginBottom: '16px' }}>Agentic OS Dashboard</h1>
      <div style={{ marginBottom: '20px' }}>
        <button style={navButtonStyle(view === 'dashboard')} onClick={() => setView('dashboard')}>Dashboard</button>
        <button style={navButtonStyle(view === 'issues')} onClick={() => setView('issues')}>Issues</button>
        <button style={navButtonStyle(view === 'briefing')} onClick={() => setView('briefing')}>Briefing</button>
      </div>

      {view === 'issues' ? (
        <IssuesView />
      ) : view === 'briefing' ? (
        <BriefingView />
      ) : error ? (
        <div style={{ color: '#b91c1c' }}>{error}</div>
      ) : !tiles ? (
        <div>Loading…</div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>

        <Tile title={`Issues Backlog (${tiles.issuesBacklog.count})`}>
          {tiles.issuesBacklog.items.length === 0 && <em>No open issues.</em>}
          <ul style={{ paddingLeft: '18px', margin: 0 }}>
            {tiles.issuesBacklog.items.slice(0, 6).map((i, idx) => (
              <li key={idx}>{i.text}{i.raisedBy && <span style={{ color: '#94a3b8' }}> — {i.raisedBy}</span>}</li>
            ))}
          </ul>
        </Tile>

        <Tile title={`Reminders (${tiles.reminders.count})`}>
          {tiles.reminders.items.length === 0 && <em>Nothing active.</em>}
          <ul style={{ paddingLeft: '18px', margin: 0 }}>
            {tiles.reminders.items.map((r, idx) => <li key={idx}>{r.text}</li>)}
          </ul>
        </Tile>

        <Tile title={`Open Todos (${tiles.todos.count})`}>
          {tiles.todos.items.length === 0 && <em>Inbox zero.</em>}
          <ul style={{ paddingLeft: '18px', margin: 0 }}>
            {tiles.todos.items.slice(0, 6).map(t => <li key={t.id}>{t.title}</li>)}
          </ul>
        </Tile>

        <Tile title="Inbox Backlog">
          <p>{tiles.inbox.backlogCount} unprocessed note{tiles.inbox.backlogCount === 1 ? '' : 's'} in <code>_inbox/</code></p>
        </Tile>

        <Tile title="Recent Research">
          {tiles.research.recent.length === 0 && <em>No research notes yet.</em>}
          <ul style={{ paddingLeft: '18px', margin: 0 }}>
            {tiles.research.recent.map(n => <li key={n.filename}>{n.firstLine}</li>)}
          </ul>
        </Tile>

        <Tile title="Latest Newsletter Digest">
          {tiles.newsletterDigest.latest
            ? <p>{tiles.newsletterDigest.latest.firstLine}</p>
            : <em>No digest yet.</em>}
        </Tile>

        <Tile title="Latest Email Digest">
          {tiles.emailTriage.latest
            ? <p>{tiles.emailTriage.latest.firstLine}</p>
            : <em>No digest yet.</em>}
        </Tile>

        <Tile title="Latest Session Log (XO)">
          {tiles.xo.latestSessionLog
            ? <p>{tiles.xo.latestSessionLog.firstLine}</p>
            : <em>No session log yet.</em>}
        </Tile>

      </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
