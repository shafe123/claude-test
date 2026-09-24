import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppState, STORAGE_KEY, parseState } from './useAppState';
import { SEED_RECIPES } from '../domain/seed';
import { emptyPlan } from '../domain/planner';
import { DAYS, MEAL_TYPES } from '../domain/types';
import type { Recipe } from '../domain/types';

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);
const draft: Omit<Recipe, 'id'> = {
  name: 'Toast', servings: 1, prepMinutes: 2, tags: ['quick'], mealTypes: ['breakfast'],
  ingredients: [{ name: 'bread', quantity: 2, unit: 'piece', category: 'bakery' }], instructions: 'Toast it.',
};

beforeEach(() => localStorage.clear());

describe('useAppState loading', () => {
  it('falls back to seed recipes + empty plan when storage is empty', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.state.recipes.map((r) => r.id)).toEqual(SEED_RECIPES.map((r) => r.id));
    expect(result.current.state.plan).toEqual(emptyPlan());
    expect(result.current.state.checkedGroceryKeys).toEqual([]);
  });

  it('falls back on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const { result } = renderHook(() => useAppState());
    expect(result.current.state.recipes).toHaveLength(SEED_RECIPES.length);
  });

  it('falls back on non-object JSON', () => {
    for (const raw of ['null', '42', '"str"', '[]']) {
      const s = parseState(raw);
      expect(s.recipes).toHaveLength(SEED_RECIPES.length);
      expect(s.plan).toEqual(emptyPlan());
    }
  });

  it('fills in missing fields of partial data', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ checkedGroceryKeys: ['a|g'] }));
    const { result } = renderHook(() => useAppState());
    expect(result.current.state.recipes).toHaveLength(SEED_RECIPES.length);
    expect(result.current.state.plan).toEqual(emptyPlan());
    expect(result.current.state.checkedGroceryKeys).toEqual(['a|g']);
  });

  it('drops invalid recipes, slots and keys but keeps valid ones', () => {
    const good = { ...draft, id: 'r1' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      recipes: [good, { name: 'no id' }, 'junk', { ...good, name: 'dup' }],
      plan: {
        mon: { breakfast: { recipeId: 'r1', servings: 2 }, lunch: { recipeId: 'gone', servings: 2 }, dinner: 'x' },
        tue: 'nope',
        wed: { dinner: { recipeId: 'r1', servings: -1 } },
      },
      checkedGroceryKeys: ['a', 1, null, 'a'],
    }));
    const { result } = renderHook(() => useAppState());
    const { recipes, plan, checkedGroceryKeys } = result.current.state;
    expect(recipes).toEqual([good]);
    expect(plan.mon).toEqual({ breakfast: { recipeId: 'r1', servings: 2 } });
    expect(plan.tue).toEqual({});
    expect(plan.wed).toEqual({});
    expect(plan.sun).toEqual({});
    expect(checkedGroceryKeys).toEqual(['a']);
  });

  it('repairs partially invalid recipe fields', () => {
    const s = parseState(JSON.stringify({
      recipes: [{ id: 'r', name: 'R', servings: 'x', mealTypes: ['dinner', 'brunch'], ingredients: [
        { name: 'x', quantity: 1, unit: 'bogus', category: 'weird' }, { name: 'bad' },
      ] }],
    }));
    expect(s.recipes[0]).toEqual({
      id: 'r', name: 'R', servings: 1, prepMinutes: 0, tags: [], mealTypes: ['dinner'],
      ingredients: [{ name: 'x', quantity: 1, unit: 'piece', category: 'other' }], instructions: '',
    });
  });

  it('keeps an intentionally empty recipe list', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ recipes: [], plan: {}, checkedGroceryKeys: [] }));
    const { result } = renderHook(() => useAppState());
    expect(result.current.state.recipes).toEqual([]);
  });

  it('does not share references with SEED_RECIPES', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.state.recipes[0]).not.toBe(SEED_RECIPES[0]);
    expect(result.current.state.recipes[0].ingredients).not.toBe(SEED_RECIPES[0].ingredients);
  });
});

describe('useAppState persistence', () => {
  it('persists state and restores it in a new hook instance', () => {
    const first = renderHook(() => useAppState());
    act(() => first.result.current.setMeal('mon', 'dinner', { recipeId: SEED_RECIPES[0].id, servings: 3 }));
    expect(stored().plan.mon.dinner).toEqual({ recipeId: SEED_RECIPES[0].id, servings: 3 });
    first.unmount();
    const second = renderHook(() => useAppState());
    expect(second.result.current.state.plan.mon.dinner).toEqual({ recipeId: SEED_RECIPES[0].id, servings: 3 });
  });
});

describe('useAppState actions', () => {
  it('addRecipe assigns an id, returns the recipe and appends it', () => {
    const { result } = renderHook(() => useAppState());
    let created!: Recipe;
    act(() => { created = result.current.addRecipe(draft); });
    expect(created.id).toBeTruthy();
    expect(created).toMatchObject(draft);
    expect(result.current.state.recipes.at(-1)).toEqual(created);
    expect(stored().recipes.at(-1)).toEqual(created);
  });

  it('updateRecipe replaces by id', () => {
    const { result } = renderHook(() => useAppState());
    const target = result.current.state.recipes[1];
    act(() => result.current.updateRecipe({ ...target, name: 'Renamed' }));
    expect(result.current.state.recipes[1].name).toBe('Renamed');
    expect(result.current.state.recipes).toHaveLength(SEED_RECIPES.length);
  });

  it('deleteRecipe removes it and clears plan slots referencing it', () => {
    const { result } = renderHook(() => useAppState());
    const [a, b] = result.current.state.recipes;
    act(() => {
      result.current.setMeal('mon', 'breakfast', { recipeId: a.id, servings: 2 });
      result.current.setMeal('tue', 'lunch', { recipeId: a.id, servings: 2 });
      result.current.setMeal('wed', 'dinner', { recipeId: b.id, servings: 2 });
    });
    act(() => result.current.deleteRecipe(a.id));
    const { recipes, plan } = result.current.state;
    expect(recipes.find((r) => r.id === a.id)).toBeUndefined();
    expect(plan.mon.breakfast).toBeUndefined();
    expect(plan.tue.lunch).toBeUndefined();
    expect(plan.wed.dinner).toEqual({ recipeId: b.id, servings: 2 });
  });

  it('setMeal sets and clears a slot without affecting others', () => {
    const { result } = renderHook(() => useAppState());
    const id = SEED_RECIPES[0].id;
    act(() => result.current.setMeal('fri', 'lunch', { recipeId: id, servings: 1 }));
    act(() => result.current.setMeal('fri', 'dinner', { recipeId: id, servings: 4 }));
    act(() => result.current.setMeal('fri', 'lunch', null));
    expect(result.current.state.plan.fri).toEqual({ dinner: { recipeId: id, servings: 4 } });
    expect('lunch' in result.current.state.plan.fri).toBe(false);
  });

  it('autoFill fills all empty slots but keeps existing ones', () => {
    const { result } = renderHook(() => useAppState());
    const id = SEED_RECIPES[0].id;
    act(() => result.current.setMeal('mon', 'breakfast', { recipeId: id, servings: 5 }));
    act(() => result.current.autoFill(2));
    const { plan } = result.current.state;
    expect(plan.mon.breakfast).toEqual({ recipeId: id, servings: 5 });
    for (const d of DAYS) for (const m of MEAL_TYPES) expect(plan[d][m]).toBeDefined();
    expect(plan.tue.dinner!.servings).toBe(2);
  });

  it('clearPlan empties the plan but keeps recipes', () => {
    const { result } = renderHook(() => useAppState());
    act(() => result.current.autoFill(2));
    act(() => result.current.clearPlan());
    expect(result.current.state.plan).toEqual(emptyPlan());
    expect(result.current.state.recipes).toHaveLength(SEED_RECIPES.length);
  });

  it('toggleGroceryItem toggles keys and clearChecked resets', () => {
    const { result } = renderHook(() => useAppState());
    act(() => result.current.toggleGroceryItem('onion|piece'));
    act(() => result.current.toggleGroceryItem('garlic|clove'));
    expect(result.current.state.checkedGroceryKeys).toEqual(['onion|piece', 'garlic|clove']);
    act(() => result.current.toggleGroceryItem('onion|piece'));
    expect(result.current.state.checkedGroceryKeys).toEqual(['garlic|clove']);
    expect(stored().checkedGroceryKeys).toEqual(['garlic|clove']);
    act(() => result.current.clearChecked());
    expect(result.current.state.checkedGroceryKeys).toEqual([]);
  });

  it('resetAll restores seed recipes, empty plan and no checks', () => {
    const { result } = renderHook(() => useAppState());
    act(() => {
      result.current.addRecipe(draft);
      result.current.deleteRecipe(SEED_RECIPES[0].id);
      result.current.autoFill(2);
      result.current.toggleGroceryItem('x');
    });
    act(() => result.current.resetAll());
    expect(result.current.state.recipes.map((r) => r.id)).toEqual(SEED_RECIPES.map((r) => r.id));
    expect(result.current.state.plan).toEqual(emptyPlan());
    expect(result.current.state.checkedGroceryKeys).toEqual([]);
    expect(stored().recipes).toHaveLength(SEED_RECIPES.length);
  });

  it('action functions are referentially stable across renders', () => {
    const { result, rerender } = renderHook(() => useAppState());
    const before = result.current;
    act(() => result.current.toggleGroceryItem('x'));
    rerender();
    expect(result.current.setMeal).toBe(before.setMeal);
    expect(result.current.addRecipe).toBe(before.addRecipe);
  });
});
