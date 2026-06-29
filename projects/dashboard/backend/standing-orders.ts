import { createActiveListStore, ActiveListItemNotFoundError } from './markdown-active-list.js';

// FR-024: persistent behavioral instructions for agents, e.g. "Always include a summary of
// subscribed newsletters at morning briefing." Stored at _meta/standing-orders.md.

const store = createActiveListStore(
  { relPath: '_meta/standing-orders.md', dateFieldKey: 'effective' },
  'Standing Orders'
);

export type StandingOrder = ReturnType<typeof store.getAll>[number];

export function getAllStandingOrders() {
  return store.getAll();
}

export function addStandingOrder(input: { text: string; agent?: string; effective?: string }) {
  return store.add({ text: input.text, agent: input.agent, dateValue: input.effective });
}

export function archiveStandingOrder(id: string, note?: string) {
  return store.archive(id, note);
}

export { ActiveListItemNotFoundError };
