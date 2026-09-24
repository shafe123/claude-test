import type { GroceryCategory, Ingredient, Recipe, Unit } from './types';

let counter = 0;

/** Generate a unique id (crypto.randomUUID when available). */
export function newId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  counter += 1;
  return `id-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const i = (name: string, quantity: number, unit: Unit, category: GroceryCategory): Ingredient => ({
  name, quantity, unit, category,
});

/** Seed recipes use stable ids so plans survive reloads/resets. */
export const SEED_RECIPES: Recipe[] = [
  {
    id: 'seed-overnight-oats',
    name: 'Berry Overnight Oats',
    servings: 2,
    prepMinutes: 10,
    tags: ['vegetarian', 'quick', 'make-ahead'],
    mealTypes: ['breakfast'],
    ingredients: [
      i('rolled oats', 1, 'cup', 'pantry'),
      i('milk', 1, 'cup', 'dairy'),
      i('greek yogurt', 150, 'g', 'dairy'),
      i('mixed berries', 200, 'g', 'frozen'),
      i('honey', 2, 'tbsp', 'pantry'),
      i('chia seeds', 1, 'tbsp', 'pantry'),
    ],
    instructions:
      'Stir oats, milk, yogurt, chia and honey together in a jar.\nTop with berries, cover and refrigerate overnight.\nServe cold.',
  },
  {
    id: 'seed-veggie-omelette',
    name: 'Spinach & Feta Omelette',
    servings: 1,
    prepMinutes: 15,
    tags: ['vegetarian', 'quick', 'high-protein'],
    mealTypes: ['breakfast', 'lunch'],
    ingredients: [
      i('egg', 3, 'piece', 'dairy'),
      i('spinach', 40, 'g', 'produce'),
      i('feta cheese', 30, 'g', 'dairy'),
      i('onion', 0.25, 'piece', 'produce'),
      i('olive oil', 1, 'tsp', 'pantry'),
      i('black pepper', 1, 'pinch', 'spices'),
    ],
    instructions:
      'Whisk eggs with pepper.\nSauté diced onion in olive oil, add spinach until wilted.\nPour in eggs, cook until nearly set, sprinkle feta, fold and serve.',
  },
  {
    id: 'seed-banana-pancakes',
    name: 'Fluffy Banana Pancakes',
    servings: 4,
    prepMinutes: 25,
    tags: ['vegetarian', 'family'],
    mealTypes: ['breakfast'],
    ingredients: [
      i('all-purpose flour', 1.5, 'cup', 'pantry'),
      i('banana', 2, 'piece', 'produce'),
      i('milk', 1.25, 'cup', 'dairy'),
      i('egg', 1, 'piece', 'dairy'),
      i('butter', 30, 'g', 'dairy'),
      i('baking powder', 2, 'tsp', 'pantry'),
      i('maple syrup', 4, 'tbsp', 'pantry'),
    ],
    instructions:
      'Mash bananas, whisk in milk, egg and melted butter.\nFold in flour and baking powder until just combined.\nCook ladlefuls on a hot griddle until bubbles form, flip, and serve with maple syrup.',
  },
  {
    id: 'seed-avocado-toast',
    name: 'Avocado Toast with Egg',
    servings: 2,
    prepMinutes: 10,
    tags: ['vegetarian', 'quick'],
    mealTypes: ['breakfast', 'lunch'],
    ingredients: [
      i('sourdough bread', 4, 'piece', 'bakery'),
      i('avocado', 2, 'piece', 'produce'),
      i('egg', 2, 'piece', 'dairy'),
      i('lemon', 0.5, 'piece', 'produce'),
      i('chili flakes', 1, 'pinch', 'spices'),
      i('salt', 1, 'pinch', 'spices'),
    ],
    instructions:
      'Toast the bread.\nMash avocado with lemon juice and salt, spread on toast.\nTop with a fried or poached egg and chili flakes.',
  },
  {
    id: 'seed-greek-salad',
    name: 'Greek Chickpea Salad',
    servings: 2,
    prepMinutes: 15,
    tags: ['vegetarian', 'quick', 'no-cook'],
    mealTypes: ['lunch', 'dinner'],
    ingredients: [
      i('chickpeas', 1, 'can', 'pantry'),
      i('cucumber', 1, 'piece', 'produce'),
      i('tomato', 2, 'piece', 'produce'),
      i('red onion', 0.5, 'piece', 'produce'),
      i('feta cheese', 100, 'g', 'dairy'),
      i('kalamata olives', 50, 'g', 'pantry'),
      i('olive oil', 2, 'tbsp', 'pantry'),
      i('lemon', 0.5, 'piece', 'produce'),
      i('dried oregano', 1, 'tsp', 'spices'),
    ],
    instructions:
      'Rinse chickpeas. Chop cucumber, tomatoes and red onion.\nToss everything with olive oil, lemon juice and oregano.\nCrumble feta on top.',
  },
  {
    id: 'seed-chicken-wrap',
    name: 'Chicken Caesar Wraps',
    servings: 2,
    prepMinutes: 20,
    tags: ['high-protein'],
    mealTypes: ['lunch'],
    ingredients: [
      i('chicken breast', 300, 'g', 'meat'),
      i('tortilla', 2, 'piece', 'bakery'),
      i('romaine lettuce', 1, 'piece', 'produce'),
      i('parmesan', 30, 'g', 'dairy'),
      i('caesar dressing', 3, 'tbsp', 'pantry'),
      i('olive oil', 1, 'tbsp', 'pantry'),
      i('garlic', 1, 'clove', 'produce'),
    ],
    instructions:
      'Season chicken, cook in olive oil with crushed garlic until done, then slice.\nToss chopped romaine with dressing and parmesan.\nFill tortillas with salad and chicken, roll up.',
  },
  {
    id: 'seed-lentil-soup',
    name: 'Red Lentil Soup',
    servings: 4,
    prepMinutes: 35,
    tags: ['vegetarian', 'vegan', 'make-ahead'],
    mealTypes: ['lunch', 'dinner'],
    ingredients: [
      i('red lentils', 250, 'g', 'pantry'),
      i('onion', 1, 'piece', 'produce'),
      i('carrot', 2, 'piece', 'produce'),
      i('garlic', 3, 'clove', 'produce'),
      i('diced tomatoes', 1, 'can', 'pantry'),
      i('vegetable stock', 1, 'l', 'pantry'),
      i('olive oil', 2, 'tbsp', 'pantry'),
      i('ground cumin', 2, 'tsp', 'spices'),
      i('lemon', 0.5, 'piece', 'produce'),
    ],
    instructions:
      'Sauté chopped onion, carrot and garlic in olive oil until soft.\nAdd cumin, lentils, tomatoes and stock; simmer 20 minutes.\nBlend partially and finish with lemon juice.',
  },
  {
    id: 'seed-spaghetti-bolognese',
    name: 'Spaghetti Bolognese',
    servings: 4,
    prepMinutes: 50,
    tags: ['family', 'comfort'],
    mealTypes: ['dinner'],
    ingredients: [
      i('spaghetti', 400, 'g', 'pantry'),
      i('ground beef', 500, 'g', 'meat'),
      i('onion', 1, 'piece', 'produce'),
      i('carrot', 1, 'piece', 'produce'),
      i('garlic', 2, 'clove', 'produce'),
      i('crushed tomatoes', 2, 'can', 'pantry'),
      i('olive oil', 2, 'tbsp', 'pantry'),
      i('parmesan', 50, 'g', 'dairy'),
      i('dried oregano', 1, 'tsp', 'spices'),
    ],
    instructions:
      'Sauté finely chopped onion, carrot and garlic in olive oil.\nBrown the beef, add tomatoes and oregano, simmer 30 minutes.\nCook spaghetti, toss with sauce and top with parmesan.',
  },
  {
    id: 'seed-chicken-stir-fry',
    name: 'Chicken & Veggie Stir-Fry',
    servings: 3,
    prepMinutes: 25,
    tags: ['quick', 'high-protein', 'dairy-free'],
    mealTypes: ['dinner'],
    ingredients: [
      i('chicken breast', 450, 'g', 'meat'),
      i('bell pepper', 2, 'piece', 'produce'),
      i('broccoli', 300, 'g', 'produce'),
      i('garlic', 2, 'clove', 'produce'),
      i('ginger', 15, 'g', 'produce'),
      i('soy sauce', 3, 'tbsp', 'pantry'),
      i('jasmine rice', 1.5, 'cup', 'pantry'),
      i('vegetable oil', 1, 'tbsp', 'pantry'),
    ],
    instructions:
      'Cook the rice.\nStir-fry sliced chicken in hot oil until browned; remove.\nStir-fry peppers, broccoli, garlic and ginger, return chicken, add soy sauce and serve over rice.',
  },
  {
    id: 'seed-veggie-curry',
    name: 'Chickpea & Spinach Curry',
    servings: 4,
    prepMinutes: 35,
    tags: ['vegetarian', 'vegan', 'dairy-free'],
    mealTypes: ['dinner'],
    ingredients: [
      i('chickpeas', 2, 'can', 'pantry'),
      i('coconut milk', 1, 'can', 'pantry'),
      i('spinach', 150, 'g', 'produce'),
      i('onion', 1, 'piece', 'produce'),
      i('garlic', 3, 'clove', 'produce'),
      i('ginger', 20, 'g', 'produce'),
      i('curry powder', 2, 'tbsp', 'spices'),
      i('olive oil', 1, 'tbsp', 'pantry'),
      i('basmati rice', 1.5, 'cup', 'pantry'),
    ],
    instructions:
      'Cook the rice.\nSoften onion, garlic and ginger in oil, stir in curry powder.\nAdd chickpeas and coconut milk, simmer 15 minutes, then stir in spinach until wilted.',
  },
  {
    id: 'seed-salmon-traybake',
    name: 'Lemon Salmon Traybake',
    servings: 2,
    prepMinutes: 30,
    tags: ['high-protein', 'gluten-free', 'pescatarian'],
    mealTypes: ['dinner'],
    ingredients: [
      i('salmon fillet', 2, 'piece', 'meat'),
      i('baby potatoes', 1, 'lb', 'produce'),
      i('asparagus', 250, 'g', 'produce'),
      i('lemon', 1, 'piece', 'produce'),
      i('garlic', 2, 'clove', 'produce'),
      i('olive oil', 2, 'tbsp', 'pantry'),
      i('dried dill', 1, 'tsp', 'spices'),
    ],
    instructions:
      'Roast halved potatoes with olive oil and garlic at 200°C for 20 minutes.\nAdd asparagus and salmon, top with lemon slices and dill.\nRoast 12–15 minutes more.',
  },
  {
    id: 'seed-black-bean-tacos',
    name: 'Black Bean Tacos',
    servings: 3,
    prepMinutes: 20,
    tags: ['vegetarian', 'quick'],
    mealTypes: ['lunch', 'dinner'],
    ingredients: [
      i('black beans', 1, 'can', 'pantry'),
      i('corn tortilla', 6, 'piece', 'bakery'),
      i('red onion', 0.5, 'piece', 'produce'),
      i('avocado', 1, 'piece', 'produce'),
      i('tomato', 1, 'piece', 'produce'),
      i('cheddar cheese', 4, 'oz', 'dairy'),
      i('lime', 1, 'piece', 'produce'),
      i('ground cumin', 1, 'tsp', 'spices'),
      i('frozen corn', 150, 'g', 'frozen'),
    ],
    instructions:
      'Warm beans and corn with cumin; season.\nDice tomato and onion, slice avocado.\nFill warmed tortillas and top with cheese and a squeeze of lime.',
  },
];
