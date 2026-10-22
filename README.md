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

## Publishing

`.github/workflows/pages.yml` builds `src/` on every push to `main` and publishes it at the
root of the Pages site (`https://kjayres.github.io/koralli-site/`). Old `…/dist/…` preview
links and old koralli.io addresses (`/what-we-do`, `/views-from-the-reef/<post>`,
`/service-offerings/…`) redirect to their new pages.

To launch on koralli.io: point the domain's DNS at GitHub Pages, set the custom domain in
the repository's Pages settings, then set the repository variable `KORALLI_LAUNCH` to `true`
and re-run the workflow, which publishes the launch build.
