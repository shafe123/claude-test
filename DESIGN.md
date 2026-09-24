# Meal Planner — Design

Client-only React + TypeScript (Vite) app. State persists in `localStorage`. No backend.

## Features
1. **Recipes** — browse/search/filter by tag, add/edit/delete recipes.
2. **Weekly planner** — 7 days × breakfast/lunch/dinner grid. Assign a recipe + servings to each slot. "Auto-fill" fills empty slots with suitable recipes (respecting `mealTypes`, avoiding repeats where possible).
3. **Grocery list** — generated from the plan: ingredients scaled by servings, merged across recipes, units converted where compatible, grouped by category, check-off persisted.

## Module ownership
| Path | Owner | Purpose |
|---|---|---|
| `src/domain/types.ts` | lead | Shared contract (do not change without coordination) |
| `src/domain/*.ts` (units, grocery, planner, seed) | domain agent | Pure logic + unit tests |
| `src/state/*` | domain agent | `useAppState` hook + localStorage persistence |
| `src/components/Recipe*` | recipes UI agent | Recipe list/detail/form |
| `src/components/Planner*`, `Grocery*` | planner UI agent | Week grid, grocery list |
| `src/App.tsx`, `index.css` | lead | Shell, tabs, integration |

## Domain API (implemented in src/domain & src/state)
```ts
// units.ts
normalizeQuantity(q: number, u: Unit): { quantity: number; unit: Unit }   // to base unit g/ml/piece etc.
formatQuantity(q: number, u: Unit): string                                // "1.5 cups", "250 g"
// grocery.ts
buildGroceryList(plan: WeekPlan, recipes: Recipe[]): GroceryItem[]         // sorted by category then name
// planner.ts
emptyPlan(): WeekPlan
autoFillPlan(plan: WeekPlan, recipes: Recipe[], defaultServings: number, rng?: () => number): WeekPlan
// seed.ts
SEED_RECIPES: Recipe[]    // ~12 diverse recipes covering all meal types
newId(): string
// state/useAppState.ts
useAppState(): {
  state: AppState;
  addRecipe(r: Omit<Recipe,'id'>): Recipe; updateRecipe(r: Recipe): void; deleteRecipe(id: string): void; // delete also clears it from plan
  setMeal(day: DayOfWeek, meal: MealType, pm: PlannedMeal | null): void;
  autoFill(servings: number): void; clearPlan(): void;
  toggleGroceryItem(key: string): void; clearChecked(): void;
  resetAll(): void;
}
```
Storage key: `meal-planner:v1`. Loading must tolerate missing/corrupt data (fall back to seed).
