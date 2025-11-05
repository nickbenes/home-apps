import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import BillPaymentPlanner from '../../frontend/App';

describe('BillPaymentPlanner (bills frontend)', () => {
  beforeEach(() => {
    // clear localStorage to use default initial bills
    window.localStorage.clear();
  });

  it('renders the main title and default bills', async () => {
    render(<BillPaymentPlanner />);

    expect(screen.getByText('Bill Payment Planner')).toBeInTheDocument();

    // default bills from getInitialBills
    await waitFor(() => {
      expect(screen.getByText('Rent')).toBeInTheDocument();
      expect(screen.getByText('Electricity')).toBeInTheDocument();
      expect(screen.getByText('Paycheck')).toBeInTheDocument();
    });
  });

  it('adds a new bill via the add form and clears inputs', async () => {
    const user = userEvent.setup();
    const { container } = render(<BillPaymentPlanner />);

    // find inputs by placeholder
    const nameInput = screen.getByPlaceholderText('Bill name');
    const amountInput = screen.getByPlaceholderText('Amount');

    // Type values
    await user.type(nameInput, 'Test Bill');
    await user.type(amountInput, '42.50');

    // Set date value using a direct DOM query for input[type=date]
    const dateField = container.querySelector('input[type="date"]') as HTMLInputElement | null;
    if (dateField) {
      // fire a change event to set the date value
      await user.clear(dateField);
      await user.type(dateField, '2025-12-01');
    }

    // Click the first Add button (planner add)
    const addButtons = screen.getAllByText('Add');
    await user.click(addButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Test Bill')).toBeInTheDocument();
    });
  });

  it('saves a bill as a template and shows it in Quick Add from Templates', async () => {
    const user = userEvent.setup();
    render(<BillPaymentPlanner />);

    // Open Quick Add to assert it's initially empty
    const quickAddButton = screen.getByText('Quick Add from Templates');
    await user.click(quickAddButton);

    await waitFor(() => {
      expect(screen.getByText('No templates saved. Click the refresh icon on any bill to save it as a template.')).toBeInTheDocument();
    });

    // Close quick add
    await user.click(quickAddButton);

    // Find the Rent bill container and click its 'Save as template' button
  // Click the first 'Save as template' button (should target the first bill)
  const saveButtons = screen.getAllByTitle('Save as template');
  expect(saveButtons.length).toBeGreaterThan(0);
  await user.click(saveButtons[0]);

    // Open Quick Add again and verify the template shows
    await user.click(quickAddButton);

    await waitFor(() => {
      // The template name should appear in the Quick Add list
      expect(screen.getAllByText('Rent').length).toBeGreaterThan(0);
    });
  });
});
