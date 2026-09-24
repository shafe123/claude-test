import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { Recipe } from '../domain/types';
import { RecipeDetail } from './RecipeDetail';

vi.mock('../domain/units', () => ({
  formatQuantity: (q: number, u: string) => `<${q}|${u}>`,
}));

const recipe: Recipe = {
  id: 'd1', name: 'Chili', servings: 6, prepMinutes: 60, tags: ['spicy'], mealTypes: ['dinner'],
  instructions: 'Brown meat.\nSimmer.',
  ingredients: [{ name: 'beans', quantity: 2, unit: 'can', category: 'pantry' }],
};

describe('RecipeDetail', () => {
  it('shows ingredients via formatQuantity, instructions and meta', () => {
    render(<RecipeDetail recipe={recipe} onEdit={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('<2|can>')).toBeInTheDocument();
    expect(screen.getByText('beans')).toBeInTheDocument();
    expect(screen.getByText('Simmer.')).toBeInTheDocument();
    expect(screen.getByText('60 min')).toBeInTheDocument();
    expect(screen.getByText('6 servings')).toBeInTheDocument();
  });

  it('calls onEdit and onClose', () => {
    const onEdit = vi.fn();
    const onClose = vi.fn();
    render(<RecipeDetail recipe={recipe} onEdit={onEdit} onDelete={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('requires inline confirmation to delete', () => {
    const onDelete = vi.fn();
    render(<RecipeDetail recipe={recipe} onEdit={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: 'Confirm delete' })).toHaveTextContent('Delete “Chili”?');
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(onDelete).toHaveBeenCalledWith('d1');
  });
});
