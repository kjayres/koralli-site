import assert from 'node:assert/strict';
import { journalViewportBand } from '../src/scripts/journal-viewport.mjs';

// A crop must contain every visible scene pixel at both ends of the page,
// through rapid jumps, and at narrow/tall viewport sizes.
for (const sceneHeight of [300, 2200, 10000, 30000]) {
  for (const screen of [480, 800, 950, 1400]) {
    for (const sceneTop of [screen, 0, -1, -533.2, -sceneHeight / 2, screen - sceneHeight, -sceneHeight]) {
      const band = journalViewportBand(sceneHeight, sceneTop, screen);
      assert.ok(band.top >= 0 && band.bottom <= sceneHeight);
      assert.ok(band.height <= screen + 2 * Math.max(180, screen * .3) + 1);
      const visibleTop = Math.max(0, -sceneTop), visibleBottom = Math.min(sceneHeight, screen - sceneTop);
      if (visibleBottom > visibleTop) {
        assert.ok(band.top <= visibleTop && band.bottom >= visibleBottom, 'Visible scene stays inside the crop');
      }
    }
  }
}
