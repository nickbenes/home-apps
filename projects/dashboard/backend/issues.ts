import fs from 'fs';
import path from 'path';

const ISSUES_REL_PATH = '_meta/issues_backlog.md';

function vaultRoot(): string {
  return process.env.VAULT_ROOT ?? path.join(process.env.HOME ?? '', 'gdrive/ObsidianVault');
}

function issuesFilePath(): string {
  return path.join(vaultRoot(), ISSUES_REL_PATH);
}

function readIssuesFile(): string {
  const full = issuesFilePath();
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf8');
}

function writeIssuesFile(content: string): void {
  fs.writeFileSync(issuesFilePath(), content, 'utf8');
}

export type IssueSection = 'open' | 'resolved';

export interface Issue {
  id: string;
  section: IssueSection;
  status: string;
  text: string;
  raisedBy?: string;
  raised?: string;
  priority?: string;
  statusField?: string; // open | discussing | resolved (Open-section "status:" sub-bullet)
  resolved?: { date: string; note?: string }; // Resolved-section "resolved:" sub-bullet
  notes?: string;
}

interface ParsedDoc {
  preamble: string; // everything before "## Open", byte-for-byte
  open: Issue[];
  resolved: Issue[];
}

const OPEN_HEADER = '## Open';
const RESOLVED_HEADER = '## Resolved';

/**
 * Split a section's raw text (after its header) into individual issue blocks.
 * Blocks are separated by one or more blank lines, each block starting with "- [".
 */
function splitBlocks(sectionText: string): string[] {
  const trimmed = sectionText.replace(/^\n+/, '');
  if (!trimmed.trim()) return [];
  // Split on blank-line boundaries that precede a new "- [" bullet.
  const rawBlocks = trimmed.split(/\n\s*\n(?=- \[)/);
  return rawBlocks.map(b => b.replace(/\n+$/, '')).filter(b => b.trim().startsWith('- ['));
}

/**
 * Parse a single issue block into its component lines: the issue's own
 * (possibly multi-line) text, followed by sub-bullets (each possibly
 * multi-line, continuation lines indented further with no leading "- ").
 */
function parseBlockLines(block: string): { text: string; subBullets: { key: string; value: string }[] } {
  const lines = block.split('\n');
  // First line: "- [status] text..."
  const firstLine = lines[0];
  const firstMatch = firstLine.match(/^- \[(\w+)\]\s*(.*)$/);
  const textLines = [firstMatch ? firstMatch[2] : firstLine];

  let i = 1;
  // Continuation lines of the issue's own text: indented, but NOT a "  - key:" sub-bullet.
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*- \w[\w ]*:/.test(line)) break; // looks like a sub-bullet
    if (line.trim() === '') { i++; continue; }
    textLines.push(line.trim());
    i++;
  }

  const subBullets: { key: string; value: string }[] = [];
  while (i < lines.length) {
    const line = lines[i];
    const subMatch = line.match(/^\s*- (\w[\w ]*?):\s*(.*)$/);
    if (subMatch) {
      subBullets.push({ key: subMatch[1].trim(), value: subMatch[2].trim() });
      i++;
      // Continuation lines for this sub-bullet's value: indented, no "- " prefix.
      while (i < lines.length && lines[i].trim() !== '' && !/^\s*- \w[\w ]*:/.test(lines[i])) {
        subBullets[subBullets.length - 1].value += ' ' + lines[i].trim();
        i++;
      }
    } else {
      i++;
    }
  }

  return { text: textLines.join(' ').replace(/\s+/g, ' ').trim(), subBullets };
}

function makeId(raisedBy: string | undefined, raised: string | undefined, text: string): string {
  // Deliberately excludes `section` and array position: an issue keeps the same id
  // across reorders and across moving from Open to Resolved, so callers (reorderOpenIssues,
  // updateIssue, resolveIssue) can find the same issue again after a re-parse.
  const base = `${raisedBy ?? ''}|${raised ?? ''}|${text.slice(0, 40)}`;
  // Simple stable hash (FNV-1a like), short enough to be a readable id.
  let hash = 2166136261;
  for (let i = 0; i < base.length; i++) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function parseIssueBlock(block: string, section: IssueSection): Issue {
  const statusMatch = block.match(/^- \[(\w+)\]/);
  const status = statusMatch?.[1] ?? (section === 'open' ? 'open' : 'resolved');
  const { text, subBullets } = parseBlockLines(block);

  const get = (key: string) => subBullets.find(s => s.key.toLowerCase() === key.toLowerCase())?.value;

  const raisedBy = get('raised by');
  const raised = get('raised');
  const issue: Issue = {
    id: '',
    section,
    status,
    text,
  };
  if (raisedBy !== undefined) issue.raisedBy = raisedBy;
  if (raised !== undefined) issue.raised = raised;

  if (section === 'open') {
    const priority = get('priority');
    const statusField = get('status');
    const notes = get('notes');
    if (priority !== undefined) issue.priority = priority;
    if (statusField !== undefined) issue.statusField = statusField;
    if (notes !== undefined) issue.notes = notes;
  } else {
    const resolvedRaw = get('resolved');
    const notes = get('notes');
    if (resolvedRaw !== undefined) {
      const m = resolvedRaw.match(/^(\d{4}-\d{2}-\d{2})\s*(?:\((.*)\))?\s*$/);
      if (m) {
        issue.resolved = { date: m[1], note: m[2] };
      } else {
        issue.resolved = { date: resolvedRaw };
      }
    }
    if (notes !== undefined) issue.notes = notes;
  }

  issue.id = makeId(raisedBy, raised, text);
  return issue;
}

function parseDoc(content: string): ParsedDoc {
  const openIdx = content.indexOf(OPEN_HEADER);
  if (openIdx === -1) {
    return { preamble: content, open: [], resolved: [] };
  }
  const preamble = content.slice(0, openIdx);
  const afterOpenHeader = content.slice(openIdx + OPEN_HEADER.length);

  const resolvedIdx = afterOpenHeader.indexOf(RESOLVED_HEADER);
  let openSectionText: string;
  let resolvedSectionText: string;
  if (resolvedIdx === -1) {
    openSectionText = afterOpenHeader;
    resolvedSectionText = '';
  } else {
    openSectionText = afterOpenHeader.slice(0, resolvedIdx);
    resolvedSectionText = afterOpenHeader.slice(resolvedIdx + RESOLVED_HEADER.length);
  }

  const openBlocks = splitBlocks(openSectionText);
  const resolvedBlocks = splitBlocks(resolvedSectionText);

  const open = openBlocks.map(b => parseIssueBlock(b, 'open'));
  const resolved = resolvedBlocks.map(b => parseIssueBlock(b, 'resolved'));

  return { preamble, open, resolved };
}

function wrapText(text: string, indent: string, firstLinePrefix: string, width = 88): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = firstLinePrefix;
  let isFirst = true;
  for (const word of words) {
    const candidate = current === firstLinePrefix || current === indent ? current + word : current + ' ' + word;
    if (candidate.length > width && current !== firstLinePrefix && current !== indent) {
      lines.push(current);
      current = indent + word;
      isFirst = false;
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  void isFirst;
  return lines.join('\n');
}

function serializeIssue(issue: Issue): string {
  const firstLinePrefix = `- [${issue.status}] `;
  const textBlock = wrapText(issue.text, '  ', firstLinePrefix);
  const lines: string[] = [textBlock];

  if (issue.raisedBy !== undefined) lines.push(`  - raised by: ${issue.raisedBy}`);
  if (issue.raised !== undefined) lines.push(`  - raised: ${issue.raised}`);

  if (issue.section === 'open') {
    if (issue.priority !== undefined) lines.push(`  - priority: ${issue.priority}`);
    if (issue.statusField !== undefined) lines.push(`  - status: ${issue.statusField}`);
    if (issue.notes !== undefined) {
      lines.push(wrapText(issue.notes, '    ', '  - notes: '));
    }
  } else {
    if (issue.resolved !== undefined) {
      const resolvedStr = issue.resolved.note
        ? `${issue.resolved.date} (${issue.resolved.note})`
        : issue.resolved.date;
      lines.push(`  - resolved: ${resolvedStr}`);
    }
    if (issue.notes !== undefined) {
      lines.push(wrapText(issue.notes, '    ', '  - notes: '));
    }
  }

  return lines.join('\n');
}

function serializeDoc(doc: ParsedDoc): string {
  const openBlocks = doc.open.map(serializeIssue).join('\n\n\n');
  const resolvedBlocks = doc.resolved.map(serializeIssue).join('\n\n\n');

  let out = doc.preamble;
  if (!out.endsWith('\n')) out += '\n';
  out += `${OPEN_HEADER}\n\n`;
  if (openBlocks) out += openBlocks + '\n\n';
  out += `${RESOLVED_HEADER}\n\n`;
  if (resolvedBlocks) out += resolvedBlocks + '\n';

  return out;
}

export function getAllIssues(): Issue[] {
  const content = readIssuesFile();
  const doc = parseDoc(content);
  return [...doc.open, ...doc.resolved];
}

function loadDoc(): ParsedDoc {
  return parseDoc(readIssuesFile());
}

function saveDocAndValidate(doc: ParsedDoc): void {
  const serialized = serializeDoc(doc);
  writeIssuesFile(serialized);

  // Validate: re-read and re-parse, confirm counts and key content match.
  const reparsed = parseDoc(readIssuesFile());
  if (reparsed.open.length !== doc.open.length || reparsed.resolved.length !== doc.resolved.length) {
    throw new Error(
      `issues.ts: validation failed after write — expected ${doc.open.length} open / ${doc.resolved.length} resolved, ` +
      `got ${reparsed.open.length} open / ${reparsed.resolved.length} resolved`
    );
  }
  for (let i = 0; i < doc.open.length; i++) {
    if (reparsed.open[i].text !== doc.open[i].text) {
      throw new Error(`issues.ts: validation failed — open issue ${i} text mismatch after write`);
    }
  }
  for (let i = 0; i < doc.resolved.length; i++) {
    if (reparsed.resolved[i].text !== doc.resolved[i].text) {
      throw new Error(`issues.ts: validation failed — resolved issue ${i} text mismatch after write`);
    }
  }
}

export class IssueNotFoundError extends Error {
  constructor(id: string) {
    super(`Issue not found: ${id}`);
  }
}

export function reorderOpenIssues(orderedIds: string[]): Issue[] {
  const doc = loadDoc();
  const byId = new Map(doc.open.map(i => [i.id, i]));

  if (orderedIds.length !== doc.open.length || orderedIds.some(id => !byId.has(id))) {
    throw new Error('reorderOpenIssues: orderedIds must be a permutation of current open issue ids');
  }

  doc.open = orderedIds.map(id => byId.get(id)!);
  saveDocAndValidate(doc);
  return [...doc.open, ...doc.resolved];
}

export function updateIssue(id: string, updates: { priority?: string; status?: string }): Issue {
  const doc = loadDoc();
  const idx = doc.open.findIndex(i => i.id === id);

  if (idx === -1) {
    // Allow editing resolved issues' nothing meaningful — but keep clear 404 semantics for callers.
    throw new IssueNotFoundError(id);
  }

  const issue = { ...doc.open[idx] };
  if (updates.priority !== undefined) issue.priority = updates.priority;

  if (updates.status !== undefined && updates.status !== 'resolved') {
    issue.statusField = updates.status;
    issue.status = updates.status;
    doc.open[idx] = issue;
    saveDocAndValidate(doc);
    return issue;
  }

  if (updates.status === 'resolved') {
    // Move to resolved section without a resolution note (caller should prefer resolveIssue()).
    doc.open.splice(idx, 1);
    const resolvedIssue: Issue = {
      id: issue.id,
      section: 'resolved',
      status: 'resolved',
      text: issue.text,
      raisedBy: issue.raisedBy,
      raised: issue.raised,
      resolved: { date: new Date().toISOString().slice(0, 10) },
      notes: issue.notes,
    };
    doc.resolved = [resolvedIssue, ...doc.resolved];
    saveDocAndValidate(doc);
    return resolvedIssue;
  }

  doc.open[idx] = issue;
  saveDocAndValidate(doc);
  return issue;
}

export function resolveIssue(id: string, resolutionNote: string): Issue {
  const doc = loadDoc();
  const idx = doc.open.findIndex(i => i.id === id);
  if (idx === -1) {
    throw new IssueNotFoundError(id);
  }

  const issue = doc.open[idx];
  doc.open.splice(idx, 1);

  const today = new Date().toISOString().slice(0, 10);
  const resolvedIssue: Issue = {
    id: issue.id,
    section: 'resolved',
    status: 'resolved',
    text: issue.text,
    raisedBy: issue.raisedBy,
    raised: issue.raised,
    resolved: { date: today, note: undefined },
    notes: resolutionNote,
  };
  // resolved: date (note)? — per format, the "resolved:" line itself carries date + optional
  // free text in parens; notes carries the substantive context. We don't have a separate
  // "resolution context in parens" input here, so leave resolved.note unset and put the
  // resolution note in notes, matching the simplest real-file precedent (date-only resolved lines exist).
  doc.resolved = [resolvedIssue, ...doc.resolved];

  saveDocAndValidate(doc);
  return resolvedIssue;
}

// Exported for tests only.
export const _internal = { parseDoc, serializeDoc };
