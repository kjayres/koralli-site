import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import { servicePose, serviceSceneMarkup } from '../src/scripts/art/service-scenes.mjs';
import { serviceReveal } from '../src/scripts/services.mjs';
import { coursePose, courseActors, courseMarkup } from '../src/scripts/art/service-course.mjs';

test('all scenes close their physical loops without a jump', () => {
  const values = object => Object.values(object).flat();
  for (let scene = 0; scene < 2; scene++) {
    const first = values(servicePose(scene, 0)), last = values(servicePose(scene, 1 - 1e-7));
    first.forEach((value, i) => assert.ok(Math.abs(value - last[i]) < .002, `scene ${scene}, coordinate ${i}`));
    assert.deepEqual(servicePose(scene, 0), servicePose(scene, 1));
  }
});

test('monkey bars keep a supporting hand on a rung and all limbs remain within reach', () => {
  for (let i = 0; i < 1000; i++) {
    const pose = coursePose(i / 1000);
    if (pose.stage === 'monkey-bars') {
      assert.ok(pose.grips.some(Boolean));
      [pose.left, pose.right].forEach((hand, j) => {
        if (pose.grips[j]) {
          assert.equal(hand[2], 72);
          assert.equal((hand[0] - 44) % 10, 0);
        }
      });
    }
    [pose.left, pose.right].forEach((hand, j) => {
      const side = j ? 1 : -1;
      const shoulder = [pose.x + .2 * pose.scale, 74 - side * 6.4 * pose.scale, pose.z + 31.8 * pose.scale];
      assert.ok(Math.hypot(...hand.map((v, k) => v - shoulder[k])) <= 21 * pose.scale);
    });
    pose.feet?.forEach((foot, j) => {
      const hip = [pose.x, 74 - (j ? 2.4 : -2.4) * pose.scale, pose.z + 18.2 * pose.scale];
      const ankle = foot.map((v, k) => v + (k === 2 ? 2.4 * pose.scale : 0));
      assert.ok(Math.hypot(...ankle.map((v, k) => v - hip[k])) <= 17.2 * pose.scale);
    });
  }
});

test('feet land on the posts and knees settle without the feet sliding', () => {
  for (const [t, x, z] of [[.645, 118, 12], [.745, 136, 16], [.845, 154, 12]]) {
    const pose = coursePose(t);
    assert.equal(pose.stage, 'settle');
    assert.equal(pose.x, x);
    assert.ok(pose.z < z);
    pose.feet.forEach(foot => { assert.equal(foot[0], x); assert.equal(foot[2], z); });
  }
});

test('hopping arms swing back, lift for take-off and lower continuously into landing', () => {
  for (const [wait, start, end] of [[.63, .66, .73], [.73, .76, .83], [.83, .86, .92]]) {
    const crouch = coursePose(wait + (start - wait) * .55);
    const takeoff = coursePose(start);
    const flight = coursePose(start + (end - start) * .35);
    const landing = coursePose(end);
    for (const key of ['left', 'right']) {
      assert.ok(crouch[key][0] < crouch.x, 'The backswing passes behind the torso.');
      assert.ok(takeoff[key][0] > takeoff.x && takeoff[key][2] > crouch[key][2]);
      assert.ok(flight[key][2] > flight.z + 31.8 * flight.scale, 'The arms rise above shoulder level in flight.');
      assert.ok(Math.abs(flight[key][1] - flight.y) > Math.abs(landing[key][1] - landing.y), 'Arms open for balance before lowering.');
      assert.ok(landing[key][2] < landing.z + 31.8 * landing.scale);
    }
    for (const boundary of [wait, start, end]) {
      const before = coursePose(boundary - 1e-7), after = coursePose(boundary + 1e-7);
      for (const key of ['left', 'right']) {
        assert.ok(Math.hypot(...before[key].map((v, i) => v - after[key][i])) < .002, `No hand jump at ${boundary}.`);
      }
    }
  }
});

test('only one robot is visible, with an empty interval before the next entry', () => {
  for (let i = 0; i <= 2000; i++) {
    const actors = courseActors(i / 2000);
    assert.ok(actors.length <= 1);
    actors.forEach(actor => assert.ok(actor.opacity > 0 && actor.opacity <= 1));
  }
  for (const phase of [.985, .995, 0, .005, 1 - 1e-7, 1]) assert.deepEqual(courseActors(phase), []);
  assert.ok(courseActors(.95)[0].opacity > courseActors(.97)[0].opacity);
  assert.ok(courseActors(.015)[0].opacity < courseActors(.035)[0].opacity);
  assert.ok(courseActors(.015)[0].x < courseActors(.035)[0].x);
  assert.equal(courseMarkup(0), courseMarkup(1), 'The entire rendered scene closes its loop.');
});

test('cloth remains on the glass and within the human arm reach', () => {
  for (let i = 0; i < 300; i++) {
    const { x, heading, wipe } = servicePose(1, i / 300);
    assert.equal(wipe[1], 118);
    const right = [Math.cos(heading), -Math.sin(heading)], forward = [Math.sin(heading), Math.cos(heading)];
    const targets = [[wipe[0] - 1.4, 118, wipe[2]], [wipe[0] + 1.4, 118, wipe[2]]];
    if (right[0] < 0) targets.reverse();
    targets.forEach((hand, j) => {
      const side = j ? 1 : -1;
      const shoulder = [x + right[0] * side * 4.25 + forward[0] * .4 * .92, 112 + right[1] * side * 4.25 + forward[1] * .4 * .92, 33.5];
      assert.ok(Math.hypot(...hand.map((v, k) => v - shoulder[k])) < 15.36);
    });
  }
});

test('the agent module meets the board and its human grips stay reachable', () => {
  for (let i = 0; i < 300; i++) {
    const { chip } = servicePose(0, i / 300);
    assert.ok(chip[2] >= 24);
    for (const side of [-1, 1]) {
      const shoulder = [93 + side * 4.25 * 1.03, 59 + .8 * .92 * 1.03, 33.5 * 1.03];
      const hand = [chip[0] + side * 4, chip[1], chip[2] + 3];
      assert.ok(Math.hypot(...hand.map((v, k) => v - shoulder[k])) <= 15.36 * 1.03);
    }
  }
  assert.equal(servicePose(0, .5).chip[2], 24);
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
  assert.equal(serviceReveal(0, 0), 0, 'The first card fades in with the scroll, like the following cards.');
  assert.ok(serviceReveal(.1, 0) > 0 && serviceReveal(.1, 0) < 1);
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

async function controller({ width = 1200, height = 800, reduced = false, stageHeight = 500, hash = '' } = {}) {
  const events = new Map(), frames = new Map(), classes = new Set(), style = () => ({ setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } });
  let observer, resizer, frameID = 0, renders = 0;
  const classList = { toggle(k, value) { value ? classes.add(k) : classes.delete(k); } };
  const pageTop = () => {
    const flow = 100 - context.scrollY, distance = Math.max(900, context.innerHeight * 1.5);
    return classes.has('services-page-pinned') ? Math.min(Math.max(flow, -1976), flow + distance) : flow;
  };
  const shell = { style: style(), classList, getBoundingClientRect: () => ({ top: 100 - context.scrollY }) };
  const page = { getBoundingClientRect: () => ({ top: pageTop(), height: 3400 }), contains: target => target === section || target === footer };
  const footer = { id: 'contact', closest: () => null, getBoundingClientRect: () => ({ top: pageTop() + 2600 }) };
  const svgs = [0, 1, 2].map(() => ({ set innerHTML(v) { renders++; } }));
  const cards = svgs.map(svg => ({ style: style(), querySelector: () => svg, getBoundingClientRect: () => ({ top: pageTop() + 2100, bottom: pageTop() + 2500 }) }));
  const stage = { getBoundingClientRect: () => ({ top: pageTop() + 2000, height: stageHeight }) };
  const section = { id: 'services', style: style(), classList, contains: target => target === section, querySelector: () => stage, querySelectorAll: () => cards, getBoundingClientRect: () => ({ top: pageTop() + 1964 }) };
  const motion = { matches: reduced, addEventListener: (name, fn) => events.set('motion', fn) };
  const document = { hidden: false, querySelector: selector => ({ '[data-services]': section, '[data-services-shell]': shell, '[data-services-page]': page })[selector], querySelectorAll: () => [], getElementById: id => ({ services: section, contact: footer })[id], addEventListener: (name, fn) => events.set(name, fn) };
  const context = vm.createContext({
    document, innerWidth: width, innerHeight: height, scrollY: 0,
    location: { hash }, history: { pushState() {} },
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
  return { context, section, shell, page, footer, stage, cards, classes, motion, frames, document, events, get renders() { return renders; },
    scroll(y) { context.scrollY = y; events.get('scroll')(); },
    intersect(value) { observer([{ isIntersecting: value }]); },
    resize(w, h) { context.innerWidth = w; context.innerHeight = h; resizer(); },
    tick(time) { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(time)); },
  };
}

test('controller pins only when cards fit and preserves progress on resize', async () => {
  const view = await controller();
  assert.ok(view.classes.has('services-pinned'));
  view.scroll(2076 + 1200 * .5);
  assert.equal(view.cards[1].style['--service-opacity'], '1.000');
  assert.equal(view.cards[2].style['--service-opacity'], '0.000');
  view.resize(1200, 900);
  assert.equal(view.cards[1].style['--service-opacity'], '1.000');
  view.resize(390, 844);
  assert.ok(!view.classes.has('services-pinned'));
  assert.equal(view.shell.style.height, undefined);
  assert.ok(view.cards.every(card => card.style['--service-opacity'] === '1.000'));
  view.resize(1200, 500);
  assert.ok(!view.classes.has('services-pinned'));
});

test('unrevealed, offscreen and hidden artwork does no drawing; reduced motion is static', async () => {
  const view = await controller();
  view.intersect(true);
  assert.equal(view.frames.size, 0);
  view.scroll(2076 + 1200 * .22);
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

test('the actual footer stays beside the cards throughout the hold, then normal scrolling resumes', async () => {
  const view = await controller();
  view.scroll(2076 + 1200 * .2);
  assert.equal(view.stage.getBoundingClientRect().top, 24);
  assert.equal(view.footer.getBoundingClientRect().top, 624);
  view.scroll(2076 + 1200 * .8);
  assert.equal(view.stage.getBoundingClientRect().top, 24);
  assert.equal(view.footer.getBoundingClientRect().top, 624);
  assert.equal(view.section.style.height, undefined);
  view.scroll(2076 + 1200 + 100);
  assert.equal(view.stage.getBoundingClientRect().top, -76);
  assert.equal(view.footer.getBoundingClientRect().top, 524);
});

test('contact navigation skips the hold and reaches the real footer', async () => {
  const view = await controller();
  view.scroll(2400);
  view.context.location.hash = '#contact';
  view.events.get('hashchange')();
  assert.equal(view.footer.getBoundingClientRect().top, 0);
});

test('a service deep link lands at the heading and stops replaying once the reader interacts', async () => {
  const view = await controller({ hash: '#services' });
  assert.equal(view.stage.getBoundingClientRect().top, 24);
  view.events.get('keydown')();
  view.scroll(2076 + 1200 * .6);
  view.resize(1200, 900);
  assert.ok(view.cards[2].style['--service-opacity'] > 0);
});
