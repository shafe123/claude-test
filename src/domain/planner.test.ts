import { describe, it, expect } from 'vitest';
import { autoFillPlan, emptyPlan } from './planner';
import { DAYS, MEAL_TYPES } from './types';
import type { MealType, Recipe, WeekPlan } from './types';

const rec = (id: string, mealTypes: MealType[]): Recipe => ({
  id, name: id, servings: 2, prepMinutes: 5, tags: [], mealTypes, ingredients: [], instructions: '',
});

/** Simple seeded LCG for deterministic tests. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const slots = (plan: WeekPlan) =>
  DAYS.flatMap((d) => MEAL_TYPES.map((m) => ({ d, m, pm: plan[d][m] })));

describe('emptyPlan', () => {
  it('has all 7 days with no meals', () => {
    const p = emptyPlan();
    expect(Object.keys(p)).toEqual(DAYS);
    for (const d of DAYS) expect(p[d]).toEqual({});
  });
  it('returns a fresh object each time', () => {
    const a = emptyPlan();
    a.mon.dinner = { recipeId: 'x', servings: 1 };
    expect(emptyPlan().mon).toEqual({});
  });
});

describe('autoFillPlan', () => {
  const recipes = [
    ...Array.from({ length: 8 }, (_, i) => rec(`b${i}`, ['breakfast'])),
    ...Array.from({ length: 3 }, (_, i) => rec(`l${i}`, ['lunch'])),
    ...Array.from({ length: 10 }, (_, i) => rec(`d${i}`, ['dinner'])),
    rec('any', ['breakfast', 'lunch', 'dinner']),
  ];

  it('fills every slot with a suitable recipe and default servings', () => {
    const out = autoFillPlan(emptyPlan(), recipes, 3, seeded(1));
    for (const { m, pm } of slots(out)) {
      expect(pm).toBeDefined();
      expect(pm!.servings).toBe(3);
      expect(recipes.find((r) => r.id === pm!.recipeId)!.mealTypes).toContain(m);
    }
  });

  it('only fills empty slots', () => {
    const plan = emptyPlan();
    plan.mon.dinner = { recipeId: 'd0', servings: 6 };
    plan.fri.breakfast = { recipeId: 'd1', servings: 1 }; // even if unusual
    const out = autoFillPlan(plan, recipes, 2, seeded(2));
    expect(out.mon.dinner).toEqual({ recipeId: 'd0', servings: 6 });
    expect(out.fri.breakfast).toEqual({ recipeId: 'd1', servings: 1 });
  });

  it('does not reuse a recipe until candidates are exhausted', () => {
    const out = autoFillPlan(emptyPlan(), recipes, 2, seeded(3));
    const ids = slots(out).map((s) => s.pm!.recipeId);
    // Dinner has 11 candidates for 7 slots -> all unique.
    const dinners = DAYS.map((d) => out[d].dinner!.recipeId);
    expect(new Set(dinners).size).toBe(7);
    // Lunch has 4 candidates (3 + 'any' unless used elsewhere) -> max usage spread evenly.
    const counts = new Map<string, number>();
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    const lunchIds = ['l0', 'l1', 'l2', 'any'];
    const lunchCounts = lunchIds.map((id) => counts.get(id) ?? 0);
    expect(Math.max(...lunchCounts) - Math.min(...lunchCounts)).toBeLessThanOrEqual(1);
  });

  it('treats pre-filled recipes as already used', () => {
    const rs = [rec('x', ['dinner']), rec('y', ['dinner'])];
    const plan = emptyPlan();
    plan.mon.dinner = { recipeId: 'x', servings: 2 };
    const out = autoFillPlan(plan, rs, 2, () => 0);
    expect(out.tue.dinner!.recipeId).toBe('y');
  });

  it('reuses recipes when candidates are exhausted, spreading evenly', () => {
    const rs = [rec('x', ['dinner']), rec('y', ['dinner'])];
    const out = autoFillPlan(emptyPlan(), rs, 2, seeded(9));
    const dinners = DAYS.map((d) => out[d].dinner!.recipeId);
    const xs = dinners.filter((id) => id === 'x').length;
    expect([3, 4]).toContain(xs);
  });

  it('leaves slots empty when no recipe suits the meal type', () => {
    const out = autoFillPlan(emptyPlan(), [rec('d', ['dinner'])], 2, seeded(4));
    for (const d of DAYS) {
      expect(out[d].breakfast).toBeUndefined();
      expect(out[d].lunch).toBeUndefined();
      expect(out[d].dinner!.recipeId).toBe('d');
    }
  });

  it('is deterministic for a given rng', () => {
    const a = autoFillPlan(emptyPlan(), recipes, 2, seeded(42));
    const b = autoFillPlan(emptyPlan(), recipes, 2, seeded(42));
    expect(a).toEqual(b);
  });

  it('different rng seeds can produce different plans', () => {
    const plans = [1, 2, 3, 4, 5].map((s) => JSON.stringify(autoFillPlan(emptyPlan(), recipes, 2, seeded(s))));
    expect(new Set(plans).size).toBeGreaterThan(1);
  });

  it('tolerates rng returning 1', () => {
    const out = autoFillPlan(emptyPlan(), recipes, 2, () => 1);
    expect(slots(out).every((s) => s.pm)).toBe(true);
  });

  it('does not mutate inputs', () => {
    const plan = emptyPlan();
    plan.tue.lunch = { recipeId: 'l0', servings: 2 };
    const snapshot = JSON.stringify({ plan, recipes });
    const out = autoFillPlan(plan, recipes, 2, seeded(5));
    expect(JSON.stringify({ plan, recipes })).toBe(snapshot);
    expect(out).not.toBe(plan);
    expect(out.tue.lunch).not.toBe(plan.tue.lunch);
  });

  it('works with no recipes', () => {
    expect(autoFillPlan(emptyPlan(), [], 2)).toEqual(emptyPlan());
  });
});
