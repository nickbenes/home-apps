const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`);
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

export interface RecurringItemInput {
  recurring_item_id?: string;
  name: string;
  amount: number;
  frequency: string;
  budget_item_id?: string | null;
  account_id?: string | null;
  projected_start_date?: string | null;
  projected_stop_date?: string | null;
  is_active?: number;
  notes?: string | null;
}

export interface RecurringItem {
  recurring_item_id: string;
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

export interface ScheduledPayment {
  recurring_item_id: string;
  name: string;
  due_date: string;
  amount: number;
  frequency: string;
  account_id: string | null;
  creditor: string | null;
}

export interface DebtPriorityItem {
  account_id: string;
  creditor: string;
  account_type: string;
  status: string;
  current_balance: number;
  interest_rate_pct: number | null;
  monthly_payment: number | null;
  monthly_interest: number | null;
  months_to_payoff: number | null;
  payoff_date: string | null;
  payoff_date_est: string | null;
}

export interface ClassificationRule {
  rule_id: string;
  pattern: string;
  match_field: 'merchant_normalized' | 'merchant_text';
  match_type: 'contains' | 'starts_with' | 'exact';
  budget_item_id: string;
  budget_item_name: string;
  category_name: string;
  confidence: 'auto_high' | 'auto_medium' | 'auto_low';
  priority: number;
  is_active: number;
  source: string;
  notes: string | null;
}

export interface BudgetVarianceItem {
  budget_item_id: string;
  item_name: string;
  category_id: string;
  category_name: string;
  budgeted_monthly: number;
  actual_amount: number;
  tx_count: number;
}

export interface BudgetVarianceCategory {
  category_id: string;
  category_name: string;
  display_order: number;
  budgeted: number;
  actual: number;
  items: BudgetVarianceItem[];
}

export interface BudgetVariance {
  month: string;
  categories: BudgetVarianceCategory[];
}

export interface AuditEntry {
  log_id: string;
  mapping_id: string;
  transaction_id: string;
  budget_item_id: string;
  action: 'created' | 'updated' | 'deleted';
  old_budget_item_id: string | null;
  old_allocated_amount: number | null;
  new_allocated_amount: number | null;
  changed_by: 'user' | 'rule' | 'import' | null;
  notes: string | null;
  created_at: string;
  budget_item_name: string | null;
  category_name: string | null;
  old_budget_item_name: string | null;
  merchant_normalized: string | null;
  merchant_text: string | null;
  transaction_date: string | null;
  transaction_amount: number | null;
}

export interface Summary {
  total_debt: number | null;
  monthly_recurring_by_category: { category_id: string; category_name: string; total_effective_monthly: number }[];
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
    update: (id: string, body: Partial<Pick<Account, 'current_balance' | 'balance_date' | 'interest_rate_pct' | 'status' | 'notes'>>) =>
      patch<Account>(`/accounts/${id}`, body),
  },
  budget: {
    items:    ()            => get<BudgetItem[]>('/budget/items'),
    variance: (month: string) => get<BudgetVariance>(`/budget/variance?month=${month}`),
  },
  recurring: {
    list:    ()                                                 => get<RecurringItem[]>('/recurring'),
    listAll: ()                                                 => get<RecurringItem[]>('/recurring?all=true'),
    create:  (body: Omit<RecurringItemInput, 'recurring_item_id'>) => post<RecurringItem>('/recurring', body),
    update:  (id: string, body: Partial<RecurringItemInput>)    => patch<RecurringItem>(`/recurring/${id}`, body),
    delete:  (id: string)                                       => del(`/recurring/${id}`),
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
  scheduled: {
    list: (days = 90) => get<ScheduledPayment[]>(`/scheduled?days=${days}`),
  },
  rules: {
    list:   ()                                                        => get<ClassificationRule[]>('/rules'),
    create: (body: Omit<ClassificationRule, 'rule_id' | 'budget_item_name' | 'category_name' | 'source'>) =>
              post<ClassificationRule>('/rules', body),
    update: (id: string, body: Partial<ClassificationRule>)          => patch<ClassificationRule>(`/rules/${id}`, body),
    delete: (id: string)                                             => del(`/rules/${id}`),
    apply:  ()                                                       => post<{ classified: number; skipped: number }>('/rules/apply', {}),
  },
  audit: {
    list: (filters: { transaction_id?: string; action?: string; changed_by?: string; limit?: number; offset?: number } = {}) => {
      const qs = new URLSearchParams();
      if (filters.transaction_id) qs.set('transaction_id', filters.transaction_id);
      if (filters.action)         qs.set('action',         filters.action);
      if (filters.changed_by)     qs.set('changed_by',     filters.changed_by);
      if (filters.limit)          qs.set('limit',          String(filters.limit));
      if (filters.offset)         qs.set('offset',         String(filters.offset));
      return get<AuditEntry[]>(`/audit?${qs}`);
    },
  },
  debtPriority: () => get<DebtPriorityItem[]>('/debt-priority'),
  summary: () => get<Summary>('/summary'),
};
