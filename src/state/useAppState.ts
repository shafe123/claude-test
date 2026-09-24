import { useCallback, useEffect, useState } from 'react';
import { DAYS, MEAL_TYPES } from '../domain/types';
import type {
  AppState, DayOfWeek, GroceryCategory, Ingredient, MealType, PlannedMeal, Recipe, Unit, WeekPlan,
} from '../domain/types';
import { autoFillPlan, emptyPlan } from '../domain/planner';
import { SEED_RECIPES, newId } from '../domain/seed';

export const STORAGE_KEY = 'meal-planner:v1';

const UNITS: readonly Unit[] = [
  'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'piece', 'pinch', 'clove', 'can',
];
const CATEGORIES: readonly GroceryCategory[] = [
  'produce', 'meat', 'dairy', 'bakery', 'pantry', 'frozen', 'spices', 'other',
];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function cloneSeed(): Recipe[] {
  return SEED_RECIPES.map((r) => ({
    ...r,
    tags: [...r.tags],
    mealTypes: [...r.mealTypes],
    ingredients: r.ingredients.map((i) => ({ ...i })),
  }));
}

export function initialState(): AppState {
  return { recipes: cloneSeed(), plan: emptyPlan(), checkedGroceryKeys: [] };
}

function sanitizeIngredient(v: unknown): Ingredient | null {
  if (!isObj(v) || !isStr(v.name) || !isNum(v.quantity)) return null;
  const unit = UNITS.includes(v.unit as Unit) ? (v.unit as Unit) : 'piece';
  const category = CATEGORIES.includes(v.category as GroceryCategory)
    ? (v.category as GroceryCategory)
    : 'other';
  return { name: v.name, quantity: v.quantity, unit, category };
}

function sanitizeRecipe(v: unknown): Recipe | null {
  if (!isObj(v) || !isStr(v.id) || !v.id || !isStr(v.name)) return null;
  const mealTypes = Array.isArray(v.mealTypes)
    ? v.mealTypes.filter((m): m is MealType => MEAL_TYPES.includes(m as MealType))
    : [];
  return {
    id: v.id,
    name: v.name,
    servings: isNum(v.servings) && v.servings > 0 ? v.servings : 1,
    prepMinutes: isNum(v.prepMinutes) && v.prepMinutes >= 0 ? v.prepMinutes : 0,
    tags: Array.isArray(v.tags) ? v.tags.filter(isStr) : [],
    mealTypes,
    ingredients: Array.isArray(v.ingredients)
      ? v.ingredients.map(sanitizeIngredient).filter((x): x is Ingredient => x !== null)
      : [],
    instructions: isStr(v.instructions) ? v.instructions : '',
  };
}

function sanitizePlan(v: unknown, recipeIds: Set<string>): WeekPlan {
  const plan = emptyPlan();
  if (!isObj(v)) return plan;
  for (const day of DAYS) {
    const slots = v[day];
    if (!isObj(slots)) continue;
    for (const meal of MEAL_TYPES) {
      const pm = slots[meal];
      if (isObj(pm) && isStr(pm.recipeId) && recipeIds.has(pm.recipeId) && isNum(pm.servings) && pm.servings > 0) {
        plan[day][meal] = { recipeId: pm.recipeId, servings: pm.servings };
      }
    }
  }
  return plan;
}

/** Parse persisted state, falling back to defaults for anything missing or invalid. */
export function parseState(raw: string | null): AppState {
  if (raw == null) return initialState();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return initialState();
  }
  if (!isObj(data)) return initialState();

  const recipes = Array.isArray(data.recipes)
    ? data.recipes.map(sanitizeRecipe).filter((r): r is Recipe => r !== null)
    : cloneSeed();
  // Deduplicate ids (keep first).
  const seen = new Set<string>();
  const unique = recipes.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));

  return {
    recipes: unique,
    plan: sanitizePlan(data.plan, seen),
    checkedGroceryKeys: Array.isArray(data.checkedGroceryKeys)
      ? [...new Set(data.checkedGroceryKeys.filter(isStr))]
      : [],
  };
}

export function loadState(): AppState {
  try {
    return parseState(localStorage.getItem(STORAGE_KEY));
  } catch {
    return initialState();
  }
}

function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — ignore.
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addRecipe = useCallback((r: Omit<Recipe, 'id'>): Recipe => {
    const recipe: Recipe = { ...r, id: newId() };
    setState((s) => ({ ...s, recipes: [...s.recipes, recipe] }));
    return recipe;
  }, []);

  const updateRecipe = useCallback((r: Recipe): void => {
    setState((s) => ({ ...s, recipes: s.recipes.map((x) => (x.id === r.id ? r : x)) }));
  }, []);

  const deleteRecipe = useCallback((id: string): void => {
    setState((s) => {
      const plan = emptyPlan();
      for (const day of DAYS) {
        for (const meal of MEAL_TYPES) {
          const pm = s.plan[day]?.[meal];
          if (pm && pm.recipeId !== id) plan[day][meal] = pm;
        }
      }
      return { ...s, recipes: s.recipes.filter((x) => x.id !== id), plan };
    });
  }, []);

  const setMeal = useCallback((day: DayOfWeek, meal: MealType, pm: PlannedMeal | null): void => {
    setState((s) => {
      const slots = { ...s.plan[day] };
      if (pm) slots[meal] = pm;
      else delete slots[meal];
      return { ...s, plan: { ...s.plan, [day]: slots } };
    });
  }, []);

  const autoFill = useCallback((servings: number): void => {
    setState((s) => ({ ...s, plan: autoFillPlan(s.plan, s.recipes, servings) }));
  }, []);

  const clearPlan = useCallback((): void => {
    setState((s) => ({ ...s, plan: emptyPlan() }));
  }, []);

  const toggleGroceryItem = useCallback((key: string): void => {
    setState((s) => ({
      ...s,
      checkedGroceryKeys: s.checkedGroceryKeys.includes(key)
        ? s.checkedGroceryKeys.filter((k) => k !== key)
        : [...s.checkedGroceryKeys, key],
    }));
  }, []);

  const clearChecked = useCallback((): void => {
    setState((s) => ({ ...s, checkedGroceryKeys: [] }));
  }, []);

  const resetAll = useCallback((): void => {
    setState(initialState());
  }, []);

  return {
    state,
    addRecipe, updateRecipe, deleteRecipe,
    setMeal, autoFill, clearPlan,
    toggleGroceryItem, clearChecked,
    resetAll,
  };
}

export type AppStateApi = ReturnType<typeof useAppState>;
