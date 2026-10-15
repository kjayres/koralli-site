import { danceOutlineMarkup } from './dance-outline.mjs?v=c8758a5a6fa6';

// Use the building's exact unrotated projection: x=.9(X-Y), y=.45(X+Y)-Z.
// The completed picture occupies a vertical wall; loose fragments begin flat
// on the ground and lift into that same plane.
export const pictureSize = { width:660, height:435 };
export const pictureProjection = [.9,.45,0,1,220,60];
export const projectPicturePoint = (x,y) => [220+.9*x,60+.45*x+y];
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
  const floorX=(column+.5)*165, floorY=70+row*75;
  return {points,centre,start:[220+.9*(floorX-floorY),495+.45*(floorX+floorY)],angle:[-15,9,-8,13,7,-13,16,-6,-11,5,-14,10][i],delay:((i*5)%12)*.11};
});
export const assemblyDuration=4.2;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>x*x*(3-2*x);
export function fragmentPose(fragment,elapsed,reducedMotion=false) {
  const t=reducedMotion?1:smooth(clamp((elapsed-fragment.delay)/2.85));
  const angle=fragment.angle*(1-t)*Math.PI/180, scale=.65+.35*t;
  const tilt=t*Math.PI/2, ux=.9, uy=.45, vx=-.9*Math.cos(tilt), vy=.45*Math.cos(tilt)+Math.sin(tilt);
  const a=scale*(ux*Math.cos(angle)+vx*Math.sin(angle)),b=scale*(uy*Math.cos(angle)+vy*Math.sin(angle));
  const c=scale*(-ux*Math.sin(angle)+vx*Math.cos(angle)),d=scale*(-uy*Math.sin(angle)+vy*Math.cos(angle));
  const final=projectPicturePoint(...fragment.centre);
  const x=fragment.start[0]*(1-t)+final[0]*t;
  const y=fragment.start[1]*(1-t)+final[1]*t;
  return {matrix:[a,b,c,d,x-a*fragment.centre[0]-c*fragment.centre[1],y-b*fragment.centre[0]-d*fragment.centre[1]],opacity:.68+.32*t,progress:t};
}

export function deliveryArtwork() {
  const clipPaths=fragments.map((fragment,i)=>`<clipPath id="delivery-clip-${i}"><polygon points="${fragment.points.map(p=>p.join(',')).join(' ')}"/></clipPath>`).join('');
  const pieces=fragments.map((fragment,i)=>`<g data-delivery-piece="${i}"><g clip-path="url(#delivery-clip-${i})"><use href="#delivery-painting"/></g><polygon class="delivery-glass-edge" points="${fragment.points.map(p=>p.join(',')).join(' ')}"/></g>`).join('');
  const plane=`matrix(${pictureProjection.join(' ')})`;
  const front=[[-7,-7],[667,-7],[667,442],[-7,442]].map(([x,y])=>projectPicturePoint(x,y));
  const back=front.map(([x,y])=>[x+7.2,y-3.6]);
  const edge=points=>`<polygon class="delivery-frame-depth" points="${points.map(p=>p.join(',')).join(' ')}"/>`;
  return `<svg viewBox="0 0 850 960" role="img" aria-labelledby="delivery-art-title delivery-art-desc" xmlns="http://www.w3.org/2000/svg">
    <title id="delivery-art-title">A line study after La Danse, assembled into one picture</title>
    <desc id="delivery-art-desc">Blue outline fragments of Matisse’s five linked dancers lift from the floor into a wall-mounted frame, viewed from the same isometric angle as the Koralli building.</desc>
    <defs><g id="delivery-painting" class="delivery-dancers">${danceOutlineMarkup()}</g>${clipPaths}</defs>
    <g data-delivery-floor opacity="0"></g>
    <g class="delivery-hanging" transform="${plane}"><path d="M130 -7 330 -48 530 -7"/><circle cx="330" cy="-48" r="2.5"/></g>
    ${edge([back[0],back[1],front[1],front[0]])}${edge([back[1],back[2],front[2],front[1]])}
    <rect class="delivery-frame" transform="${plane}" x="-7" y="-7" width="674" height="449"/>
    <g data-delivery-complete transform="${plane}"><use href="#delivery-painting"/></g><g data-delivery-pieces style="display:none">${pieces}</g>
  </svg>`;
}
