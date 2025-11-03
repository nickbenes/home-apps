import React from 'react';
import { DollarSign } from 'lucide-react';
import { Template } from '../utils';

type Props = {
  templates: Template[];
  templateDates: Record<number, string>;
  setTemplateDates: (v: Record<number, string>) => void;
  addFromTemplate: (t: Template) => void;
  calculateNextPaymentDate: (id: number, n: number, p: string) => string;
  getCategoryColor: (c: string) => string;
};

export default function QuickTemplates({ templates, templateDates, setTemplateDates, addFromTemplate, calculateNextPaymentDate, getCategoryColor }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Add from Templates</h2>
      {templates.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No templates saved. Click the refresh icon on any bill to save it as a template.</p>
      ) : (
        <div className="space-y-2">
          {templates.map(template => {
            const defaultDate = calculateNextPaymentDate(template.id, Number(template.frequencyNumber || 1), template.frequencyPeriod || 'months');
            const templateDate = templateDates[template.id] || defaultDate;

            return (
              <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="font-medium text-gray-800">{template.name}</div>
                  <div className={`flex items-center gap-1 font-semibold ${template.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <DollarSign size={16} />
                    {template.amount >= 0 ? '+' : ''}{template.amount.toFixed(2)}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>{template.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="date" value={templateDate} onChange={(e) => setTemplateDates({ ...templateDates, [template.id]: e.target.value })} className="px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
                  <button onClick={() => addFromTemplate(template)} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm">Add to Bills</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
