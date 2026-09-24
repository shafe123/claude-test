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

const FRACTIONS: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' };

/** Round to the nearest `step` (at least one step) and render quarters as fractions: 1.5 -> "1½". */
function kitchenNumber(n: number, step: number): { text: string; value: number } {
  const value = Math.max(step, Math.round(n / step) * step);
  const whole = Math.floor(value);
  const frac = FRACTIONS[roundTo(value - whole, 2)] ?? '';
  return { text: whole === 0 && frac ? frac : `${whole}${frac}`, value };
}

/**
 * Format a merged grocery quantity. Grocery items carry base units (ml/g), so small
 * volumes are shown in kitchen measures instead of odd metric values
 * (14.8 ml -> "1 tbsp", 177 ml -> "¾ cup"); 500 ml and up stays metric.
 */
export function formatGroceryQuantity(q: number, u: Unit): string {
  if (u !== 'ml' || !Number.isFinite(q) || q <= 0 || q >= 500) return formatQuantity(q, u);
  const tsp = TO_ML.tsp!;
  const tbsp = TO_ML.tbsp!;
  const cup = TO_ML.cup!;
  if (q < tbsp - 0.25) return `${kitchenNumber(q / tsp, 0.25).text} tsp`;
  if (q < cup / 4 - 0.5) return `${kitchenNumber(q / tbsp, 0.5).text} tbsp`;
  const cups = kitchenNumber(q / cup, 0.25);
  return `${cups.text} ${cups.value > 1 ? 'cups' : 'cup'}`;
}
