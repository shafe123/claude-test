import { useEffect, useId, useRef, useState } from 'react';
import type { GroceryCategory, GroceryItem } from '../domain/types';
import { formatGroceryQuantity } from '../domain/units';
import './planner.css';

export interface GroceryListProps {
  items: GroceryItem[];
  checkedKeys: string[];
  onToggle(key: string): void;
  onClearChecked(): void;
}

export const CATEGORY_ORDER: GroceryCategory[] = [
  'produce',
  'meat',
  'dairy',
  'bakery',
  'pantry',
  'frozen',
  'spices',
  'other',
];

export const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  produce: 'Produce',
  meat: 'Meat & fish',
  dairy: 'Dairy & eggs',
  bakery: 'Bakery',
  pantry: 'Pantry',
  frozen: 'Frozen',
  spices: 'Spices',
  other: 'Other',
};

export function groupByCategory(items: GroceryItem[]): [GroceryCategory, GroceryItem[]][] {
  const map = new Map<GroceryCategory, GroceryItem[]>();
  for (const item of items) {
    const cat = CATEGORY_ORDER.includes(item.category) ? item.category : 'other';
    const list = map.get(cat);
    if (list) list.push(item);
    else map.set(cat, [item]);
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => [c, map.get(c)!]);
}

export function groceryListToText(items: GroceryItem[], checkedKeys: string[]): string {
  const checked = new Set(checkedKeys);
  const lines: string[] = ['Grocery list'];
  for (const [cat, list] of groupByCategory(items)) {
    lines.push('', `${CATEGORY_LABELS[cat]}:`);
    for (const item of list) {
      lines.push(`${checked.has(item.key) ? '[x]' : '[ ]'} ${formatGroceryQuantity(item.quantity, item.unit)} ${item.name}`);
    }
  }
  return lines.join('\n');
}

type CopyStatus = { kind: 'ok' | 'error'; message: string } | null;

export function GroceryList({ items, checkedKeys, onToggle, onClearChecked }: GroceryListProps) {
  const titleId = useId();
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const checked = new Set(checkedKeys);
  const total = items.length;
  const done = items.filter((i) => checked.has(i.key)).length;

  const flash = (status: CopyStatus) => {
    setCopyStatus(status);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyStatus(null), 2500);
  };

  const copy = async () => {
    const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clip || typeof clip.writeText !== 'function') {
      flash({ kind: 'error', message: 'Clipboard not available in this browser' });
      return;
    }
    try {
      await clip.writeText(groceryListToText(items, checkedKeys));
      flash({ kind: 'ok', message: 'Copied to clipboard' });
    } catch {
      flash({ kind: 'error', message: 'Could not copy list' });
    }
  };

  if (total === 0) {
    return (
      <section className="grocery" aria-labelledby={titleId}>
        <h2 id={titleId} className="planner-title">
          Grocery list
        </h2>
        <div className="grocery-empty">
          <p>Your grocery list is empty.</p>
          <p className="grocery-muted">Plan some meals for the week and the ingredients will show up here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="grocery" aria-labelledby={titleId}>
      <header className="planner-toolbar">
        <h2 id={titleId} className="planner-title">
          Grocery list
        </h2>
        <div className="grocery-progress">
          <span>
            {done} of {total} items checked
          </span>
          <progress max={total} value={done} aria-label="Grocery progress" />
        </div>
        <div className="planner-actions">
          <button type="button" className="planner-btn planner-btn-primary" onClick={copy}>
            Copy as text
          </button>
          <button type="button" className="planner-btn" onClick={onClearChecked} disabled={done === 0}>
            Uncheck all
          </button>
          <span
            role="status"
            className={`grocery-status${copyStatus?.kind === 'error' ? ' is-error' : ''}`}
          >
            {copyStatus?.message ?? ''}
          </span>
        </div>
      </header>

      {groupByCategory(items).map(([cat, list]) => {
        const headingId = `${titleId}-${cat}`;
        return (
          <section key={cat} className="grocery-group" aria-labelledby={headingId}>
            <h3 id={headingId} className="grocery-group-title">
              {CATEGORY_LABELS[cat]}
            </h3>
            <ul className="grocery-items">
              {list.map((item) => {
                const isChecked = checked.has(item.key);
                const qty = formatGroceryQuantity(item.quantity, item.unit);
                const usedIn = item.recipeNames.length ? `Used in: ${item.recipeNames.join(', ')}` : '';
                return (
                  <li key={item.key} className={`grocery-item${isChecked ? ' is-checked' : ''}`}>
                    <label title={usedIn || undefined}>
                      <input type="checkbox" checked={isChecked} onChange={() => onToggle(item.key)} />
                      <span className="grocery-item-text">
                        <span className="grocery-item-main">
                          <span className="grocery-item-qty">{qty}</span> {item.name}
                        </span>
                        {usedIn && <span className="grocery-item-recipes">{usedIn}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </section>
  );
}

export default GroceryList;
