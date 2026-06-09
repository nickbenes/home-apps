import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckSquare, Square, AlertTriangle, CheckCircle, PartyPopper } from 'lucide-react';
import { DebtPriorityItem } from '../lib/api';

const CHECKLIST_ITEMS = [
  { id: 'credit_score',    label: 'Pull credit report & confirm score (target 720+)' },
  { id: 'income_docs',     label: 'Gather income documents (pay stubs, W-2s, tax returns)' },
  { id: 'lender_quotes',   label: 'Get rate quotes from ≥3 lenders' },
  { id: 'application',     label: 'Submit application with chosen lender' },
  { id: 'appraisal',       label: 'Order appraisal / property valuation' },
  { id: 'rate_lock',       label: 'Lock interest rate' },
  { id: 'closing',         label: 'Review closing disclosure & schedule closing' },
];

function monthsRemaining(deadlineYM: string): number {
  const [y, m] = deadlineYM.split('-').map(Number);
  const now = new Date();
  return (y - now.getFullYear()) * 12 + (m - (now.getMonth() + 1));
}

function formatYM(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function storageKey(accountId: string): string {
  return `balloon_checklist_${accountId}`;
}

function loadChecklist(accountId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(storageKey(accountId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveChecklist(accountId: string, state: Record<string, boolean>): void {
  localStorage.setItem(storageKey(accountId), JSON.stringify(state));
}

function BalloonCard({ item }: { item: DebtPriorityItem }) {
  const [expanded, setExpanded] = useState(false);
  const [checks, setChecks]   = useState<Record<string, boolean>>(() => loadChecklist(item.account_id));

  const deadline = item.payoff_date_est!;
  const months   = monthsRemaining(deadline);
  const onTrack  = item.payoff_date != null && item.payoff_date <= deadline;
  const overdue  = months < 0;
  const doneCount = CHECKLIST_ITEMS.filter(ci => checks[ci.id]).length;

  function toggle(id: string) {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    saveChecklist(item.account_id, next);
  }

  return (
    <div className={`bg-white rounded-lg border overflow-hidden ${overdue ? 'border-red-300' : onTrack ? 'border-green-200' : 'border-amber-300'}`}>
      <div className="px-4 py-3 flex items-center gap-4">
        {overdue
          ? <AlertTriangle size={18} className="text-red-500 shrink-0" />
          : onTrack
            ? <CheckCircle size={18} className="text-green-500 shrink-0" />
            : <AlertTriangle size={18} className="text-amber-500 shrink-0" />}

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{item.creditor}</p>
          <p className="text-xs text-gray-500">Balloon deadline: <strong>{formatYM(deadline)}</strong></p>
        </div>

        <div className="text-right shrink-0">
          {overdue ? (
            <p className="text-lg font-semibold text-red-600">Overdue</p>
          ) : (
            <p className="text-lg font-semibold text-gray-900">{months} <span className="text-sm font-normal text-gray-500">mo left</span></p>
          )}
          <p className={`text-xs font-medium ${overdue ? 'text-red-500' : onTrack ? 'text-green-600' : 'text-amber-600'}`}>
            {overdue ? 'Past deadline' : onTrack ? 'On track' : item.payoff_date ? `Payoff: ${formatYM(item.payoff_date)}` : 'No payoff date'}
          </p>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 shrink-0 ml-2"
        >
          <span className="text-gray-500">{doneCount}/{CHECKLIST_ITEMS.length}</span>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Refinance Readiness</p>
          {CHECKLIST_ITEMS.map(ci => (
            <button
              key={ci.id}
              onClick={() => toggle(ci.id)}
              className="flex items-start gap-2 w-full text-left group"
            >
              {checks[ci.id]
                ? <CheckSquare size={14} className="text-green-600 shrink-0 mt-0.5" />
                : <Square size={14} className="text-gray-300 group-hover:text-gray-400 shrink-0 mt-0.5" />}
              <span className={`text-xs ${checks[ci.id] ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {ci.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PayoffMilestoneCard({ item }: { item: DebtPriorityItem }) {
  const deadline = item.payoff_date_est!;
  const months   = monthsRemaining(deadline);
  const overdue  = months < 0;

  return (
    <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-4">
        <PartyPopper size={18} className="text-green-500 shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{item.creditor}</p>
          <p className="text-xs text-gray-500">Expected payoff: <strong>{formatYM(deadline)}</strong></p>
        </div>

        <div className="text-right shrink-0">
          {overdue ? (
            <p className="text-sm font-semibold text-green-600">Paid off?</p>
          ) : (
            <p className="text-lg font-semibold text-gray-900">{months} <span className="text-sm font-normal text-gray-500">mo left</span></p>
          )}
          <p className="text-xs font-medium text-green-600">
            {overdue ? 'Check if paid off' : 'Almost there!'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BalloonCountdown({ items }: { items: DebtPriorityItem[] }) {
  const balloons  = items.filter(i => i.payoff_date_est != null && i.is_balloon === 1);
  const milestones = items.filter(i => i.payoff_date_est != null && i.is_balloon !== 1);

  if (!balloons.length && !milestones.length) return null;

  return (
    <div className="space-y-4">
      {balloons.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-sm font-semibold text-gray-800">Balloon Payment Deadlines</h2>
            <span className="text-xs text-gray-400">Fixed payoff targets — click to track refi readiness</span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(balloons.length, 2)}, 1fr)` }}>
            {balloons.map(item => <BalloonCard key={item.account_id} item={item} />)}
          </div>
        </div>
      )}

      {milestones.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-sm font-semibold text-gray-800">Upcoming Payoffs</h2>
            <span className="text-xs text-gray-400">Debts on track to reach zero</span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(milestones.length, 2)}, 1fr)` }}>
            {milestones.map(item => <PayoffMilestoneCard key={item.account_id} item={item} />)}
          </div>
        </div>
      )}
    </div>
  );
}
