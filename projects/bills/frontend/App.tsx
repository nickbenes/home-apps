import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Filter, Plus, Download, Upload } from 'lucide-react';
import QuickTemplates from './components/QuickTemplates';
import BillItem from './components/BillItem';
import TemplatesPanel from './components/TemplatesPanel';
import {
  CATEGORIES,
  getInitialBills,
  getInitialTemplates,
  TIME_PERIODS,
  STORAGE_KEY,
  TEMPLATES_KEY,
  Bill,
  Template,
  NewBillForm,
  TemplateForm,
} from './utils';

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
              <QuickTemplates
                templates={templates}
                templateDates={templateDates}
                setTemplateDates={setTemplateDates}
                addFromTemplate={addFromTemplate}
                calculateNextPaymentDate={calculateNextPaymentDate}
                getCategoryColor={getCategoryColor}
              />
            )}

            <div className="space-y-2">
              {displayBills.map((bill, index) => {
                const isEditing = editingId === bill.id;
                const balance = getRunningBalance(index);
                return (
                  <BillItem
                    key={bill.id}
                    bill={bill}
                    index={index}
                    isEditing={isEditing}
                    balance={balance}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    saveEdit={saveEdit}
                    cancelEdit={cancelEdit}
                    startEdit={startEdit}
                    deleteBill={deleteBill}
                    saveAsTemplate={saveAsTemplate}
                    viewRecurringBill={viewRecurringBill}
                    getCategoryColor={getCategoryColor}
                    isRecurringBill={isRecurringBill}
                    handleDragStart={handleDragStart}
                    handleDragOver={handleDragOver}
                    handleDragEnd={handleDragEnd}
                    draggedItem={draggedItem}
                    sortBy={sortBy}
                  />
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

        {currentPage === 'templates' && (
          <TemplatesPanel
            templates={templates}
            expandedTemplates={expandedTemplates}
            editingTemplateId={editingTemplateId}
            templateEditForm={templateEditForm}
            setTemplateEditForm={setTemplateEditForm}
            startTemplateEdit={startTemplateEdit}
            cancelTemplateEdit={cancelTemplateEdit}
            saveTemplateEdit={saveTemplateEdit}
            deleteTemplate={deleteTemplate}
            getTemplatePayments={getTemplatePayments}
            calculateNextPaymentDate={calculateNextPaymentDate}
            setTemplateDates={setTemplateDates}
            templateDates={templateDates}
            addFromTemplate={addFromTemplate}
            addNewTemplate={addNewTemplate}
            exportTemplatesToCSV={exportTemplatesToCSV}
            importTemplatesFromCSV={importTemplatesFromCSV}
            newTemplate={newTemplate}
            setNewTemplate={setNewTemplate}
            TIME_PERIODS={TIME_PERIODS}
            CATEGORIES={CATEGORIES}
            getCategoryColor={getCategoryColor}
            setCurrentPage={setCurrentPage}
            startEdit={startEdit}
            deleteBill={deleteBill}
          />
        )}
      </div>
    </div>
  );
}