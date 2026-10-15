# Building before the people-only revision

This archive preserves the original four-level building on 15 October 2026, including the blue agent on the People and work level, the original figure library, section copy, export script and all eight editable SVG exports. No archived source or artwork is modified by the active build.

`manifest.json` records the byte count and SHA-256 of every preserved file. Source paths within this directory mirror the site root. The robot figures also remain in the active shared figure library for possible future design work; only the building instance changes to a coral human.

To regenerate the archived artwork without touching the active site, run from the site root:

```sh
node archive/2026-10-15-building-before-people-only/scripts/export-building.mjs archive/2026-10-15-building-before-people-only/src/scripts/art/building.mjs /tmp/koralli-original-building
```

To restore the original scene, copy the archived `src/scripts/art/building.mjs` and `src/sections/building.html` back to their original locations, then run `npm run artwork:building` and `npm run build`. Preserve any newer unrelated changes when restoring.
