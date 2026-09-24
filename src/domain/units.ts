import type { Unit } from './types';

/** Conversion factors to base units (g for mass, ml for volume). */
const TO_GRAMS: Partial<Record<Unit, number>> = {
  g: 1,
  kg: 1000,
  oz: 28.349523125,
  lb: 453.59237,
};

const TO_ML: Partial<Record<Unit, number>> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892159375,
  tbsp: 14.78676478125,
  cup: 236.5882365,
};

/** Round to at most `decimals` places, removing float noise. */
function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/**
 * Convert a quantity to its base unit: mass -> g, volume -> ml.
 * Count-like units (piece, pinch, clove, can) are returned unchanged.
 */
export function normalizeQuantity(q: number, u: Unit): { quantity: number; unit: Unit } {
  const g = TO_GRAMS[u];
  if (g !== undefined) return { quantity: roundTo(q * g, 6), unit: 'g' };
  const ml = TO_ML[u];
  if (ml !== undefined) return { quantity: roundTo(q * ml, 6), unit: 'ml' };
  return { quantity: q, unit: u };
}

/** Human-friendly number: fewer decimals as the magnitude grows. */
function niceNumber(n: number): string {
  const abs = Math.abs(n);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const r = roundTo(n, decimals);
  // String(Number) drops trailing zeros ("1.50" -> "1.5").
  return String(r === 0 ? 0 : r);
}

const PLURALS: Partial<Record<Unit, string>> = {
  cup: 'cups',
  piece: 'pieces',
  pinch: 'pinches',
  clove: 'cloves',
  can: 'cans',
};

/**
 * Format a quantity for display. Metric mass/volume is rescaled to a nice unit
 * (1500 g -> "1.5 kg", 0.25 l -> "250 ml"); other units are kept as given
 * and pluralized where appropriate ("1.5 cups", "2 cloves").
 */
export function formatQuantity(q: number, u: Unit): string {
  if (!Number.isFinite(q)) return `0 ${u}`;
  if (u === 'g' || u === 'kg') {
    const grams = normalizeQuantity(q, u).quantity;
    return Math.abs(grams) >= 1000 ? `${niceNumber(grams / 1000)} kg` : `${niceNumber(grams)} g`;
  }
  if (u === 'ml' || u === 'l') {
    const ml = normalizeQuantity(q, u).quantity;
    return Math.abs(ml) >= 1000 ? `${niceNumber(ml / 1000)} l` : `${niceNumber(ml)} ml`;
  }
  const num = niceNumber(q);
  const plural = PLURALS[u];
  const label = plural && Number(num) !== 1 ? plural : u;
  return `${num} ${label}`;
}

const FRACTIONS: [number, string][] = [
  [0, ''], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, ''],
];

/**
 * Round `n` to the nearest allowed fraction (at least the smallest one) and render it:
 * 1.5 -> "1½". `allowed` lists the fractional parts permitted, e.g. [0, ½, 1].
 */
function kitchenNumber(n: number, allowed: number[]): { text: string; value: number } {
  let whole = Math.floor(n);
  const choices = FRACTIONS.filter(([f]) => allowed.includes(f));
  let [frac, glyph] = choices.reduce((best, c) =>
    Math.abs(n - whole - c[0]) < Math.abs(n - whole - best[0]) ? c : best);
  if (frac === 1) { whole += 1; frac = 0; glyph = ''; }
  if (whole === 0 && frac === 0) [frac, glyph] = choices[1]; // never show "0"
  return { text: whole === 0 ? glyph : `${whole}${glyph}`, value: whole + frac };
}

const QUARTERS = [0, 1 / 4, 1 / 2, 3 / 4, 1];
const HALVES = [0, 1 / 2, 1];
const CUP_FRACTIONS = [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1];

/**
 * Format a merged grocery quantity. Grocery items carry base units (ml/g), so small
 * volumes are shown in kitchen measures instead of odd metric values
 * (14.8 ml -> "1 tbsp", 177 ml -> "¾ cup"); 500 ml and up stays metric.
 * Amounts are rounded before picking the unit, so 2.9 tsp becomes "1 tbsp", not "3 tsp".
 */
export function formatGroceryQuantity(q: number, u: Unit): string {
  if (u !== 'ml' || !Number.isFinite(q) || q <= 0 || q >= 500) return formatQuantity(q, u);
  const tsp = kitchenNumber(q / TO_ML.tsp!, QUARTERS);
  if (tsp.value < 3) return `${tsp.text} tsp`;
  const tbsp = kitchenNumber(q / TO_ML.tbsp!, HALVES);
  if (tbsp.value < 4) return `${tbsp.text} tbsp`;
  const cups = kitchenNumber(q / TO_ML.cup!, CUP_FRACTIONS);
  return `${cups.text} ${cups.value > 1 ? 'cups' : 'cup'}`;
}
