import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import BillItem from '../../frontend/components/BillItem';
import { Bill, NewBillForm } from '../../frontend/utils';

describe('BillItem component', () => {
  const bill: Bill = { id: 101, name: 'Sample Bill', amount: -42.5, date: '2025-11-10', category: 'Other', notes: 'note' };

  it('renders bill details and triggers actions', async () => {
    const user = userEvent.setup();
    const startEdit = jest.fn();
    const deleteBill = jest.fn();
    const saveAsTemplate = jest.fn();
    const viewRecurringBill = jest.fn();
    const getCategoryColor = jest.fn().mockReturnValue('bg-gray-100');
    const isRecurringBill = jest.fn().mockReturnValue(false);
    const handleDragStart = jest.fn();
    const handleDragOver = jest.fn();
    const handleDragEnd = jest.fn();

    const editForm: NewBillForm = { name: '', amount: '', date: '', category: 'Other', notes: '' };

    render(
      <BillItem
        bill={bill}
        index={0}
        isEditing={false}
        balance={-42.5}
        editForm={editForm}
        setEditForm={() => {}}
        saveEdit={() => {}}
        cancelEdit={() => {}}
        startEdit={startEdit}
        deleteBill={deleteBill}
        saveAsTemplate={saveAsTemplate}
        viewRecurringBill={viewRecurringBill}
        getCategoryColor={getCategoryColor}
        isRecurringBill={isRecurringBill}
        handleDragStart={handleDragStart}
        handleDragOver={handleDragOver}
        handleDragEnd={handleDragEnd}
        draggedItem={null}
        sortBy={'order'}
      />
    );

    // visible content
    expect(screen.getByText('Sample Bill')).toBeInTheDocument();
    expect(screen.getByText('-42.50')).toBeInTheDocument();

    // click Save as template (has title)
    const saveButtons = screen.getAllByTitle('Save as template');
    expect(saveButtons.length).toBeGreaterThan(0);
    await user.click(saveButtons[0]);
    expect(saveAsTemplate).toHaveBeenCalled();

    // click Edit (no title but should be present as a button)
    const editButtons = screen.getAllByRole('button');
    // there should be several buttons; ensure startEdit is callable by clicking the edit-like button (one of them)
    // find a button with a child svg (icon) and click the one that calls startEdit when clicked -- use index heuristic
    await user.click(editButtons[editButtons.length - 2]);
    expect(startEdit).toHaveBeenCalled();
  });
});
