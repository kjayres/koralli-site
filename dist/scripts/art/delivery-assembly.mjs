// One continuous image, partitioned along shared edges. Every fragment returns
// to the identity transform, so no approximation of the painting is needed.
export const pictureSize = { width:660, height:435 };
const rows = [
  [[0,0],[165,0],[330,0],[495,0],[660,0]],
  [[0,145],[141,119],[352,169],[476,131],[660,145]],
  [[0,290],[184,312],[307,265],[522,304],[660,290]],
  [[0,435],[165,435],[330,435],[495,435],[660,435]]
];
export const fragments = Array.from({length:12},(_,i)=>{
  const row=Math.floor(i/4), column=i%4;
  const points=[rows[row][column],rows[row][column+1],rows[row+1][column+1],rows[row+1][column]];
  const centre=[0,1].map(axis=>points.reduce((sum,p)=>sum+p[axis],0)/points.length);
  return {points,centre,start:[48+column*182+(row%2?15:-6),480+row*42],angle:[-15,9,-8,13,7,-13,16,-6,-11,5,-14,10][i],delay:((i*5)%12)*.11};
});
export const assemblyDuration=4.2;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>x*x*(3-2*x);
export function fragmentPose(fragment,elapsed,reducedMotion=false) {
  const t=reducedMotion?1:smooth(clamp((elapsed-fragment.delay)/2.85));
  const angle=fragment.angle*(1-t)*Math.PI/180, sx=.8+.2*t, sy=.26+.74*t;
  const a=Math.cos(angle)*sx,b=Math.sin(angle)*sy,c=-Math.sin(angle)*sx,d=Math.cos(angle)*sy;
  const x=fragment.start[0]*(1-t)+fragment.centre[0]*t;
  const y=fragment.start[1]*(1-t)+fragment.centre[1]*t;
  return {matrix:[a,b,c,d,x-a*fragment.centre[0]-c*fragment.centre[1],y-b*fragment.centre[0]-d*fragment.centre[1]],opacity:.68+.32*t,progress:t};
}

export function deliveryArtwork() {
  const clipPaths=fragments.map((fragment,i)=>`<clipPath id="delivery-clip-${i}"><polygon points="${fragment.points.map(p=>p.join(',')).join(' ')}"/></clipPath>`).join('');
  const pieces=fragments.map((fragment,i)=>`<g data-delivery-piece="${i}"><g clip-path="url(#delivery-clip-${i})"><use href="#delivery-painting"/></g><polygon class="delivery-glass-edge" points="${fragment.points.map(p=>p.join(',')).join(' ')}"/></g>`).join('');
  return `<svg viewBox="0 0 900 655" role="img" aria-labelledby="delivery-art-title delivery-art-desc" xmlns="http://www.w3.org/2000/svg">
    <title id="delivery-art-title">La Danse, assembled into one picture</title>
    <desc id="delivery-art-desc">Fragments of Henri Matisse’s five dancers rise from a plane and join within a fine blue frame. The completed painting remains visible.</desc>
    <defs><image id="delivery-painting" href="./assets/images/matisse-dance-1910.jpg" width="660" height="435" preserveAspectRatio="xMidYMid meet"/>${clipPaths}</defs>
    <g class="delivery-floor" data-delivery-floor opacity="0"><path d="M65 495 719 483 864 626 148 639Z"/><path d="M105 567 794 557 M284 491 377 635 M503 487 620 630" opacity=".35"/></g>
    <g transform="translate(120 38)"><rect class="delivery-frame" x="-7" y="-7" width="674" height="449"/><g data-delivery-complete><use href="#delivery-painting"/></g><g data-delivery-pieces style="display:none">${pieces}</g></g>
  </svg>`;
}
