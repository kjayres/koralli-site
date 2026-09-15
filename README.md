# Koralli website

The current design is shared at https://kjayres.github.io/koralli-site/.

The previous published site is preserved in the `archive/pre-redesign-2026-09-15` branch. This is a design review: draft copy labels and search-engine exclusion remain in place.

## Working on the site

- `src/`: editable HTML, CSS, content, SVG assets and animation modules.
- `scripts/build.mjs`: expands the native page components into `dist/`.
- `dist/`: complete static website, served by GitHub Pages.
- `index.html`: takes the existing shareable address to `dist/`.

Use Node.js 20 or newer. No dependency installation is needed.

```sh
npm run dev
npm run build
npm run check
```

The development server opens at http://127.0.0.1:4173. Build before committing changes to `src` so `dist` stays in sync. Relative asset URLs make the same build work on localhost and GitHub Pages. `npm run artwork:building` refreshes the downloadable building SVGs after changes to the building geometry.

On Kieran's Mac, double-click `Open Koralli.app` beside the `new_site` folder to start the server and open a browser. The launcher and internal notes remain local.
