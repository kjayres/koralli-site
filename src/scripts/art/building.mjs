import { humanParts } from './building-people.mjs';

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
  { title: 'Direction and offering', detail: 'What the organisation offers, who it serves and where it chooses to focus.' },
  { title: 'People and work', detail: 'Who does the work, how teams coordinate and who is responsible for decisions.' },
  { title: 'Systems and tools', detail: 'The applications and infrastructure people use to do the work.' },
  { title: 'Data foundations', detail: 'The records, definitions and checks that make information dependable.' }
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

// Interior dimensions are in the same world coordinates as the preserved shell.
// A standing person is 45 units tall; desks are 20 and low storage is 26.
function room(base, angle = 0, lift = 0) {
  const p = (x, y, z = 0) => project(x, y, z, base, angle, lift);
  const surface = (x, y, w, d, z = 0, fill = PAPER, extra = '') => polygon([p(x,y,z),p(x+w,y,z),p(x+w,y+d,z),p(x,y+d,z)],fill,extra);
  const panel = (x,y,z,w,h,fill=PAPER,extra='') => polygon([p(x,y,z),p(x+w,y,z),p(x+w,y,z+h),p(x,y,z+h)],fill,extra);
  const box = (x,y,w,d,h,colour=PAPER,baseZ=0) => (
    polygon([p(x+w,y,baseZ),p(x+w,y+d,baseZ),p(x+w,y+d,h+baseZ),p(x+w,y,h+baseZ)],SHADE) +
    panel(x,y+d,baseZ,w,h,colour) + surface(x,y,w,d,h+baseZ,colour)
  );
  const planLine = (coords,extra='') => `<path d="${coords.map(([x,y,z],i)=>`${i?'L':'M'}${p(x,y,z||0)}`).join(' ')}" fill="none" ${extra}/>`;
  const desk = (x,y,w,d) => {
    let result='';
    for (const [dx,dy] of [[3,3],[w-5,3],[3,d-5],[w-5,d-5]]) result+=box(x+dx,y+dy,2,2,18);
    return result+box(x,y,w,d,2,PAPER,18);
  };
  const chair = (x,y) => {
    let result='';
    for (const [dx,dy] of [[1.5,1.5],[12.5,1.5],[1.5,12.5],[12.5,12.5]]) result+=line(p(x+dx,y+dy),p(x+dx,y+dy,9.5),'stroke-opacity=".6"');
    result+=box(x,y,14,14,1.5,PAPER,9.5);
    return result+panel(x,y+14,11,14,12,PAPER,'stroke-opacity=".65"');
  };
  const screen = (x,y,w=24,h=16) => {
    const centre=x+w/2, z=24;
    return box(centre-4,y-2.5,8,5,.7,PAPER,20)
      + box(centre-.65,y-.65,1.3,1.3,3.3,PAPER,20.7)
      + panel(x,y,z,w,h)
      + panel(x+2,y,z+2,w-4,h-4,BLUE,'fill-opacity=".055" stroke-opacity=".35"');
  };
  const paper = (x,y,w=17,d=12,z=20.35) => surface(x,y,w,d,z,PAPER,'stroke-width=".75"');
  const keyboard = (x,y,w=22) => surface(x,y,w,6,20.35,PAPER,'stroke-opacity=".55"') + line(p(x+3,y+3,20.45),p(x+w-3,y+3,20.45),'stroke-opacity=".35"');
  return {p,surface,panel,box,planLine,desk,chair,screen,paper,keyboard};
}

const interiorCache = new Map();
function interior(index, base, angle = 0, lift = 0, figurePrefix = 'koralli-company-building') {
  const cacheKey = `${index}|${base}|${angle}|${lift}|${figurePrefix}`;
  if (interiorCache.has(cacheKey)) return interiorCache.get(cacheKey);
  const {p,surface,panel,box,planLine,desk,chair,screen,paper,keyboard} = room(base - (index===3?5:0),angle,lift);
  let drawing=surface(0,0,220,220,0,PAPER);
  drawing+=polygon([p(0,220),p(220,220),p(220,220,-5),p(0,220,-5)],SHADE);
  drawing+=polygon([p(220,0),p(220,220),p(220,220,-5),p(220,0,-5)],SHADE);
  drawing+=surface(12,12,196,196,.2,'none','stroke-opacity=".17"');
  drawing+=planLine([[18,18,13],[18,18],[202,18],[202,18,13]],'stroke-opacity=".28"');
  drawing+=planLine([[18,18],[18,202],[18,202,13]],'stroke-opacity=".28"');

  const objects=[], contacts=[];
  const object=(name,x,y,markup)=>objects.push({name,x,y,markup});
  const human=(name,x,y,heading,pose,kind,target)=>{
    for (const part of humanParts({project:p,x,y,heading,pose,kind,target,id:`${figurePrefix}-floor-${index}-${name}`})) {
      const item={...part,name:`${name}-${part.name}`};
      // Only the contact forearm/hand sits above its work surface. Upper arms
      // use viewing depth; each segment masks any nearer part of its own body.
      (part.role==='reach'?contacts:objects).push(item);
    }
  };
  const ruledPaper=(x,y,w=18,d=13,z=20.35,checked=false)=>{
    let result=paper(x,y,w,d,z);
    result+=surface(x+2,y+2,w-4,2,z+.05,CORAL,'stroke="none" fill-opacity=".35"');
    for (const dy of [6,9]) result+=line(p(x+3,y+dy,z+.1),p(x+w-3,y+dy,z+.1),'stroke-width=".65" stroke-opacity=".5"');
    if (checked) result+=planLine([[x+w-8,y+d-5,z+.2],[x+w-6,y+d-3,z+.2],[x+w-2,y+d-8,z+.2]],`stroke="${CORAL}" stroke-width="1.1"`);
    return result;
  };

  if(index===0) {
    // Direction: a group chooses one of three proposals on a supported board.
    let board='';
    for(const x of [63,137]) board+=box(x,42,2,2,24)+line(p(x-4,43),p(x+6,43));
    board+=panel(55,43,24,94,29);
    for(let option=0;option<3;option++) {
      const x=61+option*29, selected=option===2;
      board+=panel(x,43,29,23,19,PAPER,selected?`stroke="${CORAL}" stroke-width="1.35"`:'stroke-opacity=".5"');
      board+=line(p(x+4,43,43),p(x+18,43,43),'stroke-opacity=".5"');
      board+=line(p(x+4,43,39),p(x+14,43,39),'stroke-opacity=".4"');
      if(selected) board+=planLine([[x+7,43,34],[x+10,43,31],[x+17,43,37]],`stroke="${CORAL}" stroke-width="1.5"`);
    }
    object('choices-board',102,43,board);
    human('presenting-choice',153,49,-Math.PI/2,'pointing','woman',[140,43,34]);
    let table=desk(69,103,88,36);
    table+=ruledPaper(83,113,19,15)+ruledPaper(123,112,19,15,20.35,true);
    object('meeting-table',90,121,table);
    object('meeting-seat',92,150,chair(85,143));
    object('meeting-seat',135,150,chair(128,143));
    human('considering-proposal',92,149,Math.PI,'seated','man',[92,134,20.7]);
    human('reviewing-choice',135,149,Math.PI,'seated','woman',[135,134,20.7]);
  } else if(index===1) {
    // People: face-to-face collaboration over one shared brief, not two offices.
    let work=desk(68,93,87,34);
    work+=paper(90,98,42,24);
    work+=surface(93,101,36,3,20.5,CORAL,'stroke="none" fill-opacity=".35"');
    work+=line(p(111,107,20.5),p(111,118,20.5),'stroke-opacity=".45"');
    for(const x of [94,115]) for(const y of [108,113,118]) work+=line(p(x,y,20.5),p(x+12,y,20.5),'stroke-width=".75" stroke-opacity=".5"');
    work+=box(139,102,10,15,1.5,PAPER,20);
    object('shared-worktable',111.5,110,work);
    human('contributing-to-brief',99,86,0,'collaborating','man',[99,100,20.7]);
    human('reviewing-shared-brief',122,134,Math.PI,'collaborating','woman',[122,120,20.7]);
    // A small return desk carries the next piece of work, without another screen.
    let returnDesk=desk(155,45,36,27)+ruledPaper(161,51,22,15);
    object('next-task-desk',173,58,returnDesk);
  } else if(index===2) {
    // Systems: the equipment and its application have different physical users.
    drawing+=planLine([[54,67,.4],[54,83,.4],[112,83,.4],[112,108,.4],[145,108,.4],[145,108,18]],'stroke-opacity=".32"');
    let rack=box(36,35,32,29,47);
    for(let slot=0;slot<4;slot++) {
      const z=7+slot*9;
      rack+=panel(40,64,z,24,6,PAPER,'stroke-opacity=".65"');
      rack+=line(p(44,64,z+3),p(57,64,z+3),'stroke-opacity=".6"');
      const [cx,cy]=p(60,64,z+3);
      rack+=`<circle cx="${cx}" cy="${cy}" r=".9" fill="${BLUE}" stroke="none"/>`;
    }
    object('equipment-rack',52,49.5,rack);
    human('checking-equipment',62,76,Math.PI,'pointing','man',[60,64,33]);
    let console=desk(117,94,70,34)+screen(123,103,24,16)+screen(154,103,24,16);
    console+=panel(126,103,33,18,4,PAPER,'stroke-opacity=".5"');
    console+=line(p(126,103,29),p(140,103,29),'stroke-opacity=".45"');
    console+=planLine([[158,103,28],[162,103,31],[168,103,29],[174,103,35]],`stroke="${CORAL}" stroke-width="1.1"`);
    console+=keyboard(137,117,29);
    object('application-console',152,111,console);
    object('operator-chair',151,139,chair(144,132));
    human('using-applications',151,138,Math.PI,'seated','woman',[151,122,20.7]);
  } else {
    // Data: low open shelves of source records, and two records checked together.
    // No screen or tall cabinet: its horizontal silhouette differs from Systems.
    // Build each bay from the back towards its nearer upright. The middle
    // shelf is beneath the upper records, and the side supports occlude the
    // records behind them rather than being painted over by those records.
    let shelves=panel(34,37,3,86,22,PAPER,'stroke-opacity=".55"')+box(34,37,86,24,3);
    shelves+=box(34,37,2,24,22,PAPER,3);
    for(const [left,right,files] of [[36,75,[40,49,58]],[77,118,[81,90,99,108]]]) {
      for(const z of [3,14.5]) {
        if(z===14.5) shelves+=box(left,37,right-left,24,1.5,PAPER,13);
        for(const x of files) {
          shelves+=box(x,42,6,17,8.5,PAPER,z);
          shelves+=panel(x+1,59,z+5,4,2,CORAL,'stroke="none" fill-opacity=".35"');
        }
      }
      shelves+=box(right,37,2,24,22,PAPER,3);
    }
    shelves+=box(34,37,86,24,1.5,PAPER,25);
    object('open-records-shelf',77,49,shelves);
    human('selecting-source-record',93,71,Math.PI,'pointing','man',[91,60,22]);
    let checkDesk=desk(121,110,66,36);
    checkDesk+=ruledPaper(128,118,21,22)+ruledPaper(154,118,21,22,20.35,true);
    checkDesk+=line(p(150,121,20.6),p(150,136,20.6),'stroke-opacity=".25"');
    object('record-comparison-table',154,128,checkDesk);
    human('comparing-records',163,153,Math.PI,'collaborating','woman',[163,139,20.7]);
  }
  objects.sort((a,b)=>(a.depth??.45*(a.x+a.y))-(b.depth??.45*(b.x+b.y)));
  for(const {name,markup} of [...objects,...contacts]) drawing+=`<g data-room-object="${name}">${markup}</g>`;
  const result = `<g data-floor="${index}" data-scene="${['direction-offering','people-work','systems-tools','data-foundations'][index]}" opacity="0" stroke="${BLUE}" stroke-width="1.05" stroke-linejoin="round" stroke-linecap="round">${drawing}</g>`;
  if (interiorCache.size >= 256) interiorCache.delete(interiorCache.keys().next().value);
  interiorCache.set(cacheKey, result);
  return result;
}

const coverCache = new Map();
function cover(index, base, angle = 0, lift = 0) {
  const cacheKey = `${index}|${base}|${angle}|${lift}`;
  if (coverCache.has(cacheKey)) return coverCache.get(cacheKey);
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
  const result = `<g data-cover="${index}" data-section-height="${height}" data-architectural-storeys="${storeys}" stroke="${BLUE}" stroke-width="1" stroke-linejoin="round" stroke-linecap="round">${drawing}</g>`;
  if (coverCache.size >= 256) coverCache.delete(coverCache.keys().next().value);
  coverCache.set(cacheKey, result);
  return result;
}

export function buildingMarkup(id='koralli-company-building') {
  const safeId=String(id).replace(/[^a-zA-Z0-9_-]/g,'') || 'koralli-company-building';
  let layers='';
  for(let index=3;index>=0;index--) {
    const base=sectionBase(index);
    layers+=interior(index,base,0,0,safeId)+cover(index,base);
  }
  return `<svg class="company-building" data-figure-prefix="${safeId}" xmlns="http://www.w3.org/2000/svg" viewBox="0 -160 700 860" role="img" aria-labelledby="${safeId}-title ${safeId}-desc"><title id="${safeId}-title">Inside an organisation, in a miniature inspired by Sullivan's Guaranty Building</title><desc id="${safeId}-desc">An interpretation of the Guaranty Building with twelve exterior tiers in four equal-height sections beneath a complete flat roof. The four rooms show people choosing between proposals, collaborating over a shared brief, using applications and infrastructure, and comparing source records beside low open shelves. Scrolling lifts each exterior section to reveal its interior.</desc><g data-building-world="">${layers}</g><g data-building-scale="" fill="none" stroke="${BLUE}" stroke-width=".8" stroke-opacity=".35"><path d="M104 238 V570 M99 238 h10 M99 570 h10"/>${[0,1,2,3].map(i=>`<path d="M101 ${258+i*88} h6"/>`).join('')}</g><text x="350" y="654" text-anchor="middle" fill="${BLUE}" fill-opacity=".62" font-family="'IBM Plex Mono', monospace" font-size="9" letter-spacing="2.2">ONE ORGANISATION / FOUR LEVELS</text></svg>`;
}

const clamp=x=>Math.min(1,Math.max(0,x));
const smooth=(from,to,x)=>{ const v=clamp((x-from)/(to-from)); return v*v*(3-2*v); };
const cache = new WeakMap();
const shapeValueCache = new Map();
const SHAPE_TAG_RE = /<(polygon|path|circle|text)\b[^>]*/g;

function extractShapeValues(markup) {
  const values = [];
  for (const [tag, kind] of markup.matchAll(SHAPE_TAG_RE)) {
    if (kind === 'path') values.push(['d', /\bd="([^"]*)"/.exec(tag)?.[1] || '']);
    else if (kind === 'polygon') values.push(['points', /\bpoints="([^"]*)"/.exec(tag)?.[1] || '']);
    else if (kind === 'circle') values.push(['circle', /\bcx="([^"]*)"/.exec(tag)?.[1] || '', /\bcy="([^"]*)"/.exec(tag)?.[1] || '']);
    else if (kind === 'text') values.push(['transform', /\btransform="([^"]*)"/.exec(tag)?.[1] || '']);
  }
  return values;
}

function parts(svg) {
  if (!cache.has(svg)) {
    const covers = [...svg.querySelectorAll('[data-cover]')].sort((a,b) => +a.dataset.cover - +b.dataset.cover);
    const floors = [...svg.querySelectorAll('[data-floor]')].sort((a,b) => +a.dataset.floor - +b.dataset.floor);
    cache.set(svg, {
      covers,
      floors,
      world: svg.querySelector('[data-building-world]'),
      geometryKeys: [...covers, ...floors].map(node => node?.innerHTML ? '0' : null),
      shapes: Array(8).fill(null),
      figurePrefix: svg.dataset.figurePrefix || 'koralli-company-building'
    });
  }
  return cache.get(svg);
}

function pose(local) {
  return {
    // First rise evenly; turning begins once almost all upward travel is complete.
    lift: 94 * smooth(.02, .36, local),
    angle: number(24 * smooth(.38, .88, local)),
    opacity: 1 - smooth(.52, .94, local)
  };
}

function setGeometry(state, kind, index, angle, lift) {
  const node = state[kind === 'cover' ? 'covers' : 'floors'][index];
  if (!node) return;
  const slot = index + (kind === 'floor' ? 4 : 0);
  const key = String(angle);
  if (state.geometryKeys[slot] !== key) {
    const base = sectionBase(index);
    const markup = kind === 'cover' ? cover(index, base, angle, 0) : interior(index, base, angle, 0, state.figurePrefix);
    if (kind === 'cover' && typeof node.querySelectorAll === 'function') {
      const shapes = state.shapes[slot] ||= [...node.querySelectorAll('polygon, path, circle, text')];
      const valKey = `${kind}|${index}|${angle}`;
      let values = shapeValueCache.get(valKey);
      if (!values) {
        values = extractShapeValues(markup);
        if (shapeValueCache.size >= 256) shapeValueCache.delete(shapeValueCache.keys().next().value);
        shapeValueCache.set(valKey, values);
      }
      if (shapes.length === values.length) {
        for (let i = 0; i < shapes.length; i++) {
          const entry = values[i];
          shapes[i].setAttribute(entry[0], entry[1]);
        }
      } else {
        node.innerHTML = markup.slice(markup.indexOf('>') + 1, markup.lastIndexOf('</g>'));
        state.shapes[slot] = null;
      }
    } else {
      node.innerHTML = markup.slice(markup.indexOf('>') + 1, markup.lastIndexOf('</g>'));
    }
    state.geometryKeys[slot] = key;
  }
  if (lift) node.setAttribute('transform', `translate(0 ${number(-lift)})`);
  else node.removeAttribute('transform');
  node.setAttribute('data-world-lift', String(number(lift)));
  node.setAttribute('data-world-turn', String(number(angle)));
}

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
    const coverNode = state.covers[index];
    const floorNode = state.floors[index];
    const floorOpacity = reducedMotion ? (index === phase ? 1 : 0) : smooth(.03, .23, now) * (index === 3 ? 1 : followingPose.opacity);
    if (currentPose.opacity > 0 || !coverNode?.innerHTML) setGeometry(state, 'cover', index, currentPose.angle, currentPose.lift);
    if (floorOpacity > 0 || !floorNode?.innerHTML) setGeometry(state, 'floor', index, followingPose.angle, followingPose.lift);
    if (coverNode) {
      coverNode.setAttribute('opacity', String(currentPose.opacity));
      if (coverNode.style) coverNode.style.display = currentPose.opacity === 0 ? 'none' : '';
    }
    if (floorNode) {
      floorNode.setAttribute('opacity', String(floorOpacity));
      if (floorNode.style) floorNode.style.display = floorOpacity === 0 ? 'none' : '';
    }
  }
  svg.dataset.activeFloor = String(phase);
  const textOpacity = reducedMotion ? 1 : smooth(.06, .25, local) * (phase === 3 ? 1 : 1 - smooth(.84, 1, local));
  return {phase, localProgress: local, textOpacity};
}
