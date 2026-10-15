# Building before the interior redesign

This is the 15 October 2026 baseline taken after the people-only change and before the room interiors were rebuilt. The twelve original files are preserved byte for byte; `manifest.json` records their sizes and SHA-256 hashes.

The active revision changes the contents and descriptions of the four rooms. The exterior architecture, projection, floor dimensions and lift/rotation sequence are retained. `scripts/check-building-preservation.mjs` compares the active exterior and movement with this baseline, including ordinary and reduced-motion snapshots.

To restore the previous interiors, copy the archived `src/scripts/art/building.mjs` and `src/sections/building.html` to their corresponding active paths, then run `npm run artwork:building` and `npm run build` from the site root. The archived figure definitions and SVG exports are retained as original references.
