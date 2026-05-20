const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatCurrency(amount: number, cents = false): string {
  return (cents ? usdCents : usd).format(amount);
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  delinquent: 'Delinquent',
  paid_off: 'Paid Off',
  charged_off: 'Charged Off',
  in_collections: 'In Collections',
  judgment: 'Judgment',
  settled: 'Settled',
};

export const STATUS_COLOR: Record<string, string> = {
  judgment:       'bg-red-100 text-red-700',
  in_collections: 'bg-red-100 text-red-700',
  delinquent:     'bg-orange-100 text-orange-700',
  charged_off:    'bg-amber-100 text-amber-700',
  active:         'bg-blue-100 text-blue-700',
  paid_off:       'bg-green-100 text-green-700',
  settled:        'bg-green-100 text-green-700',
};

export const STATUS_SORT: Record<string, number> = {
  judgment: 0, in_collections: 1, delinquent: 2, charged_off: 3,
  active: 4, settled: 5, paid_off: 6,
};

export const FREQUENCY_LABEL: Record<string, string> = {
  weekly:        'Weekly',
  biweekly:      'Biweekly',
  monthly:       'Monthly',
  every_4_weeks: 'Every 4 wks',
  annually:      'Annually',
  one_time:      'One-time',
};

export const TYPE_LABEL: Record<string, string> = {
  personal_loan: 'Personal Loan',
  mortgage:      'Mortgage',
  credit_card:   'Credit Card',
  student_loan:  'Student Loan',
  tax_debt:      'Tax Debt',
  auto_loan:     'Auto Loan',
  settlement:    'Settlement',
  collections:   'Collections',
  judgment:      'Judgment',
  bnpl:          'BNPL',
  income_source: 'Bank Account',
};
