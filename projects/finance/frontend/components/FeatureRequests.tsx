import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw, ExternalLink, Pencil, Trash2, Check, X } from 'lucide-react';
import { api, FeatureRequest } from '../lib/api';

type Status = FeatureRequest['status'];

const STATUS_CONFIG: Record<Status, { label: string; cls: string }> = {
  open:        { label: 'Open',        cls: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', cls: 'bg-yellow-100 text-yellow-800' },
  done:        { label: 'Done',        cls: 'bg-green-100 text-green-800' },
  declined:    { label: 'Declined',    cls: 'bg-gray-100 text-gray-500' },
};

function StatusBadge({ status }: { status: Status }) {
  const { label, cls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
  );
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function displayTitle(title: string): string {
  return title.replace(/^Finance:\s*/i, '');
}

interface CreateForm { title: string; description: string; submitted_by: string; }
const EMPTY_CREATE: CreateForm = { title: '', description: '', submitted_by: '' };

interface EditForm { title: string; description: string; submitted_by: string; status: Status; github_issue_number: string; }

export default function FeatureRequests() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', description: '', submitted_by: '', status: 'open', github_issue_number: '' });

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    api.featureRequests.list()
      .then(setRequests)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.title.trim()) return;
    setCreating(true);
    try {
      const r = await api.featureRequests.create({
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        submitted_by: createForm.submitted_by.trim() || undefined,
      });
      setRequests(prev => [r, ...prev]);
      setCreateForm(EMPTY_CREATE);
      setShowCreate(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(r: FeatureRequest) {
    setEditingId(r.request_id);
    setEditForm({
      title: displayTitle(r.title),
      description: r.description ?? '',
      submitted_by: r.submitted_by ?? '',
      status: r.status,
      github_issue_number: r.github_issue_number != null ? String(r.github_issue_number) : '',
    });
  }

  async function saveEdit(id: string) {
    try {
      const t = editForm.title.trim();
      const prefixedTitle = t.match(/^finance:\s*/i) ? t : `Finance: ${t}`;
      const updated = await api.featureRequests.update(id, {
        title: prefixedTitle,
        description: editForm.description.trim() || undefined,
        submitted_by: editForm.submitted_by.trim() || undefined,
        status: editForm.status,
        github_issue_number: editForm.github_issue_number ? parseInt(editForm.github_issue_number) : undefined,
      });
      setRequests(prev => prev.map(r => r.request_id === id ? updated : r));
      setEditingId(null);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${displayTitle(title)}"?`)) return;
    try {
      await api.featureRequests.delete(id);
      setRequests(prev => prev.filter(r => r.request_id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await api.featureRequests.sync();
      const parts = [];
      if (result.updated > 0) parts.push(`updated ${result.updated} linked issue${result.updated !== 1 ? 's' : ''}`);
      if (result.imported > 0) parts.push(`imported ${result.imported} new issue${result.imported !== 1 ? 's' : ''} from GitHub`);
      if (parts.length === 0) parts.push('nothing new');
      setSyncMsg(`Sync complete — ${parts.join(', ')}.`);
      const refreshed = await api.featureRequests.list();
      setRequests(refreshed);
    } catch (e: any) {
      setSyncMsg(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }

  const open       = requests.filter(r => r.status === 'open');
  const inProgress = requests.filter(r => r.status === 'in_progress');
  const done       = requests.filter(r => r.status === 'done');
  const declined   = requests.filter(r => r.status === 'declined');

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;
  if (error)   return <p className="text-red-600 text-sm">{error}</p>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Feature Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Submit and track feature ideas — no GitHub account needed.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a
            href="https://github.com/nickbenes/home-apps/issues"
            target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            <ExternalLink size={13} /> GitHub Issues
          </a>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> Sync GitHub
          </button>
          <button onClick={() => setShowCreate(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded ${
              showCreate ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
            {showCreate ? <X size={13} /> : <Plus size={13} />} New Request
          </button>
        </div>
      </div>

      {syncMsg && (
        <p className={`text-sm px-3 py-2 rounded ${syncMsg.startsWith('Sync failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {syncMsg}
        </p>
      )}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Submit a feature request</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Title *</label>
            <input
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={createForm.title}
              onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
              placeholder="What would you like to see?"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <textarea rows={3}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
              value={createForm.description}
              onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
              placeholder="More details, examples, or context…" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Your name (optional)</label>
            <input
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={createForm.submitted_by}
              onChange={e => setCreateForm(f => ({ ...f, submitted_by: e.target.value }))}
              placeholder="e.g. Nick" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" disabled={creating}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
              <Check size={14} /> Submit
            </button>
          </div>
        </form>
      )}

      {/* Request sections */}
      {requests.length === 0 ? (
        <div className="text-center text-gray-400 italic text-sm py-12">
          No feature requests yet. Be the first to submit one!
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { label: 'Open', items: open },
            { label: 'In Progress', items: inProgress },
            { label: 'Done', items: done },
            { label: 'Declined', items: declined },
          ]
            .filter(s => s.items.length > 0)
            .map(({ label, items }) => (
              <div key={label}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  {label} ({items.length})
                </h2>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-50">
                  {items.map(r => (
                    <div key={r.request_id} className="p-4">
                      {editingId === r.request_id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Title *</label>
                            <input
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                              value={editForm.title}
                              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Description</label>
                            <textarea rows={4}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                              value={editForm.description}
                              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Submitted by</label>
                              <input
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                                value={editForm.submitted_by}
                                onChange={e => setEditForm(f => ({ ...f, submitted_by: e.target.value }))}
                                placeholder="e.g. Nick"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">GitHub Issue # (optional)</label>
                              <input type="number"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
                                value={editForm.github_issue_number}
                                onChange={e => setEditForm(f => ({ ...f, github_issue_number: e.target.value }))}
                                placeholder="e.g. 30" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Status</label>
                            <select
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                              value={editForm.status}
                              onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Status }))}>
                              {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
                                <option key={v} value={v}>{label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100">
                              Cancel
                            </button>
                            <button onClick={() => saveEdit(r.request_id)}
                              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
                              <Check size={12} /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">{displayTitle(r.title)}</span>
                              <StatusBadge status={r.status} />
                              {r.github_issue_number && (
                                <a
                                  href={r.github_issue_url ?? `https://github.com/nickbenes/home-apps/issues/${r.github_issue_number}`}
                                  target="_blank" rel="noreferrer"
                                  className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline"
                                >
                                  #{r.github_issue_number}
                                  {r.github_issue_status === 'closed' && (
                                    <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 px-1 rounded">closed</span>
                                  )}
                                  <ExternalLink size={10} className="inline ml-0.5" />
                                </a>
                              )}
                            </div>
                            {r.description && (
                              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{r.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5">
                              {r.submitted_by && (
                                <span className="text-xs text-gray-400">by {r.submitted_by}</span>
                              )}
                              <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => startEdit(r)}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded" title="Edit status / link issue">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDelete(r.request_id, r.title)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded" title="Delete">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
