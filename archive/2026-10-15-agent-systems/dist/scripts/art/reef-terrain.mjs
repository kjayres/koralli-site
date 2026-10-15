// One sampled surface supplies both the visible seabed and colony/animal heights.
const cache = new Map();
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// Unequal banks leave the established central sand passage open. Each outcrop
// has a broken outer shoulder, a tilted shelf and an offset raised cap.
const outcrops = [
  [-735, -275, 235, 102, 30, -.21, 1],
  [-395, -82, 195, 112, 33, .34, 2],
  [455, -238, 235, 98, 29, -.37, 3],
  [820, 32, 305, 126, 43, .26, 4],
  [-665, 182, 285, 138, 45, -.18, 5],
  [360, 115, 262, 82, 34, .41, 6],
  [-175, 330, 176, 96, 24, -.42, 7],
].map(([x,y,rx,ry,height,angle,seed]) => ({x,y,rx,ry,height,c:Math.cos(angle),s:Math.sin(angle),seed}));

function rockHeight(x, y) {
  let highest = 0;
  for (const rock of outcrops) {
    const dx = (x - rock.x) / rock.rx, dy = (y - rock.y) / rock.ry;
    if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) continue;
    const u = dx * rock.c - dy * rock.s, v = dx * rock.s + dy * rock.c;
    // Angular shoulders and a diagonal split, rather than identical round humps.
    const rim = Math.max(Math.abs(u) * .88, Math.abs(v) * .92,
      Math.abs(u * .69 + v * .72) * .88, Math.abs(u * .78 - v * .62) * .90);
    const edge = 1 + .065 * Math.sin(u * 5.2 + rock.seed) + .045 * Math.sin(v * 7.4 - rock.seed);
    const shoulder = smooth((edge - rim) / .31);
    const shelf = smooth((.74 + .05 * u - rim) / .12);
    const cap = smooth((.40 - Math.max(Math.abs(u + .19), Math.abs(v - .13) * 1.17)) / .12);
    const split = 1 - .40 * (1 - smooth(Math.abs(v + .27 * u + .12) / .13)) * smooth((rim - .18) / .28);
    const tilt = 1 + .09 * u - .07 * v;
    highest = Math.max(highest, rock.height * (.47 * shoulder + .34 * shelf + .19 * cap) * split * tilt);
  }
  return highest;
}

function profile(x, y, compact) {
  const xx = compact ? x * 3.2 : x, yy = compact ? y / .52 : y;
  const rise = 1 / (1 + Math.exp(-(yy + 110) / 130));
  const mound = (cx, cy, rx, ry) => Math.exp(-(((xx - cx) / rx) ** 2) - ((yy - cy) / ry) ** 2);
  return (compact ? .9 : 1) * (66 + 258 * rise
    + 48 * mound(-690, -130, 390, 205) + 54 * mound(510, 75, 440, 230)
    + 30 * mound(-90, 290, 290, 170) - 32 * mound(-80, -90, 185, 300)
    + 6 * Math.sin(xx * .009 + yy * .012) + 3 * Math.cos(xx * .018 - yy * .023)
    + rockHeight(xx, yy) * (compact ? .55 : 1));
}

function normal(a, b, c) {
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  const x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx,length=Math.hypot(x,y,z);
  return [x/length,y/length,z/length];
}

function rowPosition(t, state) {
  const {near,bankNear,bankFar,far}=state;
  if(t<.13)return near+(bankNear-near)*t/.13;
  if(t<.83)return bankNear+(bankFar-bankNear)*(t-.13)/.70;
  return bankFar+(far-bankFar)*(t-.83)/.17;
}
function rowFraction(y,state) {
  const {near,bankNear,bankFar,far}=state;
  if(y<bankNear)return .13*(y-near)/(bankNear-near);
  if(y<bankFar)return .13+.70*(y-bankNear)/(bankFar-bankNear);
  return .83+.17*(y-bankFar)/(far-bankFar);
}

function terrain(compact) {
  if(cache.has(compact))return cache.get(compact);
  const state={columns:compact?50:78,rows:compact?58:74,span:compact?730:1650,
    near:compact?-980:-2010,far:compact?2700:4600,bankNear:compact?-735:-1400,bankFar:compact?780:1500};
  const {columns,rows,span}=state,vertices=[],sand=[],rocks=[],cells=[],midpoints=new Map();
  for(let row=0;row<=rows;row++) {
    const y=rowPosition(row/rows,state);
    for(let column=0;column<=columns;column++) {
      const x=-span+column/columns*span*2+Math.sin(row*7.1+column*2.3)*9;
      const yy=y+Math.sin(row*2.7+column*5.1)*7;
      vertices.push([x,yy,profile(x,yy/3.1,compact)]);
    }
  }
  const rockAtFace=face=>rockHeight(face.reduce((sum,id)=>sum+vertices[id][0],0)/3*(compact?3.2:1),
    face.reduce((sum,id)=>sum+vertices[id][1],0)/3/3.1/(compact?.52:1));
  const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++) {
    const a=row*(columns+1)+column,b=a+1,c=a+columns+1,d=c+1;
    cells.push([[a,b,d],[a,d,c]]);
    for(const face of cells.at(-1))if(rockAtFace(face)>2) {
      for(let i=0;i<3;i++) {
        const from=face[i],to=face[(i+1)%3],key=edgeKey(from,to);
        if(midpoints.has(key))continue;
        const x=(vertices[from][0]+vertices[to][0])/2,y=(vertices[from][1]+vertices[to][1])/2;
        midpoints.set(key,vertices.length);vertices.push([x,y,profile(x,y/3.1,compact)]);
      }
    }
  }
  // Shared midpoints refine only the shelves. Their immediate neighbours use
  // the same boundary vertices, so refinement never opens a crack in the floor.
  const split=(a,b,c,ab,bc,ca)=>{
    if(ab!==undefined&&bc!==undefined&&ca!==undefined)return [[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]];
    if(ab!==undefined&&bc!==undefined)return [[a,ab,c],[ab,bc,c],[ab,b,bc]];
    if(bc!==undefined&&ca!==undefined)return [[b,bc,a],[bc,ca,a],[bc,c,ca]];
    if(ca!==undefined&&ab!==undefined)return [[c,ca,b],[ca,ab,b],[ca,a,ab]];
    if(ab!==undefined)return [[a,ab,c],[ab,b,c]];
    if(bc!==undefined)return [[b,bc,a],[bc,c,a]];
    if(ca!==undefined)return [[c,ca,b],[ca,a,b]];
    return [[a,b,c]];
  };
  for(let i=0;i<cells.length;i++) {
    cells[i]=cells[i].flatMap(([a,b,c])=>split(a,b,c,midpoints.get(edgeKey(a,b)),midpoints.get(edgeKey(b,c)),midpoints.get(edgeKey(c,a))));
    for(const face of cells[i])(rockAtFace(face)>4?rocks:sand).push(face);
  }
  const mesh=(name,material,faces)=>{
    const indices=new Map(),points=[];
    const localFaces=faces.map(face=>face.map(id=>{
      if(!indices.has(id)){indices.set(id,points.length);points.push(vertices[id]);}
      return indices.get(id);
    }));
    return {name,material,vertices:points,faces:localFaces,nodes:[],normals:faces.map(face=>normal(...face.map(id=>vertices[id])))};
  };
  Object.assign(state,{vertices,cells,meshes:[mesh('Continuous reef floor','terrain',sand),mesh('Broken limestone shelves','rock',rocks)]});
  cache.set(compact,state);
  return state;
}

function triangleHeight(vertices,a,b,c,x,y) {
  const p=vertices[a],q=vertices[b],r=vertices[c];
  const ux=q[0]-p[0],uy=q[1]-p[1],vx=r[0]-p[0],vy=r[1]-p[1];
  const dx=x-p[0],dy=y-p[1],den=ux*vy-uy*vx;
  const u=(dx*vy-dy*vx)/den,v=(ux*dy-uy*dx)/den;
  return u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8?p[2]+u*(q[2]-p[2])+v*(r[2]-p[2]):null;
}

/** Height in habitat coordinates, interpolated from the exact rendered triangles. */
export function reefFloorHeight(x,y,compact=false) {
  const state=terrain(compact),yy=y*3.1,{columns,rows,span,vertices}=state;
  const column=clamp(Math.floor((x+span)/(span*2)*columns),0,columns-1);
  const row=clamp(Math.floor(rowFraction(yy,state)*rows),0,rows-1);
  for(const dr of [0,-1,1])for(const dc of [0,-1,1]) {
    const r=row+dr,c=column+dc;
    if(r<0||r>=rows||c<0||c>=columns)continue;
    for(const [a,b,third] of state.cells[r*columns+c]) {
      const height=triangleHeight(vertices,a,b,third,x,yy);
      if(height!==null)return height;
    }
  }
  return profile(x,y,compact);
}

/** Static geometry is shared; local shelf refinement leaves distant sand coarse. */
export function reefTerrain(compact=false) { return terrain(compact).meshes; }

const random = seed => { const value=Math.sin(seed*91.73+17.19)*41738.31; return value-Math.floor(value); };
const fragmentOutline=[[1,.12],[.81,.43],[.64,.69],[.37,.58],[.17,.87],[-.18,.91],[-.79,.58],[-.98,-.13],
  [-.66,-.51],[-.57,-.74],[-.09,-.85],[.12,-.67],[.46,-.78],[.77,-.49]];
const fragmentSegments=(height,compact)=>height>(compact?10:18)?(compact?40:64):(compact?16:24);

function fragmentBounds(x,y,rx,ry,height,seed,compact) {
  const angle=random(seed+11)*Math.PI,c=Math.cos(angle),s=Math.sin(angle),segments=fragmentSegments(height,compact);
  const low=[Infinity,Infinity,0],high=[-Infinity,-Infinity,0];
  for(let i=0;i<segments;i++) {
    const at=i/segments*fragmentOutline.length,index=Math.floor(at),part=at-index;
    const a=fragmentOutline[index],b=fragmentOutline[(index+1)%fragmentOutline.length];
    const u=(a[0]+(b[0]-a[0])*part)*1.02,v=(a[1]+(b[1]-a[1])*part)*1.02;
    const point=[x+(u*c-v*s)*rx,y*3.1+(u*s+v*c)*ry];
    for(let axis=0;axis<2;axis++){low[axis]=Math.min(low[axis],point[axis]);high[axis]=Math.max(high[axis],point[axis]);}
  }
  return [low,high];
}

function limestoneFragment(x,y,rx,ry,height,seed,compact) {
  const vertices=[],faces=[],segments=fragmentSegments(height,compact),outline=fragmentOutline;
  const angle=random(seed+11)*Math.PI,c=Math.cos(angle),s=Math.sin(angle);
  const ground=reefFloorHeight(x,y,compact);
  const rings=[[.93,0],[1.02,.18],[.99,.43],[.87,.67],[.79,1],[.61,1.015],[.42,1.01],[.21,.995]];
  for(let row=0;row<rings.length;row++)for(let i=0;i<segments;i++) {
    const at=i/segments*outline.length,index=Math.floor(at),part=at-index;
    const a=outline[index],b=outline[(index+1)%outline.length];
    const radius=rings[row][0]*(1+(row>4?.025:0)*(random(seed+row*37+i)-.5));
    const u=(a[0]+(b[0]-a[0])*part)*radius,v=(a[1]+(b[1]-a[1])*part)*radius;
    const xx=x+(u*c-v*s)*rx,yy=y*3.1+(u*s+v*c)*ry;
    // Slightly offset strata make a chipped rim. A shallow diagonal cleft crosses
    // the top; the surrounding faces remain large-scale planes, not global noise.
    const cleft=row>=4?Math.max(0,1-Math.abs(v+u*.43-.08)/.14)*height*.19:0;
    const crown=.71+.31*((1-part)*random(seed+index*23)+part*random(seed+((index+1)%outline.length)*23));
    const uneven=1-(1-crown)*Math.min(1,radius/.7);
    const z=row===0?reefFloorHeight(xx,yy/3.1,compact)-3:
      ground+height*rings[row][1]*uneven+u*height*.075-v*height*.045-cleft;
    vertices.push([xx,yy,z]);
  }
  for(let row=0;row<rings.length-1;row++)for(let i=0;i<segments;i++) {
    const a=row*segments+i,b=row*segments+(i+1)%segments,c=a+segments,d=b+segments;
    faces.push([a,b,c],[b,d,c]);
  }
  const top=vertices.push([x,y*3.1,ground+height*1.002])-1,bottom=vertices.push([x,y*3.1,ground-4])-1;
  for(let i=0;i<segments;i++) {
    const next=(i+1)%segments,a=(rings.length-1)*segments+i,b=(rings.length-1)*segments+next;
    faces.push([a,b,top],[next,i,bottom]);
  }
  const minimum=[0,1,2].map(axis=>Math.min(...vertices.map(p=>p[axis])));
  const maximum=[0,1,2].map(axis=>Math.max(...vertices.map(p=>p[axis])));
  return {name:'Broken limestone fragment',material:'limestone',vertices,faces,nodes:[],
    normals:faces.map(face=>normal(...face.map(id=>vertices[id]))),bounds:[minimum,maximum]};
}

/** A few explicit slabs in clear near-bank pockets, with smaller broken pieces. */
export function reefRockFragments(habitat,compact=false) {
  const result=[],depthScale=compact?.52:1,xScale=compact?.36:1;
  const pockets=compact?[[-170,-410],[300,-375]]:[[-330,-335],[160,-355],[-535,-228]];
  const clear=rock=>{
    const [lo,hi]=rock.bounds;
    return habitat.every(colony=>hi[0]<colony.origin[0]-colony.envelope.rx-4
      ||lo[0]>colony.origin[0]+colony.envelope.rx+4
      ||hi[1]<colony.origin[1]*3.1-colony.envelope.ry-4
      ||lo[1]>colony.origin[1]*3.1+colony.envelope.ry+4)
      &&result.every(other=>hi[0]<other.bounds[0][0]-3||lo[0]>other.bounds[1][0]+3
        ||hi[1]<other.bounds[0][1]-3||lo[1]>other.bounds[1][1]+3);
  };
  for(let pocket=0;pocket<(compact?2:3);pocket++) {
    let main;
    for(let attempt=0;attempt<90&&!main;attempt++) {
      const seed=7067+pocket*431+attempt*29,shrink=attempt<45?1:.76;
      const x=(pockets[pocket][0]+(random(seed)-.5)*260)*xScale;
      const y=(pockets[pocket][1]+(random(seed+1)-.5)*80)*depthScale;
      const rx=(compact?37:87)*shrink,ry=(compact?22:44)*shrink,height=(compact?19:31)*shrink;
      // Reject occupied footprints before constructing the detailed static mesh.
      if(!clear({bounds:fragmentBounds(x,y,rx,ry,height,seed,compact)}))continue;
      const rock=limestoneFragment(x,y,rx,ry,height,seed,compact);
      if(clear(rock)){main=rock;main.name=`Limestone outcrop ${pocket+1}`;result.push(main);}
    }
    if(!main)continue;
    const [lo,hi]=main.bounds,cx=(lo[0]+hi[0])/2,cy=(lo[1]+hi[1])/2;
    let added=0;
    for(let attempt=0;attempt<70&&added<(compact?3:5);attempt++) {
      const seed=9203+pocket*631+attempt*37,angle=random(seed)*Math.PI*2;
      const radius=(compact?7:15)*(1+random(seed+1)*.7);
      const x=cx+Math.cos(angle)*((hi[0]-lo[0])*.65+radius*1.5);
      const yy=cy+Math.sin(angle)*((hi[1]-lo[1])*.64+radius*1.5);
      const ry=radius*(.62+random(seed+2)*.18),height=radius*.44;
      if(!clear({bounds:fragmentBounds(x,yy/3.1,radius,ry,height,seed,compact)}))continue;
      const rock=limestoneFragment(x,yy/3.1,radius,ry,height,seed,compact);
      if(clear(rock)){rock.name=`Limestone chip ${pocket+1}.${++added}`;result.push(rock);}
    }
  }
  return result;
}
