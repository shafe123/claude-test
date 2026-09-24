import { describe, it, expect } from 'vitest';
import { SEED_RECIPES, newId } from './seed';
import { MEAL_TYPES } from './types';

describe('SEED_RECIPES', () => {
  it('has around a dozen recipes with unique ids', () => {
    expect(SEED_RECIPES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(SEED_RECIPES.map((r) => r.id)).size).toBe(SEED_RECIPES.length);
  });
  it('covers every meal type with several options', () => {
    for (const m of MEAL_TYPES) {
      expect(SEED_RECIPES.filter((r) => r.mealTypes.includes(m)).length).toBeGreaterThanOrEqual(3);
    }
  });
  it('includes vegetarian recipes', () => {
    expect(SEED_RECIPES.some((r) => r.tags.includes('vegetarian'))).toBe(true);
  });
  it('has valid, lowercase ingredients', () => {
    for (const r of SEED_RECIPES) {
      expect(r.servings).toBeGreaterThan(0);
      expect(r.ingredients.length).toBeGreaterThan(0);
      expect(r.instructions.length).toBeGreaterThan(0);
      for (const i of r.ingredients) {
        expect(i.name).toBe(i.name.trim().toLowerCase());
        expect(i.quantity).toBeGreaterThan(0);
      }
    }
  });
  it('shares common ingredients across recipes', () => {
    for (const name of ['onion', 'garlic', 'olive oil']) {
      expect(SEED_RECIPES.filter((r) => r.ingredients.some((i) => i.name === name)).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('newId', () => {
  it('returns unique non-empty strings', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id.length).toBeGreaterThan(0);
  });
});
