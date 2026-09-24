# Meal Planner

Plan your week's meals, manage a recipe library, and get an auto-generated grocery list.

- **Recipes**: search, filter by tag/meal type, add/edit/delete
- **Week plan**: 7 days × breakfast/lunch/dinner, per-slot servings, one-click auto-fill
- **Grocery list**: ingredients scaled by servings, merged across recipes with unit conversion, grouped by aisle, check-off and copy-as-text

Everything runs in the browser; data is stored in `localStorage`.

## Development
```bash
npm install
npm run dev      # start dev server
npm test         # run unit + component tests
npm run build    # production build to dist/
```

See [DESIGN.md](DESIGN.md) for architecture and module ownership. **CI/deploy:** every push runs tests; pushes to `main` deploy to GitHub Pages (Settings → Pages → Source: GitHub Actions).
