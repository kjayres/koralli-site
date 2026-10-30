const clamp = value => Math.min(1, Math.max(0, value));

export function depthGaugeState({ scroll, maxScroll, buildingTop, enhanced, width, reduced, dark }) {
  const progress = clamp(scroll / Math.max(1, maxScroll));
  return {
    hidden: !enhanced || buildingTop > 0 || width < 760 || reduced,
    marker: `translate3d(0,${(progress * 104).toFixed(2)}px,0)`,
    label: `−${String(Math.round(progress * 120)).padStart(3, '0')} M`,
    color: dark ? '#F3F0E8' : '#111111'
  };
}

export function initDepthGauge(root, { building, motion, darkAt }) {
  const marker = root.querySelector('b');
  const value = root.querySelector('[data-depth-value]');
  const update = () => {
    const state = depthGaugeState({
      scroll: scrollY,
      maxScroll: document.documentElement.scrollHeight - innerHeight,
      buildingTop: building?.getBoundingClientRect().top ?? Infinity,
      enhanced: Boolean(building?.classList.contains('building-enhanced')),
      width: innerWidth,
      reduced: motion.matches,
      dark: darkAt(innerHeight / 2)
    });
    root.hidden = state.hidden;
    if (marker) marker.style.transform = state.marker;
    if (value && value.textContent !== state.label) value.textContent = state.label;
    if (root.style.color !== state.color) root.style.color = state.color;
  };
  // Enhancement and late content can change document height without a user scroll.
  const observer = new ResizeObserver(update);
  observer.observe(document.body);
  update();
  return update;
}
