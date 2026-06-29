import fs from 'fs';
import path from 'path';

const FIXTURE = path.join(__dirname, '../test/fixtures/_meta/ccirs.md');
const SCRATCH_DIR = path.join(__dirname, '../test/scratch-ccirs');
const SCRATCH_META = path.join(SCRATCH_DIR, '_meta');
const SCRATCH_FILE = path.join(SCRATCH_META, 'ccirs.md');

// See test/api.test.ts for why this must be set before the lazy-VAULT_ROOT import below.
process.env.VAULT_ROOT = SCRATCH_DIR;

import * as ccirsModule from './ccirs';

function resetScratch() {
  fs.mkdirSync(SCRATCH_META, { recursive: true });
  fs.copyFileSync(FIXTURE, SCRATCH_FILE);
}

describe('ccirs.ts', () => {
  beforeEach(() => {
    resetScratch();
  });

  it('parses active and archived CCIRs from the fixture', () => {
    const all = ccirsModule.getAllCcirs();
    const active = all.filter(i => i.section === 'active');
    const archived = all.filter(i => i.section === 'archived');

    expect(active.length).toBe(2);
    expect(archived.length).toBe(1);

    const billCcir = active.find(i => i.text.includes('5 days past due'));
    expect(billCcir).toMatchObject({ agent: 'H8', dateValue: '2026-07-15' });
  });

  it('adds a new CCIR to the active section and persists it', () => {
    const added = ccirsModule.addCcir({ text: 'New trigger condition', agent: 'XO', review: '2026-08-01' });
    expect(added.section).toBe('active');

    const reparsed = ccirsModule.getAllCcirs();
    const found = reparsed.find(i => i.id === added.id);
    expect(found).toMatchObject({ text: 'New trigger condition', agent: 'XO', dateValue: '2026-08-01' });
  });

  it('archives an active CCIR, moving it out of the active section', () => {
    const before = ccirsModule.getAllCcirs().find(i => i.section === 'active')!;
    const archived = ccirsModule.archiveCcir(before.id, 'no longer relevant');

    expect(archived.section).toBe('archived');
    expect(archived.archivedNote).toBe('no longer relevant');

    const reparsed = ccirsModule.getAllCcirs();
    expect(reparsed.find(i => i.id === before.id && i.section === 'active')).toBeUndefined();
    expect(reparsed.find(i => i.id === before.id && i.section === 'archived')).toBeDefined();
  });

  it('throws ActiveListItemNotFoundError when archiving an unknown id', () => {
    expect(() => ccirsModule.archiveCcir('does-not-exist')).toThrow(ccirsModule.ActiveListItemNotFoundError);
  });
});
