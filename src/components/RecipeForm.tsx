import { useId, useState, type FormEvent } from 'react';
import type { GroceryCategory, Ingredient, MealType, Recipe, Unit } from '../domain/types';
import { MEAL_TYPES } from '../domain/types';
import './recipes.css';

const UNITS: Unit[] = [
  'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'piece', 'pinch', 'clove', 'can',
];
const CATEGORIES: GroceryCategory[] = [
  'produce', 'meat', 'dairy', 'bakery', 'pantry', 'frozen', 'spices', 'other',
];

export interface RecipeFormProps {
  /** Recipe to edit; omit for a new recipe. */
  initial?: Recipe;
  onSubmit(r: Omit<Recipe, 'id'>): void;
  onCancel(): void;
}

interface IngredientRow {
  key: number;
  name: string;
  quantity: string;
  unit: Unit;
  category: GroceryCategory;
}

type Errors = Partial<Record<'name' | 'servings' | 'prepMinutes' | 'ingredients', string>> & {
  rows?: Record<number, { name?: string; quantity?: string }>;
};

let rowKey = 0;
const blankRow = (): IngredientRow => ({
  key: ++rowKey, name: '', quantity: '', unit: 'piece', category: 'produce',
});
const toRow = (i: Ingredient): IngredientRow => ({
  key: ++rowKey, name: i.name, quantity: String(i.quantity), unit: i.unit, category: i.category,
});

export function RecipeForm({ initial, onSubmit, onCancel }: RecipeFormProps) {
  const uid = useId();
  const [name, setName] = useState(initial?.name ?? '');
  const [servings, setServings] = useState(String(initial?.servings ?? 2));
  const [prepMinutes, setPrepMinutes] = useState(String(initial?.prepMinutes ?? 30));
  const [mealTypes, setMealTypes] = useState<MealType[]>(initial?.mealTypes ?? []);
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [instructions, setInstructions] = useState(initial?.instructions ?? '');
  const [rows, setRows] = useState<IngredientRow[]>(
    initial && initial.ingredients.length ? initial.ingredients.map(toRow) : [blankRow()],
  );
  const [errors, setErrors] = useState<Errors>({});

  const updateRow = (key: number, patch: Partial<IngredientRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const toggleMeal = (m: MealType) =>
    setMealTypes((ms) => (ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m]));

  function validate(): Errors {
    const e: Errors = {};
    if (!name.trim()) e.name = 'Name is required.';
    const s = Number(servings);
    if (servings.trim() === '' || !Number.isFinite(s) || s < 1) e.servings = 'Servings must be at least 1.';
    const p = Number(prepMinutes);
    if (prepMinutes.trim() !== '' && (!Number.isFinite(p) || p < 0)) e.prepMinutes = 'Prep time cannot be negative.';
    const filled = rows.filter((r) => r.name.trim() || r.quantity.trim());
    if (filled.length === 0) e.ingredients = 'Add at least one ingredient.';
    const rowErrs: NonNullable<Errors['rows']> = {};
    for (const r of filled) {
      const q = Number(r.quantity);
      const re: { name?: string; quantity?: string } = {};
      if (!r.name.trim()) re.name = 'Ingredient name is required.';
      if (r.quantity.trim() === '' || !Number.isFinite(q) || q <= 0) re.quantity = 'Quantity must be greater than 0.';
      if (re.name || re.quantity) rowErrs[r.key] = re;
    }
    if (Object.keys(rowErrs).length) e.rows = rowErrs;
    return e;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    onSubmit({
      name: name.trim(),
      servings: Number(servings),
      prepMinutes: prepMinutes.trim() === '' ? 0 : Number(prepMinutes),
      mealTypes: MEAL_TYPES.filter((m) => mealTypes.includes(m)),
      tags: Array.from(
        new Set(tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)),
      ),
      instructions: instructions.trim(),
      ingredients: rows
        .filter((r) => r.name.trim() || r.quantity.trim())
        .map((r) => ({
          name: r.name.trim().toLowerCase(),
          quantity: Number(r.quantity),
          unit: r.unit,
          category: r.category,
        })),
    });
  }

  const hasErrors = Object.keys(errors).length > 0;
  const fid = (s: string) => `${uid}-${s}`;

  return (
    <form className="recipe-form" onSubmit={handleSubmit} noValidate aria-label={initial ? 'Edit recipe' : 'New recipe'}>
      <h2>{initial ? `Edit ${initial.name}` : 'New recipe'}</h2>
      {hasErrors && (
        <p className="recipe-form__summary" role="alert">Please fix the highlighted fields.</p>
      )}

      <div className="recipe-field">
        <label htmlFor={fid('name')}>Name</label>
        <input
          id={fid('name')} value={name} onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name} aria-describedby={errors.name ? fid('name-err') : undefined}
        />
        {errors.name && <span id={fid('name-err')} className="recipe-error">{errors.name}</span>}
      </div>

      <div className="recipe-form__row">
        <div className="recipe-field">
          <label htmlFor={fid('servings')}>Servings</label>
          <input
            id={fid('servings')} type="number" min={1} step={1} inputMode="numeric"
            value={servings} onChange={(e) => setServings(e.target.value)}
            aria-invalid={!!errors.servings} aria-describedby={errors.servings ? fid('servings-err') : undefined}
          />
          {errors.servings && <span id={fid('servings-err')} className="recipe-error">{errors.servings}</span>}
        </div>
        <div className="recipe-field">
          <label htmlFor={fid('prep')}>Prep time (min)</label>
          <input
            id={fid('prep')} type="number" min={0} step={1} inputMode="numeric"
            value={prepMinutes} onChange={(e) => setPrepMinutes(e.target.value)}
            aria-invalid={!!errors.prepMinutes} aria-describedby={errors.prepMinutes ? fid('prep-err') : undefined}
          />
          {errors.prepMinutes && <span id={fid('prep-err')} className="recipe-error">{errors.prepMinutes}</span>}
        </div>
      </div>

      <fieldset className="recipe-fieldset">
        <legend>Meal types</legend>
        <div className="recipe-checks">
          {MEAL_TYPES.map((m) => (
            <label key={m} className="recipe-check">
              <input type="checkbox" checked={mealTypes.includes(m)} onChange={() => toggleMeal(m)} />
              {m}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="recipe-field">
        <label htmlFor={fid('tags')}>Tags (comma-separated)</label>
        <input
          id={fid('tags')} value={tags} placeholder="vegetarian, quick"
          onChange={(e) => setTags(e.target.value)}
        />
      </div>

      <fieldset className="recipe-fieldset">
        <legend>Ingredients</legend>
        {errors.ingredients && <p className="recipe-error" role="alert">{errors.ingredients}</p>}
        <ul className="ingredient-rows">
          {rows.map((r, idx) => {
            const re = errors.rows?.[r.key];
            const n = idx + 1;
            return (
              <li key={r.key} className="ingredient-row">
                <div className="recipe-field ingredient-row__name">
                  <label htmlFor={fid(`ing-name-${r.key}`)}>Ingredient {n} name</label>
                  <input
                    id={fid(`ing-name-${r.key}`)} value={r.name}
                    onChange={(e) => updateRow(r.key, { name: e.target.value })}
                    aria-invalid={!!re?.name}
                  />
                  {re?.name && <span className="recipe-error">{re.name}</span>}
                </div>
                <div className="recipe-field ingredient-row__qty">
                  <label htmlFor={fid(`ing-qty-${r.key}`)}>Ingredient {n} quantity</label>
                  <input
                    id={fid(`ing-qty-${r.key}`)} type="number" min={0} step="any" inputMode="decimal"
                    value={r.quantity}
                    onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                    aria-invalid={!!re?.quantity}
                  />
                  {re?.quantity && <span className="recipe-error">{re.quantity}</span>}
                </div>
                <div className="recipe-field">
                  <label htmlFor={fid(`ing-unit-${r.key}`)}>Ingredient {n} unit</label>
                  <select
                    id={fid(`ing-unit-${r.key}`)} value={r.unit}
                    onChange={(e) => updateRow(r.key, { unit: e.target.value as Unit })}
                  >
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="recipe-field">
                  <label htmlFor={fid(`ing-cat-${r.key}`)}>Ingredient {n} category</label>
                  <select
                    id={fid(`ing-cat-${r.key}`)} value={r.category}
                    onChange={(e) => updateRow(r.key, { category: e.target.value as GroceryCategory })}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button
                  type="button" className="recipe-btn recipe-btn--ghost ingredient-row__remove"
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  disabled={rows.length === 1}
                  aria-label={`Remove ingredient ${n}`}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="recipe-btn" onClick={() => setRows((rs) => [...rs, blankRow()])}>
          + Add ingredient
        </button>
      </fieldset>

      <div className="recipe-field">
        <label htmlFor={fid('instructions')}>Instructions</label>
        <textarea
          id={fid('instructions')} rows={6} value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      <div className="recipe-actions">
        <button type="submit" className="recipe-btn recipe-btn--primary">
          {initial ? 'Save changes' : 'Add recipe'}
        </button>
        <button type="button" className="recipe-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default RecipeForm;
