# Koralli website

The website design review is shared at https://kjayres.github.io/koralli-site/. It includes the revised copy and structure, four-level building, mesh reef and an underwater journal with three complete essays. Individual essays use a paper-coloured reading layout.

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
npm run check:artwork
```

The development server opens at http://127.0.0.1:4173. Build before committing changes to `src` so `dist` stays in sync. Relative asset URLs make the same build work on localhost and GitHub Pages. `npm run artwork:building` refreshes the downloadable building SVGs after changes to the building geometry. The journal uses a plain text heading; its canvas scene is in `src/scripts/art/journal-water.mjs`. The earlier letter-growth study remains in `src/scripts/art/journal-lettering.mjs` and is only loaded when its matching SVG elements are present. Motion follows the visitor's reduced-motion setting and stops when the page is hidden.

The homepage reef is rendered by `src/scripts/art/reef.mjs`, with its layout in `reef-habitat.mjs` and its page styling in `src/styles/reef.css`. `node scripts/export-reef.mjs` refreshes its static SVGs. The build versions JavaScript and CSS together so published pages use matching assets. `npm run check` also reports stale files in `dist/`; archive or remove obsolete generated files explicitly when retiring source assets.

`npm run check:artwork` runs the animation, geometry, visibility and failure-recovery checks. It uses Node's VM-module flag for the browser lifecycle test; the associated experimental warning is expected.

Our Work uses one pinned particle scene while its three text panels and numbers fade between scroll-selected phases. Key phrases gradually turn blue, and a fine network appears around each settled Go & See inspection. Small viewports that cannot fit the complete scene, reduced motion and JavaScript-free visits retain a normal document flow. `src/scripts/art/approach.mjs` controls inspection, physical sand and coral tracing; `approach-view.mjs` manages the pinned sequence, keyboard phase links and layout fallbacks. Run `node --experimental-vm-modules --test scripts/check-approach-scroll.mjs` after changing this behaviour. The sand waits for grounded settlement before each new formation. Run `node scripts/check-approach-physics.mjs` and `node scripts/check-approach.mjs` after changes to the sequence or its particle solver. Reduced motion presents composed states while keeping all phase descriptions readable.

On Kieran's Mac, double-click `Open Koralli.app` inside the `new_site` folder to start the server and open a browser. The launcher and internal notes remain local.

Local supporting material is in `docs/` and `artwork-source/`, both excluded from GitHub. `Open Koralli.webloc` opens the published design directly. The sibling `agent_workspace` project has its own Git repository and shareable demo at https://kjayres.github.io/koralli-workspace/. The Agent Systems page introduces that prototype; agent execution is not connected.

Unused earlier animations, lettering, building studies and asset variants are preserved locally in `artwork-source/site-archive/2026-10-01/`, with their original paths and a manifest of reasons, sizes and SHA-256 hashes. Current gallery studies remain available in `artwork.html`. To reuse an archived study, restore its native source and review its dependencies before rebuilding. Git history also retains the previously tracked versions.
