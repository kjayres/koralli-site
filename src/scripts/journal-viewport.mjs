// Keep the ocean's world coordinates tied to the whole page, but allocate pixels
// only for the screen and a little overscan. This also keeps tall mobile pages
// below browser canvas-size limits.
export function journalViewportBand(sceneHeight, sceneTop, viewportHeight) {
  const margin = Math.max(180, viewportHeight * .3);
  const height = Math.min(sceneHeight, Math.ceil(viewportHeight + margin * 2));
  const top = Math.max(0, Math.min(Math.max(0, sceneHeight - height), Math.floor(-sceneTop - margin)));
  return { top, bottom: top + height, height };
}
