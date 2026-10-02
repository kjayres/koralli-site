import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../src/scripts/approach-view.mjs', import.meta.url), 'utf8');

// Model document geometry and DOM state; the browser review covers CSS layout.
function element() {
  const classes = new Set(), attributes = new Map(), events = new Map();
  return {
    dataset: {}, inert: false,
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
    },
    style: {
      setProperty(name, value) { this[name] = value; },
      removeProperty(name) { delete this[name]; },
    },
    setAttribute: (name, value) => attributes.set(name, value),
    getAttribute: name => attributes.get(name) ?? null,
    removeAttribute: name => attributes.delete(name),
    addEventListener: (name, callback) => events.set(name, callback),
    querySelector: () => null,
    events,
  };
}

async function setup({ reduced = false, width = 1440, height = 900, panelHeight = 490, hash = '', present = true } = {}) {
  const events = new Map(), observed = [], resizers = [], phases = [], scrolls = [];
  const section = element(), track = element(), stage = element(), figure = element(), frame = element();
  const ids = ['go-and-see', 'build-and-learn', 'adapt-and-grow'];
  const copies = ids.map(element);
  const headings = ids.map(element);
  const steps = ids.map((id, index) => ({ ...element(), id, querySelector: selector => selector === '.approach-copy' ? copies[index] : selector === 'h3' ? headings[index] : null }));
  const links = ids.map((id, index) => ({ ...element(), hash: `#${id}`, dataset: { approachLink: String(index) } }));
  links.forEach(link => link.classList.add('approach-number'));
  const nextLinks = ids.slice(1).map((id, index) => ({ ...element(), hash: `#${id}`, dataset: { approachLink: String(index + 1) } }));
  nextLinks.forEach(link => link.classList.add('approach-next'));
  let measuredHeight = panelHeight;
  const trackTop = 1100;
  const motion = { matches: reduced, addEventListener: (name, callback) => events.set(`motion:${name}`, callback) };
  const context = vm.createContext({
    document: { activeElement: null, querySelector: () => present ? section : null },
    innerWidth: width, innerHeight: height, scrollY: 0,
    location: { hash },
    history: { replaceState(_state, _title, value) { context.location.hash = value; } },
    matchMedia: () => motion,
    addEventListener: (name, callback) => events.set(name, callback),
    scrollTo(options) { scrolls.push(options); context.scrollY = options.top; },
    ResizeObserver: class {
      constructor(callback) { resizers.push(callback); }
      observe(target) { observed.push(target); }
    },
  });
  const nodes = {
    '[data-approach-scroll]': track,
    '[data-approach-stage]': stage,
    '[data-approach-figure]': figure,
  };
  section.querySelector = selector => nodes[selector] ?? null;
  section.querySelectorAll = selector => selector === '[data-approach-step]' ? steps : selector === '[data-approach-link]' ? [links[0], nextLinks[0], links[1], nextLinks[1], links[2]] : [];
  track.getBoundingClientRect = () => ({ top: trackTop - context.scrollY });
  stage.getBoundingClientRect = () => ({ height: measuredHeight });
  figure.querySelector = selector => selector === '.approach-frame' ? frame : null;
  figure.getBoundingClientRect = () => ({ bottom: trackTop + 290 - context.scrollY });
  steps.forEach((step, index) => {
    step.getBoundingClientRect = () => ({ top: trackTop + index * 650 - context.scrollY });
    headings[index].focus = options => {
      assert.equal(step.inert, false, 'A heading must be made accessible before it receives focus');
      assert.equal(options?.preventScroll, true, 'Heading focus must preserve the chosen reading position');
      context.document.activeElement = headings[index];
    };
  });
  const module = new vm.SourceTextModule(source, { context });
  await module.link(() => {});
  await module.evaluate();
  const update = module.namespace.initApproach(phase => phases.push(phase));
  return {
    section, track, stage, figure, frame, copies, headings, steps, links, nextLinks, motion, context, events, observed, phases, scrolls, update,
    scrollToPosition(position) {
      const travel = Number.parseFloat(track.style.height) - measuredHeight;
      assert.ok(travel > 0, 'This helper requires a pinned scroll track');
      context.scrollY = trackTop - Number.parseFloat(section.style['--approach-pin-top']) + travel * position;
      update();
    },
    resize({ width: nextWidth = context.innerWidth, height: nextHeight = context.innerHeight, panelHeight: nextPanelHeight = measuredHeight } = {}) {
      context.innerWidth = nextWidth;
      context.innerHeight = nextHeight;
      measuredHeight = nextPanelHeight;
      events.get('resize')();
    },
    changeMotion(reduce) { motion.matches = reduce; events.get('motion:change')(); },
    notifyContentResize() { resizers.forEach(callback => callback()); },
    navigateTo(hash) { context.location.hash = hash; events.get('hashchange')(); },
    click(index, modifiers = {}, targets = links) {
      const event = { prevented: false, preventDefault() { this.prevented = true; }, ...modifiers };
      targets[index].events.get('click')(event);
      return event;
    },
  };
}

function assertPinnedPhase(t, expected) {
  assert.equal(t.section.classList.contains('approach-enhanced'), true);
  assert.equal(Number(t.section.dataset.phase), expected);
  t.steps.forEach((step, index) => {
    assert.equal(step.classList.contains('is-active'), index === expected, 'Only the current reading panel is active');
    assert.equal(step.inert, index !== expected, 'Hidden reading panels cannot retain keyboard targets');
    assert.equal(step.getAttribute('aria-hidden'), index === expected ? null : 'true');
    assert.equal(t.links[index].getAttribute('aria-current'), index === expected ? 'step' : null);
  });
}

function assertFlow(t) {
  assert.equal(t.section.classList.contains('approach-enhanced'), false, 'The readable flow layout must be restored');
  assert.equal(t.track.style.height, undefined, 'Fallbacks must remove the long scroll spacer');
  assert.ok(t.steps.every(step => !step.inert && step.getAttribute('aria-hidden') === null), 'Every phase remains available in fallback mode');
}

test('scrolling forwards and backwards selects each phase once and preserves readable endpoints', async () => {
  const t = await setup();
  assertPinnedPhase(t, 0);
  t.scrollToPosition(-.2);
  assert.equal(Number(t.steps[0].style['--approach-opacity']), 1, 'The first panel is visible before the scene pins');
  for (let sample = 0; sample <= 100; sample++) {
    t.scrollToPosition(sample / 100);
    assertPinnedPhase(t, Number(t.section.dataset.phase));
  }
  assert.deepEqual(t.phases, [0, 1, 2], 'Scrolling within a phase must not restart the particle scene');
  t.scrollToPosition(1.2);
  assertPinnedPhase(t, 2);
  assert.equal(Number(t.steps[2].style['--approach-opacity']), 1, 'The final panel stays visible after the scene unpins');
  for (let sample = 100; sample >= 0; sample--) t.scrollToPosition(sample / 100);
  assert.deepEqual(t.phases, [0, 1, 2, 1, 0], 'Reverse scrolling must restore the previous phases without duplicate callbacks');
  assertPinnedPhase(t, 0);
});

test('every phase has a fully readable interval and its emphasis develops during scrolling', async () => {
  const t = await setup();
  const readings = [[], [], []];
  for (let sample = 0; sample <= 300; sample++) {
    t.scrollToPosition(sample / 300);
    const phase = Number(t.section.dataset.phase), step = t.steps[phase];
    const opacity = Number(step.style['--approach-opacity']);
    const emphasis = Number(step.style['--approach-emphasis']);
    assert.ok(opacity >= 0 && opacity <= 1 && emphasis >= 0 && emphasis <= 1);
    readings[phase].push({ opacity, emphasis });
  }
  readings.forEach((samples, phase) => {
    assert.ok(samples.filter(({ opacity }) => opacity === 1).length > 30, `Phase ${phase + 1} needs a substantial fully visible reading interval`);
    assert.ok(samples.some(({ opacity, emphasis }) => opacity === 1 && emphasis === 1), 'Keywords must finish turning blue while the copy remains readable');
    assert.ok(samples.some(({ emphasis }) => emphasis === 0));
    assert.ok(samples.some(({ emphasis }) => emphasis > 0 && emphasis < 1), 'Emphasis must develop rather than switch abruptly');
    if (phase > 0) assert.ok(samples.slice(0, 12).some(({ opacity }) => opacity < .5), 'The incoming number and text fade in together');
    if (phase < 2) assert.ok(samples.slice(-12).some(({ opacity }) => opacity < .5), 'The outgoing number and text fade out together');
  });
});

test('layout notifications keep the selected scene stable and observe content rather than the spacer', async () => {
  const t = await setup();
  t.scrollToPosition(.5);
  const selected = [...t.phases], spacer = t.track.style.height;
  for (let i = 0; i < 8; i++) { t.notifyContentResize(); t.resize(); t.update(); }
  assertPinnedPhase(t, 1);
  assert.deepEqual(t.phases, selected, 'Repeated measurement must not restart the current phase');
  assert.equal(t.track.style.height, spacer);
  assert.deepEqual(t.observed, [...t.copies, t.frame], 'Only changing content should trigger remeasurement');
});

test('short viewports and later content growth expose all copy and recover when the scene fits', async () => {
  const short = await setup({ height: 450 });
  assertFlow(short);
  short.context.scrollY = 1850;
  short.update();
  assert.equal(short.section.dataset.phase, '1', 'Flow mode still follows the currently read phase');
  assertFlow(short);
  short.resize({ height: 900 });
  assert.equal(short.section.classList.contains('approach-enhanced'), true);
  short.resize({ panelHeight: 950 });
  assertFlow(short);
  short.resize({ panelHeight: 490 });
  assert.equal(short.section.classList.contains('approach-enhanced'), true);
});

test('reduced motion exposes all phases at startup and when enabled during the story', async () => {
  const initial = await setup({ reduced: true });
  assertFlow(initial);
  initial.changeMotion(false);
  assertPinnedPhase(initial, 0);
  initial.scrollToPosition(.8);
  assertPinnedPhase(initial, 2);
  initial.changeMotion(true);
  assertFlow(initial);
  initial.update();
  assertFlow(initial);
});

test('fragment navigation lands on readable copy, including initial deep links', async () => {
  const t = await setup({ hash: '#adapt-and-grow' });
  assertPinnedPhase(t, 2);
  assert.equal(Number(t.steps[2].style['--approach-opacity']), 1);
  t.navigateTo('#build-and-learn');
  assertPinnedPhase(t, 1);
  assert.equal(Number(t.steps[1].style['--approach-opacity']), 1);
  const count = t.scrolls.length;
  t.navigateTo('#bank-case');
  assert.equal(t.scrolls.length, count, 'Links to other sections must keep native navigation');
  assert.equal(t.click(0).prevented, true);
  assert.equal(t.context.location.hash, '#go-and-see');
  assertPinnedPhase(t, 0);
  for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
    const before = t.scrolls.length;
    assert.equal(t.click(0, { [modifier]: true }).prevented, false);
    assert.equal(t.scrolls.length, before, 'Modified anchor clicks retain browser behaviour');
  }
});

test('next-phase links provide a keyboard route through all copy and focus the incoming heading', async () => {
  const t = await setup();
  for (let phase = 1; phase <= 2; phase++) {
    assertPinnedPhase(t, phase - 1);
    assert.equal(t.click(phase - 1, {}, t.nextLinks).prevented, true);
    assertPinnedPhase(t, phase);
    assert.equal(t.context.document.activeElement, t.headings[phase]);
    assert.equal(t.headings[phase].getAttribute('tabindex'), '-1', 'Programmatic heading focus must not create an extra tab stop');
    assert.equal(Number(t.steps[phase].style['--approach-opacity']), 1, 'The focused incoming copy must be fully visible');
    assert.equal(t.nextLinks[phase - 1].getAttribute('aria-current'), null, 'Only numbered phase markers announce current status');
  }
  assert.deepEqual(t.phases, [0, 1, 2]);
});

test('flow anchors and pages without an approach section retain native behaviour', async () => {
  const t = await setup({ reduced: true, hash: '#adapt-and-grow' });
  assert.equal(t.scrolls.length, 0);
  assert.equal(t.click(1).prevented, false);
  t.navigateTo('#build-and-learn');
  assert.equal(t.scrolls.length, 0);
  const absent = await setup({ present: false });
  absent.update();
  assert.deepEqual(absent.phases, []);
  assert.equal(absent.events.size, 0, 'Unrelated pages install no approach listeners');
  assert.equal(absent.observed.length, 0);
});
