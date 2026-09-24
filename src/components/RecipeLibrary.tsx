import { useMemo, useState } from 'react';
import type { MealType, Recipe } from '../domain/types';
import { MEAL_TYPES } from '../domain/types';
import { RecipeDetail } from './RecipeDetail';
import { RecipeForm } from './RecipeForm';
import './recipes.css';

export interface RecipeLibraryProps {
  recipes: Recipe[];
  onAdd(r: Omit<Recipe, 'id'>): void;
  onUpdate(r: Recipe): void;
  onDelete(id: string): void;
}

type View =
  | { kind: 'list' }
  | { kind: 'detail'; id: string }
  | { kind: 'new' }
  | { kind: 'edit'; id: string };

export function filterRecipes(
  recipes: Recipe[], query: string, tags: string[], meal: MealType | 'all',
): Recipe[] {
  const q = query.trim().toLowerCase();
  return recipes.filter((r) => {
    if (meal !== 'all' && !r.mealTypes.includes(meal)) return false;
    if (tags.length && !tags.every((t) => r.tags.includes(t))) return false;
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.ingredients.some((i) => i.name.toLowerCase().includes(q))
    );
  });
}

export function RecipeLibrary({ recipes, onAdd, onUpdate, onDelete }: RecipeLibraryProps) {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [meal, setMeal] = useState<MealType | 'all'>('all');

  const allTags = useMemo(
    () => Array.from(new Set(recipes.flatMap((r) => r.tags))).sort(),
    [recipes],
  );
  const visible = useMemo(
    () => filterRecipes(recipes, query, selectedTags, meal),
    [recipes, query, selectedTags, meal],
  );

  const toggleTag = (t: string) =>
    setSelectedTags((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]));

  const current =
    view.kind === 'detail' || view.kind === 'edit'
      ? recipes.find((r) => r.id === view.id)
      : undefined;

  if (view.kind === 'new') {
    return (
      <div className="recipes">
        <RecipeForm
          onSubmit={(r) => { onAdd(r); setView({ kind: 'list' }); }}
          onCancel={() => setView({ kind: 'list' })}
        />
      </div>
    );
  }

  if (view.kind === 'edit' && current) {
    return (
      <div className="recipes">
        <RecipeForm
          key={current.id}
          initial={current}
          onSubmit={(r) => { onUpdate({ ...r, id: current.id }); setView({ kind: 'detail', id: current.id }); }}
          onCancel={() => setView({ kind: 'detail', id: current.id })}
        />
      </div>
    );
  }

  if (view.kind === 'detail' && current) {
    return (
      <div className="recipes">
        <RecipeDetail
          recipe={current}
          onEdit={() => setView({ kind: 'edit', id: current.id })}
          onDelete={(id) => { onDelete(id); setView({ kind: 'list' }); }}
          onClose={() => setView({ kind: 'list' })}
        />
      </div>
    );
  }

  const filtersActive = query.trim() !== '' || selectedTags.length > 0 || meal !== 'all';

  return (
    <div className="recipes">
      <div className="recipes__header">
        <h2>Recipes</h2>
        <button type="button" className="recipe-btn recipe-btn--primary" onClick={() => setView({ kind: 'new' })}>
          + New recipe
        </button>
      </div>

      <div className="recipes__filters" role="search">
        <label className="recipe-field recipes__search">
          <span>Search</span>
          <input
            type="search" value={query} placeholder="Name or ingredient…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="recipe-field">
          <span>Meal type</span>
          <select value={meal} onChange={(e) => setMeal(e.target.value as MealType | 'all')}>
            <option value="all">All meals</option>
            {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>

      {allTags.length > 0 && (
        <div className="recipe-chips" role="group" aria-label="Filter by tag">
          {allTags.map((t) => (
            <button
              key={t} type="button"
              className={`recipe-chip${selectedTags.includes(t) ? ' recipe-chip--on' : ''}`}
              aria-pressed={selectedTags.includes(t)}
              onClick={() => toggleTag(t)}
            >
              {t}
            </button>
          ))}
          {filtersActive && (
            <button
              type="button" className="recipe-btn recipe-btn--ghost"
              onClick={() => { setQuery(''); setSelectedTags([]); setMeal('all'); }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <p className="recipe-muted" aria-live="polite">
        {visible.length} of {recipes.length} recipes
      </p>

      {visible.length === 0 ? (
        <p className="recipe-empty">
          {recipes.length === 0 ? 'No recipes yet — add your first one.' : 'No recipes match your filters.'}
        </p>
      ) : (
        <ul className="recipe-grid" aria-label="Recipe list">
          {visible.map((r) => (
            <li key={r.id}>
              <button
                type="button" className="recipe-card"
                onClick={() => setView({ kind: 'detail', id: r.id })}
                aria-label={`${r.name}, ${r.prepMinutes} minutes, ${r.servings} servings`}
              >
                <span className="recipe-card__name">{r.name}</span>
                <span className="recipe-meta">
                  <span>{r.prepMinutes} min</span>
                  <span>{r.servings} serv.</span>
                </span>
                {r.tags.length > 0 && (
                  <span className="recipe-tags">
                    {r.tags.map((t) => <span key={t} className="recipe-tag">{t}</span>)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default RecipeLibrary;
