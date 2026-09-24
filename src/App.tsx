import { useMemo, useState } from 'react'
import { useAppState } from './state/useAppState'
import { buildGroceryList } from './domain/grocery'
import { DAYS, MEAL_TYPES } from './domain/types'
import { RecipeLibrary } from './components/RecipeLibrary'
import { WeekPlanner } from './components/PlannerWeek'
import { GroceryList } from './components/GroceryList'

type Tab = 'plan' | 'recipes' | 'grocery'

export default function App() {
  const app = useAppState()
  const { state } = app
  const [tab, setTab] = useState<Tab>('plan')
  const [confirmReset, setConfirmReset] = useState(false)

  const groceryItems = useMemo(
    () => buildGroceryList(state.plan, state.recipes),
    [state.plan, state.recipes],
  )
  const plannedCount = DAYS.reduce(
    (n, d) => n + MEAL_TYPES.filter((m) => state.plan[d]?.[m]).length, 0,
  )
  const remaining = groceryItems.filter((i) => !state.checkedGroceryKeys.includes(i.key)).length

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'plan', label: 'Week plan', badge: plannedCount },
    { id: 'recipes', label: 'Recipes', badge: state.recipes.length },
    { id: 'grocery', label: 'Grocery list', badge: remaining },
  ]

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="app-title">🥕 Meal Planner</h1>
          <nav className="app-tabs" role="tablist" aria-label="Sections">
            {tabs.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
                {t.label}
                {t.badge !== undefined && <span className="badge">{t.badge}</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main>
        {tab === 'plan' && (
          <WeekPlanner
            plan={state.plan}
            recipes={state.recipes}
            onSetMeal={app.setMeal}
            onAutoFill={app.autoFill}
            onClear={app.clearPlan}
          />
        )}
        {tab === 'recipes' && (
          <RecipeLibrary
            recipes={state.recipes}
            onAdd={app.addRecipe}
            onUpdate={app.updateRecipe}
            onDelete={app.deleteRecipe}
          />
        )}
        {tab === 'grocery' && (
          <GroceryList
            items={groceryItems}
            checkedKeys={state.checkedGroceryKeys}
            onToggle={app.toggleGroceryItem}
            onClearChecked={app.clearChecked}
          />
        )}
      </main>
      <footer className="app-footer">
        <span>Data is saved in this browser.</span>
        {confirmReset ? (
          <>
            <span>Reset all recipes and plans?</span>
            <button className="link-button danger" onClick={() => { app.resetAll(); setConfirmReset(false) }}>Yes, reset</button>
            <button className="link-button" onClick={() => setConfirmReset(false)}>Cancel</button>
          </>
        ) : (
          <button className="link-button" onClick={() => setConfirmReset(true)}>Reset to sample data</button>
        )}
      </footer>
    </>
  )
}
