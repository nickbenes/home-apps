import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import TemplatesPanel from '../../frontend/components/TemplatesPanel';
import { Template, TemplateForm, Bill } from '../../frontend/utils';

describe('TemplatesPanel component', () => {
  const template: Template = { id: 201, name: 'Monthly Subscription', amount: -9.99, category: 'Subscriptions', frequencyNumber: 1, frequencyPeriod: 'months' };

  it('renders empty state and export/import controls', async () => {
    const exportTemplatesToCSV = jest.fn();
    const importTemplatesFromCSV = jest.fn();
    const startTemplateEdit = jest.fn();
    const cancelTemplateEdit = jest.fn();
    const saveTemplateEdit = jest.fn();
    const deleteTemplate = jest.fn();
    const getTemplatePayments = jest.fn().mockReturnValue([] as Bill[]);
    const calculateNextPaymentDate = jest.fn().mockReturnValue('2025-12-01');
    const setTemplateDates = jest.fn();
    const addFromTemplate = jest.fn();
    const addNewTemplate = jest.fn();
    const setNewTemplate = jest.fn();
    const startEdit = jest.fn();
    const deleteBill = jest.fn();

    render(
      <TemplatesPanel
        templates={[]}
        expandedTemplates={{}}
        editingTemplateId={null}
        templateEditForm={{ name: '', amount: '', category: 'Other', frequencyNumber: 1, frequencyPeriod: 'months', notes: '' } as TemplateForm}
        setTemplateEditForm={() => {}}
        startTemplateEdit={startTemplateEdit}
        cancelTemplateEdit={cancelTemplateEdit}
        saveTemplateEdit={saveTemplateEdit}
        deleteTemplate={deleteTemplate}
        getTemplatePayments={getTemplatePayments}
        calculateNextPaymentDate={calculateNextPaymentDate}
        setTemplateDates={setTemplateDates}
        templateDates={{}}
        addFromTemplate={addFromTemplate}
        addNewTemplate={addNewTemplate}
        exportTemplatesToCSV={exportTemplatesToCSV}
        importTemplatesFromCSV={importTemplatesFromCSV}
        newTemplate={{ name: '', amount: '', category: 'Other', frequencyNumber: 1, frequencyPeriod: 'months', notes: '' } as TemplateForm}
        setNewTemplate={setNewTemplate}
        TIME_PERIODS={['days','weeks','months','years']}
        CATEGORIES={['Other']}
        getCategoryColor={() => 'bg-gray-100'}
        setCurrentPage={() => {}}
        startEdit={startEdit}
        deleteBill={deleteBill}
      />
    );

    expect(screen.getByText('Recurring Bills')).toBeInTheDocument();
    expect(screen.getByText('No recurring bills yet')).toBeInTheDocument();
  });

  it('renders a template and calls addFromTemplate when Add Payment clicked', async () => {
    const user = userEvent.setup();
    const addFromTemplate = jest.fn();
    const setTemplateDates = jest.fn();
    const getTemplatePayments = jest.fn().mockReturnValue([] as Bill[]);
    const calculateNextPaymentDate = jest.fn().mockReturnValue('2025-12-01');

    render(
      <TemplatesPanel
        templates={[template]}
        expandedTemplates={{ [template.id]: true }}
        editingTemplateId={null}
        templateEditForm={{ name: '', amount: '', category: 'Other', frequencyNumber: 1, frequencyPeriod: 'months', notes: '' } as TemplateForm}
        setTemplateEditForm={() => {}}
        startTemplateEdit={() => {}}
        cancelTemplateEdit={() => {}}
        saveTemplateEdit={() => {}}
        deleteTemplate={() => {}}
        getTemplatePayments={getTemplatePayments}
        calculateNextPaymentDate={calculateNextPaymentDate}
        setTemplateDates={setTemplateDates}
        templateDates={{}}
        addFromTemplate={addFromTemplate}
        addNewTemplate={() => {}}
        exportTemplatesToCSV={() => {}}
        importTemplatesFromCSV={() => {}}
        newTemplate={{ name: '', amount: '', category: 'Other', frequencyNumber: 1, frequencyPeriod: 'months', notes: '' } as TemplateForm}
        setNewTemplate={() => {}}
        TIME_PERIODS={['days','weeks','months','years']}
        CATEGORIES={['Other']}
        getCategoryColor={() => 'bg-gray-100'}
        setCurrentPage={() => {}}
        startEdit={() => {}}
        deleteBill={() => {}}
      />
    );

    expect(screen.getByText('Monthly Subscription')).toBeInTheDocument();

  // when there are no payments yet the UI shows "Add First Payment"
  const addPaymentButton = screen.getByText('Add First Payment');
    await user.click(addPaymentButton);
    expect(addFromTemplate).toHaveBeenCalled();
  });
});
