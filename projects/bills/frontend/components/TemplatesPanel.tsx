import React from 'react';
import { Plus, Download, Upload, RefreshCw, Edit2, Check, X, ChevronDown, ChevronRight, Trash2, DollarSign } from 'lucide-react';
import { Template, TemplateForm, Bill } from '../utils';

type Props = {
  templates: Template[];
  expandedTemplates: Record<number, boolean>;
  editingTemplateId: number | null;
  templateEditForm: TemplateForm;
  setTemplateEditForm: (v: TemplateForm) => void;
  startTemplateEdit: (t: Template) => void;
  cancelTemplateEdit: () => void;
  saveTemplateEdit: () => void;
  deleteTemplate: (id: number) => void;
  getTemplatePayments: (id: number) => Bill[];
  calculateNextPaymentDate: (templateId: number, frequencyNumber: number, frequencyPeriod: string) => string;
  setTemplateDates: (v: Record<number, string>) => void;
  templateDates: Record<number, string>;
  addFromTemplate: (t: Template) => void;
  addNewTemplate: () => void;
  exportTemplatesToCSV: () => void;
  importTemplatesFromCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  newTemplate: TemplateForm;
  setNewTemplate: (v: TemplateForm) => void;
  TIME_PERIODS: string[];
  CATEGORIES: string[];
  getCategoryColor: (c: string) => string;
  setCurrentPage: (p: string) => void;
  startEdit: (b: Bill) => void;
  deleteBill: (id: number) => void;
};

export default function TemplatesPanel({ templates, expandedTemplates, editingTemplateId, templateEditForm, setTemplateEditForm, startTemplateEdit, cancelTemplateEdit, saveTemplateEdit, deleteTemplate, getTemplatePayments, calculateNextPaymentDate, setTemplateDates, templateDates, addFromTemplate, addNewTemplate, exportTemplatesToCSV, importTemplatesFromCSV, newTemplate, setNewTemplate, TIME_PERIODS, CATEGORIES, getCategoryColor, setCurrentPage, startEdit, deleteBill }: Props) {
  return (
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
                            onClick={() => setCurrentPage('templates')}
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
  );
}
