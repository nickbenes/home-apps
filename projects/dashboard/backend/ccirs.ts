import { createActiveListStore, ActiveListItemNotFoundError } from './markdown-active-list.js';

// FR-024: Critical Information Requirements — threshold/trigger conditions that warrant
// surfacing outside the normal briefing rhythm, e.g. "any bill goes 5 days past due."
// Stored at _meta/ccirs.md.

const store = createActiveListStore(
  { relPath: '_meta/ccirs.md', dateFieldKey: 'review' },
  'CCIRs'
);

export type Ccir = ReturnType<typeof store.getAll>[number];

export function getAllCcirs() {
  return store.getAll();
}

export function addCcir(input: { text: string; agent?: string; review?: string }) {
  return store.add({ text: input.text, agent: input.agent, dateValue: input.review });
}

export function archiveCcir(id: string, note?: string) {
  return store.archive(id, note);
}

export { ActiveListItemNotFoundError };
