// The scene's wiring in src/scripts/site.js, as it was before archiving. The last block replaced
// a thesis-only version; restore it in place of that.

let redesignersStage = null;
let renderRedesigners = null;
let redesignersVisible = false;
let redesignersTime = 0;


// ----

  if (redesignersVisible && renderRedesigners && !motion.matches) {
    redesignersTime += dt;
    renderRedesigners(redesignersTime, false);
  }

// ----

  const activeRedesigners = Boolean(redesignersVisible && renderRedesigners);
  if (!frame && !motion.matches && !document.hidden && (activeCanvas || activeThesis || activeRedesigners)) frame = requestAnimationFrame(tick);
// ----

redesignersStage = document.querySelector('[data-redesigners-stage]');

// ----

if (thesisStage || redesignersStage) {
  if (thesisStage) {
    new IntersectionObserver(entries => {
      thesisVisible = entries[0].isIntersecting;
      lastTime = 0;
      if (thesisVisible) updateThesisScroll();
      schedule();
    }).observe(thesisStage);
  }
  if (redesignersStage) {
    new IntersectionObserver(entries => {
      redesignersVisible = entries[0].isIntersecting;
      lastTime = 0;
      if (redesignersVisible && renderRedesigners) renderRedesigners(redesignersTime, motion.matches);
      schedule();
    }).observe(redesignersStage);
  }
  import('./art/thesis-cards.mjs').then(({ initThesisCards, initRedesigners }) => {
    if (thesisStage) {
      renderThesis = initThesisCards(thesisStage);
      updateThesisScroll();
    }
    if (redesignersStage) {
      renderRedesigners = initRedesigners(redesignersStage);
      renderRedesigners(redesignersTime, motion.matches);
    }
    schedule();
  }).catch(error => console.error('Unable to initialise thesis/redesigners artwork:', error));
}