import { useId, useState } from 'react';
import type { DayOfWeek, MealType, PlannedMeal, Recipe, WeekPlan } from '../domain/types';
import { DAYS, MEAL_TYPES } from '../domain/types';
import './planner.css';

export interface WeekPlannerProps {
  plan: WeekPlan;
  recipes: Recipe[];
  onSetMeal(day: DayOfWeek, meal: MealType, pm: PlannedMeal | null): void;
  onAutoFill(servings: number): void;
  onClear(): void;
}

export const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 50;

function clampServings(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(n)));
}

export function countPlannedMeals(plan: WeekPlan): number {
  let n = 0;
  for (const d of DAYS) {
    for (const m of MEAL_TYPES) {
      if (plan[d]?.[m]) n++;
    }
  }
  return n;
}

interface SlotProps {
  day: DayOfWeek;
  meal: MealType;
  planned: PlannedMeal | undefined;
  recipes: Recipe[];
  defaultServings: number;
  onSetMeal: WeekPlannerProps['onSetMeal'];
}

function PlannerSlot({ day, meal, planned, recipes, defaultServings, onSetMeal }: SlotProps) {
  const label = `${DAY_LABELS[day]} ${MEAL_LABELS[meal].toLowerCase()}`;
  const suited = recipes.filter((r) => r.mealTypes.includes(meal));
  const others = recipes.filter((r) => !r.mealTypes.includes(meal));
  const selected = planned ? recipes.find((r) => r.id === planned.recipeId) : undefined;
  // A planned recipe that no longer exists: keep it selectable so the select isn't lying.
  const missing = planned && !selected;

  return (
    <div className={`planner-slot${planned ? ' is-filled' : ''}`} data-testid={`slot-${day}-${meal}`}>
      <span className="planner-slot-meal" aria-hidden="true">
        {MEAL_LABELS[meal]}
      </span>
      <select
        aria-label={`${label} recipe`}
        value={planned?.recipeId ?? ''}
        onChange={(e) => {
          const id = e.target.value;
          if (!id) {
            onSetMeal(day, meal, null);
            return;
          }
          onSetMeal(day, meal, { recipeId: id, servings: planned?.servings ?? defaultServings });
        }}
      >
        <option value="">— None —</option>
        {missing && <option value={planned.recipeId}>(deleted recipe)</option>}
        {suited.length > 0 && (
          <optgroup label={`Suited for ${MEAL_LABELS[meal].toLowerCase()}`}>
            {suited.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </optgroup>
        )}
        {others.length > 0 && (
          <optgroup label="Any recipe">
            {others.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {planned && (
        <div className="planner-slot-controls">
          <label className="planner-servings">
            <span>Servings</span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_SERVINGS}
              max={MAX_SERVINGS}
              step={1}
              aria-label={`${label} servings`}
              value={planned.servings}
              onChange={(e) => {
                const v = e.target.valueAsNumber;
                if (!Number.isFinite(v)) return;
                onSetMeal(day, meal, {
                  recipeId: planned.recipeId,
                  servings: clampServings(v, planned.servings),
                });
              }}
            />
          </label>
          <button
            type="button"
            className="planner-btn planner-btn-ghost"
            aria-label={`Clear ${label}`}
            onClick={() => onSetMeal(day, meal, null)}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

export function WeekPlanner({ plan, recipes, onSetMeal, onAutoFill, onClear }: WeekPlannerProps) {
  const [defaultServings, setDefaultServings] = useState(2);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const servingsId = useId();
  const total = DAYS.length * MEAL_TYPES.length;
  const planned = countPlannedMeals(plan);

  return (
    <section className="planner" aria-labelledby={`${servingsId}-title`}>
      <header className="planner-toolbar">
        <h2 id={`${servingsId}-title`} className="planner-title">
          Week plan
        </h2>
        <p className="planner-count" aria-live="polite">
          {planned} of {total} meals planned
        </p>
        <div className="planner-actions">
          <label className="planner-servings" htmlFor={servingsId}>
            <span>Default servings</span>
            <input
              id={servingsId}
              type="number"
              inputMode="numeric"
              min={MIN_SERVINGS}
              max={MAX_SERVINGS}
              step={1}
              value={defaultServings}
              onChange={(e) => setDefaultServings(clampServings(e.target.valueAsNumber, defaultServings))}
            />
          </label>
          <button
            type="button"
            className="planner-btn planner-btn-primary"
            onClick={() => onAutoFill(defaultServings)}
            disabled={recipes.length === 0 || planned === total}
          >
            Auto-fill
          </button>
          {confirmingClear ? (
            <span className="planner-confirm" role="group" aria-label="Confirm clear week">
              <span>Clear all meals?</span>
              <button
                type="button"
                className="planner-btn planner-btn-danger"
                onClick={() => {
                  onClear();
                  setConfirmingClear(false);
                }}
              >
                Yes, clear
              </button>
              <button type="button" className="planner-btn" onClick={() => setConfirmingClear(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="planner-btn"
              onClick={() => setConfirmingClear(true)}
              disabled={planned === 0}
            >
              Clear week
            </button>
          )}
        </div>
      </header>

      {recipes.length === 0 && <p className="planner-empty">Add some recipes to start planning.</p>}

      <div className="planner-grid">
        {DAYS.map((day) => (
          <section key={day} className="planner-day" aria-label={DAY_LABELS[day]}>
            <h3 className="planner-day-title">{DAY_LABELS[day]}</h3>
            {MEAL_TYPES.map((meal) => (
              <PlannerSlot
                key={meal}
                day={day}
                meal={meal}
                planned={plan[day]?.[meal]}
                recipes={recipes}
                defaultServings={defaultServings}
                onSetMeal={onSetMeal}
              />
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}

export default WeekPlanner;
