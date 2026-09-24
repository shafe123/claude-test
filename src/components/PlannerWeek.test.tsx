import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { WeekPlanner, countPlannedMeals } from './PlannerWeek';
import type { Recipe, WeekPlan } from '../domain/types';

function recipe(id: string, name: string, mealTypes: Recipe['mealTypes']): Recipe {
  return { id, name, servings: 2, prepMinutes: 10, tags: [], mealTypes, ingredients: [], instructions: '' };
}

const RECIPES: Recipe[] = [
  recipe('oats', 'Overnight Oats', ['breakfast']),
  recipe('salad', 'Greek Salad', ['lunch', 'dinner']),
  recipe('curry', 'Chickpea Curry', ['dinner']),
];

function emptyPlan(): WeekPlan {
  return { mon: {}, tue: {}, wed: {}, thu: {}, fri: {}, sat: {}, sun: {} };
}

function setup(plan: WeekPlan = emptyPlan(), recipes = RECIPES) {
  const onSetMeal = vi.fn();
  const onAutoFill = vi.fn();
  const onClear = vi.fn();
  render(<WeekPlanner plan={plan} recipes={recipes} onSetMeal={onSetMeal} onAutoFill={onAutoFill} onClear={onClear} />);
  return { onSetMeal, onAutoFill, onClear };
}

function optgroupNames(select: HTMLElement, label: string): string[] {
  const group = select.querySelector(`optgroup[label="${label}"]`);
  return group ? Array.from(group.querySelectorAll('option')).map((o) => o.textContent ?? '') : [];
}

describe('WeekPlanner', () => {
  it('renders 7 days x 3 slots', () => {
    setup();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(7);
    expect(screen.getAllByRole('combobox')).toHaveLength(21);
    expect(screen.getByText('0 of 21 meals planned')).toBeInTheDocument();
  });

  it('filters recipes by meal type, with others in an "Any recipe" group', () => {
    setup();
    const breakfast = screen.getByLabelText('Monday breakfast recipe');
    expect(optgroupNames(breakfast, 'Suited for breakfast')).toEqual(['Overnight Oats']);
    expect(optgroupNames(breakfast, 'Any recipe')).toEqual(['Greek Salad', 'Chickpea Curry']);

    const dinner = screen.getByLabelText('Friday dinner recipe');
    expect(optgroupNames(dinner, 'Suited for dinner')).toEqual(['Greek Salad', 'Chickpea Curry']);
    expect(optgroupNames(dinner, 'Any recipe')).toEqual(['Overnight Oats']);

    const lunch = screen.getByLabelText('Sunday lunch recipe');
    expect(optgroupNames(lunch, 'Suited for lunch')).toEqual(['Greek Salad']);
  });

  it('selecting a recipe calls onSetMeal with default servings', () => {
    const { onSetMeal } = setup();
    fireEvent.change(screen.getByLabelText('Tuesday dinner recipe'), { target: { value: 'curry' } });
    expect(onSetMeal).toHaveBeenCalledWith('tue', 'dinner', { recipeId: 'curry', servings: 2 });
  });

  it('uses the toolbar default servings for new selections', () => {
    const { onSetMeal } = setup();
    fireEvent.change(screen.getByLabelText('Default servings'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Monday breakfast recipe'), { target: { value: 'oats' } });
    expect(onSetMeal).toHaveBeenCalledWith('mon', 'breakfast', { recipeId: 'oats', servings: 4 });
  });

  it('changing recipe in a filled slot keeps its servings; choosing None clears it', () => {
    const plan = emptyPlan();
    plan.wed.lunch = { recipeId: 'salad', servings: 3 };
    const { onSetMeal } = setup(plan);
    const select = screen.getByLabelText('Wednesday lunch recipe');
    expect(select).toHaveValue('salad');
    fireEvent.change(select, { target: { value: 'curry' } });
    expect(onSetMeal).toHaveBeenLastCalledWith('wed', 'lunch', { recipeId: 'curry', servings: 3 });
    fireEvent.change(select, { target: { value: '' } });
    expect(onSetMeal).toHaveBeenLastCalledWith('wed', 'lunch', null);
  });

  it('edits servings and clears a slot', () => {
    const plan = emptyPlan();
    plan.mon.dinner = { recipeId: 'curry', servings: 2 };
    const { onSetMeal } = setup(plan);
    fireEvent.change(screen.getByLabelText('Monday dinner servings'), { target: { value: '6' } });
    expect(onSetMeal).toHaveBeenLastCalledWith('mon', 'dinner', { recipeId: 'curry', servings: 6 });
    fireEvent.click(screen.getByRole('button', { name: 'Clear Monday dinner' }));
    expect(onSetMeal).toHaveBeenLastCalledWith('mon', 'dinner', null);
  });

  it('only filled slots show servings/clear controls', () => {
    const plan = emptyPlan();
    plan.mon.dinner = { recipeId: 'curry', servings: 2 };
    setup(plan);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(2); // default servings + one slot
    expect(screen.queryByLabelText('Monday lunch servings')).not.toBeInTheDocument();
  });

  it('shows count of planned meals', () => {
    const plan = emptyPlan();
    plan.mon.breakfast = { recipeId: 'oats', servings: 1 };
    plan.sun.dinner = { recipeId: 'curry', servings: 2 };
    setup(plan);
    expect(countPlannedMeals(plan)).toBe(2);
    expect(screen.getByText('2 of 21 meals planned')).toBeInTheDocument();
  });

  it('auto-fill passes the default servings', () => {
    const { onAutoFill } = setup();
    fireEvent.change(screen.getByLabelText('Default servings'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Auto-fill' }));
    expect(onAutoFill).toHaveBeenCalledWith(3);
  });

  it('auto-fill is disabled with no recipes', () => {
    setup(emptyPlan(), []);
    expect(screen.getByRole('button', { name: 'Auto-fill' })).toBeDisabled();
    expect(screen.getByText(/add some recipes/i)).toBeInTheDocument();
  });

  it('clear week requires inline confirmation', () => {
    const plan = emptyPlan();
    plan.mon.breakfast = { recipeId: 'oats', servings: 1 };
    const confirmSpy = vi.spyOn(window, 'confirm');
    const { onClear } = setup(plan);

    fireEvent.click(screen.getByRole('button', { name: 'Clear week' }));
    expect(onClear).not.toHaveBeenCalled();
    const group = screen.getByRole('group', { name: 'Confirm clear week' });

    fireEvent.click(within(group).getByRole('button', { name: 'Cancel' }));
    expect(onClear).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Clear week' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, clear' }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Clear week' })).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('clear week is disabled when plan is empty', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Clear week' })).toBeDisabled();
  });
});
