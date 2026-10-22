# Redesigners scene

The animation beside "koralli is for the redesigners." on the home page: a researcher with a
clipboard scratching their head and a welder fusing a shoulder, either side of the coral fish's
deep-sea diving suit, its cockpit built into the hull. The suit is a closed triangle mesh drawn
like the reef's animals. The scene stood on the line of the section's last link, so it never made
the section taller, and followed the text on phones.

Archived in October 2026 at the user's request ("too much"). The section's heading and text stay
on the home page. The suited fish that swims through Views from the Reef is separate and remains
(`src/scripts/art/journal-deep-life.mjs`).

## Files

- `redesigners-stage.mjs`: the scene, cut from `src/scripts/art/thesis-cards.mjs`. It uses that
  file's helpers, so it goes back into it, along with the import noted at its top.
- `diving-suit.mjs`: the suit's mesh, from `src/scripts/art/`.
- `check-diving-suit.mjs`: its test, from `scripts/`. Run it here with `node check-diving-suit.mjs`.
- `redesigners-stage.html`: the lead column's markup in `src/index.html`.
- `redesigners-stage.css`: the rules from `src/styles/home.css`.
- `site-wiring.js`: the code from `src/scripts/site.js` that starts and animates it.

`human3DMarkup` in `thesis-cards.mjs` keeps the two options the scene added (`torchPower`, and a
projector's own `depth`), since the thesis cards share that figure code.

## Earlier versions

Git keeps each earlier take: the original isometric scene is in commit `13a3134`, and the first
straight-on version in `0299e97`.

## Restoring it

1. Move `diving-suit.mjs` back to `src/scripts/art/` and `check-diving-suit.mjs` to `scripts/`,
   changing its import back to `../src/scripts/art/diving-suit.mjs`.
2. Paste `redesigners-stage.mjs` into `thesis-cards.mjs` before `initThesisCards`, with its import.
3. Put the markup, styles and wiring back where their notes say.
4. Run `npm run build`, `npm run check` and `npm run check:artwork`.
