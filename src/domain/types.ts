// Shared domain contract. All modules build against these types — change with care.

export type Unit =
  | 'g' | 'kg' | 'ml' | 'l'
  | 'tsp' | 'tbsp' | 'cup'
  | 'oz' | 'lb'
  | 'piece' | 'pinch' | 'clove' | 'can';

export type GroceryCategory =
  | 'produce' | 'meat' | 'dairy' | 'bakery' | 'pantry' | 'frozen' | 'spices' | 'other';

export interface Ingredient {
  name: string;          // e.g. "onion" — lowercase, singular preferred
  quantity: number;
  unit: Unit;
  category: GroceryCategory;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface Recipe {
  id: string;
  name: string;
  servings: number;       // servings the ingredient quantities yield
  prepMinutes: number;
  tags: string[];         // e.g. "vegetarian", "quick"
  mealTypes: MealType[];  // meals this recipe is suited for
  ingredients: Ingredient[];
  instructions: string;
}

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface PlannedMeal {
  recipeId: string;
  servings: number;       // servings to cook (scales ingredients)
}

/** Week plan: day -> meal slot -> planned meal (absent = empty slot). */
export type WeekPlan = Record<DayOfWeek, Partial<Record<MealType, PlannedMeal>>>;

export interface GroceryItem {
  key: string;            // stable id: `${name}|${unit}` after normalization
  name: string;
  quantity: number;
  unit: Unit;
  category: GroceryCategory;
  recipeNames: string[];  // which recipes contributed
}

export interface AppState {
  recipes: Recipe[];
  plan: WeekPlan;
  checkedGroceryKeys: string[]; // grocery items ticked off
}

export const DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];
