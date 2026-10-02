import { figureDefinitions, figureMarkup } from './figures.mjs?v=4272aaa1c2e4';

// The page can interpolate these colours while descending into deeper water.
const PAPER = 'var(--building-paper, #F3F0E8)';
const BLUE = 'var(--building-line, #244EFF)';
const CORAL = 'var(--building-coral, #FF6655)';
const SHADE = 'var(--building-shade, #E5E8ED)';
const GLASS = 'var(--building-glass, #D7DFEF)';
const SECTION_HEIGHTS = [97, 97, 97, 97];
const SECTION_TIERS = [3, 3, 3, 3];
const ROOF = 378 - SECTION_HEIGHTS.reduce((sum, height) => sum + height, 0);
const sectionBase = index => ROOF + SECTION_HEIGHTS.slice(0, index + 1).reduce((sum, height) => sum + height, 0);

export const buildingPhases = [
  { title: 'Organisation', detail: 'Direction, priorities and decisions that shape the whole organisation.' },
  { title: 'People and work', detail: 'Teams, responsibilities and the way work moves between people and agents.' },
  { title: 'Systems and tools', detail: 'Applications, models and infrastructure that support the work.' },
  { title: 'Data foundations', detail: 'Records, definitions, data quality and the pipelines that connect them.' }
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
  const chair = (x, y, towardsBack = false) => {
    let result = '';
    for (const [dx,dy] of [[2,2],[15,2],[2,14],[15,14]]) result += line(p(x+dx,y+dy),p(x+dx,y+dy,12),'stroke-opacity=".55"');
    result += box(x,y,17,16,2,PAPER,12);
    const back = y + (towardsBack ? 16 : 0);
    return result + polygon([p(x,back,14),p(x+17,back,14),p(x+17,back,29),p(x,back,29)],PAPER,'stroke-opacity=".7"');
  };
  const screen = (x,y,w=26,h=18,z=20) => {
    const a=p(x,y,z), b=p(x+w,y,z), c=p(x+w,y,z+h), d=p(x,y,z+h);
    return polygon([a,b,c,d],PAPER)+polygon([p(x+3,y,z+3),p(x+w-3,y,z+3),p(x+w-3,y,z+h-3),p(x+3,y,z+h-3)],BLUE,'fill-opacity=".055" stroke-opacity=".35"')+line(p(x+w*.5,y,z),p(x+w*.5,y,z-5))+line(p(x+w*.3,y-2,z-5),p(x+w*.7,y+2,z-5));
  };
  const planLine = (coords, extra = '') => `<path d="${coords.map(([x,y,z],i)=>`${i?'L':'M'}${p(x,y,z||0)}`).join(' ')}" fill="none" ${extra}/>`;
  return {p, surface, box, person, desk, chair, screen, planLine};
}

function interior(index, base, angle = 0, lift = 0, figurePrefix = 'koralli-company-building') {
  const {p,surface,box,person,desk,chair,screen,planLine} = room(base - (index === 3 ? 5 : 0), angle, lift, figurePrefix);
  let drawing = surface(0,0,220,220,0,PAPER);
  drawing += polygon([p(0,220),p(220,220),p(220,220,-5),p(0,220,-5)],SHADE);
  drawing += polygon([p(220,0),p(220,220),p(220,220,-5),p(220,0,-5)],SHADE);
  drawing += surface(12,12,196,196,.2,'none','stroke-opacity=".17"');
  drawing += planLine([[18,18,13],[18,18],[202,18],[202,18,13]],'stroke-opacity=".28"');
  drawing += planLine([[18,18],[18,202],[18,202,13]],'stroke-opacity=".28"');
  const paper = (x,y,w=19,d=14,z=21,colour=PAPER) => surface(x,y,w,d,z,colour,'stroke-width=".8"');
  const check = (x,y,z,size=1) => planLine([[x,y,z],[x+3*size,y,z-3*size],[x+10*size,y,z+6*size]],`stroke="${CORAL}" stroke-width="1.6"`);

  if (index === 0) {
    // A leadership discussion, with alternatives and one agreed priority.
    drawing += screen(37,31,132,62,8);
    for (let option=0;option<3;option++) {
      const x=47+option*39;
      drawing += polygon([p(x,31,23),p(x+28,31,23),p(x+28,31,55),p(x,31,55)],
        option===1?CORAL:PAPER,`fill-opacity="${option===1?'.10':'1'}" stroke-opacity="${option===1?'1':'.45'}"`);
      drawing += planLine([[x+5,31,46],[x+22,31,46]],'stroke-opacity=".5"');
      drawing += planLine([[x+5,31,39],[x+18,31,39]],'stroke-opacity=".35"');
      if(option===1) drawing += check(x+8,31,31,.85);
    }
    drawing += chair(82,82)+chair(137,82);
    drawing += person(60,77,'woman','explaining');
    drawing += person(174,90,'man');
    drawing += desk(57,103,120,61);
    drawing += paper(69,117,25,17)+paper(104,130,24,17)+paper(138,115,25,17);
    drawing += surface(109,134,14,3,21.2,CORAL,'stroke="none" fill-opacity=".55"');
    drawing += chair(119,175,true);
    drawing += person(103,192,'woman');
  } else if (index === 1) {
    // Two work areas meet at a human decision, rather than a row of machines.
    drawing += planLine([[73,77,1],[111,77,1],[111,135,1],[156,135,1]],'stroke-opacity=".42" stroke-dasharray="3 3"');
    drawing += planLine([[151,131,1],[156,135,1],[150,139,1]],'stroke-opacity=".65"');
    drawing += desk(36,45,61,39);
    drawing += screen(44,56,29,22);
    drawing += paper(76,59,13,16);
    drawing += chair(77,94,true);
    drawing += person(56,111,'man');
    drawing += desk(112,101,64,43);
    drawing += paper(121,113,23,17)+paper(149,119,17,13);
    drawing += planLine([[126,117,21.5],[139,117,21.5]],`stroke="${CORAL}" stroke-width="1.4"`);
    drawing += chair(139,153,true);
    drawing += person(107,169,'woman','explaining');
    drawing += person(178,166,'robot');
    drawing += screen(147,34,44,38,4);
    drawing += planLine([[153,34,31],[170,34,31]],'stroke-opacity=".5"');
    drawing += check(154,34,20,.9);
  } else if (index === 2) {
    // Infrastructure, applications and a console share one visible connection.
    for (const [x,y] of [[37,34],[37,96]]) {
      drawing += box(x,y,39,36,52);
      for(let slot=0;slot<5;slot++) {
        drawing += line(p(x+6,y+36,9+slot*8),p(x+32,y+36,9+slot*8),'stroke-opacity=".65"');
        const [px,py]=p(x+10,y+36,12+slot*8);
        drawing += `<circle cx="${px}" cy="${py}" r="1.15" fill="${BLUE}" stroke="none"/>`;
      }
    }
    drawing += planLine([[55,148,1],[108,148,1],[108,123,1],[158,123,1]],'stroke-opacity=".5"');
    drawing += desk(119,86,76,46);
    drawing += screen(126,98,28,25)+screen(161,98,28,25);
    drawing += planLine([[132,98,36],[132,98,26],[147,98,26]],'stroke-opacity=".55"');
    drawing += planLine([[166,98,27],[172,98,33],[179,98,30],[184,98,39]],'stroke-width="1.35"');
    drawing += chair(151,145,true);
    drawing += person(139,169,'woman');
    drawing += person(188,160,'man','explaining');
  } else {
    // Differently structured source records are checked against a shared ledger.
    drawing += desk(34,63,152,92);
    for (const [x,y,offset] of [[46,76,0],[46,105,3],[46,132,-2]]) {
      drawing += paper(x-2,y-2,27,18,21)+paper(x,y,27,18,23);
      drawing += planLine([[x+5,y+6,23.5],[x+20+offset,y+6,23.5]],'stroke-opacity=".6"');
      drawing += planLine([[x+5,y+11,23.5],[x+14,y+11,23.5]],'stroke-opacity=".4"');
      drawing += planLine([[x+29,y+9,21.5],[92,y+9,21.5],[105,109,21.5]],'stroke-opacity=".4"');
    }
    drawing += paper(108,79,63,61,23);
    drawing += surface(109,80,61,10,23.4,CORAL,'stroke="none" fill-opacity=".16"');
    for(let row=1;row<6;row++) drawing += planLine([[108,79+row*10,23.5],[171,79+row*10,23.5]],'stroke-opacity=".45" stroke-width=".8"');
    for(let col=1;col<4;col++) drawing += planLine([[108+col*16,79,23.5],[108+col*16,140,23.5]],'stroke-opacity=".4" stroke-width=".8"');
    drawing += paper(89,106,14,19,24);
    drawing += planLine([[92,111,24.5],[95,114,24.5],[101,108,24.5]],`stroke="${CORAL}" stroke-width="1.5"`);
    drawing += chair(70,166,true)+chair(126,166,true);
    drawing += person(42,183,'man');
    drawing += person(160,183,'woman','explaining');
    drawing += box(38,28,21,20,21)+box(68,28,21,20,29)+box(98,28,21,20,24);
    for(const x of [38,68,98]) drawing += polygon([p(x+6,48,7),p(x+15,48,7),p(x+15,48,13),p(x+6,48,13)],PAPER,'stroke-opacity=".55"');
  }
  return `<g data-floor="${index}" data-scene="${['organisation','people-work','systems-tools','data-foundations'][index]}" opacity="0" stroke="${BLUE}" stroke-width="1.05" stroke-linejoin="round" stroke-linecap="round">${drawing}</g>`;
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

    if (index === 3) {
      // Tall shopfronts, a mezzanine and an upper window row fill the equal base block.
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
        glass += rect(start,78,width,13);
        mullions += rule(start+width/2,78,start+width/2,91);
        if(bay) {
          const axis=margin+bay*bayPitch;
          piers += rule(axis-1.8,0,axis-1.8,height)+rule(axis+1.8,0,axis+1.8,height);
          relief += sprout(axis,37,.6)+leaf(axis,59,1.5,3.3);
        }
      }
      piers += rule(0,94,220,94)+rule(0,75,220,75)+rule(0,73,220,73);
      shadow += rule(0,39,220,39)+rule(0,44,220,44);
    } else {
      for(let bay=0;bay<bays*2;bay++) {
        const start=margin+bay*pitch+2.05, mid=start+opening/2;
        if(index===0) {
          const crownOffset=35;
          glass += rect(start,5,opening,22.6,1.1);
          mullions += rule(start,16.3,start+opening,16.3)+rule(mid,5,mid,27.6);
          relief += leaf(mid,32,1.9,2.6);
          glass += arch(start,5+crownOffset,opening,31);
          mullions += rule(start,16+crownOffset,start+opening,16+crownOffset)+rule(mid,5+crownOffset,mid,29+crownOffset);
          // The arched last office tier, oculi and spreading tree capitals are distinctive.
          glass += oval(mid,47.5+crownOffset,opening*.36);
          relief += oval(mid,47.5+crownOffset,opening*.47);
          relief += sprout(start-2.05,42+crownOffset,.76);
          relief += leaf(mid,58+crownOffset,2,2.8);
        } else {
          for(let tier=0;tier<SECTION_TIERS[index];tier++) {
            const bottom=5+tier*(height/SECTION_TIERS[index]);
            glass += rect(start,bottom,opening,22.6,1.1);
            mullions += rule(start,bottom+11.3,start+opening,bottom+11.3)+rule(mid,bottom,mid,bottom+22.6);
            relief += leaf(mid,bottom+24.7,1.9,2.6);
          }
        }
      }
      for(let pier=0;pier<=bays*2;pier++) {
        const axis=margin+pier*pitch;
        const top=index===0?73:height;
        // Long aligned pier edges cross conceptual section boundaries without a belt course.
        piers += rule(axis-1.05,0,axis-1.05,top)+rule(axis+1.05,0,axis+1.05,top);
        if(pier%2===0) {
          if(index===0) relief += sprout(axis,67,.72);
          else for(let tier=0;tier<SECTION_TIERS[index];tier++) relief += sprout(axis,8+tier*(height/SECTION_TIERS[index]),.32);
        }
      }
    }
    // The corner and end pilasters remain visually continuous from base to crown.
    piers += rule(3,0,3,height)+rule(217,0,217,height);
    relief += Array.from({length:index===0?3:5},(_,i)=>leaf(5,7+i*(height-14)/(index===0?2:4),1,2.6)).join('');
    drawing += `<g data-facade="${side}"><path d="${glass}" fill="${GLASS}" stroke-opacity=".7" stroke-width=".7"/><path d="${mullions}" fill="none" stroke-opacity=".56" stroke-width=".62"/><path d="${piers}" fill="none" stroke-opacity=".85" stroke-width=".75"/><path d="${shadow}" fill="none" stroke-opacity=".28" stroke-width=".6"/><path d="${relief}" fill="none" stroke-opacity=".43" stroke-width=".55"/>${accent}</g>`;
    if(index===3) {
      const origin=q(110,66), direction=q(side==='left'?111:109,66);
      drawing += `<text transform="matrix(${number(direction[0]-origin[0])} ${number(direction[1]-origin[1])} 0 1 ${origin})" text-anchor="middle" fill="${BLUE}" stroke="none" fill-opacity=".78" font-family="'IBM Plex Mono',monospace" font-size="3.2" letter-spacing=".24">${side==='left'?'GUARANTY':'PRUDENTIAL'}</text>`;
    }
  }

  if(index===0) {
    // One complete level roof sits over all four walls.
    const outer=[[-5,-5],[225,-5],[225,225],[-5,225]];
    const roofZ=height+5;
    drawing += polygon([p(-5,225,roofZ),p(225,225,roofZ),p(220,220,height-3),p(0,220,height-3)],PAPER,'stroke-opacity=".75"');
    drawing += polygon([p(225,-5,roofZ),p(225,225,roofZ),p(220,220,height-3),p(220,0,height-3)],SHADE,'stroke-opacity=".75"');
    drawing += polygon(plane(outer,roofZ),PAPER,'data-roof-plane="" stroke-width="1.1"');
    drawing += line(p(-5,225,roofZ-2),p(225,225,roofZ-2),'stroke-opacity=".46" stroke-width=".6"');
    drawing += line(p(225,-5,roofZ-2),p(225,225,roofZ-2),'stroke-opacity=".46" stroke-width=".6"');
    drawing += polygon(plane([[8,8],[206,8],[206,206],[8,206]],roofZ+.2),'none','stroke-opacity=".17" stroke-width=".7"');
  } else {
    // Roof faces are concealed when assembled and become the next cutaway's floor.
    drawing += polygon(plane([[0,0],[220,0],[220,220],[0,220]],height),PAPER,'stroke-opacity=".2" stroke-width=".7"');
    drawing += polygon(plane([[12,12],[208,12],[208,208],[12,208]],height+.1),'none','stroke-opacity=".15" stroke-width=".6"');
  }
  const storeys=['10-12','7-9','4-6','1-3'][index];
  return `<g data-cover="${index}" data-section-height="${height}" data-architectural-storeys="${storeys}" stroke="${BLUE}" stroke-width="1" stroke-linejoin="round" stroke-linecap="round">${drawing}</g>`;
}

export function buildingMarkup(id='koralli-company-building') {
  const safeId=String(id).replace(/[^a-zA-Z0-9_-]/g,'') || 'koralli-company-building';
  let layers='';
  for(let index=3;index>=0;index--) {
    const base=sectionBase(index);
    layers+=interior(index,base,0,0,safeId)+cover(index,base);
  }
  return `<svg class="company-building" data-figure-prefix="${safeId}" xmlns="http://www.w3.org/2000/svg" viewBox="0 -160 700 860" role="img" aria-labelledby="${safeId}-title ${safeId}-desc"><title id="${safeId}-title">Inside an organisation, in a miniature inspired by Sullivan's Guaranty Building</title><desc id="${safeId}-desc">An interpretation of the Guaranty Building with twelve exterior tiers in four equal-height sections beneath a complete flat roof. The rooms show a leadership discussion, people and an agent handing work between teams, connected infrastructure and tools, and source records checked into a shared table. Scrolling lifts each exterior section to reveal its interior.</desc>${figureDefinitions(safeId)}<g data-building-world="">${layers}</g><g data-building-scale="" fill="none" stroke="${BLUE}" stroke-width=".8" stroke-opacity=".35"><path d="M104 238 V570 M99 238 h10 M99 570 h10"/>${[0,1,2,3].map(i=>`<path d="M101 ${258+i*88} h6"/>`).join('')}</g><text x="350" y="654" text-anchor="middle" fill="${BLUE}" fill-opacity=".62" font-family="'IBM Plex Mono', monospace" font-size="9" letter-spacing="2.2">ONE ORGANISATION / FOUR LEVELS</text></svg>`;
}

const clamp=x=>Math.min(1,Math.max(0,x));
const smooth=(from,to,x)=>{ const v=clamp((x-from)/(to-from)); return v*v*(3-2*v); };
const cache = new WeakMap();
function parts(svg) {
  if (!cache.has(svg)) cache.set(svg, {
    covers: [...svg.querySelectorAll('[data-cover]')].sort((a,b) => +a.dataset.cover - +b.dataset.cover),
    floors: [...svg.querySelectorAll('[data-floor]')].sort((a,b) => +a.dataset.floor - +b.dataset.floor),
    world: svg.querySelector('[data-building-world]'),
    geometryKeys: Array(8).fill(null),
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
  const slot = index + (kind === 'floor' ? 4 : 0);
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
  const phase = Math.min(3, Math.floor(p * 4));
  const local = p === 1 ? 1 : p * 4 - phase;
  const state = parts(svg);
  state.world?.setAttribute('transform', `translate(0 ${number(reducedMotion ? -54 : -108 * p)})`);
  for (let index = 0; index < 4; index++) {
    const now = clamp(p * 4 - index);
    const next = clamp(p * 4 - index - 1);
    const currentPose = reducedMotion ? {angle: 0, lift: 0, opacity: index <= phase ? 0 : 1} : pose(now);
    const followingPose = reducedMotion ? {angle: 0, lift: 0, opacity: 1} : pose(next);
    setGeometry(state, 'cover', index, currentPose.angle, currentPose.lift);
    setGeometry(state, 'floor', index, followingPose.angle, followingPose.lift);
    state.covers[index]?.setAttribute('opacity', String(currentPose.opacity));
    const floorOpacity = reducedMotion ? (index === phase ? 1 : 0) : smooth(.03, .23, now) * (index === 3 ? 1 : followingPose.opacity);
    state.floors[index]?.setAttribute('opacity', String(floorOpacity));
  }
  svg.dataset.activeFloor = String(phase);
  const textOpacity = reducedMotion ? 1 : smooth(.06, .25, local) * (phase === 3 ? 1 : 1 - smooth(.84, 1, local));
  return {phase, localProgress: local, textOpacity};
}
