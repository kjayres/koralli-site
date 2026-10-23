# Views from the Reef diving suit

The coral fish in its deep-sea diving suit, swimming through the water of Views from the Reef,
with an angler fish that now and then drifted up behind it as if to eat the pilot. It was the
sequel to the home page's redesigners scene, where the suit was being built; when that scene was
archived (see `../redesigners-scene/`), the swimming suit lost its story. Archived in October 2026.

- `journal-diving-suit.mjs`: `drawDeepMechFish`, the angler's mesh and `drawAngler`, cut from the
  end of `src/scripts/art/journal-deep-life.mjs`.

To restore it, paste the file back at the end of `journal-deep-life.mjs` and call
`drawDeepMechFish(ctx, scene, time, current, scroll, viewport)` at the end of `drawDeepFish`,
before `ctx.restore()`. Then run `npm run build`, `npm run check` and `npm run check:artwork`.
