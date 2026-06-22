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

function App() {
  const [tiles, setTiles] = React.useState<Tiles | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/dashboard/api/tiles')
      .then(res => res.json())
      .then(setTiles)
      .catch(() => setError('Failed to load dashboard data'));
  }, []);

  if (error) return <div style={{ padding: '24px', color: '#b91c1c' }}>{error}</div>;
  if (!tiles) return <div style={{ padding: '24px' }}>Loading…</div>;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px', fontFamily: 'Inter, Arial, sans-serif' }}>
      <h1 style={{ fontSize: '22px', color: '#0f172a', marginBottom: '20px' }}>Agentic OS Dashboard</h1>
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
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
