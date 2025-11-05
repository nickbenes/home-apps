import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import BillItem from '../../frontend/components/BillItem';
import { Bill, NewBillForm } from '../../frontend/utils';

describe('BillItem edit/save flow', () => {
  const bill: Bill = { id: 301, name: 'Editable Bill', amount: -10, date: '2025-11-20', category: 'Other', notes: '' };

  it('calls setEditForm as user types and triggers save/cancel', async () => {
    const user = userEvent.setup();
    const setEditForm = jest.fn();
    const saveEdit = jest.fn();
    const cancelEdit = jest.fn();
    const startEdit = jest.fn();
    const deleteBill = jest.fn();
    const saveAsTemplate = jest.fn();
    const viewRecurringBill = jest.fn();
    const getCategoryColor = jest.fn().mockReturnValue('bg-gray-100');
    const isRecurringBill = jest.fn().mockReturnValue(false);
    const handleDragStart = jest.fn();
    const handleDragOver = jest.fn();
    const handleDragEnd = jest.fn();

    const editForm: NewBillForm = { name: 'Editable Bill', amount: '-10', date: '2025-11-20', category: 'Other', notes: '' };

    render(
      <BillItem
        bill={bill}
        index={0}
        isEditing={true}
        balance={-10}
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
        draggedItem={null}
        sortBy={'order'}
      />
    );

    // find name input and type
    const nameInput = screen.getByDisplayValue('Editable Bill') as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'Edited Name');
    expect(setEditForm).toHaveBeenCalled();

    // find amount input and type
    const amountInput = screen.getByDisplayValue('-10') as HTMLInputElement;
    await user.clear(amountInput);
    await user.type(amountInput, '20');
    expect(setEditForm).toHaveBeenCalled();

  // click save and cancel buttons (first two buttons in edit UI are save and cancel)
  const buttons = screen.getAllByRole('button');
  expect(buttons.length).toBeGreaterThanOrEqual(2);

  await user.click(buttons[0]);
  expect(saveEdit).toHaveBeenCalled();

  await user.click(buttons[1]);
  expect(cancelEdit).toHaveBeenCalled();
  });
});
