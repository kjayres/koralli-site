import { baseLifeMarkup } from './base-life.mjs';
import { figureDefinitions, figureMarkup } from './figures.mjs';

// The page can interpolate these colours while descending into deeper water.
const PAPER = 'var(--building-paper, #F3F0E8)';
const BLUE = 'var(--building-line, #244EFF)';
const CORAL = 'var(--building-coral, #FF6655)';
const SHADE = 'var(--building-shade, #E5E8ED)';
const GLASS = 'var(--building-glass, #D7DFEF)';
const SECTION_HEIGHTS = [62, 82, 82, 82, 80];
const ROOF = 378 - SECTION_HEIGHTS.reduce((sum, height) => sum + height, 0);
const sectionBase = index => ROOF + SECTION_HEIGHTS.slice(0, index + 1).reduce((sum, height) => sum + height, 0);

export const buildingPhases = [
  { title: 'Organisation & strategy', detail: 'Rethink what business you are in, and what AI makes possible.' },
  { title: 'Operating model', detail: 'Rethink how decisions, teams and accountability are organised.' },
  { title: 'Process & product', detail: 'Rethink what is automated, augmented or retired.' },
  { title: 'Systems & models', detail: 'Rethink the stack: data, models, evaluation and controls.' },
  { title: 'Technical & research detail', detail: 'Rethink what is actually possible now, from the research floor.' }
];

const number = n => Number(n.toFixed(2));
/** Rotate only in the horizontal world plane; world-z remains screen-vertical. */
export function projectBuildingPoint(x, y, z = 0, base = 0, angle = 0, lift = 0) {
  const radians = angle * Math.PI / 180;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  const dx = x - 110, dy = y - 110;
  const rx = 110 + dx * cos - dy * sin;
  const ry = 110 + dx * sin + dy * cos;
  return [number(350 + .9 * (rx - ry)), number(base + .45 * (rx + ry) - z - lift)];
}
const project = projectBuildingPoint;
const points = ps => ps.map(p => p.join(',')).join(' ');
const polygon = (ps, fill = PAPER, extra = '') => `<polygon points="${points(ps)}" fill="${fill}" ${extra}/>`;
const line = (a, b, extra = '') => `<path d="M${a} L${b}" fill="none" ${extra}/>`;

function room(base, angle = 0, lift = 0, figurePrefix = 'koralli-company-building') {
  const p = (x, y, z = 0) => project(x, y, z, base, angle, lift);
  const surface = (x, y, w, d, z = 0, fill = PAPER, extra = '') => polygon([p(x,y,z),p(x+w,y,z),p(x+w,y+d,z),p(x,y+d,z)], fill, extra);
  const box = (x, y, w, d, h, colour = PAPER, baseZ = 0) => (
    polygon([p(x+w,y,baseZ),p(x+w,y+d,baseZ),p(x+w,y+d,h+baseZ),p(x+w,y,h+baseZ)], SHADE) +
    polygon([p(x,y+d,baseZ),p(x+w,y+d,baseZ),p(x+w,y+d,h+baseZ),p(x,y+d,h+baseZ)], SHADE) +
    surface(x,y,w,d,h+baseZ,colour)
  );
  const person = (x, y, kind = 'man', pose = 'standing') => {
    const [px, py] = p(x,y);
    return `<g transform="translate(${px} ${py})">${figureMarkup(kind, pose, figurePrefix)}</g>`;
  };
  const desk = (x, y, w = 43, d = 28) => {
    let result = '';
    for (const [dx,dy] of [[3,3],[w-3,3],[3,d-3],[w-3,d-3]]) result += line(p(x+dx,y+dy),p(x+dx,y+dy,18));
    return result + box(x,y,w,d,2,PAPER,18);
  };
  const screen = (x,y,w=26,h=18,z=20) => {
    const a=p(x,y,z), b=p(x+w,y,z), c=p(x+w,y,z+h), d=p(x,y,z+h);
    return polygon([a,b,c,d],PAPER)+polygon([p(x+3,y,z+3),p(x+w-3,y,z+3),p(x+w-3,y,z+h-3),p(x+3,y,z+h-3)],BLUE,'fill-opacity=".055" stroke-opacity=".35"')+line(p(x+w*.5,y,z),p(x+w*.5,y,z-5))+line(p(x+w*.3,y-2,z-5),p(x+w*.7,y+2,z-5));
  };
  const planLine = (coords, extra = '') => `<path d="${coords.map(([x,y,z],i)=>`${i?'L':'M'}${p(x,y,z||0)}`).join(' ')}" fill="none" ${extra}/>`;
  return {p, surface, box, person, desk, screen, planLine};
}

function interior(index, base, angle = 0, lift = 0, figurePrefix = 'koralli-company-building') {
  // Keep the bottom slab inside the facade so plants share one fixed perimeter.
  const {p,surface,box,person,desk,screen,planLine} = room(base - (index === 4 ? 5 : 0), angle, lift, figurePrefix);
  let drawing = surface(0,0,220,220,0,PAPER);
  drawing += polygon([p(0,220),p(220,220),p(220,220,-5),p(0,220,-5)],SHADE);
  drawing += polygon([p(220,0),p(220,220),p(220,220,-5),p(220,0,-5)],SHADE);
  drawing += surface(12,12,196,196,.2,'none','stroke-opacity=".17"');
  drawing += planLine([[18,18,13],[18,18],[202,18],[202,18,13]],'stroke-opacity=".28"');
  drawing += planLine([[18,18],[18,202],[18,202,13]],'stroke-opacity=".28"');

  if (index === 0) {
    // Joint planning around the existing board table.
    drawing += screen(52,35,96,48,6);
    drawing += planLine([[64,35,20],[78,35,26],[93,35,25],[109,35,40],[135,35,42]],'stroke-width="1.5"');
    for (const [x,kind] of [[83,'man'],[121,'woman'],[158,'robot']]) drawing += person(x,78,kind,x===83?'explaining':'standing');
    drawing += desk(60,96,120,65);
    for (const [x,y] of [[73,108],[104,127],[143,114]]) drawing += surface(x,y,18,13,20.8,PAPER,'stroke-opacity=".45"');
    drawing += surface(119,108,17,6,21,CORAL,'stroke="none" fill-opacity=".35"');
    for (const [x,kind] of [[84,'woman'],[122,'man'],[160,'robot']]) drawing += person(x,181,kind,x===160?'explaining':'standing');
  } else if (index === 1) {
    // Three small teams, with shared routes between the desks.
    drawing += planLine([[67,75,1],[105,75,1],[105,139,1],[160,139,1]],'stroke-opacity=".35" stroke-dasharray="3 4"');
    drawing += planLine([[105,110,1],[54,155,1]],'stroke-opacity=".35" stroke-dasharray="3 4"');
    for (const [x,y,backKind,frontKind] of [[49,48,'woman','robot'],[137,111,'robot','man'],[43,145,'man','woman']]) {
      drawing += person(x+19,y-13,backKind);
      drawing += desk(x,y,47,31);
      drawing += screen(x+8,y+10,28,17);
      drawing += person(x+21,y+48,frontKind);
    }
    drawing += screen(135,28,45,26,0);
    drawing += planLine([[143,28,16],[153,28,20],[167,28,15],[176,28,20]],'stroke-opacity=".6"');
  } else if (index === 2) {
    // A work board and three connected work stations.
    drawing += screen(40,31,135,54,0);
    for (let col=0;col<3;col++) {
      drawing += line(p(50+col*40,31,45),p(73+col*40,31,45),'stroke-opacity=".55"');
      for (let row=0;row<2;row++) drawing += polygon([p(50+col*40,31,38-row*16),p(72+col*40,31,38-row*16),p(72+col*40,31,28-row*16),p(50+col*40,31,28-row*16)],col===2&&row===0?CORAL:PAPER,`fill-opacity="${col===2&&row===0?'.12':'1'}" stroke-opacity=".45"`);
    }
    drawing += planLine([[53,142,1],[109,142,1],[109,164,1],[168,164,1]],'stroke-opacity=".55"');
    drawing += person(152,86,'woman','explaining');
    for (const [x,y,kind] of [[35,105,'man'],[99,105,'robot'],[148,147,'woman']]) {
      drawing += desk(x,y,37,28);
      drawing += screen(x+5,y+9,25,16);
      drawing += person(x+13,y+48,kind);
    }
  } else if (index === 3) {
    // Two banks of servers and a human-operated systems console.
    for (const [x,y] of [[42,42],[91,42],[42,102],[91,102]]) {
      drawing += box(x,y,28,30,56);
      for(let slot=0;slot<5;slot++) {
        drawing += line(p(x+4,y+30,10+slot*9),p(x+24,y+30,10+slot*9),'stroke-opacity=".65"');
        const [px,py]=p(x+7,y+30,13+slot*9);
        drawing += `<circle cx="${px}" cy="${py}" r="1" fill="${slot===3?CORAL:BLUE}" stroke="none"/>`;
      }
    }
    drawing += planLine([[65,171,1],[134,171,1],[134,112,1],[171,112,1]],'stroke-opacity=".45"');
    drawing += desk(151,97,43,40);
    drawing += screen(156,106,32,25);
    drawing += person(140,164,'robot','explaining')+person(174,161,'man');
  } else {
    // Research bench, mathematical sketch board, prototype apparatus and researchers.
    drawing += screen(34,28,104,56,0);
    drawing += planLine([[46,28,12],[46,28,45]],'stroke-opacity=".4"');
    drawing += planLine([[46,28,12],[125,28,12]],'stroke-opacity=".4"');
    const curve=[];
    for(let j=0;j<=20;j++) curve.push([49+j*3.5,28,18+22*Math.exp(-Math.pow((j-11)/5,2))]);
    drawing += planLine(curve,'stroke-width="1.5"');
    drawing += person(160,48,'woman','explaining');
    drawing += desk(52,92,134,52);
    drawing += screen(65,105,31,23);
    drawing += box(132,105,28,21,22,PAPER,20);
    drawing += planLine([[146,115,43],[146,115,58],[137,115,63]],'stroke-width="2"');
    drawing += planLine([[131,119,25],[144,119,25],[154,119,33]],'stroke-opacity=".7"');
    drawing += surface(109,120,17,13,21,PAPER,'stroke-opacity=".55"');
    drawing += person(85,168,'man')+person(157,176,'robot');
  }
  return `<g data-floor="${index}" opacity="0" stroke="${BLUE}" stroke-width="1.05" stroke-linejoin="round" stroke-linecap="round">${drawing}</g>`;
}

function cover(index, base, angle = 0, lift = 0) {
  const height = SECTION_HEIGHTS[index];
  const p = (x,y,z=0) => project(x,y,z,base,angle,lift);
  const plane = (xy,z) => xy.map(([x,y])=>p(x,y,z));
  const closedPath = ps => `M${ps.join(' L')} Z `;
  let drawing = polygon([p(220,0),p(220,220),p(220,220,height),p(220,0,height)],SHADE,'stroke-opacity=".38"');
  drawing += polygon([p(0,220),p(220,220),p(220,220,height),p(0,220,height)],PAPER,'stroke-opacity=".38"');

  for (const side of ['left','right']) {
    const bays = side === 'left' ? 7 : 5;
    const q = (s,z,inset=0) => side === 'left' ? p(s,220-inset,z) : p(220-inset,s,z);
    const rect = (s,z,w,h,inset=0) => closedPath([q(s,z,inset),q(s+w,z,inset),q(s+w,z+h,inset),q(s,z+h,inset)]);
    const rule = (s,z,t,v) => `M${q(s,z)} L${q(t,v)} `;
    const arch = (s,z,w,h) => {
      const r=w/2, spring=z+h-r;
      return `M${q(s,z)} L${q(s+w,z)} L${q(s+w,spring)} C${q(s+w,spring+r*.5523)} ${q(s+r*1.5523,spring+r)} ${q(s+r,spring+r)} C${q(s+r*.4477,spring+r)} ${q(s,spring+r*.5523)} ${q(s,spring)} Z `;
    };
    const oval = (s,z,r) => `M${q(s+r,z)} C${q(s+r,z+r*.5523)} ${q(s+r*.5523,z+r)} ${q(s,z+r)} C${q(s-r*.5523,z+r)} ${q(s-r,z+r*.5523)} ${q(s-r,z)} C${q(s-r,z-r*.5523)} ${q(s-r*.5523,z-r)} ${q(s,z-r)} C${q(s+r*.5523,z-r)} ${q(s+r,z-r*.5523)} ${q(s+r,z)} Z `;
    const leaf = (s,z,w=3,h=5) => `M${q(s,z-h)} C${q(s-w,z-h*.5)} ${q(s-w,z+h*.45)} ${q(s,z+h)} C${q(s+w,z+h*.45)} ${q(s+w,z-h*.5)} ${q(s,z-h)} Z `;
    const sprout = (s,z,size=1) => `M${q(s,z-4*size)} C${q(s-1*size,z)} ${q(s+1*size,z+3*size)} ${q(s,z+7*size)} M${q(s,z+1*size)} C${q(s-4*size,z+1*size)} ${q(s-4*size,z+5*size)} ${q(s-6*size,z+5*size)} M${q(s,z+3*size)} C${q(s+4*size,z+3*size)} ${q(s+3*size,z+7*size)} ${q(s+6*size,z+8*size)} `;
    let glass='', mullions='', piers='', relief='', shadow='', accent='';
    const margin=9, span=202, pitch=span/(bays*2), opening=pitch-4.1;

    if (index === 4) {
      // Sullivan's tall shopfronts and smaller mezzanine windows form the base.
      const bayPitch=span/bays, portal=Math.floor(bays/2);
      for(let bay=0;bay<bays;bay++) {
        const start=margin+bay*bayPitch+3.5, width=bayPitch-7;
        if(bay===portal) {
          glass += arch(start,1,width,60);
          mullions += rule(start+width/2,2,start+width/2,43);
          mullions += rule(start,35,start+width,35)+rule(start+2,4,start+width-2,4);
          relief += arch(start-3,0,width+6,65);
          relief += sprout(start-4,59,.52)+sprout(start+width+4,59,.52);
        } else {
          glass += rect(start,5,width,30)+rect(start,48,width,21);
          mullions += rule(start+width/2,5,start+width/2,35)+rule(start+width/2,48,start+width/2,69);
          relief += leaf(start+width/2,41,2.3,3.5);
        }
        if(bay) {
          const axis=margin+bay*bayPitch;
          piers += rule(axis-1.8,0,axis-1.8,height)+rule(axis+1.8,0,axis+1.8,height);
          relief += sprout(axis,37,.6)+leaf(axis,59,1.5,3.3);
        }
      }
      piers += rule(0,76,220,76)+rule(0,73,220,73);
      shadow += rule(0,39,220,39)+rule(0,44,220,44);
    } else {
      for(let bay=0;bay<bays*2;bay++) {
        const start=margin+bay*pitch+2.05, mid=start+opening/2;
        if(index===0) {
          glass += arch(start,5,opening,31);
          mullions += rule(start,16,start+opening,16)+rule(mid,5,mid,29);
          // The arched last office tier, oculi and spreading tree capitals are distinctive.
          glass += oval(mid,47.5,opening*.36);
          relief += oval(mid,47.5,opening*.47);
          relief += sprout(start-2.05,42,.76);
          relief += leaf(mid,58,2,2.8);
        } else {
          for(let tier=0;tier<3;tier++) {
            const bottom=5+tier*(height/3);
            glass += rect(start,bottom,opening,18.6,1.1);
            mullions += rule(start,bottom+9.3,start+opening,bottom+9.3)+rule(mid,bottom,mid,bottom+18.6);
            relief += leaf(mid,bottom+22.6,1.9,2.6);
          }
        }
      }
      for(let pier=0;pier<=bays*2;pier++) {
        const axis=margin+pier*pitch;
        const top=index===0?38:height;
        // Long aligned pier edges cross conceptual section boundaries without a belt course.
        piers += rule(axis-1.05,0,axis-1.05,top)+rule(axis+1.05,0,axis+1.05,top);
        if(pier%2===0) {
          if(index===0) relief += sprout(axis,32,.72);
          else for(let tier=0;tier<3;tier++) relief += sprout(axis,8+tier*(height/3),.32);
        }
      }
    }
    // The corner and end pilasters remain visually continuous from base to crown.
    piers += rule(3,0,3,height)+rule(217,0,217,height);
    relief += Array.from({length:index===0?3:5},(_,i)=>leaf(5,7+i*(height-14)/(index===0?2:4),1,2.6)).join('');
    drawing += `<g data-facade="${side}"><path d="${glass}" fill="${GLASS}" stroke-opacity=".7" stroke-width=".7"/><path d="${mullions}" fill="none" stroke-opacity=".56" stroke-width=".62"/><path d="${piers}" fill="none" stroke-opacity=".85" stroke-width=".75"/><path d="${shadow}" fill="none" stroke-opacity=".28" stroke-width=".6"/><path d="${relief}" fill="none" stroke-opacity=".43" stroke-width=".55"/>${accent}</g>`;
    if(index===4) {
      const origin=q(110,66), direction=q(side==='left'?111:109,66);
      drawing += `<text transform="matrix(${number(direction[0]-origin[0])} ${number(direction[1]-origin[1])} 0 1 ${origin})" text-anchor="middle" fill="${BLUE}" stroke="none" fill-opacity=".78" font-family="'IBM Plex Mono',monospace" font-size="3.2" letter-spacing=".24">${side==='left'?'GUARANTY':'PRUDENTIAL'}</text>`;
    }
  }

  if(index===0) {
    // The roof opens into the original U-shaped light court on the rear side.
    const outer=[[-5,-5],[65,-5],[65,112],[150,112],[150,-5],[225,-5],[225,225],[-5,225]];
    const roofZ=height+5, wellZ=height-27;
    drawing += polygon(plane([[65,0],[150,0],[150,112],[65,112]],wellZ),GLASS,'stroke-opacity=".35"');
    drawing += polygon([p(65,0,wellZ),p(65,112,wellZ),p(65,112,roofZ),p(65,0,roofZ)],SHADE,'stroke-opacity=".5"');
    drawing += polygon([p(65,112,wellZ),p(150,112,wellZ),p(150,112,roofZ),p(65,112,roofZ)],PAPER,'stroke-opacity=".5"');
    drawing += polygon([p(150,0,wellZ),p(150,112,wellZ),p(150,112,roofZ),p(150,0,roofZ)],SHADE,'stroke-opacity=".45"');
    drawing += polygon([p(-5,225,roofZ),p(225,225,roofZ),p(220,220,height-3),p(0,220,height-3)],PAPER,'stroke-opacity=".75"');
    drawing += polygon([p(225,-5,roofZ),p(225,225,roofZ),p(220,220,height-3),p(220,0,height-3)],SHADE,'stroke-opacity=".75"');
    drawing += polygon(plane(outer,roofZ),PAPER,'stroke-width="1.1"');
    drawing += line(p(-5,225,roofZ-2),p(225,225,roofZ-2),'stroke-opacity=".46" stroke-width=".6"');
    drawing += line(p(225,-5,roofZ-2),p(225,225,roofZ-2),'stroke-opacity=".46" stroke-width=".6"');
    drawing += polygon(plane([[8,132],[206,132],[206,206],[8,206]],roofZ+.2),'none','stroke-opacity=".17" stroke-width=".7"');
  } else {
    // Roof faces are concealed when assembled and become the next cutaway's floor.
    drawing += polygon(plane([[0,0],[220,0],[220,220],[0,220]],height),PAPER,'stroke-opacity=".2" stroke-width=".7"');
    drawing += polygon(plane([[12,12],[208,12],[208,208],[12,208]],height+.1),'none','stroke-opacity=".15" stroke-width=".6"');
  }
  const storeys=['12-13','9-11','6-8','3-5','1-2'][index];
  return `<g data-cover="${index}" data-architectural-storeys="${storeys}" stroke="${BLUE}" stroke-width="1" stroke-linejoin="round" stroke-linecap="round">${drawing}</g>`;
}

export function buildingMarkup(id='koralli-company-building') {
  const safeId=String(id).replace(/[^a-zA-Z0-9_-]/g,'') || 'koralli-company-building';
  let layers='';
  for(let index=4;index>=0;index--) {
    const base=sectionBase(index);
    layers+=interior(index,base,0,0,safeId)+cover(index,base);
  }
  return `<svg class="company-building" data-figure-prefix="${safeId}" xmlns="http://www.w3.org/2000/svg" viewBox="0 -160 700 860" role="img" aria-labelledby="${safeId}-title ${safeId}-desc"><title id="${safeId}-title">Inside an organisation, in a miniature of Sullivan's Guaranty Building</title><desc id="${safeId}-desc">Thirteen exterior tiers of the Guaranty Building, interpreted in five conceptual sections. The interiors show coral-coloured people in suits working alongside blue mesh robots. Scrolling lifts each section to reveal executive decisions, teams, work processes, systems and research. Small coral and seaweed sprigs grow around its base.</desc>${figureDefinitions(safeId)}<g data-building-world="">${baseLifeMarkup('back')}${layers}${baseLifeMarkup('front')}</g><g data-building-scale="" fill="none" stroke="${BLUE}" stroke-width=".8" stroke-opacity=".35"><path d="M104 238 V570 M99 238 h10 M99 570 h10"/>${[0,1,2,3,4].map(i=>`<path d="M101 ${258+i*66} h6"/>`).join('')}</g><text x="350" y="654" text-anchor="middle" fill="${BLUE}" fill-opacity=".62" font-family="'IBM Plex Mono', monospace" font-size="9" letter-spacing="2.2">ONE ORGANISATION / FIVE DEPTHS</text></svg>`;
}

const clamp=x=>Math.min(1,Math.max(0,x));
const smooth=(from,to,x)=>{ const v=clamp((x-from)/(to-from)); return v*v*(3-2*v); };
const cache = new WeakMap();
function parts(svg) {
  if (!cache.has(svg)) cache.set(svg, {
    covers: [...svg.querySelectorAll('[data-cover]')].sort((a,b) => +a.dataset.cover - +b.dataset.cover),
    floors: [...svg.querySelectorAll('[data-floor]')].sort((a,b) => +a.dataset.floor - +b.dataset.floor),
    world: svg.querySelector('[data-building-world]'),
    geometryKeys: Array(10).fill(null),
    figurePrefix: svg.dataset.figurePrefix || 'koralli-company-building'
  });
  return cache.get(svg);
}

function pose(local) {
  return {
    // First rise evenly; turning begins once almost all upward travel is complete.
    lift: 94 * smooth(.02, .36, local),
    angle: 24 * smooth(.38, .88, local),
    opacity: 1 - smooth(.52, .94, local)
  };
}

function setGeometry(state, kind, index, angle, lift) {
  const node = state[kind === 'cover' ? 'covers' : 'floors'][index];
  if (!node) return;
  const slot = index + (kind === 'floor' ? 5 : 0);
  const key = `${angle}|${lift}`;
  if (state.geometryKeys[slot] !== key) {
    const base = sectionBase(index);
    const markup = kind === 'cover' ? cover(index, base, angle, lift) : interior(index, base, angle, lift, state.figurePrefix);
    node.innerHTML = markup.slice(markup.indexOf('>') + 1, markup.lastIndexOf('</g>'));
    state.geometryKeys[slot] = key;
  }
  node.removeAttribute('transform');
  node.setAttribute('data-world-lift', String(number(lift)));
  node.setAttribute('data-world-turn', String(number(angle)));
}

/**
 * Scrolling selects a pose, so backwards scrolling exactly restores every point.
 * The geometry is projected again after turning in world XY and lifting in world Z.
 * SVG screen-plane rotation is deliberately never used: walls remain vertical,
 * and all four slab corners share the same upward displacement.
 * Reduced motion presents one stationary cutaway selected by the caller.
 */
export function updateBuilding(svg, progress, reducedMotion = false) {
  const p = clamp(Number.isFinite(progress) ? progress : 0);
  const phase = Math.min(4, Math.floor(p * 5));
  const local = p === 1 ? 1 : p * 5 - phase;
  const state = parts(svg);
  state.world?.setAttribute('transform', `translate(0 ${number(reducedMotion ? -54 : -108 * p)})`);
  for (let index = 0; index < 5; index++) {
    const now = clamp(p * 5 - index);
    const next = clamp(p * 5 - index - 1);
    const currentPose = reducedMotion ? {angle: 0, lift: 0, opacity: index <= phase ? 0 : 1} : pose(now);
    const followingPose = reducedMotion ? {angle: 0, lift: 0, opacity: 1} : pose(next);
    setGeometry(state, 'cover', index, currentPose.angle, currentPose.lift);
    setGeometry(state, 'floor', index, followingPose.angle, followingPose.lift);
    state.covers[index]?.setAttribute('opacity', String(currentPose.opacity));
    const floorOpacity = reducedMotion ? (index === phase ? 1 : 0) : smooth(.03, .23, now) * (index === 4 ? 1 : followingPose.opacity);
    state.floors[index]?.setAttribute('opacity', String(floorOpacity));
  }
  svg.dataset.activeFloor = String(phase);
  const textOpacity = reducedMotion ? 1 : smooth(.06, .25, local) * (phase === 4 ? 1 : 1 - smooth(.84, 1, local));
  return {phase, localProgress: local, textOpacity};
}
