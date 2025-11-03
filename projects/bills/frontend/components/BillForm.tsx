import React from 'react';
import { Plus, Download, Upload, RefreshCw, Filter } from 'lucide-react';
import { NewBillForm, CATEGORIES } from '../utils';

type Props = {
  newBill: NewBillForm;
  setNewBill: (v: NewBillForm) => void;
  addBill: () => void;
  showTemplates: boolean;
  setShowTemplates: (v: boolean) => void;
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  exportPaymentsToCSV: () => void;
  importPaymentsFromCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function BillForm({ newBill, setNewBill, addBill, showTemplates, setShowTemplates, filterCategory, setFilterCategory, sortBy, setSortBy, exportPaymentsToCSV, importPaymentsFromCSV }: Props) {
  return (
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
    </>
  );
}
