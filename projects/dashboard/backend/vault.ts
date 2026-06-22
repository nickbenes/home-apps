import fs from 'fs';
import path from 'path';

const VAULT_ROOT = process.env.VAULT_ROOT ?? path.join(process.env.HOME ?? '', 'gdrive/ObsidianVault');

function readVaultFile(relPath: string): string | null {
  const full = path.join(VAULT_ROOT, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function listDir(relPath: string): string[] {
  const full = path.join(VAULT_ROOT, relPath);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter(f => !f.startsWith('.'));
}

export interface IssueItem {
  status: string;
  text: string;
  raisedBy?: string;
  priority?: string;
}

export function getOpenIssues(): IssueItem[] {
  const content = readVaultFile('_meta/issues_backlog.md');
  if (!content) return [];
  const openSection = content.split('## Open')[1]?.split('## Resolved')[0] ?? '';
  const blocks = openSection.split(/\n(?=- \[)/).filter(b => b.trim().startsWith('- ['));
  return blocks.map(block => {
    const statusMatch = block.match(/^- \[(\w+)\]\s*(.+?)(?:\n|$)/);
    const raisedByMatch = block.match(/raised by:\s*(.+)/);
    const priorityMatch = block.match(/priority:\s*(\w+)/);
    return {
      status: statusMatch?.[1] ?? 'open',
      text: statusMatch?.[2]?.trim() ?? block.trim().slice(0, 120),
      raisedBy: raisedByMatch?.[1]?.trim(),
      priority: priorityMatch?.[1]?.trim(),
    };
  });
}

export interface ReminderItem {
  status: string;
  text: string;
  nextSurfaced?: string;
}

export function getActiveReminders(): ReminderItem[] {
  const content = readVaultFile('_meta/briefing_items.md');
  if (!content) return [];
  const activeSection = content.split('## Active')[1]?.split('## Resolved')[0] ?? '';
  const blocks = activeSection.split(/\n(?=- \[)/).filter(b => b.trim().startsWith('- ['));
  return blocks.map(block => {
    const statusMatch = block.match(/^- \[(\w+)\]\s*(.+?)(?:\n|$)/);
    const nextMatch = block.match(/next surfaced:\s*(.+)/);
    return {
      status: statusMatch?.[1] ?? 'active',
      text: statusMatch?.[2]?.trim() ?? block.trim().slice(0, 120),
      nextSurfaced: nextMatch?.[1]?.trim(),
    };
  });
}

export function getInboxBacklogCount(): number {
  return listDir('_inbox').filter(f => f !== '_processed').length;
}

function latestFile(relDir: string, predicate?: (f: string) => boolean): string | null {
  const files = listDir(relDir).filter(f => f.endsWith('.md')).filter(f => !predicate || predicate(f));
  if (!files.length) return null;
  return files.sort().reverse()[0];
}

export interface RecentNote {
  filename: string;
  path: string;
  firstLine: string;
}

function noteSummary(relDir: string, filename: string): RecentNote {
  const content = readVaultFile(path.join(relDir, filename)) ?? '';
  const firstLine = content.split('\n').find(l => l.trim().startsWith('#'))?.replace(/^#+\s*/, '') ?? filename;
  return { filename, path: path.join(relDir, filename), firstLine };
}

export function getRecentResearch(limit = 5): RecentNote[] {
  const files = listDir('_meta/research')
    .filter(f => f.endsWith('.md') && !f.includes('newsletter-digest'))
    .sort()
    .reverse()
    .slice(0, limit);
  return files.map(f => noteSummary('_meta/research', f));
}

export function getLatestNewsletterDigest(): RecentNote | null {
  const f = latestFile('_meta/research', name => name.includes('newsletter-digest'));
  return f ? noteSummary('_meta/research', f) : null;
}

export function getLatestEmailDigest(): RecentNote | null {
  const f = latestFile('_meta/triage', name => name.includes('email-digest'));
  return f ? noteSummary('_meta/triage', f) : null;
}

export function getLatestSessionLog(): RecentNote | null {
  const f = latestFile('_session_logs');
  return f ? noteSummary('_session_logs', f) : null;
}
