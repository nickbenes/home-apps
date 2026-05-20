export const STORAGE_KEY = 'bill-payment-planner-bills';
export const TEMPLATES_KEY = 'bill-payment-planner-templates';

export const CATEGORIES = ['Income', 'Housing', 'Utilities', 'Subscriptions', 'Insurance', 'Transportation', 'Food', 'Entertainment', 'Healthcare', 'Other'];

export type Bill = {
  id: number;
  name: string;
  amount: number;
  date: string;
  category: string;
  notes?: string;
  billId?: number | null;
};

export type Template = {
  id: number;
  name: string;
  amount: number;
  category: string;
  frequencyNumber?: number;
  frequencyPeriod?: string;
  notes?: string;
};

export type NewBillForm = {
  name: string;
  amount: string;
  date: string;
  category: string;
  notes: string;
};

export type TemplateForm = {
  name: string;
  amount: string;
  category: string;
  frequencyNumber: number | string;
  frequencyPeriod: string;
  notes: string;
};

export const TIME_PERIODS = ['days', 'weeks', 'months', 'years'];

export const getInitialBills = (): Bill[] => {
  try {
    const savedBills = localStorage.getItem(STORAGE_KEY);
    if (savedBills) {
      return JSON.parse(savedBills);
    }
  } catch (error) {
    console.error('Error loading bills:', error);
  }
  return [
    { id: 1, name: 'Rent', amount: -1500, date: '2025-11-01', category: 'Housing' },
    { id: 2, name: 'Electricity', amount: -120, date: '2025-11-05', category: 'Utilities' },
    { id: 3, name: 'Paycheck', amount: 3000, date: '2025-11-15', category: 'Income' },
  ];
};

export const getInitialTemplates = (): Template[] => {
  try {
    const savedTemplates = localStorage.getItem(TEMPLATES_KEY);
    if (savedTemplates) {
      return JSON.parse(savedTemplates);
    }
  } catch (error) {
    console.error('Error loading templates:', error);
  }
  return [];
};

export const calculateNextPaymentDate = (templateId: number, frequencyNumber: number, frequencyPeriod: string, bills: Bill[]) => {
  const payments = bills.filter(b => b.billId === templateId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (payments.length === 0) return new Date().toISOString().split('T')[0];

  const latestPayment = payments[payments.length - 1];
  const latestDate = new Date(latestPayment.date + 'T00:00:00'); // Ensure time is set to midnight for consistency
  let nextDate = new Date(latestDate);

  switch (frequencyPeriod) {
    case 'days':
      nextDate.setDate(nextDate.getDate() + frequencyNumber);
      break;
    case 'weeks':
      nextDate.setDate(nextDate.getDate() + (frequencyNumber * 7));
      break;
    case 'months':
      nextDate.setMonth(nextDate.getMonth() + frequencyNumber);
      break;
    case 'years':
      nextDate.setFullYear(nextDate.getFullYear() + frequencyNumber);
      break;
  }

  return nextDate.toISOString().split('T')[0];
};

export const getTemplatePayments = (templateId: number, bills: Bill[]) => {
  return bills.filter(bill => bill.billId === templateId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Income': 'bg-green-100 text-green-800',
    'Housing': 'bg-blue-100 text-blue-800',
    'Utilities': 'bg-yellow-100 text-yellow-800',
    'Subscriptions': 'bg-purple-100 text-purple-800',
    'Insurance': 'bg-indigo-100 text-indigo-800',
    'Transportation': 'bg-orange-100 text-orange-800',
    'Food': 'bg-red-100 text-red-800',
    'Entertainment': 'bg-pink-100 text-pink-800',
    'Healthcare': 'bg-teal-100 text-teal-800',
    'Other': 'bg-gray-100 text-gray-800',
  };
  return colors[category] || colors['Other'];
};
