import { DAYS, MEAL_TYPES } from './types';
import type { GroceryCategory, GroceryItem, Recipe, WeekPlan } from './types';
import { normalizeQuantity } from './units';

export const CATEGORY_ORDER: GroceryCategory[] = [
  'produce', 'meat', 'dairy', 'bakery', 'pantry', 'frozen', 'spices', 'other',
];

const round = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;

/**
 * Build a merged grocery list from the week plan.
 * Ingredients are scaled by planned servings / recipe servings, normalized to
 * base units, and merged by lowercased trimmed name + normalized unit.
 * Planned meals whose recipe no longer exists are skipped.
 */
export function buildGroceryList(plan: WeekPlan, recipes: Recipe[]): GroceryItem[] {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const items = new Map<string, GroceryItem>();

  for (const day of DAYS) {
    const slots = plan?.[day];
    if (!slots) continue;
    for (const meal of MEAL_TYPES) {
      const pm = slots[meal];
      if (!pm) continue;
      const recipe = byId.get(pm.recipeId);
      if (!recipe) continue;
      const factor = recipe.servings > 0 ? pm.servings / recipe.servings : 1;

      for (const ing of recipe.ingredients) {
        const name = ing.name.trim().toLowerCase();
        if (!name) continue;
        const { quantity, unit } = normalizeQuantity(ing.quantity * factor, ing.unit);
        const key = `${name}|${unit}`;
        const existing = items.get(key);
        if (existing) {
          existing.quantity += quantity;
          if (!existing.recipeNames.includes(recipe.name)) existing.recipeNames.push(recipe.name);
        } else {
          items.set(key, {
            key,
            name,
            quantity,
            unit,
            category: ing.category,
            recipeNames: [recipe.name],
          });
        }
      }
    }
  }

  const catIndex = (c: GroceryCategory) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };

  return [...items.values()]
    .map((it) => ({ ...it, quantity: round(it.quantity) }))
    .sort((a, b) => catIndex(a.category) - catIndex(b.category) || a.name.localeCompare(b.name));
}
