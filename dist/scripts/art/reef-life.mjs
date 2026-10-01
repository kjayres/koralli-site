// Original Koralli fish geometry and travelling body wave, kept in two dimensions.
const fishPts = [[.5,0],[.33,-.12],[.12,-.16],[0,-.3],[-.16,-.12],[-.34,-.02],[-.5,-.17],[-.5,.14],[-.12,.14],[.06,.27],[.3,.11],[.38,-.04]];
const fishEdges = [[0,1],[1,2],[2,4],[4,5],[5,6],[6,7],[7,5],[8,5],[8,10],[10,0],[2,3],[3,4],[2,8],[4,8],[8,9],[9,10],[1,10]];
const fish = [
  {x:.16,y:.17,size:31,dir:1,sp:.32,ph:1.2,ws:.095},
  {x:.45,y:.34,size:24,dir:-1,sp:.26,ph:3.1,ws:.12},
  {x:.70,y:.23,size:39,dir:1,sp:.43,ph:2.4,ws:.084},
  {x:.87,y:.47,size:28,dir:-1,sp:.36,ph:5.2,ws:.11},
];
const colour = 'rgba(243,240,232,0.5)';
const wrap = (value, length) => ((value % length) + length) % length;

function fishPoints(f, x, y, size, time) {
  return fishPts.map(p => {
    const wig = Math.sin(time * f.ws + f.ph + p[0] * 4) * (.5 - p[0]) * .16;
    return [x + f.dir * p[0] * size, y + (p[1] + wig) * size];
  });
}

export function reefFishMarkup(width, height, compact = false) {
  return fish.map(f => {
    const points = fishPoints(f, f.x * width, f.y * height, f.size * (compact ? 1.5 : 1), 0);
    const lines = fishEdges.map(([a,b]) => `M${points[a].join(' ')} L${points[b].join(' ')}`).join(' ');
    const nodes = points.map(([x,y],i) => `<circle cx="${x}" cy="${y}" r="${i === 11 ? 1.9 : 1.5}"/>`).join('');
    return `<g fill="#F3F0E8" opacity=".5"><path d="${lines}" fill="none" stroke="#F3F0E8" stroke-width="1"/>${nodes}</g>`;
  }).join('');
}

export function drawReefFish(ctx, width, height, seconds) {
  const time = Math.max(0, Number(seconds) || 0) * 60;
  ctx.clearRect(0,0,width,height);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 1;
  for (const f of fish) {
    const x = wrap(f.x * width + 90 + f.dir * f.sp * time, width + 180) - 90;
    const points = fishPoints(f,x,f.y * height,f.size,time);
    ctx.beginPath();
    for (const [a,b] of fishEdges) { ctx.moveTo(...points[a]); ctx.lineTo(...points[b]); }
    ctx.stroke();
    for (let i=0;i<points.length;i++) {
      ctx.beginPath();ctx.arc(...points[i],i === 11 ? 1.9 : 1.5,0,6.3);ctx.fill();
    }
  }
}

export function initReefLife() {
  const reef = document.querySelector('.flat-reef-section');
  const canvas = reef?.querySelector('[data-reef-fish]');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let width=0,height=0,visible=false,time=0,last=0,frame=0;
  const draw = () => {
    drawReefFish(ctx,width,height,motion.matches ? 0 : time);
    reef.dataset.reefReady='true';
  };
  const tick = now => {
    frame=0;
    time+=last ? Math.min(.05,(now-last)/1000) : 0;
    last=now;
    draw();
    schedule();
  };
  const schedule = () => {
    if (visible && !motion.matches && !document.hidden) {
      if (!frame) frame=requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frame);frame=0;last=0;
    }
  };
  const resize = () => {
    const rect=canvas.parentElement.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    width=rect.width;height=rect.height;
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    draw();
  };
  new ResizeObserver(resize).observe(canvas.parentElement);
  new IntersectionObserver(entries => { visible=entries[0].isIntersecting;schedule(); }).observe(reef);
  motion.addEventListener('change',() => { draw();schedule(); });
  document.addEventListener('visibilitychange',schedule);
  resize();
}
