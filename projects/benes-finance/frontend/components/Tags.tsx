import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { api, RecurringItem } from '../lib/api';
import { formatCurrency, FREQUENCY_LABEL } from '../lib/format';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
];

function tagColor(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length];
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${tagColor(tag)}`}>
      <Tag size={10} />
      {tag}
    </span>
  );
}

function ItemRow({ item }: { item: RecurringItem }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 ${!item.is_active ? 'opacity-40' : ''}`}>
      <span className="flex-1 text-sm text-gray-800 truncate">{item.name}</span>
      {!item.is_active && (
        <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded shrink-0">inactive</span>
      )}
      <span className={`text-xs font-mono shrink-0 ${item.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
        {item.amount < 0 ? '−' : '+'}{formatCurrency(Math.abs(item.amount), true)}
      </span>
      <span className="text-xs text-gray-400 shrink-0 w-20 text-right">
        {FREQUENCY_LABEL[item.frequency] ?? item.frequency}
      </span>
    </div>
  );
}

function TagCard({ tag, items }: { tag: string; items: RecurringItem[] }) {
  const active   = items.filter(i => i.is_active);
  const inactive = items.filter(i => !i.is_active);
  const sorted   = [...active, ...inactive];
  const monthly  = active.reduce((s, i) => s + i.effective_monthly, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-3">
        <TagPill tag={tag} />
        <span className="text-xs text-gray-400">{active.length} active{inactive.length > 0 ? `, ${inactive.length} inactive` : ''}</span>
        {active.length > 0 && (
          <span className={`ml-auto text-xs font-mono font-medium ${monthly < 0 ? 'text-red-600' : 'text-green-700'}`}>
            {monthly < 0 ? '−' : '+'}{formatCurrency(Math.abs(monthly), true)}/mo
          </span>
        )}
      </div>
      <div>
        {sorted.map(item => <ItemRow key={item.recurring_item_id} item={item} />)}
      </div>
    </div>
  );
}

function PrefixSection({ prefix, tags, tagToItems }: {
  prefix: string | null;
  tags: string[];
  tagToItems: Map<string, RecurringItem[]>;
}) {
  const totalActive = tags.reduce((s, t) => s + (tagToItems.get(t) ?? []).filter(i => i.is_active).length, 0);
  const totalMonthly = tags.reduce((s, t) => {
    return s + (tagToItems.get(t) ?? []).filter(i => i.is_active).reduce((ss, i) => ss + i.effective_monthly, 0);
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {prefix ?? 'Other'}
        </h2>
        <span className="text-xs text-gray-400">{tags.length} tag{tags.length !== 1 ? 's' : ''} · {totalActive} active items</span>
        {totalActive > 0 && (
          <span className={`text-xs font-mono ${totalMonthly < 0 ? 'text-red-500' : 'text-green-600'}`}>
            {totalMonthly < 0 ? '−' : '+'}{formatCurrency(Math.abs(totalMonthly), true)}/mo
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {tags.map(tag => (
          <TagCard key={tag} tag={tag} items={tagToItems.get(tag) ?? []} />
        ))}
      </div>
    </div>
  );
}

export default function Tags() {
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.recurring.listAll()
      .then(items => { setItems(items); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const { tagToItems, prefixGroups, unprefixed, untaggedActive } = useMemo(() => {
    const tagToItems = new Map<string, RecurringItem[]>();
    for (const item of items) {
      for (const tag of item.tags) {
        if (!tagToItems.has(tag)) tagToItems.set(tag, []);
        tagToItems.get(tag)!.push(item);
      }
    }

    const prefixGroups = new Map<string, string[]>();
    const unprefixed: string[] = [];
    for (const tag of [...tagToItems.keys()].sort()) {
      const col = tag.indexOf(':');
      if (col > 0) {
        const prefix = tag.slice(0, col).trim();
        if (!prefixGroups.has(prefix)) prefixGroups.set(prefix, []);
        prefixGroups.get(prefix)!.push(tag);
      } else {
        unprefixed.push(tag);
      }
    }

    const untaggedActive = items.filter(i => i.is_active && i.tags.length === 0).length;
    return { tagToItems, prefixGroups, unprefixed, untaggedActive };
  }, [items]);

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;
  if (error)   return <p className="text-red-600 text-sm">{error}</p>;

  const totalTags   = tagToItems.size;
  const taggedItems = new Set(items.filter(i => i.tags.length > 0).map(i => i.recurring_item_id)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Tags</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalTags} tag{totalTags !== 1 ? 's' : ''} across {taggedItems} recurring item{taggedItems !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/recurring"
          className="ml-auto text-xs text-blue-600 hover:underline"
        >
          Manage on Recurring →
        </Link>
      </div>

      {/* Untagged warning */}
      {untaggedActive > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <Tag size={13} />
          {untaggedActive} active item{untaggedActive !== 1 ? 's have' : ' has'} no tags — consider tagging{' '}
          <Link to="/recurring" className="underline hover:text-amber-900">on the Recurring page</Link>.
        </div>
      )}

      {totalTags === 0 ? (
        <div className="text-center text-gray-400 italic text-sm py-16">
          No tags yet. Add tags to recurring items on the{' '}
          <Link to="/recurring" className="text-blue-500 hover:underline">Recurring page</Link>.
        </div>
      ) : (
        <div className="space-y-8">
          {[...prefixGroups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([prefix, tags]) => (
            <PrefixSection key={prefix} prefix={prefix} tags={tags} tagToItems={tagToItems} />
          ))}
          {unprefixed.length > 0 && (
            <PrefixSection prefix={null} tags={unprefixed} tagToItems={tagToItems} />
          )}
        </div>
      )}
    </div>
  );
}
