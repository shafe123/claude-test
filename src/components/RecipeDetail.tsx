import { useState } from 'react';
import type { Recipe } from '../domain/types';
import { formatQuantity } from '../domain/units';
import './recipes.css';

export interface RecipeDetailProps {
  recipe: Recipe;
  onEdit(): void;
  onDelete(id: string): void;
  onClose(): void;
}

export function RecipeDetail({ recipe, onEdit, onDelete, onClose }: RecipeDetailProps) {
  const [confirming, setConfirming] = useState(false);
  const headingId = `recipe-detail-${recipe.id}`;

  return (
    <article className="recipe-detail" aria-labelledby={headingId}>
      <button type="button" className="recipe-btn recipe-btn--ghost" onClick={onClose}>
        ← Back to recipes
      </button>
      <h2 id={headingId}>{recipe.name}</h2>
      <p className="recipe-meta">
        <span>{recipe.prepMinutes} min</span>
        <span>{recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}</span>
        {recipe.mealTypes.length > 0 && <span>{recipe.mealTypes.join(' · ')}</span>}
      </p>
      {recipe.tags.length > 0 && (
        <ul className="recipe-tags" aria-label="Tags">
          {recipe.tags.map((t) => <li key={t} className="recipe-tag">{t}</li>)}
        </ul>
      )}

      <section>
        <h3>Ingredients</h3>
        <ul className="recipe-ingredients">
          {recipe.ingredients.map((i, idx) => (
            <li key={`${i.name}-${idx}`}>
              <span className="recipe-ingredients__qty">{formatQuantity(i.quantity, i.unit)}</span>{' '}
              <span>{i.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Instructions</h3>
        {recipe.instructions.trim() ? (
          <div className="recipe-instructions">
            {recipe.instructions.split(/\n+/).map((p, idx) => <p key={idx}>{p}</p>)}
          </div>
        ) : (
          <p className="recipe-muted">No instructions yet.</p>
        )}
      </section>

      <div className="recipe-actions">
        {confirming ? (
          <div className="recipe-confirm" role="group" aria-label="Confirm delete">
            <span>Delete “{recipe.name}”? This also removes it from the plan.</span>
            <button
              type="button" className="recipe-btn recipe-btn--danger"
              onClick={() => onDelete(recipe.id)}
            >
              Yes, delete
            </button>
            <button type="button" className="recipe-btn" onClick={() => setConfirming(false)} autoFocus>
              Keep
            </button>
          </div>
        ) : (
          <>
            <button type="button" className="recipe-btn recipe-btn--primary" onClick={onEdit}>Edit</button>
            <button type="button" className="recipe-btn recipe-btn--danger" onClick={() => setConfirming(true)}>
              Delete
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export default RecipeDetail;
