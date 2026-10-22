// From src/scripts/site.js. The gauge shares the page's scroll handler with the building
// artwork: `building`, `buildingProgress`, `clamp` and `scrollFrame` all live in site.js.

const gauge = document.querySelector('.depth-gauge');
const gaugeMarker = gauge?.querySelector('b');
const gaugeValue = gauge?.querySelector('[data-depth-value]');
let maxScrollCache = 0;

// Inside onScroll(event), before the requestAnimationFrame:
if (!event || event.type === 'resize') maxScrollCache = 0;

// Inside the onScroll frame, after the other updates:
const maxScroll = gauge ? (maxScrollCache ||= Math.max(1, document.documentElement.scrollHeight - innerHeight)) : 1;
if (!gauge) return;
gauge.hidden = !building?.classList.contains('building-enhanced') || !rect || rect.top > 0;
const p = clamp(scrollY / maxScroll);
if (gaugeMarker) gaugeMarker.style.transform = `translate3d(0,${(p * 104).toFixed(2)}px,0)`;
const label = `−${String(Math.round(p * 120)).padStart(3, '0')} M`;
if (gaugeValue && gaugeValue.textContent !== label) gaugeValue.textContent = label;
const gaugeColor = rect && (rect.bottom < innerHeight || buildingProgress > .43) ? '#F3F0E8' : '#111111';
if (gauge.style.color !== gaugeColor) gauge.style.color = gaugeColor;

// The page only listens for scroll when something needs it; the gauge was one of those things:
// const tracksScroll = Boolean(building || gauge || journalState || thesisStage || ...);
