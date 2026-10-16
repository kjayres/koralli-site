import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../src/scripts/approach-view.mjs', import.meta.url), 'utf8');

// Model native sticky geometry independently of the controller: the page and its
// descendants stop moving during the shell's hold, while window.scrollY advances.
// Browser review remains responsible for CSS sizing and real focus-scroll behaviour.
function element(id = '') {
  const classes = new Set(), attributes = new Map(), events = new Map();
  return {
    id, dataset: {}, inert: false, parentElement: null, scrollMarginTop: 0,
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
    contains(target) {
      for (let node = target; node; node = node.parentElement) if (node === this) return true;
      return false;
    },
    events,
  };
}

async function setup({ reduced = false, width = 1440, height = 805, panelHeight = 608, hash = '', present = true, withShell = true, pendingFonts = false, flowStepHeight = () => 650 } = {}) {
  const events = new Map(), observed = [], resizers = [], phases = [], scrolls = [], history = [];
  const shell = element(), page = element('main'), section = element(), track = element(), stage = element();
  const figure = element(), frame = element(), heading = element('approach-title'), continuation = element();
  const hero = element('work-title'), heroEdge = element(), bank = element('bank-case'), bankLink = element('bank-reading');
  const outside = element('outside');
  const ids = ['go-and-see', 'build-and-learn', 'adapt-and-grow'];
  const copies = ids.map(() => element()), headings = ids.map(id => element(`${id}-heading`));
  const steps = ids.map((id, index) => ({ ...element(id), querySelector: selector => selector === '.approach-copy' ? copies[index] : selector === 'h3' ? headings[index] : null }));
  const anchor = (hash, parent) => Object.assign(element(), { hash, parentElement: parent });
  const links = ids.map((id, index) => Object.assign(anchor(`#${id}`, steps[index]), { dataset: { approachLink: String(index) } }));
  links.forEach(link => link.classList.add('approach-number'));
  const nextLinks = ids.slice(1).map((id, index) => Object.assign(anchor(`#${id}`, steps[index]), { dataset: { approachLink: String(index + 1) } }));
  nextLinks.forEach(link => link.classList.add('approach-next'));
  const bankAnchor = anchor('#bank-case', hero), heroAnchor = anchor('#work-title', bank);
  const mainAnchor = anchor('#main', outside), outsideAnchor = anchor('#outside', stage);
  const missingAnchor = anchor('#missing', stage), malformedAnchor = anchor('#%broken', stage);
  continuation.hash = '#bank-case';
  page.parentElement = shell;
  section.parentElement = page;
  track.parentElement = section;
  stage.parentElement = track;
  figure.parentElement = stage;
  frame.parentElement = figure;
  heading.parentElement = stage;
  continuation.parentElement = stage;
  [hero, heroEdge, bank].forEach(node => { node.parentElement = page; });
  bankLink.parentElement = bank;
  steps.forEach((step, index) => {
    step.parentElement = stage;
    copies[index].parentElement = step;
    headings[index].parentElement = step;
  });
  let measuredHeight = panelHeight, stageOffset = 1100;
  const pageStart = 100;
  const flowStepSize = () => flowStepHeight(context.innerHeight);
  const stageSize = () => section.classList.contains('approach-enhanced') ? measuredHeight : flowStepSize() * 3 + 250;
  const pageSize = () => stageOffset + stageSize() + 1400;
  const motion = { matches: reduced, addEventListener: (name, callback) => events.set(`motion:${name}`, callback) };
  const allAnchors = [...links, ...nextLinks, continuation, bankAnchor, heroAnchor, mainAnchor, outsideAnchor, missingAnchor, malformedAnchor];
  const targets = new Map([page, hero, heading, bank, bankLink, outside, ...steps].map(node => [node.id, node]));
  let resolveFonts;
  const fonts = pendingFonts ? { ready: new Promise(resolve => { resolveFonts = resolve; }) } : undefined;
  const context = vm.createContext({
    document: {
      activeElement: null,
      fonts,
      querySelector: selector => !present ? null : ({ '[data-approach]': section, '[data-approach-page]': page, '[data-approach-shell]': withShell ? shell : null })[selector] ?? null,
      querySelectorAll: selector => selector === 'a[href^="#"]' ? allAnchors : [],
      getElementById: id => targets.get(id) ?? null,
    },
    innerWidth: width, innerHeight: height, scrollY: 0,
    location: { hash },
    history: Object.fromEntries(['replaceState', 'pushState'].map(method => [method, (_state, _title, value) => { history.push({ method, hash: value }); context.location.hash = value; }])),
    getComputedStyle: node => ({ scrollMarginTop: `${node.scrollMarginTop}px` }),
    matchMedia: () => motion,
    addEventListener: (name, callback) => events.set(name, callback),
    scrollTo(options) { scrolls.push(options); context.scrollY = Math.max(0, options.top); },
    ResizeObserver: class {
      constructor(callback) { resizers.push(callback); }
      observe(target) { observed.push(target); }
    },
  });
  const rect = (top, height) => ({ top, height, bottom: top + height });
  const pageTop = () => {
    const natural = pageStart - context.scrollY;
    if (!shell.classList.contains('approach-page-pinned')) return natural;
    const inset = Number.parseFloat(shell.style['--approach-page-top']);
    const bottomLimit = pageStart + Number.parseFloat(shell.style.height) - pageSize() - context.scrollY;
    return Math.min(Math.max(natural, inset), bottomLimit);
  };
  shell.getBoundingClientRect = () => rect(pageStart - context.scrollY, Number.parseFloat(shell.style.height) || pageSize());
  page.getBoundingClientRect = () => rect(pageTop(), pageSize());
  stage.getBoundingClientRect = () => rect(pageTop() + stageOffset, stageSize());
  track.getBoundingClientRect = () => stage.getBoundingClientRect();
  figure.getBoundingClientRect = () => rect(pageTop() + stageOffset + 53, 512);
  frame.getBoundingClientRect = () => rect(figure.getBoundingClientRect().top, 420);
  heading.getBoundingClientRect = () => rect(stage.getBoundingClientRect().top, 45);
  continuation.getBoundingClientRect = () => rect(stage.getBoundingClientRect().bottom - 34, 16);
  hero.getBoundingClientRect = () => rect(pageTop() + 180, 100);
  hero.scrollMarginTop = 16;
  heroEdge.getBoundingClientRect = () => rect(pageTop() + stageOffset - 48, 16);
  bank.getBoundingClientRect = () => rect(pageTop() + stageOffset + stageSize() + 24, 600);
  bank.scrollMarginTop = 24;
  bankLink.getBoundingClientRect = () => rect(bank.getBoundingClientRect().top + 550, 20);
  bankLink.scrollMarginTop = 24;
  outside.getBoundingClientRect = () => rect(-context.scrollY, 20);
  steps.forEach((step, index) => {
    step.getBoundingClientRect = () => rect(pageTop() + stageOffset + (section.classList.contains('approach-enhanced') ? 190 : index * flowStepSize()), 250);
    copies[index].getBoundingClientRect = () => step.getBoundingClientRect();
    headings[index].getBoundingClientRect = () => rect(step.getBoundingClientRect().top, 44);
  });
  const focus = (node, options) => {
    context.document.activeElement = node;
    if (page.contains(node)) page.events.get('focusin')?.({ target: node });
  };
  [...targets.values(), heroEdge, continuation, ...headings].forEach(node => { node.focus = options => focus(node, options); });
  headings.forEach((node, index) => {
    node.focus = options => {
      assert.equal(steps[index].inert, false, 'A heading must be accessible before focus');
      assert.equal(options?.preventScroll, true, 'Heading focus must not add another scroll');
      focus(node, options);
    };
  });
  const nodes = {
    '[data-approach-scroll]': track, '[data-approach-stage]': stage, '[data-approach-figure]': figure,
    '.approach-heading': heading, '.approach-continuation': continuation,
  };
  section.querySelector = selector => nodes[selector] ?? null;
  section.querySelectorAll = selector => selector === '[data-approach-step]' ? steps : selector === '[data-approach-link]' ? [links[0], nextLinks[0], links[1], nextLinks[1], links[2]] : [];
  figure.querySelector = selector => selector === '.approach-frame' ? frame : null;
  const module = new vm.SourceTextModule(source, { context });
  await module.link(() => {});
  await module.evaluate();
  const update = module.namespace.initApproach(phase => phases.push(phase));
  const travel = () => Number.parseFloat(shell.style.height) - pageSize();
  const pinStart = () => pageStart + stageOffset - Number.parseFloat(section.style['--approach-pin-top']);
  return {
    shell, page, section, track, stage, figure, frame, heading, continuation, hero, heroEdge, bank, bankLink,
    bankAnchor, heroAnchor, mainAnchor, outsideAnchor, missingAnchor, malformedAnchor,
    copies, headings, steps, links, nextLinks, motion, context, events, observed, phases, scrolls, history, update, travel, pinStart,
    scrollToPosition(position) {
      assert.ok(travel() > 0, 'This helper requires the outer shell runway');
      context.scrollY = pinStart() + travel() * position;
      update();
    },
    resize({ width: nextWidth = context.innerWidth, height: nextHeight = context.innerHeight, panelHeight: nextPanelHeight = measuredHeight, offset: nextOffset = stageOffset, beforeEvent } = {}) {
      context.innerWidth = nextWidth; context.innerHeight = nextHeight;
      measuredHeight = nextPanelHeight; stageOffset = nextOffset;
      beforeEvent?.();
      events.get('resize')();
    },
    changeMotion(reduce) { motion.matches = reduce; events.get('motion:change')(); },
    changeContent({ offset = stageOffset, panelHeight = measuredHeight } = {}) { stageOffset = offset; measuredHeight = panelHeight; },
    notifyContentResize() { resizers.forEach(callback => callback()); },
    async finishFonts() { resolveFonts?.(); await Promise.resolve(); },
    navigateTo(hash, event = 'hashchange') { context.location.hash = hash; events.get(event)(); },
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
  assert.equal(t.track.style.height, undefined, 'The approach must never contain a scroll spacer');
  assert.equal(t.shell.style.height, undefined, 'Fallbacks must remove the outer runway');
  assert.equal(t.shell.style['--approach-page-top'], undefined);
  assert.equal(t.shell.classList.contains('approach-page-pinned'), false);
  assert.ok(t.steps.every(step => !step.inert && step.getAttribute('aria-hidden') === null), 'Every phase remains available in fallback mode');
}

test('the pinned frame contains the title, particle scene and working case link', async () => {
  const html = await fs.readFile(new URL('../src/our-work.html', import.meta.url), 'utf8');
  const ancestors = [], framed = [], neighbours = [], ids = new Set();
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  for (const [, closing, name, attributes] of html.matchAll(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    if (closing) { ancestors.pop(); continue; }
    const id = attributes.match(/\bid="([^"]+)"/)?.[1];
    if (id) {
      assert.ok(!ids.has(id), `The real page must not duplicate #${id}`);
      ids.add(id);
    }
    if (/\bclass="[^"]*(?:work-opening|case-section)/.test(attributes) && name === 'section') {
      assert.ok(ancestors.some(parent => /\bdata-approach-page\b/.test(parent)), 'Actual neighbours must share the sticky page');
      assert.ok(ancestors.some(parent => /\bdata-approach-shell\b/.test(parent)), 'The page must live within the outer runway');
      neighbours.push(id || 'opening');
    }
    if (/\bid="approach-title"|\bdata-art="approach"|\bclass="[^"]*approach-continuation/.test(attributes)) {
      assert.ok(ancestors.some(parent => /\bdata-approach-stage\b/.test(parent)), 'The heading, shared scene and following boundary must move as one frame');
      framed.push(name);
      if (name === 'a') assert.match(attributes, /\bhref="#bank-case"/, 'The bottom cue must lead to the actual case study');
    }
    if (!voidTags.has(name.toLowerCase()) && !attributes.endsWith('/')) ancestors.push(attributes);
  }
  assert.deepEqual(framed, ['h2', 'canvas', 'a']);
  assert.equal(neighbours.length, 2, 'One real opening and bank section must share the page');
});

test('the outer runway holds real neighbours and the stage together without an inner spacer', async () => {
  const t = await setup();
  assert.equal(t.travel(), 805 * 2.85, 'The complete original scroll travel is retained');
  assert.equal(t.track.style.height, undefined, 'No blank runway belongs between neighbouring sections');
  const nodes = [t.heroEdge, t.stage, t.frame, t.bank];
  const held = [];
  for (const progress of [0, .2, .5, .8, 1]) {
    t.scrollToPosition(progress);
    const tops = nodes.map(node => node.getBoundingClientRect().top);
    if (!held.length) held.push(...tops);
    else tops.forEach((top, index) => assert.ok(Math.abs(top - held[index]) < 1e-8, 'All real content remains fixed while scrollY advances'));
    assert.ok(t.heroEdge.getBoundingClientRect().top >= 0 && t.heroEdge.getBoundingClientRect().bottom < t.stage.getBoundingClientRect().top);
    assert.ok(t.bank.getBoundingClientRect().top > t.stage.getBoundingClientRect().bottom && t.bank.getBoundingClientRect().top < t.context.innerHeight);
  }
  assert.equal(Number(t.section.dataset.phase), 2, 'Phases must advance even though stage.getBoundingClientRect() is frozen');
  for (const [progress, displacement] of [[-1 / t.travel(), 1], [1 + 1 / t.travel(), -1]]) {
    t.scrollToPosition(progress);
    nodes.forEach((node, index) => assert.ok(Math.abs(node.getBoundingClientRect().top - held[index] - displacement) < 1e-8, 'Entry and release must join ordinary flow continuously'));
  }
  assert.equal(t.scrolls.length, 0, 'Ordinary scrolling must not be trapped or corrected');
});

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

test('fades develop over a generous scroll interval while the reading position remains fixed', async () => {
  const t = await setup();
  const pinTop = t.section.style['--approach-pin-top'];
  const travel = t.travel();
  assert.ok(travel >= t.context.innerHeight * 2.7, 'Each phase needs close to a viewport of ordinary scrolling');
  const fading = [0, 0, 0];
  for (let sample = 0; sample <= 600; sample++) {
    t.scrollToPosition(sample / 600);
    const phase = Number(t.section.dataset.phase);
    const opacity = Number(t.steps[phase].style['--approach-opacity']);
    if (opacity > .02 && opacity < .98) fading[phase]++;
    assert.equal(t.section.style['--approach-pin-top'], pinTop, 'Cycling copy must not move the shared reading position');
  }
  assert.ok(fading[0] >= 42 && fading[2] >= 42, 'An entering or leaving fade must span at least a fifth of a phase');
  assert.ok(fading[1] >= 84, 'The middle phase must have equally gradual entry and exit');
  assert.equal(t.scrolls.length, 0, 'Ordinary scrolling must never be intercepted or corrected programmatically');
  const bottomOfStage = Number.parseFloat(pinTop) + t.stage.getBoundingClientRect().height;
  assert.ok(bottomOfStage <= t.context.innerHeight - Number.parseFloat(pinTop), 'The complete content-sized frame must fit inside the viewport');
  assert.equal(t.section.style['--approach-exit-space'], undefined);
});

test('layout notifications keep the selected scene stable and observe content rather than the spacer', async () => {
  const t = await setup();
  t.scrollToPosition(.5);
  const selected = [...t.phases], spacer = t.shell.style.height;
  for (let i = 0; i < 8; i++) { t.notifyContentResize(); t.resize(); t.update(); }
  assertPinnedPhase(t, 1);
  assert.deepEqual(t.phases, selected, 'Repeated measurement must not restart the current phase');
  assert.equal(t.shell.style.height, spacer);
  assert.equal(t.track.style.height, undefined);
  assert.deepEqual(t.observed, [...t.copies, t.frame, t.heading, t.continuation, t.page], 'Actual page content should trigger remeasurement, not the outer runway');
});

test('viewport and page-content changes preserve held progress without moving readers outside the hold', async () => {
  const t = await setup();
  const progress = .53;
  t.scrollToPosition(progress);
  const opacity = t.steps[1].style['--approach-opacity'], phases = [...t.phases];
  t.resize({ height: 950, panelHeight: 650, offset: 1260 });
  assert.ok(Math.abs((t.context.scrollY - t.pinStart()) / t.travel() - progress) < 1e-12);
  assertPinnedPhase(t, 1);
  assert.equal(t.steps[1].style['--approach-opacity'], opacity);
  assert.deepEqual(t.phases, phases, 'Remeasurement must not restart the current particle phase');
  assert.equal(t.stage.getBoundingClientRect().top, Number.parseFloat(t.section.style['--approach-pin-top']));
  assert.equal(t.scrolls.length, 1, 'One correction preserves the held progress');
  t.notifyContentResize();
  assert.equal(t.scrolls.length, 1, 'Stable measurements do not repeatedly correct scroll position');
  for (const position of [-.2, 1.2]) {
    t.scrollToPosition(position);
    const before = t.context.scrollY, count = t.scrolls.length;
    t.resize({ offset: 1300 + position * 10 });
    assert.equal(t.context.scrollY, before, 'Normal page reading outside the hold must not jump on resize');
    assert.equal(t.scrolls.length, count);
  }
});

test('late fonts must not replay an initial fragment after the reader has scrolled elsewhere', async () => {
  const untouched = await setup({ hash: '#bank-case', pendingFonts: true });
  untouched.changeContent({ offset: 1260 });
  await untouched.finishFonts();
  assert.equal(untouched.bank.getBoundingClientRect().top, 24, 'An untouched initial fragment should still be corrected after font reflow');

  const t = await setup({ hash: '#go-and-see', pendingFonts: true });
  t.scrollToPosition(.53);
  const position = t.context.scrollY, count = t.scrolls.length;
  await t.finishFonts();
  assertPinnedPhase(t, 1);
  assert.equal(t.context.scrollY, position, 'Font readiness must preserve the reader\'s current position');
  assert.equal(t.scrolls.length, count, 'An unchanged layout must not replay the initial deep link');
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

test('changing between pinned and ordinary flow preserves the phase being read', async () => {
  const pinned = await setup();
  pinned.scrollToPosition(.8);
  assertPinnedPhase(pinned, 2);
  pinned.resize({ height: 450 });
  assertFlow(pinned);
  assert.equal(pinned.section.dataset.phase, '2', 'Shrinking the viewport must not replace the phase the reader was viewing');
  const exitHeading = pinned.headings[2].getBoundingClientRect();
  assert.ok(exitHeading.top >= 0 && exitHeading.bottom <= pinned.context.innerHeight, 'The previously active heading must remain visible in ordinary flow');

  const flowing = await setup({ height: 450 });
  flowing.context.scrollY = 1850;
  flowing.update();
  assert.equal(flowing.section.dataset.phase, '1');
  flowing.resize({ height: 900 });
  assertPinnedPhase(flowing, 1);
  assert.equal(Number(flowing.steps[1].style['--approach-opacity']), 1, 'Entering the hold must show the corresponding phase fully, not land in a fade');
  const entryHeading = flowing.headings[1].getBoundingClientRect();
  assert.ok(entryHeading.top >= 0 && entryHeading.bottom <= flowing.context.innerHeight);
});

test('viewport-driven flow spacing may reflow before resize without losing the reading phase', async () => {
  const t = await setup({ width: 1512, height: 805, flowStepHeight: viewport => viewport * .65 });
  t.scrollToPosition(.8);
  assertPinnedPhase(t, 2);
  t.resize({ height: 450 });
  assertFlow(t);
  assert.equal(t.section.dataset.phase, '2');
  const visibleTop = t.headings[2].getBoundingClientRect().top;
  assert.ok(visibleTop >= 0 && t.headings[2].getBoundingClientRect().bottom <= 450);
  const phases = [...t.phases];
  t.resize({ height: 805, beforeEvent() {
    // The two preceding 65svh rows grow before the resize listener runs.
    const shifted = t.headings[2].getBoundingClientRect().top;
    assert.ok(shifted - visibleTop > 450 && shifted > 450, 'The fixture must reproduce the CSS-first offscreen shift');
    t.update(); // A scroll/animation callback can arrive before remeasurement.
    assert.equal(t.section.dataset.phase, '2', 'Unmeasured viewport geometry must not replace the cached reading phase');
  } });
  assertPinnedPhase(t, 2);
  assert.equal(Number(t.steps[2].style['--approach-opacity']), 1, 'Returning to the hold must restore readable Adapt & Grow');
  assert.deepEqual(t.phases, phases, 'Resize must not briefly restart a different particle phase');
  const heading = t.headings[2].getBoundingClientRect();
  assert.ok(heading.top >= 0 && heading.bottom <= t.context.innerHeight);
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
  assert.equal(initial.section.dataset.phase, '2', 'Reduced motion must retain the section currently being read');
  assert.ok(initial.headings[2].getBoundingClientRect().top >= 0 && initial.headings[2].getBoundingClientRect().bottom <= initial.context.innerHeight);
  initial.update();
  assertFlow(initial);
  initial.changeMotion(false);
  assertPinnedPhase(initial, 2);
  assert.equal(Number(initial.steps[2].style['--approach-opacity']), 1);
});

test('fragment navigation lands on readable copy, including initial deep links', async () => {
  const t = await setup({ hash: '#adapt-and-grow' });
  assertPinnedPhase(t, 2);
  assert.equal(Number(t.steps[2].style['--approach-opacity']), 1);
  t.navigateTo('#build-and-learn');
  assertPinnedPhase(t, 1);
  assert.equal(Number(t.steps[1].style['--approach-opacity']), 1);
  t.navigateTo('#bank-case');
  assert.equal(t.bank.getBoundingClientRect().top, 24, 'The actual downstream bank target must reach its scroll margin');
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

test('real hero and bank anchors map before or after the hold, including direct URLs and history', async () => {
  for (const hash of ['#bank-case', '#bank%2Dcase']) {
    const direct = await setup({ hash });
    assert.equal(direct.bank.getBoundingClientRect().top, 24);
    assert.ok(direct.context.scrollY > direct.pinStart() + direct.travel(), 'Bank navigation must leave the complete held interval behind');
  }
  const t = await setup();
  t.scrollToPosition(.5);
  assert.equal(t.click(0, {}, [t.bankAnchor]).prevented, true);
  assert.equal(t.context.document.activeElement, t.bank);
  assert.equal(t.bank.getBoundingClientRect().top, 24);
  assert.equal(t.history.at(-1).method, 'pushState');
  assert.equal(t.click(0, {}, [t.heroAnchor]).prevented, true);
  assert.equal(t.hero.getBoundingClientRect().top, 16);
  assert.ok(t.context.scrollY < t.pinStart());
  assert.equal(t.context.document.activeElement, t.hero);
  t.navigateTo('#bank-case', 'popstate');
  assert.equal(t.bank.getBoundingClientRect().top, 24, 'History navigation must restore downstream content as well as phase hashes');
  t.navigateTo('#work-title', 'popstate');
  assert.equal(t.hero.getBoundingClientRect().top, 16);
  t.click(0, {}, [t.mainAnchor]);
  assert.equal(t.page.getBoundingClientRect().top, 0, 'The skip-to-main target must remain reachable');
  for (const target of [t.bankAnchor, t.heroAnchor]) {
    for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
      const count = t.scrolls.length;
      assert.equal(t.click(0, { [modifier]: true }, [target]).prevented, false);
      assert.equal(t.scrolls.length, count);
    }
  }
  for (const target of [t.outsideAnchor, t.missingAnchor, t.malformedAnchor]) {
    const count = t.scrolls.length;
    assert.equal(t.click(0, {}, [target]).prevented, false);
    t.navigateTo(target.hash);
    assert.equal(t.scrolls.length, count, 'Unrelated or invalid fragments retain native behaviour');
  }
});

test('keyboard focus can escape to real offscreen neighbours without disturbing visible content', async () => {
  const t = await setup();
  t.scrollToPosition(.5);
  const count = t.scrolls.length;
  t.heroEdge.focus();
  assert.equal(t.scrolls.length, count, 'A visible neighbouring control must not skip the story');
  t.headings[1].focus({ preventScroll: true });
  assert.equal(t.scrolls.length, count, 'Focus within the active phase must preserve progress');
  assert.ok(t.bankLink.getBoundingClientRect().top > t.context.innerHeight);
  t.bankLink.focus();
  assert.equal(t.context.document.activeElement, t.bankLink);
  assert.equal(t.bankLink.getBoundingClientRect().top, 24, 'Tabbing below the scene must clear the runway and reveal its target');
  assert.ok(t.context.scrollY > t.pinStart() + t.travel());
  t.scrollToPosition(.5);
  assert.ok(t.hero.getBoundingClientRect().bottom < 0);
  t.hero.focus();
  assert.equal(t.hero.getBoundingClientRect().top, 16, 'Shift-Tab to earlier content must escape before the hold');
  assert.ok(t.context.scrollY < t.pinStart());
});

test('flow anchors and pages without an approach section retain native behaviour', async () => {
  const t = await setup({ reduced: true, hash: '#adapt-and-grow' });
  assert.equal(t.scrolls.length, 0);
  assert.equal(t.click(1).prevented, false);
  t.navigateTo('#build-and-learn');
  assert.equal(t.scrolls.length, 0);
  assert.equal(t.click(0, {}, [t.bankAnchor]).prevented, false);
  t.navigateTo('#bank-case');
  assert.equal(t.scrolls.length, 0);
  const missingShell = await setup({ withShell: false });
  assertFlow(missingShell);
  const absent = await setup({ present: false });
  absent.update();
  assert.deepEqual(absent.phases, []);
  assert.equal(absent.events.size, 0, 'Unrelated pages install no approach listeners');
  assert.equal(absent.observed.length, 0);
});
