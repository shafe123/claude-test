import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import type { GroceryItem } from '../domain/types';

vi.mock('../domain/units', () => ({
  formatGroceryQuantity: (q: number, u: string) => `${q} ${u}`,
}));

import { GroceryList, groupByCategory, groceryListToText } from './GroceryList';

const ITEMS: GroceryItem[] = [
  { key: 'onion|piece', name: 'onion', quantity: 2, unit: 'piece', category: 'produce', recipeNames: ['Curry', 'Salad'] },
  { key: 'tomato|piece', name: 'tomato', quantity: 3, unit: 'piece', category: 'produce', recipeNames: ['Salad'] },
  { key: 'rice|g', name: 'rice', quantity: 300, unit: 'g', category: 'pantry', recipeNames: ['Curry'] },
  { key: 'feta|g', name: 'feta', quantity: 150, unit: 'g', category: 'dairy', recipeNames: ['Salad'] },
];

function setup(items = ITEMS, checkedKeys: string[] = []) {
  const onToggle = vi.fn();
  const onClearChecked = vi.fn();
  render(<GroceryList items={items} checkedKeys={checkedKeys} onToggle={onToggle} onClearChecked={onClearChecked} />);
  return { onToggle, onClearChecked };
}

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
}

afterEach(() => {
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else delete (navigator as { clipboard?: unknown }).clipboard;
});

describe('GroceryList', () => {
  it('shows empty state when there are no items', () => {
    setup([]);
    expect(screen.getByText(/grocery list is empty/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
  });

  it('groups items by category in fixed order with headings', () => {
    setup();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Produce', 'Dairy & eggs', 'Pantry']);
    const produce = screen.getByRole('region', { name: 'Produce' });
    expect(within(produce).getAllByRole('checkbox')).toHaveLength(2);
    expect(groupByCategory(ITEMS).map(([c]) => c)).toEqual(['produce', 'dairy', 'pantry']);
  });

  it('shows formatted quantity and recipe names', () => {
    setup();
    expect(screen.getByText('300 g')).toBeInTheDocument();
    expect(screen.getByText('Used in: Curry, Salad')).toBeInTheDocument();
    expect(screen.getByText('Used in: Curry, Salad').closest('label')).toHaveAttribute('title', 'Used in: Curry, Salad');
  });

  it('reflects checked state, strike-through class and progress', () => {
    setup(ITEMS, ['rice|g', 'onion|piece', 'stale|key']);
    expect(screen.getByText('2 of 4 items checked')).toBeInTheDocument();
    const rice = screen.getByRole('checkbox', { name: /rice/ });
    expect(rice).toBeChecked();
    expect(rice.closest('li')).toHaveClass('is-checked');
    const feta = screen.getByRole('checkbox', { name: /feta/ });
    expect(feta).not.toBeChecked();
    expect(feta.closest('li')).not.toHaveClass('is-checked');
  });

  it('toggling calls onToggle with the item key', () => {
    const { onToggle } = setup();
    fireEvent.click(screen.getByRole('checkbox', { name: /tomato/ }));
    expect(onToggle).toHaveBeenCalledWith('tomato|piece');
  });

  it('uncheck all calls onClearChecked, disabled when nothing checked', () => {
    const { onClearChecked } = setup(ITEMS, ['feta|g']);
    fireEvent.click(screen.getByRole('button', { name: 'Uncheck all' }));
    expect(onClearChecked).toHaveBeenCalledTimes(1);
  });

  it('uncheck all is disabled when nothing is checked', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Uncheck all' })).toBeDisabled();
  });

  it('copies the list as text and shows feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    setup(ITEMS, ['rice|g']);
    fireEvent.click(screen.getByRole('button', { name: 'Copy as text' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied'));
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('Produce:');
    expect(text).toContain('[ ] 2 piece onion');
    expect(text).toContain('[x] 300 g rice');
    expect(text).toBe(groceryListToText(ITEMS, ['rice|g']));
  });

  it('shows feedback when clipboard is unavailable', async () => {
    setClipboard(undefined);
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Copy as text' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/not available/i));
  });

  it('shows feedback when copy fails', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Copy as text' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/could not copy/i));
  });
});
