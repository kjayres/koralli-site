import { fragments, fragmentPose, assemblyDuration } from './art/delivery-assembly.mjs?v=940187d6bc40';

// A short, user-replayable sequence. It holds its complete still indefinitely
// and stops requesting frames when offscreen, hidden, or motion is reduced.
const motion=matchMedia('(prefers-reduced-motion: reduce)');
for(const figure of document.querySelectorAll('[data-delivery]')) {
  const pieces=[...figure.querySelectorAll('[data-delivery-piece]')];
  if(pieces.length!==fragments.length) continue;
  const moving=figure.querySelector('[data-delivery-pieces]'),complete=figure.querySelector('[data-delivery-complete]');
  const floor=figure.querySelector('[data-delivery-floor]'),button=figure.querySelector('[data-delivery-replay]');
  let visible=false,started=false,elapsed=0,frame=0,last=0,finished=motion.matches;
  function draw() {
    moving.style.display=finished?'none':'';
    complete.style.display=finished?'':'none';
    floor.setAttribute('opacity',finished?'0':String(.55*(1-Math.min(1,elapsed/assemblyDuration))));
    if(!finished) pieces.forEach((element,i)=>{
      const pose=fragmentPose(fragments[i],elapsed);
      element.setAttribute('transform',`matrix(${pose.matrix.map(v=>v.toFixed(5)).join(' ')})`);
      element.setAttribute('opacity',pose.opacity.toFixed(3));
    });
    figure.dataset.deliveryState=finished?'complete':'assembling';
    button.hidden=motion.matches;
    button.disabled=!finished;
  }
  function stop(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}
  function schedule(){if(!frame&&started&&visible&&!document.hidden&&!finished&&!motion.matches)frame=requestAnimationFrame(tick);}
  function tick(now){frame=0;if(last)elapsed+=Math.min(.05,(now-last)/1000);last=now;finished=elapsed>=assemblyDuration;draw();schedule();}
  const observer=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.2;
    if(visible&&!started){started=true;draw();}
    if(visible)schedule();else stop();
  },{threshold:.2});
  observer.observe(figure);
  button.addEventListener('click',()=>{if(motion.matches)return;stop();elapsed=0;finished=false;started=true;draw();schedule();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else schedule();});
  motion.addEventListener('change',()=>{stop();finished=true;elapsed=assemblyDuration;draw();});
  figure.classList.add('delivery-ready');
  draw();
  schedule();
}
