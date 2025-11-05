import { calculateNextPaymentDate, getTemplatePayments } from '../../frontend/utils';

describe('utils helpers', () => {
  const bills = [
    { id: 1, name: 'T1', amount: -10, date: '2025-01-01', category: 'Other', billId: 100 },
    { id: 2, name: 'T2', amount: -20, date: '2025-02-01', category: 'Other', billId: 100 },
  ];

  it('calculates next payment date in months', () => {
    const next = calculateNextPaymentDate(100, 1, 'months', bills as any);
    // latest payment in bills is 2025-02-01 -> next month is 2025-03-01
    expect(next.startsWith('2025-03-01')).toBeTruthy();
  });

  it('returns payments for a template id', () => {
    const payments = getTemplatePayments(100, bills as any);
    expect(payments.length).toBe(2);
    expect(payments[0].id).toBe(1);
  });
});
