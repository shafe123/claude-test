import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { Recipe } from '../domain/types';
import { RecipeForm } from './RecipeForm';

const setup = (initial?: Recipe) => {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(<RecipeForm initial={initial} onSubmit={onSubmit} onCancel={onCancel} />);
  return { onSubmit, onCancel };
};
const change = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: /Add recipe|Save changes/ }));

describe('RecipeForm validation', () => {
  it('requires a name and at least one ingredient', () => {
    const { onSubmit } = setup();
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Add at least one ingredient.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('requires servings >= 1', () => {
    const { onSubmit } = setup();
    change('Name', 'Soup');
    change('Ingredient 1 name', 'water');
    change('Ingredient 1 quantity', '1');
    change('Servings', '0');
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Servings must be at least 1.')).toBeInTheDocument();
  });

  it('requires ingredient quantity > 0 and a name for filled rows', () => {
    const { onSubmit } = setup();
    change('Name', 'Soup');
    change('Ingredient 1 name', 'water');
    change('Ingredient 1 quantity', '0');
    submit();
    expect(screen.getByText('Quantity must be greater than 0.')).toBeInTheDocument();
    change('Ingredient 1 name', '');
    change('Ingredient 1 quantity', '2');
    submit();
    expect(screen.getByText('Ingredient name is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a fully populated recipe with dynamic rows, meal types and tags', () => {
    const { onSubmit } = setup();
    change('Name', '  Omelette ');
    change('Servings', '2');
    change(/Prep time/, '15');
    fireEvent.click(screen.getByLabelText('dinner'));
    fireEvent.click(screen.getByLabelText('breakfast'));
    change(/Tags/, 'Quick, vegetarian, , quick');
    change('Ingredient 1 name', 'Egg');
    change('Ingredient 1 quantity', '3');
    fireEvent.click(screen.getByRole('button', { name: '+ Add ingredient' }));
    change('Ingredient 2 name', 'milk');
    change('Ingredient 2 quantity', '0.5');
    change('Ingredient 2 unit', 'cup');
    change('Ingredient 2 category', 'dairy');
    fireEvent.click(screen.getByRole('button', { name: '+ Add ingredient' }));
    // blank trailing row is ignored
    change('Instructions', 'Whisk and cook.');
    submit();
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Omelette', servings: 2, prepMinutes: 15,
      mealTypes: ['breakfast', 'dinner'], tags: ['quick', 'vegetarian'],
      instructions: 'Whisk and cook.',
      ingredients: [
        { name: 'egg', quantity: 3, unit: 'piece', category: 'produce' },
        { name: 'milk', quantity: 0.5, unit: 'cup', category: 'dairy' },
      ],
    });
  });

  it('removes ingredient rows', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: '+ Add ingredient' }));
    change('Ingredient 1 name', 'first');
    change('Ingredient 2 name', 'second');
    fireEvent.click(screen.getByRole('button', { name: 'Remove ingredient 1' }));
    expect(screen.getByLabelText('Ingredient 1 name')).toHaveValue('second');
    expect(screen.queryByLabelText('Ingredient 2 name')).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove ingredient 1' })).toBeDisabled();
  });

  it('prefills when editing and calls onCancel', () => {
    const recipe: Recipe = {
      id: 'x', name: 'Salad', servings: 3, prepMinutes: 5, tags: ['fresh'], mealTypes: ['lunch'],
      instructions: 'Toss.',
      ingredients: [{ name: 'lettuce', quantity: 1, unit: 'piece', category: 'produce' }],
    };
    const { onSubmit, onCancel } = setup(recipe);
    expect(screen.getByLabelText('Name')).toHaveValue('Salad');
    expect(screen.getByLabelText('Servings')).toHaveValue(3);
    expect(screen.getByLabelText('lunch')).toBeChecked();
    expect(screen.getByLabelText(/Tags/)).toHaveValue('fresh');
    expect(screen.getByLabelText('Ingredient 1 name')).toHaveValue('lettuce');
    submit();
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Salad', servings: 3, prepMinutes: 5, tags: ['fresh'], mealTypes: ['lunch'],
      instructions: 'Toss.', ingredients: recipe.ingredients,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
