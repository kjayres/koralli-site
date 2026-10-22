# Koralli Site

Static site source (`src/`) and built output (`dist/`).

## Commands

- `npm run dev` — start local dev server
- `npm run build` — build `src/` into `dist/`
- `npm run check` — verify built output, links, and JS syntax
- `npm run check:artwork` — run interactive scene and artwork test suite

## Launching on koralli.io

Preview builds (`npm run build`) tell search engines not to index the site, so the
GitHub Pages copy never competes with the real domain. Every page already names its
`https://www.koralli.io/…` address as canonical.

When the site moves to koralli.io, build with `npm run build:launch` (and verify with
`npm run check:launch`). That removes the noindex tag from every page and adds
`robots.txt` and `sitemap.xml`. Serve `dist/` as the domain's root.
