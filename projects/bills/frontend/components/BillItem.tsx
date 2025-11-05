import React from 'react';
import { GripVertical, DollarSign, Edit2, Check, X, List, RefreshCw, Trash2 } from 'lucide-react';
import { Bill, NewBillForm } from '../utils';

type Props = {
  bill: Bill;
  index: number;
  isEditing: boolean;
  balance: number;
  editForm: NewBillForm;
  setEditForm: (v: NewBillForm) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  startEdit: (b: Bill) => void;
  deleteBill: (id: number) => void;
  saveAsTemplate: (b: Bill) => void;
  viewRecurringBill: (id: number | null | undefined) => void;
  getCategoryColor: (c: string) => string;
  isRecurringBill: (id: number | null | undefined) => boolean;
  handleDragStart: (e: any, index: number) => void;
  handleDragOver: (e: any, index: number) => void;
  handleDragEnd: () => void;
  draggedItem: number | null;
  sortBy: string;
};

export default function BillItem({ bill, index, isEditing, balance, editForm, setEditForm, saveEdit, cancelEdit, startEdit, deleteBill, saveAsTemplate, viewRecurringBill, getCategoryColor, isRecurringBill, handleDragStart, handleDragOver, handleDragEnd, draggedItem, sortBy }: Props) {

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
              {/* options are rendered by parent; kept simple here */}
              <option value={editForm.category}>{editForm.category}</option>
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
}
