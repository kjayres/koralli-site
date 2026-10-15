// Progressive enhancement: the full drawing is the default without JavaScript.
// Web Animations pause outside the viewport; there is no continuous frame loop.
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const contrast=matchMedia('(forced-colors: active)');

for(const figure of document.querySelectorAll('[data-work-foundation]')) {
  if(motion.matches || contrast.matches || !('IntersectionObserver' in window) || typeof Element.prototype.animate!=='function') continue;
  const paths=[...figure.querySelectorAll('[data-foundation-draw]')];
  const animations=[];
  let visible=false, finished=false;
  let observer;

  function finish() {
    if(finished) return;
    finished=true;
    figure.classList.remove('is-drawing');
    figure.dataset.foundationComplete='true';
    animations.forEach(animation=>animation.cancel());
    observer?.disconnect();
    document.removeEventListener('visibilitychange',sync);
    motion.removeEventListener('change',finish);
    contrast.removeEventListener('change',finish);
    removeEventListener('beforeprint',finish);
  }
  function sync() {
    if(finished) return;
    for(const animation of animations) {
      if(visible && !document.hidden) animation.play();
      else animation.pause();
    }
  }

  try {
    figure.classList.add('is-drawing');
    for(const path of paths) {
      const stage=Number(path.dataset.foundationDraw);
      const animation=path.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{
        duration:stage===3?850:700, delay:stage*240, easing:'cubic-bezier(.22,.61,.36,1)',fill:'both',
      });
      animation.pause();
      animations.push(animation);
    }
    observer=new IntersectionObserver(entries=>{
      visible=entries.some(entry=>entry.target===figure && entry.isIntersecting && entry.intersectionRatio>=.12);
      sync();
    },{threshold:[0,.12]});
    observer.observe(figure);
    document.addEventListener('visibilitychange',sync);
    motion.addEventListener('change',finish,{once:true});
    contrast.addEventListener('change',finish,{once:true});
    addEventListener('beforeprint',finish,{once:true});
    Promise.all(animations.map(animation=>animation.finished)).then(finish).catch(()=>{});
  } catch {
    finish();
  }
}
