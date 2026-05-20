const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`DELETE ${path} → ${res.status}`);
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Account {
  account_id: string;
  creditor: string;
  account_type: string;
  status: string;
  current_balance: number | null;
  balance_date: string | null;
  interest_rate_pct: number | null;
  account_number: string | null;
  portal_url: string | null;
  payoff_date_est: string | null;
  notes: string | null;
}

export interface BudgetItem {
  budget_item_id: string;
  category_id: string;
  name: string;
  category_name: string;
  expected_amount: number | null;
}

export interface CashflowItem {
  cashflow_item_id: string;
  name: string;
  amount: number;
  effective_monthly: number;
  frequency: string;
  payments_per_year: number;
  budget_item_id: string | null;
  account_id: string | null;
  is_active: number;
}

export interface Transaction {
  transaction_id: string;
  account_id: string;
  transaction_date: string;
  posted_date: string | null;
  amount: number;
  merchant_text: string;
  merchant_normalized: string | null;
  transaction_type: string;
  mapping_count: number;
}

export interface Mapping {
  mapping_id: string;
  transaction_id: string;
  budget_item_id: string;
  allocated_amount: number;
  confidence: string;
  budget_item_name?: string;
  category_name?: string;
}

export interface Summary {
  total_debt: number | null;
  monthly_cashflow_by_category: { category_id: string; category_name: string; total_effective_monthly: number }[];
  unmatched_transaction_count: number;
}

// ── API calls ────────────────────────────────────────────────────────────────

export interface TransactionFilters {
  account_id?: string;
  unmatched?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

export const api = {
  accounts: {
    list: () => get<Account[]>('/accounts'),
  },
  budget: {
    items: () => get<BudgetItem[]>('/budget/items'),
  },
  cashflow: {
    list: () => get<CashflowItem[]>('/cashflow'),
  },
  transactions: {
    list: (filters: TransactionFilters = {}) => {
      const qs = new URLSearchParams();
      if (filters.account_id) qs.set('account_id', filters.account_id);
      if (filters.unmatched)   qs.set('unmatched', 'true');
      if (filters.q)           qs.set('q', filters.q);
      if (filters.limit)       qs.set('limit', String(filters.limit));
      if (filters.offset)      qs.set('offset', String(filters.offset));
      return get<Transaction[]>(`/transactions?${qs}`);
    },
    get: (id: string) => get<Transaction & { mappings: Mapping[] }>(`/transactions/${id}`),
    classify: (id: string, body: { budget_item_id: string; allocated_amount: number; notes?: string }) =>
      post<Mapping>(`/transactions/${id}/classify`, body),
  },
  mappings: {
    delete: (id: string) => del(`/mappings/${id}`),
  },
  summary: () => get<Summary>('/summary'),
};
