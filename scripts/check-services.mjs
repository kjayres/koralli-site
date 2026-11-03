import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import { servicePose, serviceSceneMarkup } from '../src/scripts/art/service-scenes.mjs';
import { serviceReveal } from '../src/scripts/services.mjs';

test('all scenes close their physical loops without a jump', () => {
  const values = object => Object.values(object).flat();
  for (let scene = 0; scene < 3; scene++) {
    const first = values(servicePose(scene, 0)), last = values(servicePose(scene, 1 - 1e-7));
    first.forEach((value, i) => assert.ok(Math.abs(value - last[i]) < .002, `scene ${scene}, coordinate ${i}`));
    assert.deepEqual(servicePose(scene, 0), servicePose(scene, 1));
  }
});

test('the test robot waits at the closed gate and clears it on both journeys', () => {
  for (let i = 0; i <= 1000; i++) {
    const t = i / 1000, state = servicePose(2, t);
    if (state.x > 99 && state.x < 116) assert.ok(state.gate > .95, `gate obstructs robot at ${t}`);
    if (t > .29 && t < .41) {
      assert.equal(state.x, 91);
      assert.equal(state.stride, 0);
    }
  }
  assert.ok(Math.abs(servicePose(2, .2).stride) > .2);
});

test('cloth remains on the glass and within the human arm reach', () => {
  const shoulder = [115.25, 108 + .4 * .92, 33.5];
  for (let i = 0; i < 300; i++) {
    const { wipe } = servicePose(1, i / 300);
    assert.equal(wipe[1], 118);
    assert.ok(Math.hypot(...wipe.map((v, j) => v - shoulder[j])) < 15.36);
  }
});

test('the prototype stays at the agent grippers and walking stops at the workstations', () => {
  for (let i = 0; i < 300; i++) {
    const { x, heading, token } = servicePose(0, i / 300);
    assert.ok(Math.abs(Math.hypot(token[0] - x, token[1] - 84) - 10) < 1e-9);
    assert.ok(Math.abs(token[0] - x - Math.sin(heading) * 10) < 1e-9);
    assert.ok(token[2] >= 23);
  }
  assert.equal(servicePose(0, .05).stride, 0);
  assert.equal(servicePose(0, .5).stride, 0);
});

test('frames have finite geometry, unique figure clips and balanced SVG groups', () => {
  for (let scene = 0; scene < 3; scene++) for (let frame = 0; frame < 96; frame++) {
    const markup = serviceSceneMarkup(scene, frame / 96);
    assert.doesNotMatch(markup, /NaN|Infinity|undefined|service-hands/);
    const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length);
    let depth = 0;
    for (const tag of markup.matchAll(/<\/?g\b[^>]*>/g)) {
      depth += tag[0].startsWith('</') ? -1 : 1;
      assert.ok(depth >= 0);
    }
    assert.equal(depth, 0);
  }
});

test('each card has a readable interval and all three settle before the release', () => {
  assert.deepEqual([0, 1, 2].map(i => serviceReveal(.22, i)), [1, 0, 0]);
  assert.deepEqual([0, 1, 2].map(i => serviceReveal(.5, i)), [1, 1, 0]);
  assert.deepEqual([0, 1, 2].map(i => serviceReveal(.75, i)), [1, 1, 1]);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 100; j++) {
    assert.ok(serviceReveal(j / 100, i) <= serviceReveal((j + 1) / 100, i));
  }
});

test('services sit outside the approach hold, inside the same main landmark', async () => {
  const html = await fs.readFile(new URL('../src/our-work.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.match(html, /<main id="main">\s*<div[^>]*data-approach-shell/);
  assert.match(html, /<\/section>\s*<\/div>\s*<\/div>\s*<section[^>]*data-services/);
  assert.ok(html.indexOf('data-services') < html.indexOf('</main>'));
});

async function controller({ width = 1200, height = 800, reduced = false, stageHeight = 500 } = {}) {
  const events = new Map(), frames = new Map(), classes = new Set(), style = () => ({ setProperty(k, v) { this[k] = v; } });
  let observer, resizer, frameID = 0, renders = 0;
  const svgs = [0, 1, 2].map(() => ({ set innerHTML(v) { renders++; } }));
  const cards = svgs.map(svg => ({ style: style(), querySelector: () => svg, getBoundingClientRect: () => ({ top: 200, bottom: 600 }) }));
  const stage = { getBoundingClientRect: () => ({ height: stageHeight }) };
  const section = { style: style(), classList: { toggle(k, value) { value ? classes.add(k) : classes.delete(k); } }, querySelector: () => stage, querySelectorAll: () => cards, getBoundingClientRect: () => ({ top: 2000 - context.scrollY }) };
  const motion = { matches: reduced, addEventListener: (name, fn) => events.set('motion', fn) };
  const document = { hidden: false, querySelector: () => section, addEventListener: (name, fn) => events.set(name, fn) };
  const context = vm.createContext({
    document, innerWidth: width, innerHeight: height, scrollY: 0,
    matchMedia: () => motion, getComputedStyle: () => ({ paddingTop: '70' }),
    addEventListener: (name, fn) => events.set(name, fn),
    requestAnimationFrame: fn => { frames.set(++frameID, fn); return frameID; }, cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: class { constructor(fn) { observer = fn; } observe() {} },
    ResizeObserver: class { constructor(fn) { resizer = fn; } observe() {} },
    scrollTo: ({ top }) => { context.scrollY = top; },
  });
  const source = await fs.readFile(new URL('../src/scripts/services.mjs', import.meta.url), 'utf8');
  const mod = new vm.SourceTextModule(source, { context });
  await mod.link(() => new vm.SyntheticModule(['serviceSceneMarkup'], function () { this.setExport('serviceSceneMarkup', () => '<g/>'); }, { context }));
  await mod.evaluate();
  return { context, section, cards, classes, motion, frames, document, events, get renders() { return renders; },
    scroll(y) { context.scrollY = y; events.get('scroll')(); },
    intersect(value) { observer([{ isIntersecting: value }]); },
    resize(w, h) { context.innerWidth = w; context.innerHeight = h; resizer(); },
    tick(time) { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(time)); },
  };
}

test('controller pins only when cards fit and preserves progress on resize', async () => {
  const view = await controller();
  assert.ok(view.classes.has('services-pinned'));
  view.scroll(1920 + 1440 * .5);
  assert.equal(view.cards[1].style['--service-opacity'], '1.000');
  assert.equal(view.cards[2].style['--service-opacity'], '0.000');
  view.resize(1200, 900);
  assert.equal(view.cards[1].style['--service-opacity'], '1.000');
  view.resize(390, 844);
  assert.ok(!view.classes.has('services-pinned'));
  assert.equal(view.section.style.height, '');
  assert.ok(view.cards.every(card => card.style['--service-opacity'] === '1.000'));
  view.resize(1200, 500);
  assert.ok(!view.classes.has('services-pinned'));
});

test('unrevealed, offscreen and hidden artwork does no drawing; reduced motion is static', async () => {
  const view = await controller();
  view.intersect(true);
  assert.equal(view.frames.size, 0);
  view.scroll(1920 + 1440 * .22);
  view.tick(100);
  assert.equal(view.renders, 1);
  view.intersect(false);
  assert.equal(view.frames.size, 0);
  view.intersect(true);
  view.document.hidden = true;
  view.events.get('visibilitychange')();
  assert.equal(view.frames.size, 0);
  view.document.hidden = false;
  view.events.get('visibilitychange')();
  assert.equal(view.frames.size, 1);
  view.motion.matches = true;
  view.events.get('motion')();
  assert.equal(view.frames.size, 0);
  assert.ok(!view.classes.has('services-pinned'));
  assert.equal(view.renders, 4);
});
