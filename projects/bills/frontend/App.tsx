import React, { useState, useEffect } from 'react';
import { GripVertical, Plus, Trash2, DollarSign, Edit2, Check, X, Filter, RefreshCw, Calendar, ChevronDown, ChevronRight, List, Download, Upload } from 'lucide-react';

const STORAGE_KEY = 'bill-payment-planner-bills';
const TEMPLATES_KEY = 'bill-payment-planner-templates';

const CATEGORIES = ['Income', 'Housing', 'Utilities', 'Subscriptions', 'Insurance', 'Transportation', 'Food', 'Entertainment', 'Healthcare', 'Other'];

type Bill = {
  id: number;
  name: string;
  amount: number;
  date: string;
  category: string;
  notes?: string;
  billId?: number | null;
};

type Template = {
  id: number;
  name: string;
  amount: number;
  category: string;
  frequencyNumber?: number;
  frequencyPeriod?: string;
  notes?: string;
};

type NewBillForm = {
  name: string;
  amount: string;
  date: string;
  category: string;
  notes: string;
};

type TemplateForm = {
  name: string;
  amount: string;
  category: string;
  frequencyNumber: number | string;
  frequencyPeriod: string;
  notes: string;
};

const getInitialBills = () => {
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

const getInitialTemplates = () => {
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

const TIME_PERIODS = ['days', 'weeks', 'months', 'years'];

export default function BillPaymentPlanner() {
  const [bills, setBills] = useState<Bill[]>(getInitialBills() as Bill[]);
  const [templates, setTemplates] = useState<Template[]>(getInitialTemplates() as Template[]);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [newBill, setNewBill] = useState<NewBillForm>({ name: '', amount: '', date: '', category: 'Other', notes: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<NewBillForm>({ name: '', amount: '', date: '', category: 'Other', notes: '' });
  const [sortBy, setSortBy] = useState('order');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateDates, setTemplateDates] = useState<Record<number, string>>({});
  const [currentPage, setCurrentPage] = useState('planner'); // 'planner' or 'templates'
  const [expandedTemplates, setExpandedTemplates] = useState<Record<number, boolean>>({});
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [templateEditForm, setTemplateEditForm] = useState<TemplateForm>({ name: '', amount: '', category: 'Other', frequencyNumber: 1, frequencyPeriod: 'months', notes: '' });
  const [newTemplate, setNewTemplate] = useState<TemplateForm>({ name: '', amount: '', category: 'Other', frequencyNumber: 1, frequencyPeriod: 'months', notes: '' });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
    } catch (error) {
      console.error('Error saving bills:', error);
    }
  }, [bills]);

  useEffect(() => {
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  }, [templates]);

  const handleDragStart = (e: any, index: number) => {
    if (sortBy !== 'order') return;
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: any, index: number) => {
    e.preventDefault();
    if (sortBy !== 'order' || draggedItem === null || draggedItem === index) return;

    const newBills = [...bills];
    const draggedBill = newBills[draggedItem];
    newBills.splice(draggedItem, 1);
    newBills.splice(index, 0, draggedBill);

    setBills(newBills);
    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const addBill = () => {
    if (!newBill.name || !newBill.amount || !newBill.date) return;

    const bill = {
      id: Date.now(),
      name: newBill.name,
      amount: parseFloat(newBill.amount),
      date: newBill.date,
      category: newBill.category,
      notes: newBill.notes,
      billId: null,
    };

    setBills([...bills, bill]);
    setNewBill({ name: '', amount: '', date: '', category: 'Other', notes: '' });
  };

  const deleteBill = (id: number) => {
    setBills(bills.filter(bill => bill.id !== id));
  };

  const startEdit = (bill: Bill) => {
    setEditingId(bill.id);
    setEditForm({ name: bill.name, amount: bill.amount.toString(), date: bill.date, category: bill.category, notes: bill.notes || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', amount: '', date: '', category: 'Other', notes: '' });
  };

  const saveEdit = () => {
    if (!editForm.name || !editForm.amount || !editForm.date) return;

    setBills(bills.map(bill => 
      bill.id === editingId 
        ? { ...bill, name: editForm.name, amount: parseFloat(editForm.amount), date: editForm.date, category: editForm.category, notes: editForm.notes }
        : bill
    ));
    setEditingId(null);
    setEditForm({ name: '', amount: '', date: '', category: 'Other', notes: '' });
  };

  const saveAsTemplate = (bill: Bill) => {
    const template = {
      id: Date.now(),
      name: bill.name,
      amount: bill.amount,
      category: bill.category,
      frequencyNumber: 1,
      frequencyPeriod: 'months',
      notes: bill.notes || '',
    };
    setTemplates([...templates, template]);
  };

  const addNewTemplate = () => {
    if (!newTemplate.name || !newTemplate.amount) return;

    const template = {
      id: Date.now(),
      name: newTemplate.name,
      amount: parseFloat(newTemplate.amount),
      category: newTemplate.category,
      frequencyNumber: parseInt(String(newTemplate.frequencyNumber)),
      frequencyPeriod: newTemplate.frequencyPeriod,
      notes: newTemplate.notes,
    };

    setTemplates([...templates, template]);
    setNewTemplate({ name: '', amount: '', category: 'Other', frequencyNumber: 1, frequencyPeriod: 'months', notes: '' });
  };

  const viewRecurringBill = (billId: number | null | undefined) => {
    if (billId) {
      setCurrentPage('templates');
      setExpandedTemplates({ [billId]: true });
    }
  };

  const calculateNextPaymentDate = (templateId: number, frequencyNumber: number, frequencyPeriod: string) => {
    const payments = getTemplatePayments(templateId);
    
    if (payments.length === 0) {
      return new Date().toISOString().split('T')[0];
    }

    const latestPayment = payments[payments.length - 1];
    const latestDate = new Date(latestPayment.date);
    
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

  const addFromTemplate = (template: Template) => {
    const defaultDate = calculateNextPaymentDate(
      template.id,
      Number(template.frequencyNumber || 1),
      template.frequencyPeriod || 'months'
    );
    const selectedDate = templateDates[template.id] || defaultDate;
    
    const bill = {
      id: Date.now(),
      name: template.name,
      amount: template.amount,
      date: selectedDate,
      category: template.category,
      notes: template.notes || '',
      billId: template.id,
    };

    setBills([...bills, bill]);
  };

  const deleteTemplate = (id: number) => {
    setTemplates(templates.filter(t => t.id !== id));
    const newTemplateDates = { ...templateDates };
    delete newTemplateDates[id];
    setTemplateDates(newTemplateDates);
    const newExpanded = { ...expandedTemplates };
    delete newExpanded[id];
    setExpandedTemplates(newExpanded);
  };

  const startTemplateEdit = (template: Template) => {
    setEditingTemplateId(template.id);
    setTemplateEditForm({ 
      name: template.name, 
      amount: template.amount.toString(), 
      category: template.category,
      frequencyNumber: template.frequencyNumber || 1,
      frequencyPeriod: template.frequencyPeriod || 'months',
      notes: template.notes || ''
    });
  };

  const cancelTemplateEdit = () => {
    setEditingTemplateId(null);
    setTemplateEditForm({ name: '', amount: '', category: 'Other', frequencyNumber: 1, frequencyPeriod: 'months', notes: '' });
  };

  const saveTemplateEdit = () => {
    if (!templateEditForm.name || !templateEditForm.amount) return;

    setTemplates(templates.map(template => 
      template.id === editingTemplateId 
        ? { 
            ...template, 
            name: templateEditForm.name, 
            amount: parseFloat(templateEditForm.amount), 
            category: templateEditForm.category,
            frequencyNumber: parseInt(String(templateEditForm.frequencyNumber)),
            frequencyPeriod: templateEditForm.frequencyPeriod,
            notes: templateEditForm.notes
          }
        : template
    ));
    setEditingTemplateId(null);
    setTemplateEditForm({ name: '', amount: '', category: 'Other', frequencyNumber: 1, frequencyPeriod: 'months', notes: '' });
  };

  const toggleTemplateExpand = (templateId: number) => {
    setExpandedTemplates(prev => ({
      ...prev,
      [templateId]: !prev[templateId]
    }));
  };

  const getTemplatePayments = (templateId: number) => {
    return bills.filter(bill => bill.billId === templateId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const isRecurringBill = (billId: number | null | undefined) => {
    return billId !== null && billId !== undefined;
  };

  // helper removed: getTemplateName was unused

  const exportPaymentsToCSV = () => {
    const headers = ['id', 'name', 'amount', 'date', 'category', 'notes', 'billId'];
    const rows = bills.map(bill => [
      bill.id,
      bill.name,
      bill.amount,
      bill.date,
      bill.category,
      bill.notes || '',
      bill.billId || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTemplatesToCSV = () => {
    const headers = ['id', 'name', 'amount', 'category', 'frequencyNumber', 'frequencyPeriod', 'notes'];
    const rows = templates.map(template => [
      template.id,
      template.name,
      template.amount,
      template.category,
      template.frequencyNumber || 1,
      template.frequencyPeriod || 'months',
      template.notes || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recurring-bills-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPaymentsFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') return;
        const lines = text.split('\n').filter((line: string) => line.trim());

        const newBills: Bill[] = [];
        for (let i = 1; i < lines.length; i++) {
          const match = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
          const values = match.map((v: string) => v.replace(/^"|"$/g, '').trim());

          const bill: Bill = {
            id: parseInt(values[0]) || Date.now() + i,
            name: values[1] || '',
            amount: parseFloat(values[2]) || 0,
            date: values[3] || new Date().toISOString().split('T')[0],
            category: values[4] || 'Other',
            notes: values[5] || '',
            billId: values[6] && values[6] !== '' ? parseInt(values[6]) : null
          };

          if (bill.name && bill.amount !== 0) {
            newBills.push(bill);
          }
        }

        setBills([...bills, ...newBills]);
        alert(`Successfully imported ${newBills.length} payment(s)`);
      } catch (error) {
        alert('Error importing CSV. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  const importTemplatesFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') return;
        const lines = text.split('\n').filter((line: string) => line.trim());

        const newTemplates: Template[] = [];
        for (let i = 1; i < lines.length; i++) {
          const match = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
          const values = match.map((v: string) => v.replace(/^"|"$/g, '').trim());

          const template: Template = {
            id: parseInt(values[0]) || Date.now() + i,
            name: values[1] || '',
            amount: parseFloat(values[2]) || 0,
            category: values[3] || 'Other',
            frequencyNumber: parseInt(values[4]) || 1,
            frequencyPeriod: values[5] || 'months',
            notes: values[6] || ''
          };

          if (template.name && template.amount !== 0) {
            newTemplates.push(template);
          }
        }

        setTemplates([...templates, ...newTemplates]);
        alert(`Successfully imported ${newTemplates.length} recurring bill(s)`);
      } catch (error) {
        alert('Error importing CSV. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  const getFilteredAndSortedBills = () => {
    let filtered = bills;
    
    if (filterCategory !== 'all') {
      filtered = bills.filter(bill => bill.category === filterCategory);
    }

    let sorted = [...filtered];
    
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'amount':
        sorted.sort((a, b) => a.amount - b.amount);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'category':
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      default:
        break;
    }

    return sorted;
  };

  const displayBills = getFilteredAndSortedBills();

  const getRunningBalance = (index: number) => {
    return displayBills.slice(0, index + 1).reduce((acc, bill) => acc + bill.amount, 0);
  };

  const runningTotal = displayBills.reduce((acc, bill) => acc + bill.amount, 0);

  const getCategoryColor = (category: string) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage('planner')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                currentPage === 'planner'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Calendar size={20} />
                Payment Planner
              </div>
            </button>
            <button
              onClick={() => setCurrentPage('templates')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                currentPage === 'templates'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <RefreshCw size={20} />
                Recurring Bills ({templates.length})
              </div>
            </button>
          </div>
        </div>

        {/* Payment Planner Page */}
        {currentPage === 'planner' && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Bill Payment Planner</h1>
              <p className="text-gray-600 mb-4">Manage your bills with categories and templates</p>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Bill name"
                  value={newBill.name}
                  onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  step="0.01"
                  value={newBill.amount}
                  onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="date"
                  value={newBill.date}
                  onChange={(e) => setNewBill({ ...newBill, date: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={newBill.category}
                  onChange={(e) => setNewBill({ ...newBill, category: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  onClick={addBill}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add
                </button>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={newBill.notes}
                  onChange={(e) => setNewBill({ ...newBill, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-gray-600" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="order">Manual Order</option>
                    <option value="date">Date</option>
                    <option value="amount">Amount</option>
                    <option value="name">Name</option>
                    <option value="category">Category</option>
                  </select>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={exportPaymentsToCSV}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition flex items-center gap-2 text-sm"
                  >
                    <Download size={16} />
                    Export
                  </button>
                  
                  <label className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition flex items-center gap-2 text-sm cursor-pointer">
                    <Upload size={16} />
                    Import
                    <input
                      type="file"
                      accept=".csv"
                      onChange={importPaymentsFromCSV}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="px-4 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition flex items-center gap-2 text-sm"
                  >
                    <RefreshCw size={16} />
                    Quick Add from Templates
                  </button>
                </div>
              </div>
            </div>

            {showTemplates && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Add from Templates</h2>
                {templates.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No templates saved. Click the refresh icon on any bill to save it as a template.</p>
                ) : (
                  <div className="space-y-2">
            {templates.map(template => {
                      const defaultDate = calculateNextPaymentDate(
                        template.id,
                        Number(template.frequencyNumber || 1),
                        template.frequencyPeriod || 'months'
                      );
                      const templateDate = templateDates[template.id] || defaultDate;
                      
                      return (
                        <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="font-medium text-gray-800">{template.name}</div>
                            <div className={`flex items-center gap-1 font-semibold ${
                              template.amount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <DollarSign size={16} />
                              {template.amount >= 0 ? '+' : ''}{template.amount.toFixed(2)}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                              {template.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={templateDate}
                              onChange={(e) => setTemplateDates({ ...templateDates, [template.id]: e.target.value })}
                              className="px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                            <button
                              onClick={() => addFromTemplate(template)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                            >
                              Add to Bills
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {displayBills.map((bill, index) => {
                const balance = getRunningBalance(index);
                const isEditing = editingId === bill.id;
                
                return (
                  <div
                    key={bill.id}
                    draggable={!isEditing && sortBy === 'order'}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-lg shadow p-4 transition ${
                      isEditing ? '' : sortBy === 'order' ? 'cursor-move hover:shadow-md' : 'hover:shadow-md'
                    } ${draggedItem === index ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <GripVertical 
                        className={`flex-shrink-0 ${
                          sortBy === 'order' && !isEditing ? 'text-gray-400' : 'text-gray-300'
                        }`} 
                        size={24} 
                      />
                      
                      {isEditing ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.amount}
                            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />

                          <select
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={saveEdit}
                              className="text-green-600 hover:text-green-700 transition p-2 bg-green-50 rounded"
                            >
                              <Check size={20} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-gray-600 hover:text-gray-700 transition p-2 bg-gray-50 rounded"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          
                          <div className="col-span-full">
                            <input
                              type="text"
                              placeholder="Notes (optional)"
                              value={editForm.notes}
                              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                            <div className="font-medium text-gray-800">{bill.name}</div>
                            
                            <div className={`flex items-center gap-1 font-semibold ${
                              bill.amount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <DollarSign size={18} />
                              {bill.amount >= 0 ? '+' : ''}{bill.amount.toFixed(2)}
                            </div>
                            
                            <div className="text-gray-600">
                              {new Date(bill.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>

                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(bill.category)} w-fit`}>
                              {bill.category}
                            </span>
                            
                            <div className="flex items-center justify-between md:justify-end gap-2">
                              <div className={`font-medium text-sm ${
                                balance >= 0 ? 'text-green-700' : 'text-red-700'
                              }`}>
                                Balance: ${balance.toFixed(2)}
                              </div>
                              
                              <div className="flex items-center gap-1">
                                {isRecurringBill(bill.billId) ? (
                                  <button
                                    onClick={() => viewRecurringBill(bill.billId)}
                                    className="text-purple-500 hover:text-purple-700 transition p-1"
                                    title="View recurring bill"
                                  >
                                    <List size={18} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => saveAsTemplate(bill)}
                                    className="text-purple-500 hover:text-purple-700 transition p-1"
                                    title="Save as template"
                                  >
                                    <RefreshCw size={18} />
                                  </button>
                                )}
                                <button
                                  onClick={() => startEdit(bill)}
                                  className="text-blue-500 hover:text-blue-700 transition p-1"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => deleteBill(bill.id)}
                                  className="text-red-500 hover:text-red-700 transition p-1"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {bill.notes && (
                            <div className="mt-2 text-sm text-gray-600 italic">
                              {bill.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {displayBills.length === 0 && (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                {filterCategory !== 'all' ? 'No bills in this category.' : 'No bills added yet. Add your first bill above!'}
              </div>
            )}

            {displayBills.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-700">
                    {filterCategory !== 'all' ? `${filterCategory} Balance:` : 'Final Balance:'}
                  </span>
                  <span className={`text-2xl font-bold ${
                    runningTotal >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${runningTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Recurring Bills Page */}
        {currentPage === 'templates' && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Recurring Bills</h1>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600">Manage your recurring bill templates and view payment history</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportTemplatesToCSV}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition flex items-center gap-2 text-sm"
                  >
                    <Download size={16} />
                    Export
                  </button>
                  
                  <label className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition flex items-center gap-2 text-sm cursor-pointer">
                    <Upload size={16} />
                    Import
                    <input
                      type="file"
                      accept=".csv"
                      onChange={importTemplatesFromCSV}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Bill name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  step="0.01"
                  value={newTemplate.amount}
                  onChange={(e) => setNewTemplate({ ...newTemplate, amount: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="col-span-2 flex gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-gray-600 whitespace-nowrap">Every</span>
                    <input
                      type="number"
                      min="1"
                      value={newTemplate.frequencyNumber}
                      onChange={(e) => setNewTemplate({ ...newTemplate, frequencyNumber: e.target.value })}
                      className="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      value={newTemplate.frequencyPeriod}
                      onChange={(e) => setNewTemplate({ ...newTemplate, frequencyPeriod: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {TIME_PERIODS.map(period => (
                        <option key={period} value={period}>{period}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={addNewTemplate}
                  className="col-span-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add
                </button>
              </div>
              
              <input
                type="text"
                placeholder="Notes (optional)"
                value={newTemplate.notes}
                onChange={(e) => setNewTemplate({ ...newTemplate, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {templates.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <RefreshCw size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg mb-2">No recurring bills yet</p>
                <p>Go to the Payment Planner and click the refresh icon on any bill to save it as a recurring template.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map(template => {
                  const isExpanded = expandedTemplates[template.id];
                  const isEditing = editingTemplateId === template.id;
                  const payments = getTemplatePayments(template.id);
                  
                  return (
                    <div key={template.id} className="bg-white rounded-lg shadow">
                      <div className="p-4">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                value={templateEditForm.name}
                                onChange={(e) => setTemplateEditForm({ ...templateEditForm, name: e.target.value })}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={templateEditForm.amount}
                                onChange={(e) => setTemplateEditForm({ ...templateEditForm, amount: e.target.value })}
                                className="w-32 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <select
                                value={templateEditForm.category}
                                onChange={(e) => setTemplateEditForm({ ...templateEditForm, category: e.target.value })}
                                className="w-40 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                {CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Every</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={templateEditForm.frequencyNumber}
                                  onChange={(e) => setTemplateEditForm({ ...templateEditForm, frequencyNumber: e.target.value })}
                                  className="w-16 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <select
                                  value={templateEditForm.frequencyPeriod}
                                  onChange={(e) => setTemplateEditForm({ ...templateEditForm, frequencyPeriod: e.target.value })}
                                  className="w-28 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  {TIME_PERIODS.map(period => (
                                    <option key={period} value={period}>{period}</option>
                                  ))}
                                </select>
                              </div>
                              <button
                                onClick={saveTemplateEdit}
                                className="text-green-600 hover:text-green-700 transition p-2 bg-green-50 rounded"
                              >
                                <Check size={20} />
                              </button>
                              <button
                                onClick={cancelTemplateEdit}
                                className="text-gray-600 hover:text-gray-700 transition p-2 bg-gray-50 rounded"
                              >
                                <X size={20} />
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Notes (optional)"
                              value={templateEditForm.notes}
                              onChange={(e) => setTemplateEditForm({ ...templateEditForm, notes: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => toggleTemplateExpand(template.id)}
                                  className="text-gray-500 hover:text-gray-700 transition"
                                >
                                  {isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                                </button>
                                
                                <div className="font-bold text-lg text-gray-800">{template.name}</div>
                                
                                <div className={`flex items-center gap-1 font-bold text-lg ${
                                  template.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  <DollarSign size={20} />
                                  {template.amount >= 0 ? '+' : ''}{template.amount.toFixed(2)}
                                </div>
                                
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(template.category)}`}>
                                  {template.category}
                                </span>
                                
                                <span className="text-sm text-gray-600">
                                  Every {template.frequencyNumber} {template.frequencyPeriod}
                                </span>
                                
                                {payments.length > 0 && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                    {payments.length} payment{payments.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startTemplateEdit(template)}
                                  className="text-blue-500 hover:text-blue-700 transition p-2"
                                  title="Edit template"
                                >
                                  <Edit2 size={20} />
                                </button>
                                <button
                                  onClick={() => deleteTemplate(template.id)}
                                  className="text-red-500 hover:text-red-700 transition p-2"
                                  title="Delete template"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            </div>
                            
                            {template.notes && (
                              <div className="ml-10 text-sm text-gray-600 italic">
                                {template.notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {isExpanded && payments.length > 0 && (
                        <div className="border-t border-gray-200 p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-700">Payment History</h3>
                            <button
                              onClick={() => {
                                const defaultDate = calculateNextPaymentDate(
                                  template.id,
                                  Number(template.frequencyNumber || 1),
                                  template.frequencyPeriod || 'months'
                                );
                                setTemplateDates({ ...templateDates, [template.id]: defaultDate });
                                addFromTemplate(template);
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm flex items-center gap-2"
                            >
                              <Plus size={16} />
                              Add Payment
                            </button>
                          </div>
                          <div className="space-y-2">
                            {payments.map(payment => (
                              <div key={payment.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                                <div className="flex items-center gap-4">
                                  <div className="text-gray-700">
                                    {new Date(payment.date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </div>
                                  <div className={`flex items-center gap-1 font-semibold ${
                                    payment.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    <DollarSign size={16} />
                                    {payment.amount >= 0 ? '+' : ''}{payment.amount.toFixed(2)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setCurrentPage('planner');
                                      startEdit(payment);
                                    }}
                                    className="text-blue-500 hover:text-blue-700 transition p-1"
                                    title="Edit payment"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => deleteBill(payment.id)}
                                    className="text-red-500 hover:text-red-700 transition p-1"
                                    title="Delete payment"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {isExpanded && payments.length === 0 && (
                        <div className="border-t border-gray-200 p-4 bg-gray-50">
                          <div className="text-center">
                            <p className="text-gray-500 text-sm mb-3">No payments yet for this recurring bill</p>
                            <button
                              onClick={() => {
                                const defaultDate = calculateNextPaymentDate(
                                  template.id,
                                  Number(template.frequencyNumber || 1),
                                  template.frequencyPeriod || 'months'
                                );
                                setTemplateDates({ ...templateDates, [template.id]: defaultDate });
                                addFromTemplate(template);
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm flex items-center gap-2 mx-auto"
                            >
                              <Plus size={16} />
                              Add First Payment
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}