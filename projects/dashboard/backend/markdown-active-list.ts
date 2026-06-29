import fs from 'fs';
import path from 'path';

// Shared parser/serializer for the "## Active" / "## Archived" markdown-bullet format used by
// both standing-orders.ts (FR-024) and ccirs.ts (FR-024). Mirrors issues.ts's block-based
// parsing approach but deliberately simpler — no priority/reorder, just active vs. archived.

export interface ActiveListItem {
  id: string;
  section: 'active' | 'archived';
  text: string;
  agent?: string;
  dateValue?: string; // meaning depends on caller (e.g. "effective" date or "review" date)
  archivedNote?: string;
}

export interface ActiveListConfig {
  relPath: string; // e.g. '_meta/ccirs.md'
  dateFieldKey: string; // sub-bullet key for dateValue, e.g. 'review' or 'effective'
}

function vaultRoot(): string {
  return process.env.VAULT_ROOT ?? path.join(process.env.HOME ?? '', 'gdrive/ObsidianVault');
}

const ACTIVE_HEADER = '## Active';
const ARCHIVED_HEADER = '## Archived';

interface ParsedDoc {
  preamble: string;
  active: ActiveListItem[];
  archived: ActiveListItem[];
}

function splitBlocks(sectionText: string): string[] {
  const trimmed = sectionText.replace(/^\n+/, '');
  if (!trimmed.trim()) return [];
  const rawBlocks = trimmed.split(/\n\s*\n(?=- \[)/);
  return rawBlocks.map(b => b.replace(/\n+$/, '')).filter(b => b.trim().startsWith('- ['));
}

function makeId(text: string, agent: string | undefined): string {
  const base = `${agent ?? ''}|${text.slice(0, 60)}`;
  let hash = 2166136261;
  for (let i = 0; i < base.length; i++) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function parseBlock(block: string, section: 'active' | 'archived', dateFieldKey: string): ActiveListItem {
  const lines = block.split('\n');
  const firstMatch = lines[0].match(/^- \[\w+\]\s*(.*)$/);
  const text = (firstMatch ? firstMatch[1] : lines[0]).trim();

  let agent: string | undefined;
  let dateValue: string | undefined;
  let archivedNote: string | undefined;

  for (let i = 1; i < lines.length; i++) {
    const m = lines[i].match(/^\s*- (\w[\w ]*?):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const value = m[2].trim();
    if (key === 'agent') agent = value;
    else if (key === dateFieldKey) dateValue = value;
    else if (key === 'archived') archivedNote = value;
  }

  return { id: makeId(text, agent), section, text, agent, dateValue, archivedNote };
}

function parseDoc(content: string, dateFieldKey: string): ParsedDoc {
  const activeIdx = content.indexOf(ACTIVE_HEADER);
  if (activeIdx === -1) return { preamble: content, active: [], archived: [] };

  const preamble = content.slice(0, activeIdx);
  const afterActiveHeader = content.slice(activeIdx + ACTIVE_HEADER.length);

  const archivedIdx = afterActiveHeader.indexOf(ARCHIVED_HEADER);
  const activeSectionText = archivedIdx === -1 ? afterActiveHeader : afterActiveHeader.slice(0, archivedIdx);
  const archivedSectionText = archivedIdx === -1 ? '' : afterActiveHeader.slice(archivedIdx + ARCHIVED_HEADER.length);

  return {
    preamble,
    active: splitBlocks(activeSectionText).map(b => parseBlock(b, 'active', dateFieldKey)),
    archived: splitBlocks(archivedSectionText).map(b => parseBlock(b, 'archived', dateFieldKey)),
  };
}

function serializeItem(item: ActiveListItem, dateFieldKey: string): string {
  const lines = [`- [${item.section}] ${item.text}`];
  if (item.agent !== undefined) lines.push(`  - agent: ${item.agent}`);
  if (item.dateValue !== undefined) lines.push(`  - ${dateFieldKey}: ${item.dateValue}`);
  if (item.archivedNote !== undefined) lines.push(`  - archived: ${item.archivedNote}`);
  return lines.join('\n');
}

function serializeDoc(doc: ParsedDoc, header: string, dateFieldKey: string): string {
  const activeBlocks = doc.active.map(i => serializeItem(i, dateFieldKey)).join('\n\n');
  const archivedBlocks = doc.archived.map(i => serializeItem(i, dateFieldKey)).join('\n\n');

  let out = doc.preamble.trim() ? doc.preamble : `# ${header}\n`;
  if (!out.endsWith('\n')) out += '\n';
  out += `\n${ACTIVE_HEADER}\n\n`;
  if (activeBlocks) out += activeBlocks + '\n\n';
  out += `${ARCHIVED_HEADER}\n\n`;
  if (archivedBlocks) out += archivedBlocks + '\n';

  return out;
}

export class ActiveListItemNotFoundError extends Error {
  constructor(id: string) {
    super(`Item not found: ${id}`);
  }
}

export function createActiveListStore(config: ActiveListConfig, header: string) {
  function filePath(): string {
    return path.join(vaultRoot(), config.relPath);
  }

  function readFile(): string {
    const full = filePath();
    if (!fs.existsSync(full)) return '';
    return fs.readFileSync(full, 'utf8');
  }

  function writeFile(content: string): void {
    fs.mkdirSync(path.dirname(filePath()), { recursive: true });
    fs.writeFileSync(filePath(), content, 'utf8');
  }

  function loadDoc(): ParsedDoc {
    return parseDoc(readFile(), config.dateFieldKey);
  }

  function saveDoc(doc: ParsedDoc): void {
    writeFile(serializeDoc(doc, header, config.dateFieldKey));
  }

  return {
    getAll(): ActiveListItem[] {
      const doc = loadDoc();
      return [...doc.active, ...doc.archived];
    },

    add(item: { text: string; agent?: string; dateValue?: string }): ActiveListItem {
      const doc = loadDoc();
      const newItem: ActiveListItem = {
        id: makeId(item.text, item.agent),
        section: 'active',
        text: item.text,
        agent: item.agent,
        dateValue: item.dateValue,
      };
      doc.active = [...doc.active, newItem];
      saveDoc(doc);
      return newItem;
    },

    archive(id: string, note?: string): ActiveListItem {
      const doc = loadDoc();
      const idx = doc.active.findIndex(i => i.id === id);
      if (idx === -1) throw new ActiveListItemNotFoundError(id);

      const [item] = doc.active.splice(idx, 1);
      const archivedItem: ActiveListItem = { ...item, section: 'archived', archivedNote: note };
      doc.archived = [archivedItem, ...doc.archived];
      saveDoc(doc);
      return archivedItem;
    },
  };
}
