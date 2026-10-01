import assert from 'node:assert/strict';
import { drawJournalWater } from '../src/scripts/art/journal-water.mjs';

// Record complete canvas paths, then compare the paths which can touch a crop.
// Browser QA additionally compares actual pixels, including antialiasing.
function capture(width, height, time, viewport, cull, reducedMotion = false) {
  const properties = ['globalAlpha', 'strokeStyle', 'fillStyle', 'lineWidth', 'lineCap', 'lineJoin'];
  const visible = [], stack = [];
  let commands = [], low = Infinity, high = -Infinity, segments = 0;
  const point = (x, y) => { assert.ok(Number.isFinite(x + y)); low = Math.min(low, y); high = Math.max(high, y); };
  const ctx = {
    globalAlpha: 1, strokeStyle: '#000000', fillStyle: '#000000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
    clearRect() {},
    save() { stack.push(properties.map(name => this[name])); },
    restore() { const values = stack.pop(); properties.forEach((name, i) => this[name] = values[i]); },
    beginPath() { commands = []; low = Infinity; high = -Infinity; },
    moveTo(x, y) { point(x, y); commands.push(['M', x, y]); },
    lineTo(x, y) { point(x, y); commands.push(['L', x, y]); segments++; },
    arc(x, y, radius, from, to) { point(x, y - radius); point(x, y + radius); commands.push(['A', x, y, radius, from, to]); segments++; },
    closePath() { commands.push(['Z']); },
    stroke() { this.record('stroke', this.lineWidth / 2 + 1); },
    fill() { this.record('fill', 1); },
    record(kind, padding) {
      if (high + padding >= viewport.top && low - padding <= viewport.bottom) {
        const styles = kind === 'stroke' ? ['globalAlpha','strokeStyle','lineWidth','lineCap','lineJoin'] : ['globalAlpha','fillStyle'];
        visible.push([kind, styles.map(name => this[name]), commands]);
      }
    }
  };
  drawJournalWater(ctx, width, height, time, { reducedMotion, viewport: cull ? viewport : undefined });
  assert.equal(stack.length, 0, 'Restore the shared canvas state');
  return { visible, segments };
}

let comparisons = 0, fullSegments = 0, culledSegments = 0;
for (const [width, height, viewHeight] of [[1512,1778,800], [390,2100,720], [768,2600,900]]) {
  for (const time of [0, 12, 30, 45, 62, 88, 112, 139, 258.5, 1024, 3599]) {
    for (const top of [0, (height - viewHeight) * .45, height - viewHeight]) {
      const viewport = { top, bottom: top + viewHeight };
      const full = capture(width, height, time, viewport, false);
      const culled = capture(width, height, time, viewport, true);
      assert.equal(JSON.stringify(culled.visible) === JSON.stringify(full.visible), true, `Visible draw paths must match at ${width}x${height}, t=${time}, top=${top}`);
      assert.ok(culled.segments <= full.segments, 'Culling never adds geometry');
      fullSegments += full.segments; culledSegments += culled.segments; comparisons++;
    }
  }
  const viewport = { top: 0, bottom: height };
  assert.deepEqual(capture(width,height,0,viewport,false,true), capture(width,height,1000,viewport,true,true), 'Reduced-motion whole-scene still stays deterministic');
  const absent = capture(width,height,12,{top:height+5000,bottom:height+5800},true);
  assert.equal(absent.segments, 0, 'An entirely distant viewport builds no actor or plant paths');
}
console.log(`Journal culling: ${comparisons} exact visible-path comparisons; ${Math.round((1-culledSegments/fullSegments)*100)}% fewer submitted segments across sampled crops. Geometry, style and draw order preserved.`);
