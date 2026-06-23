import fs from 'fs';
import path from 'path';

const FIXTURE = path.join(__dirname, 'fixtures/_meta/issues_backlog.md');
const SCRATCH_DIR = path.join(__dirname, 'scratch');
const SCRATCH_META = path.join(SCRATCH_DIR, '_meta');
const SCRATCH_FILE = path.join(SCRATCH_META, 'issues_backlog.md');

// IMPORTANT: ESM imports hoist above all other statements, so setting
// process.env.VAULT_ROOT here would NOT run before this import executes.
// issues.ts must read process.env.VAULT_ROOT lazily (per-call), not cache it
// at module load — do not "fix" this by moving the env assignment, fix it by
// keeping the read lazy in issues.ts.
process.env.VAULT_ROOT = SCRATCH_DIR;

// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as issuesModule from '../backend/issues';

function resetScratch() {
  fs.mkdirSync(SCRATCH_META, { recursive: true });
  fs.copyFileSync(FIXTURE, SCRATCH_FILE);
}

describe('issues.ts parser/serializer', () => {
  beforeEach(() => {
    resetScratch();
  });

  describe('getAllIssues (parsing)', () => {
    it('parses all open and resolved issues from the real-shaped fixture', () => {
      const issues = issuesModule.getAllIssues();
      const open = issues.filter(i => i.section === 'open');
      const resolved = issues.filter(i => i.section === 'resolved');

      expect(open.length).toBe(8);
      expect(resolved.length).toBe(5);
    });

    it('parses multi-line wrapped issue text correctly (joins continuation lines)', () => {
      const issues = issuesModule.getAllIssues();
      const tbom = issues.find(i => i.text.includes('TBOM/Destiny Mastercard'));
      expect(tbom).toBeDefined();
      expect(tbom!.text).toContain('TBOM-Destiny-Mastercard.md');
      expect(tbom!.text).not.toContain('\n');
    });

    it('parses multi-line wrapped notes correctly', () => {
      const issues = issuesModule.getAllIssues();
      const inboxThreads = issues.find(i => i.text.includes('8 inbox threads'));
      expect(inboxThreads).toBeDefined();
      expect(inboxThreads!.notes).toContain('Utilidata');
      expect(inboxThreads!.notes).toContain('Mary Trump Media newsletter issue');
    });

    it('parses Open-section sub-bullet schema: raised by, raised, priority, status', () => {
      const issues = issuesModule.getAllIssues();
      const tbom = issues.find(i => i.text.includes('TBOM/Destiny Mastercard'));
      expect(tbom).toMatchObject({
        section: 'open',
        raisedBy: 'email-triage',
        raised: '2026-06-22',
        priority: 'medium',
        statusField: 'open',
      });
    });

    it('parses Resolved-section sub-bullet schema: raised by, raised, resolved (date + paren note), notes', () => {
      const issues = issuesModule.getAllIssues();
      const substackBacklog = issues.find(i => i.text.includes('Substack newsletter backlog'));
      expect(substackBacklog).toBeDefined();
      expect(substackBacklog!.section).toBe('resolved');
      expect(substackBacklog!.raisedBy).toBe('newsletter-digest');
      expect(substackBacklog!.resolved).toMatchObject({
        date: '2026-06-22',
        note: 'same evening',
      });
      expect(substackBacklog!.notes).toContain('fresh start going forward');
    });

    it('parses resolved entries with parenthetical resolved-date notes (e.g. "via ...")', () => {
      const issues = issuesModule.getAllIssues();
      const nonSubstack = issues.find(i => i.text.includes('Should non-Substack'));
      expect(nonSubstack).toBeDefined();
      expect(nonSubstack!.resolved?.date).toBe('2026-06-23');
      expect(nonSubstack!.resolved?.note).toContain('Notes from email cleanup.md');
    });

    it('does not lose blank-line-separated blocks (double newline between bullets)', () => {
      const issues = issuesModule.getAllIssues();
      // The fixture has a double-blank-line gap between issue 1 and issue 2 in Open.
      const eightThreads = issues.find(i => i.text.includes('8 inbox threads'));
      expect(eightThreads).toBeDefined();
    });
  });

  describe('round-trip parse -> serialize -> parse', () => {
    it('preserves issue count and key content with no data loss', () => {
      const before = issuesModule.getAllIssues();

      // Force a re-serialize without mutating content: reorder open issues to their own
      // current order (a no-op reorder), which exercises the serializer.
      const openIds = before.filter(i => i.section === 'open').map(i => i.id);
      issuesModule.reorderOpenIssues(openIds);

      const after = issuesModule.getAllIssues();
      expect(after.length).toBe(before.length);

      for (let i = 0; i < before.length; i++) {
        expect(after[i].text).toBe(before[i].text);
        expect(after[i].raisedBy).toBe(before[i].raisedBy);
        expect(after[i].raised).toBe(before[i].raised);
        expect(after[i].section).toBe(before[i].section);
        if (before[i].section === 'open') {
          expect(after[i].priority).toBe(before[i].priority);
          expect(after[i].statusField).toBe(before[i].statusField);
        } else {
          expect(after[i].resolved?.date).toBe(before[i].resolved?.date);
          expect(after[i].resolved?.note).toBe(before[i].resolved?.note);
        }
        expect(after[i].notes).toBe(before[i].notes);
      }
    });

    it('preserves the preamble and ## Format code block byte-for-byte', () => {
      const originalContent = fs.readFileSync(SCRATCH_FILE, 'utf8');
      const preambleAndFormat = originalContent.split('## Open')[0];

      const before = issuesModule.getAllIssues();
      const openIds = before.filter(i => i.section === 'open').map(i => i.id);
      issuesModule.reorderOpenIssues(openIds);

      const newContent = fs.readFileSync(SCRATCH_FILE, 'utf8');
      expect(newContent.split('## Open')[0]).toBe(preambleAndFormat);
    });
  });

  describe('reorderOpenIssues', () => {
    it('persists the new order and re-parses correctly', () => {
      const before = issuesModule.getAllIssues().filter(i => i.section === 'open');
      const reversedIds = [...before].reverse().map(i => i.id);

      const result = issuesModule.reorderOpenIssues(reversedIds);
      const resultOpen = result.filter(i => i.section === 'open');
      expect(resultOpen.map(i => i.id)).toEqual(reversedIds);

      const reparsed = issuesModule.getAllIssues().filter(i => i.section === 'open');
      expect(reparsed.map(i => i.id)).toEqual(reversedIds);
      expect(reparsed[0].text).toBe(before[before.length - 1].text);
    });

    it('rejects an orderedIds array that is not a permutation of current open ids', () => {
      expect(() => issuesModule.reorderOpenIssues(['bogus-id'])).toThrow();
    });
  });

  describe('updateIssue', () => {
    it('updates priority in place, staying in the Open section', () => {
      const before = issuesModule.getAllIssues().filter(i => i.section === 'open')[0];
      const updated = issuesModule.updateIssue(before.id, { priority: 'high' });
      expect(updated.priority).toBe('high');
      expect(updated.section).toBe('open');

      const reparsed = issuesModule.getAllIssues().find(i => i.id === before.id);
      expect(reparsed?.priority).toBe('high');
    });

    it('updates status to "discussing" in place, staying in Open', () => {
      const before = issuesModule.getAllIssues().filter(i => i.section === 'open')[0];
      const updated = issuesModule.updateIssue(before.id, { status: 'discussing' });
      expect(updated.statusField).toBe('discussing');
      expect(updated.section).toBe('open');
    });

    it('moves to Resolved when status is set to "resolved"', () => {
      const before = issuesModule.getAllIssues().filter(i => i.section === 'open')[0];
      const updated = issuesModule.updateIssue(before.id, { status: 'resolved' });
      expect(updated.section).toBe('resolved');
      expect(updated.resolved?.date).toBeDefined();

      const reparsed = issuesModule.getAllIssues();
      const stillOpen = reparsed.find(i => i.id === before.id && i.section === 'open');
      const nowResolved = reparsed.find(i => i.id === before.id && i.section === 'resolved');
      expect(stillOpen).toBeUndefined();
      expect(nowResolved).toBeDefined();
    });

    it('throws IssueNotFoundError for an unknown id', () => {
      expect(() => issuesModule.updateIssue('does-not-exist', { priority: 'high' }))
        .toThrow(issuesModule.IssueNotFoundError);
    });
  });

  describe('resolveIssue', () => {
    it('moves the issue from Open to Resolved with correct resolved-date and notes', () => {
      const before = issuesModule.getAllIssues().filter(i => i.section === 'open')[0];
      const result = issuesModule.resolveIssue(before.id, 'Resolved via test harness.');

      expect(result.section).toBe('resolved');
      expect(result.notes).toBe('Resolved via test harness.');
      expect(result.resolved?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const reparsed = issuesModule.getAllIssues();
      const stillOpen = reparsed.find(i => i.id === before.id && i.section === 'open');
      const nowResolved = reparsed.find(i => i.id === before.id && i.section === 'resolved');
      expect(stillOpen).toBeUndefined();
      expect(nowResolved).toBeDefined();
      expect(nowResolved!.text).toBe(before.text);

      // Open count decreased by one, resolved count increased by one.
      const openCount = reparsed.filter(i => i.section === 'open').length;
      const resolvedCount = reparsed.filter(i => i.section === 'resolved').length;
      expect(openCount).toBe(7);
      expect(resolvedCount).toBe(6);
    });

    it('throws IssueNotFoundError when resolving an unknown id', () => {
      expect(() => issuesModule.resolveIssue('does-not-exist', 'note'))
        .toThrow(issuesModule.IssueNotFoundError);
    });

    it('removes priority/status lines per Resolved-section convention', () => {
      const before = issuesModule.getAllIssues().filter(i => i.section === 'open')[0];
      const result = issuesModule.resolveIssue(before.id, 'Done.');
      expect(result.priority).toBeUndefined();
      expect(result.statusField).toBeUndefined();
    });
  });
});
