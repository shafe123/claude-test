import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { Recipe } from '../domain/types';
import { RecipeLibrary, filterRecipes } from './RecipeLibrary';

vi.mock('../domain/units', () => ({
  formatQuantity: (q: number, u: string) => `${q} ${u}`,
}));

const recipes: Recipe[] = [
  {
    id: 'r1', name: 'Pancakes', servings: 4, prepMinutes: 20, tags: ['vegetarian', 'sweet'],
    mealTypes: ['breakfast'], instructions: 'Mix.\nFry.',
    ingredients: [
      { name: 'flour', quantity: 200, unit: 'g', category: 'pantry' },
      { name: 'milk', quantity: 300, unit: 'ml', category: 'dairy' },
    ],
  },
  {
    id: 'r2', name: 'Chicken Curry', servings: 2, prepMinutes: 45, tags: ['spicy'],
    mealTypes: ['dinner', 'lunch'], instructions: 'Cook.',
    ingredients: [{ name: 'chicken breast', quantity: 500, unit: 'g', category: 'meat' }],
  },
  {
    id: 'r3', name: 'Veggie Wrap', servings: 1, prepMinutes: 10, tags: ['vegetarian', 'quick'],
    mealTypes: ['lunch'], instructions: '',
    ingredients: [{ name: 'tortilla', quantity: 1, unit: 'piece', category: 'bakery' }],
  },
];

const setup = () => {
  const cbs = { onAdd: vi.fn(), onUpdate: vi.fn(), onDelete: vi.fn() };
  render(<RecipeLibrary recipes={recipes} {...cbs} />);
  return cbs;
};
const cardNames = () =>
  within(screen.getByRole('list', { name: 'Recipe list' }))
    .getAllByRole('button')
    .map((b) => b.querySelector('.recipe-card__name')!.textContent);

describe('filterRecipes', () => {
  it('matches name and ingredient case-insensitively', () => {
    expect(filterRecipes(recipes, 'PAN', [], 'all').map((r) => r.id)).toEqual(['r1']);
    expect(filterRecipes(recipes, 'milk', [], 'all').map((r) => r.id)).toEqual(['r1']);
  });
  it('requires all selected tags and the meal type', () => {
    expect(filterRecipes(recipes, '', ['vegetarian'], 'all').map((r) => r.id)).toEqual(['r1', 'r3']);
    expect(filterRecipes(recipes, '', ['vegetarian'], 'lunch').map((r) => r.id)).toEqual(['r3']);
  });
});

describe('RecipeLibrary', () => {
  it('renders cards with name, prep time, servings and tags', () => {
    setup();
    expect(cardNames()).toEqual(['Pancakes', 'Chicken Curry', 'Veggie Wrap']);
    const card = screen.getByRole('button', { name: /Chicken Curry/ });
    expect(card).toHaveTextContent('45 min');
    expect(card).toHaveTextContent('2 serv.');
    expect(card).toHaveTextContent('spicy');
  });

  it('filters by search text (name or ingredient)', () => {
    setup();
    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'chicken' } });
    expect(cardNames()).toEqual(['Chicken Curry']);
    fireEvent.change(search, { target: { value: 'tortilla' } });
    expect(cardNames()).toEqual(['Veggie Wrap']);
    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByText('No recipes match your filters.')).toBeInTheDocument();
  });

  it('filters by tag chips and meal type', () => {
    setup();
    const chips = within(screen.getByRole('group', { name: 'Filter by tag' }));
    const veg = chips.getByRole('button', { name: 'vegetarian' });
    fireEvent.click(veg);
    expect(veg).toHaveAttribute('aria-pressed', 'true');
    expect(cardNames()).toEqual(['Pancakes', 'Veggie Wrap']);
    fireEvent.change(screen.getByLabelText('Meal type'), { target: { value: 'breakfast' } });
    expect(cardNames()).toEqual(['Pancakes']);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(cardNames()).toHaveLength(3);
  });

  it('opens detail on card click with formatted ingredients', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Pancakes/ }));
    expect(screen.getByRole('heading', { name: 'Pancakes' })).toBeInTheDocument();
    expect(screen.getByText('200 g')).toBeInTheDocument();
    expect(screen.getByText('Fry.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to recipes/ }));
    expect(screen.getByRole('list', { name: 'Recipe list' })).toBeInTheDocument();
  });

  it('adds a new recipe via the form', () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByRole('button', { name: '+ New recipe' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Toast' } });
    fireEvent.change(screen.getByLabelText('Ingredient 1 name'), { target: { value: 'Bread' } });
    fireEvent.change(screen.getByLabelText('Ingredient 1 quantity'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add recipe' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toMatchObject({
      name: 'Toast', ingredients: [{ name: 'bread', quantity: 2, unit: 'piece', category: 'produce' }],
    });
    expect(onAdd.mock.calls[0][0]).not.toHaveProperty('id');
    expect(screen.getByRole('list', { name: 'Recipe list' })).toBeInTheDocument();
  });

  it('edits a recipe and calls onUpdate with the same id', () => {
    const { onUpdate } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Chicken Curry/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Name');
    expect(name).toHaveValue('Chicken Curry');
    fireEvent.change(name, { target: { value: 'Thai Curry' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'r2', name: 'Thai Curry', servings: 2, mealTypes: ['lunch', 'dinner'] }),
    );
  });

  it('deletes only after inline confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const { onDelete } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Veggie Wrap/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(onDelete).toHaveBeenCalledWith('r3');
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('shows an empty state when there are no recipes', () => {
    render(<RecipeLibrary recipes={[]} onAdd={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/No recipes yet/)).toBeInTheDocument();
  });
});
