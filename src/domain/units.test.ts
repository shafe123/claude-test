import { describe, it, expect } from 'vitest';
import { normalizeQuantity, formatQuantity, formatGroceryQuantity } from './units';

describe('normalizeQuantity', () => {
  it('converts mass to grams', () => {
    expect(normalizeQuantity(1.5, 'kg')).toEqual({ quantity: 1500, unit: 'g' });
    expect(normalizeQuantity(250, 'g')).toEqual({ quantity: 250, unit: 'g' });
    expect(normalizeQuantity(1, 'oz').quantity).toBeCloseTo(28.35, 2);
    expect(normalizeQuantity(1, 'oz').unit).toBe('g');
    expect(normalizeQuantity(2, 'lb').quantity).toBeCloseTo(907.18, 2);
  });
  it('converts volume to ml', () => {
    expect(normalizeQuantity(1, 'l')).toEqual({ quantity: 1000, unit: 'ml' });
    expect(normalizeQuantity(0.25, 'l')).toEqual({ quantity: 250, unit: 'ml' });
    expect(normalizeQuantity(1, 'tsp').quantity).toBeCloseTo(4.93, 2);
    expect(normalizeQuantity(1, 'tbsp').quantity).toBeCloseTo(14.79, 2);
    expect(normalizeQuantity(1, 'cup').quantity).toBeCloseTo(236.59, 2);
    expect(normalizeQuantity(3, 'tsp').quantity).toBeCloseTo(normalizeQuantity(1, 'tbsp').quantity, 5);
    expect(normalizeQuantity(1, 'cup').unit).toBe('ml');
  });
  it('leaves count units unchanged', () => {
    for (const u of ['piece', 'pinch', 'clove', 'can'] as const) {
      expect(normalizeQuantity(3, u)).toEqual({ quantity: 3, unit: u });
    }
  });
  it('avoids float noise', () => {
    expect(normalizeQuantity(0.1 + 0.2, 'kg').quantity).toBe(300);
  });
});

describe('formatQuantity', () => {
  it('scales grams to kg', () => {
    expect(formatQuantity(1500, 'g')).toBe('1.5 kg');
    expect(formatQuantity(1000, 'g')).toBe('1 kg');
    expect(formatQuantity(250, 'g')).toBe('250 g');
    expect(formatQuantity(0.25, 'kg')).toBe('250 g');
  });
  it('scales ml to l', () => {
    expect(formatQuantity(750, 'ml')).toBe('750 ml');
    expect(formatQuantity(1250, 'ml')).toBe('1.25 l');
    expect(formatQuantity(2, 'l')).toBe('2 l');
  });
  it('rounds sensibly without float noise', () => {
    expect(formatQuantity(0.1 + 0.2, 'cup')).toBe('0.3 cups');
    expect(formatQuantity(0.30000004, 'kg')).toBe('300 g');
    expect(formatQuantity(123.456, 'g')).toBe('123 g');
    expect(formatQuantity(12.345, 'g')).toBe('12.3 g');
    expect(formatQuantity(1.2345, 'tbsp')).toBe('1.23 tbsp');
    expect(formatQuantity(1234.5678, 'g')).toBe('1.23 kg');
  });
  it('pluralizes count units and cups', () => {
    expect(formatQuantity(1.5, 'cup')).toBe('1.5 cups');
    expect(formatQuantity(1, 'cup')).toBe('1 cup');
    expect(formatQuantity(2, 'clove')).toBe('2 cloves');
    expect(formatQuantity(1, 'clove')).toBe('1 clove');
    expect(formatQuantity(3, 'piece')).toBe('3 pieces');
    expect(formatQuantity(2, 'pinch')).toBe('2 pinches');
    expect(formatQuantity(2, 'can')).toBe('2 cans');
    expect(formatQuantity(2, 'tsp')).toBe('2 tsp');
  });
  it('keeps imperial units as given', () => {
    expect(formatQuantity(1, 'lb')).toBe('1 lb');
    expect(formatQuantity(4, 'oz')).toBe('4 oz');
  });
  it('handles zero and non-finite', () => {
    expect(formatQuantity(0, 'g')).toBe('0 g');
    expect(formatQuantity(NaN, 'g')).toBe('0 g');
  });
});

describe('formatGroceryQuantity', () => {
  const ml = (q: number, u: Parameters<typeof normalizeQuantity>[1]) => normalizeQuantity(q, u).quantity;
  it('shows small volumes as teaspoons', () => {
    expect(formatGroceryQuantity(ml(1, 'tsp'), 'ml')).toBe('1 tsp');
    expect(formatGroceryQuantity(ml(0.5, 'tsp'), 'ml')).toBe('½ tsp');
    expect(formatGroceryQuantity(ml(2.75, 'tsp'), 'ml')).toBe('2¾ tsp');
    expect(formatGroceryQuantity(0.3, 'ml')).toBe('¼ tsp');
  });
  it('shows medium volumes as tablespoons', () => {
    expect(formatGroceryQuantity(ml(1, 'tbsp'), 'ml')).toBe('1 tbsp');
    expect(formatGroceryQuantity(ml(3, 'tsp'), 'ml')).toBe('1 tbsp');
    expect(formatGroceryQuantity(ml(1.5, 'tbsp'), 'ml')).toBe('1½ tbsp');
    expect(formatGroceryQuantity(ml(1, 'tbsp') + ml(1, 'tsp'), 'ml')).toBe('1½ tbsp');
  });
  it('shows larger volumes as cups', () => {
    expect(formatGroceryQuantity(ml(0.25, 'cup'), 'ml')).toBe('¼ cup');
    expect(formatGroceryQuantity(ml(4, 'tbsp'), 'ml')).toBe('¼ cup');
    expect(formatGroceryQuantity(ml(0.75, 'cup'), 'ml')).toBe('¾ cup');
    expect(formatGroceryQuantity(ml(1, 'cup'), 'ml')).toBe('1 cup');
    expect(formatGroceryQuantity(ml(2, 'cup'), 'ml')).toBe('2 cups');
    expect(formatGroceryQuantity(ml(1.5, 'cup'), 'ml')).toBe('1½ cups');
  });
  it('keeps 500 ml and up metric', () => {
    expect(formatGroceryQuantity(500, 'ml')).toBe('500 ml');
    expect(formatGroceryQuantity(1250, 'ml')).toBe('1.25 l');
  });
  it('leaves non-volume units to formatQuantity', () => {
    expect(formatGroceryQuantity(1500, 'g')).toBe('1.5 kg');
    expect(formatGroceryQuantity(2, 'clove')).toBe('2 cloves');
    expect(formatGroceryQuantity(0, 'ml')).toBe('0 ml');
  });
});
