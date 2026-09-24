import { describe, it, expect } from 'vitest';
import { buildGroceryList, CATEGORY_ORDER } from './grocery';
import { emptyPlan } from './planner';
import { SEED_RECIPES } from './seed';
import type { Recipe } from './types';

const r = (id: string, name: string, servings: number, ingredients: Recipe['ingredients']): Recipe => ({
  id, name, servings, prepMinutes: 10, tags: [], mealTypes: ['dinner'], ingredients, instructions: '',
});

const pasta = r('a', 'Pasta', 2, [
  { name: 'Onion', quantity: 1, unit: 'piece', category: 'produce' },
  { name: 'olive oil', quantity: 1, unit: 'tbsp', category: 'pantry' },
  { name: 'spaghetti', quantity: 200, unit: 'g', category: 'pantry' },
  { name: 'salt', quantity: 1, unit: 'pinch', category: 'spices' },
]);
const soup = r('b', 'Soup', 4, [
  { name: ' onion ', quantity: 2, unit: 'piece', category: 'produce' },
  { name: 'olive oil', quantity: 1, unit: 'tsp', category: 'pantry' },
  { name: 'stock', quantity: 1, unit: 'l', category: 'pantry' },
  { name: 'beef', quantity: 1, unit: 'kg', category: 'meat' },
  { name: 'cream', quantity: 100, unit: 'ml', category: 'dairy' },
  { name: 'peas', quantity: 100, unit: 'g', category: 'frozen' },
  { name: 'bread', quantity: 1, unit: 'piece', category: 'bakery' },
  { name: 'foil', quantity: 1, unit: 'piece', category: 'other' },
]);

describe('buildGroceryList', () => {
  it('returns empty list for empty plan', () => {
    expect(buildGroceryList(emptyPlan(), [pasta])).toEqual([]);
  });

  it('scales by planned servings / recipe servings', () => {
    const plan = emptyPlan();
    plan.mon.dinner = { recipeId: 'a', servings: 4 };
    const list = buildGroceryList(plan, [pasta]);
    expect(list.find((i) => i.name === 'spaghetti')).toMatchObject({ quantity: 400, unit: 'g' });
    expect(list.find((i) => i.name === 'onion')).toMatchObject({ quantity: 2, unit: 'piece' });
  });

  it('merges by lowercased trimmed name + normalized unit, with unique recipe names', () => {
    const plan = emptyPlan();
    plan.mon.dinner = { recipeId: 'a', servings: 2 };
    plan.tue.dinner = { recipeId: 'b', servings: 4 };
    plan.wed.dinner = { recipeId: 'a', servings: 2 };
    const list = buildGroceryList(plan, [pasta, soup]);
    const onion = list.find((i) => i.name === 'onion')!;
    expect(onion.quantity).toBe(4);
    expect(onion.key).toBe('onion|piece');
    expect(onion.recipeNames).toEqual(['Pasta', 'Soup']);
    const oil = list.find((i) => i.name === 'olive oil')!;
    expect(oil.unit).toBe('ml');
    expect(oil.quantity).toBeCloseTo(14.787 * 2 + 4.929, 2);
    expect(list.filter((i) => i.name === 'olive oil')).toHaveLength(1);
    expect(list.find((i) => i.name === 'stock')).toMatchObject({ quantity: 1000, unit: 'ml', key: 'stock|ml' });
    expect(list.find((i) => i.name === 'beef')).toMatchObject({ quantity: 1000, unit: 'g' });
  });

  it('keeps incompatible units separate', () => {
    const x = r('x', 'X', 1, [
      { name: 'garlic', quantity: 2, unit: 'clove', category: 'produce' },
      { name: 'garlic', quantity: 10, unit: 'g', category: 'produce' },
    ]);
    const plan = emptyPlan();
    plan.mon.lunch = { recipeId: 'x', servings: 1 };
    const keys = buildGroceryList(plan, [x]).map((i) => i.key);
    expect(keys).toEqual(['garlic|clove', 'garlic|g']);
  });

  it('skips meals whose recipe no longer exists', () => {
    const plan = emptyPlan();
    plan.mon.dinner = { recipeId: 'missing', servings: 2 };
    plan.tue.dinner = { recipeId: 'a', servings: 2 };
    const list = buildGroceryList(plan, [pasta]);
    expect(list).toHaveLength(4);
    expect(list.every((i) => i.recipeNames.join() === 'Pasta')).toBe(true);
  });

  it('sorts by category order then name', () => {
    const plan = emptyPlan();
    plan.mon.dinner = { recipeId: 'a', servings: 2 };
    plan.tue.dinner = { recipeId: 'b', servings: 4 };
    const list = buildGroceryList(plan, [pasta, soup]);
    const cats = list.map((i) => CATEGORY_ORDER.indexOf(i.category));
    expect(cats).toEqual([...cats].sort((x, y) => x - y));
    expect(list.map((i) => i.name)).toEqual([
      'onion', 'beef', 'cream', 'bread', 'olive oil', 'spaghetti', 'stock', 'peas', 'salt', 'foil',
    ]);
  });

  it('avoids float noise in merged quantities', () => {
    const x = r('x', 'X', 3, [{ name: 'rice', quantity: 0.1, unit: 'kg', category: 'pantry' }]);
    const plan = emptyPlan();
    plan.mon.lunch = { recipeId: 'x', servings: 1 };
    plan.tue.lunch = { recipeId: 'x', servings: 2 };
    expect(buildGroceryList(plan, [x])[0].quantity).toBe(100);
  });

  it('does not mutate inputs', () => {
    const plan = emptyPlan();
    plan.mon.dinner = { recipeId: 'a', servings: 4 };
    const snapshot = JSON.stringify([plan, pasta]);
    buildGroceryList(plan, [pasta]);
    buildGroceryList(plan, [pasta]);
    expect(JSON.stringify([plan, pasta])).toBe(snapshot);
  });

  it('merges shared seed ingredients like onion, garlic and olive oil', () => {
    const plan = emptyPlan();
    const byId = (id: string) => SEED_RECIPES.find((x) => x.id === id)!;
    plan.mon.dinner = { recipeId: byId('seed-spaghetti-bolognese').id, servings: 4 };
    plan.tue.dinner = { recipeId: byId('seed-veggie-curry').id, servings: 4 };
    const list = buildGroceryList(plan, SEED_RECIPES);
    for (const name of ['onion', 'garlic', 'olive oil']) {
      expect(list.find((i) => i.name === name)!.recipeNames).toHaveLength(2);
    }
  });
});
