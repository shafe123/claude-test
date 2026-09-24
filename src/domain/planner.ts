import { DAYS, MEAL_TYPES } from './types';
import type { Recipe, WeekPlan } from './types';

export function emptyPlan(): WeekPlan {
  return { mon: {}, tue: {}, wed: {}, thu: {}, fri: {}, sat: {}, sun: {} };
}

/**
 * Fill empty slots with recipes suited for that meal type.
 * - Existing slots are preserved.
 * - Recipes already used in the week (including pre-filled slots) are avoided
 *   until no unused candidates remain; then the least-used candidates are chosen.
 * - Deterministic for a given rng. Does not mutate inputs.
 */
export function autoFillPlan(
  plan: WeekPlan,
  recipes: Recipe[],
  defaultServings: number,
  rng: () => number = Math.random,
): WeekPlan {
  const next = emptyPlan();
  const usage = new Map<string, number>();

  for (const day of DAYS) {
    for (const meal of MEAL_TYPES) {
      const pm = plan?.[day]?.[meal];
      if (pm) {
        next[day][meal] = { ...pm };
        usage.set(pm.recipeId, (usage.get(pm.recipeId) ?? 0) + 1);
      }
    }
  }

  for (const day of DAYS) {
    for (const meal of MEAL_TYPES) {
      if (next[day][meal]) continue;
      const candidates = recipes.filter((r) => r.mealTypes.includes(meal));
      if (candidates.length === 0) continue;
      const minUse = Math.min(...candidates.map((r) => usage.get(r.id) ?? 0));
      const pool = candidates.filter((r) => (usage.get(r.id) ?? 0) === minUse);
      const idx = Math.min(pool.length - 1, Math.max(0, Math.floor(rng() * pool.length)));
      const pick = pool[idx];
      next[day][meal] = { recipeId: pick.id, servings: defaultServings };
      usage.set(pick.id, minUse + 1);
    }
  }

  return next;
}
