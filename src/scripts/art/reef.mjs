import { ORGANIC_CORALS } from './reef-organic.mjs';

const TAU = Math.PI * 2;
const WATER = [12, 22, 48];
const PALE = [143, 165, 255];
const CORAL = [255, 102, 85];
const FISH_GREY = [195, 195, 195];
const TIP_START=.965;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
function normal(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function makeFish() {
  const vertices = [[29, 0, .3]], faces = [], segments = 12;
  const rings = [[26, 1.8, 2.5], [22, 3.2, 5.1], [16, 4.8, 8.0], [8, 5.8, 10.0],
    [0, 5.3, 10.2], [-8, 4.1, 8.5], [-15, 2.2, 5.7], [-21, 1.1, 2.4], [-24, .6, 1.6]];
  for (const [x, width, height] of rings) {
    for (let i=0;i<segments;i++) {
      const angle=i*TAU/segments;
      vertices.push([x,width*Math.cos(angle),height*Math.sin(angle)*(Math.sin(angle)<0?.88:1)]);
    }
  }
  for(let i=0;i<segments;i++) faces.push([0,1+i,1+(i+1)%segments]);
  for(let row=0;row<rings.length-1;row++) for(let i=0;i<segments;i++) {
    const a=1+row*segments+i,b=1+row*segments+(i+1)%segments;
    faces.push([a,a+segments,b],[b,a+segments,b+segments]);
  }
  const cap=vertices.push([-24.7,0,0])-1;
  for(let i=0;i<segments;i++)faces.push([1+(rings.length-1)*segments+i,
    1+(rings.length-1)*segments+(i+1)%segments,cap]);

  // Fin rays form shallow, swept surfaces instead of large triangular spikes.
  function fin(rays) {
    const first=vertices.length,steps=3;
    for(const [root,edge] of rays)for(let j=0;j<steps;j++) {
      const t=j/(steps-1);
      vertices.push(root.map((v,k)=>v+(edge[k]-v)*t));
    }
    for(let i=0;i<rays.length-1;i++)for(let j=0;j<steps-1;j++) {
      const a=first+i*steps+j,b=a+steps;
      faces.push([a,b,a+1],[a+1,b,b+1]);
    }
  }
  fin([[13,8.8,9.0],[8,10,13],[2,10.3,14.3],[-4,9.5,13.6],[-10,7.8,11.5],[-16,5,7.0],[-20,3,3.4]]
    .map(([x,z,top])=>[[x,0,z],[x-1.8,0,top]]));
  fin([[1,-8.8,-9.0],[-4,-8.4,-12.0],[-9,-7.1,-12.5],[-14,-5.4,-10.5],[-19,-2.8,-4.2]]
    .map(([x,z,bottom])=>[[x,0,z],[x-2,0,bottom]]));
  fin(Array.from({length:9},(_,i)=>{
    const u=(i-4)/4;
    return [[-23.7,0,u*1.6],[-28.2-7.2*Math.abs(u)**1.35,0,u*11.2]];
  }));
  for(const side of [-1,1])fin(Array.from({length:5},(_,i)=>{
    const t=i/4;
    return [[12-5*t,side*(4.7+.7*t),1-3*t],
      [9-13*Math.sin(t*Math.PI/2),side*(5.4+5*Math.sin(t*Math.PI)),1-4.8*t]];
  }));
  const eyes=[vertices.push([22,3.02,1.5])-1,vertices.push([22,-3.02,1.5])-1];
  return {vertices,faces,nodes:eyes,material:'fish'};
}
const FISH = makeFish();

function reefBank(compact) {
  const random=seed=>{const value=Math.sin(seed*91.73+17.19)*41738.31;return value-Math.floor(value);};
  const rows=compact?6:7,columns=compact?8:12,colonies=[];
  const levels=compact?[-460,-330,-205,-60,95,260]:[-360,-270,-180,-90,30,140,260];
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++) {
    const index=row*columns+column,seed=index*17+row*31;
    const nativeY=Math.max(compact?-490:-390,levels[row]+(random(seed+2)-.5)*130);
    const distance=compact?1500:2800,depthScale=compact?.52:1;
    const y=nativeY*depthScale;
    const span=(compact?337:1120)*(distance+y*3.1)/distance;
    const spacing=2*span/(columns-1);
    const x=-span+column*spacing+(random(seed+3)-.5)*spacing*.72
      +Math.sin(row*1.9)*spacing*.25;
    const pick=random(seed+4);
    let kind=pick<.36?'cauliflower_small':pick<.72?'coral_bush':pick<.91?(index%2?'brain_lobes':'brain_ridged'):'shelf_coral';
    if(row===0&&(column===2||column===columns-3))kind='coral_bush';
    if(!ORGANIC_CORALS[kind])kind='cauliflower';
    let height=(compact?44+row*12:43+row*10)*(.77+random(seed+5)*.48);
    if(kind==='coral_bush')height=35+random(seed+11)*25;
    if(kind.startsWith('brain'))height*=.70;
    if(kind==='shelf_coral')height*=.45;
    const colourField=Math.sin(x/(compact?105:280)+row*.72)+Math.cos(index*1.1)*.34;
    colonies.push({
      name:`Reef colony ${index+1}`,kind,height,origin:[x,y,floorHeight(x,y,compact)],
      yaw:random(seed+6)*360,material:colourField>.38?'coral':'blue',
      width:(.90+random(seed+7)*.56)*1.32,depth:(.76+random(seed+8)*.54)*1.28,
      burial:kind==='coral_bush'?0:height*.08,
      lean:[(random(seed+9)-.5)*.28,(random(seed+10)-.5)*.18],
      motion:kind==='coral_bush'&&row===0&&(column===2||column===columns-3),bank:true,
    });
  }
  return colonies;
}

function floorHeight(x,y,compact=false) {
  // A rising reef bank supports several overlapping depths of low growth.
  const xx=compact?x*3.2:x,yy=compact?y/.52:y;
  const rise=1/(1+Math.exp(-(yy+100)/115));
  const relief=compact?.90:1;
  return relief*(78+284*rise
    +28*Math.sin((xx+250)/310)*(.2+.8*rise)
    +26*Math.exp(-(((xx-410)/370)**2))*rise
    -20*Math.exp(-(((xx+60)/250)**2))*rise
    +4*Math.sin(xx*.016+yy*.025));
}

function extendedFloor(compact) {
  const columns = compact ? 50 : 78, rows = compact ? 58 : 74;
  const span = compact ? 730 : 1650, near = compact ? -980 : -2010, far = compact ? 2700 : 4600;
  const vertices = [], faces = [];
  for (let row = 0; row <= rows; row += 1) {
    const y = near + (far - near) * (row / rows) ** 1.7;
    for (let column = 0; column <= columns; column += 1) {
      const x = -span + column / columns * span * 2 + Math.sin(row * 7.1 + column * 2.3) * 9;
      const yy = y + Math.sin(row * 2.7 + column * 5.1) * 7;
      vertices.push([x, yy, floorHeight(x, yy / 3.1, compact)]);
    }
  }
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1;
    faces.push([a, b, d], [a, d, c]);
  }
  return { name: 'Continuous reef floor', material: 'terrain', vertices, faces, nodes: [],
    normals: faces.map(face => normal(vertices[face[0]], vertices[face[1]], vertices[face[2]])) };
}

function prepare(source, index) {
  let vertices, faces, nodes;
  if (source.kind) {
    const geometry = ORGANIC_CORALS[source.kind], angle = source.yaw * Math.PI / 180;
    const c = Math.cos(angle), s = Math.sin(angle), h = source.height, spread=source.width||1;
    vertices = geometry.vertices.map(([x, y, z]) => [
      source.origin[0] + ((x * c - y * s) * spread + (source.lean?.[0]||0)*z*z) * h,
      source.origin[1] + ((x * s + y * c) * spread * (source.depth||1) + (source.lean?.[1]||0)*z*z) * h,
      source.origin[2] + z * h,
    ]);
    faces = geometry.faces; nodes = geometry.nodes;
  } else { vertices = source.vertices; faces = source.faces; nodes = source.nodes || []; }
  // More space between the existing near/far colonies lets a low frontal
  // camera reveal depth. This keeps each coral's actual branch volume intact.
  const centreY = source.origin?.[1] ?? vertices.reduce((sum, p) => sum + p[1], 0) / vertices.length;
  vertices = vertices.map(p => [p[0], p[1] + centreY * 2.1, p[2]]);
  return {
    name: source.name, material: source.material, vertices, faces, nodes,
    index, base: source.origin?.[2] || 0, height: source.height || 1,
    anchor: source.origin ? [source.origin[0], source.origin[1] * 3.1] : null,
    coral: Boolean(source.kind), subdivide: !source.bank, motion:Boolean(source.motion),burial:source.burial||0,
    normals: faces.map(face => normal(vertices[face[0]], vertices[face[1]], vertices[face[2]])),
  };
}

function surfaceHeight(object, x, y) {
  let height = -Infinity;
  for (const face of object.faces) {
    const [a,b,c] = face.map(i => object.vertices[i]);
    if (x < Math.min(a[0],b[0],c[0]) || x > Math.max(a[0],b[0],c[0]) || y < Math.min(a[1],b[1],c[1]) || y > Math.max(a[1],b[1],c[1])) continue;
    const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    if (Math.abs(den)<1e-8) continue;
    const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den;
    const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den;
    if (u>=-1e-6 && v>=-1e-6 && u+v<=1.000001) height=Math.max(height,u*a[2]+v*b[2]+(1-u-v)*c[2]);
  }
  return height;
}

function groundScene(terrain, objects,compact) {
  const rocks=objects.filter(object=>!object.coral);
  for (const rock of rocks) {
    const [x,y]=[0,1].map(axis=>rock.vertices.reduce((sum,p)=>sum+p[axis],0)/rock.vertices.length);
    const lowest=Math.min(...rock.vertices.map(p=>p[2]));
    rock.vertices=rock.vertices.map(([x,y,z])=>[x,y,lowest+(z-lowest)*.44]);
    const dz=surfaceHeight(terrain,x,y)-lowest-4;
    if (Number.isFinite(dz)) rock.vertices=rock.vertices.map(([x,y,z])=>[x,y,z+dz]);
  }
  for (const coral of objects.filter(object=>object.coral)) {
    const [x,y]=coral.anchor;
    const ground=Math.max(surfaceHeight(terrain,x,y),...rocks.map(rock=>surfaceHeight(rock,x,y)));
    if (!Number.isFinite(ground)) continue;
    const dz=ground-.5-coral.burial-coral.base;
    coral.vertices=coral.vertices.map(([x,y,z])=>[x,y,z+dz]);
    coral.base=ground-.5-coral.burial;
    // Buried root caps must not reappear through the foreground in a painter's renderer.
    const above=coral.vertices.map(([x,y,z])=>z-floorHeight(x,y/3.1,compact)>-.6);
    const visible=coral.faces.flatMap((face,index)=>face.some(vertex=>above[vertex])?[index]:[]);
    coral.faces=visible.map(index=>coral.faces[index]);
    coral.normals=visible.map(index=>coral.normals[index]);
    coral.nodes=coral.nodes.filter(index=>above[index]);
  }
  return [terrain,...objects];
}

function fishPose(time, index, compact) {
  const direction=index%2?-1:1,rate=[.026,.021,.029,.024][index];
  const pulseRate=.075+index*.019,pulsePhase=index*1.91;
  // Integrating the speed variation keeps the route continuous through each turn.
  const angle=[-.85,.3,2.25,3.34][index]+direction*rate*
    (time+.16/pulseRate*(Math.cos(pulsePhase)-Math.cos(time*pulseRate+pulsePhase)));
  const angularRate=direction*rate*(1+.16*Math.sin(time*pulseRate+pulsePhase));
  const span=(compact?380:1080)*(compact?[1,.90,1.06,.95]:[1,.52,1.06,.82])[index];
  const depth=[210,155,235,180][index];
  const x=Math.sin(angle)*span,y=[-130,190,20,-290][index]+Math.cos(angle)*depth;
  const vx=Math.cos(angle)*span*angularRate,vy=-Math.sin(angle)*depth*angularRate;
  const turnRate=-span*depth*angularRate/(span*span*Math.cos(angle)**2+depth*depth*Math.sin(angle)**2);
  const bobRate=[.20,.16,.23,.18][index],bob=[5,7,4,6][index],phase=index*1.37;
  const vz=Math.cos(time*bobRate+phase)*bob*bobRate;
  return {
    centre:[x,y,(compact?455:520)-index*35+Math.sin(time*bobRate+phase)*bob],
    yaw:Math.atan2(vy,vx),
    pitch:clamp(Math.atan2(vz,Math.hypot(vx,vy)),-.05,.05),
    bank:clamp(turnRate*.38,-.065,.065),
    size:[.83,.69,.96,.77][index],
  };
}

function movingFish(time, index, compact) {
  const pose = fishPose(time, index, compact);
  const cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw), cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
  const cb = Math.cos(pose.bank), sb = Math.sin(pose.bank);
  const vertices = FISH.vertices.map(([x, y, z]) => {
    const tail = clamp((19-x)/54),amplitude=.12+7.2*tail**1.8;
    const wave = time * (5.1 + index * .4) + index * 1.7 + x / 60 * 3.3;
    y += Math.sin(wave) * amplitude;
    z += Math.sin(wave + .7) * tail * .42;
    const by = y * cb - z * sb, bz = y * sb + z * cb;
    const px = x * cp - bz * sp, pz = x * sp + bz * cp;
    return [pose.centre[0] + (px * cy - by * sy) * pose.size,
      pose.centre[1] + (px * sy + by * cy) * pose.size, pose.centre[2] + pz * pose.size];
  });
  return { ...FISH, name: `Fish ${index + 1}`, vertices,
    normals: FISH.faces.map(face => normal(vertices[face[0]], vertices[face[1]], vertices[face[2]])) };
}

function movingCoral(object,time) {
  const rate=.47+(object.index%3)*.065,phase=object.index*1.73;
  const vertices=object.vertices.map(([x,y,z])=>{
    const height=clamp((z-object.base)/object.height),bend=clamp((height-TIP_START)/(1-TIP_START))**2;
    return [x+Math.sin(time*rate+phase+height*.8)*object.height*.025*bend,
      y+Math.cos(time*rate*.73+phase)*object.height*.014*bend,z];
  });
  return {...object,vertices,normals:object.faces.map(face=>normal(vertices[face[0]],vertices[face[1]],vertices[face[2]]))};
}

function coralSection(object,tips) {
  if(!object.sections) {
    const high=index=>(object.vertices[index][2]-object.base)/object.height>TIP_START;
    object.sections=[false,true].map(moving=>{
      const indices=object.faces.flatMap((face,index)=>face.some(high)===moving?[index]:[]);
      return {faces:indices.map(index=>object.faces[index]),normals:indices.map(index=>object.normals[index]),
        nodes:object.nodes.filter(index=>high(index)===moving)};
    });
  }
  return {...object,...object.sections[tips?1:0]};
}

function waterDrift(ctx,width,height,time) {
  ctx.fillStyle=mix(WATER,PALE,.24);
  const count=width<600?12:25;
  for(let i=0;i<count;i++) {
    const u=(Math.sin(i*91.7+13)*43758.5)%1,v=(Math.sin(i*47.3+2)*17941.7)%1;
    const x=((Math.abs(u)*(width+50)+time*(1.3+(i%4)*.45))%(width+50))-25;
    const y=height*(.19+Math.abs(v)*.40)+Math.sin(time*.19+i)*3;
    ctx.beginPath();ctx.arc(x,y,i%3===0?.7:.45,0,TAU);ctx.fill();
  }
}

function camera(width, height, time, compact) {
  // A fixed low camera lets the fine reef geometry be painted once.
  const yaw = 0;
  const elevation = 0.044;
  const distance = compact ? 1500 : 2800;
  const right = [Math.cos(yaw), -Math.sin(yaw), 0];
  const up = [Math.sin(yaw) * Math.sin(elevation), Math.cos(yaw) * Math.sin(elevation), Math.cos(elevation)];
  const eye = [-Math.sin(yaw) * Math.cos(elevation), -Math.cos(yaw) * Math.cos(elevation), Math.sin(elevation)];
  const fieldWidth=1200+clamp((width-600)/840)*470;
  const scale = compact ? Math.min(width / 660, height / 640) : Math.min(width / fieldWidth, height / 630);
  const target = [0, 0, compact ? 68 : 70];
  return {
    eye, distance,
    project(p) {
      const relative = [p[0] - target[0], p[1] - target[1], p[2] - target[2]];
      const z = distance - dot(relative, eye);
      const factor = scale * distance / z;
      return { x: width * 0.5 + dot(relative, right) * factor,
        y: height * (compact ? 0.83 : .80+.065*clamp((width-600)/840)) - dot(relative, up) * factor, z };
    },
  };
}

function style(material, faceNormal, depth, distance) {
  const colour = material === 'fish' ? FISH_GREY : material === 'coral' ? CORAL : PALE;
  const light = Math.abs(dot(faceNormal, [-0.303, -0.505, 0.808]));
  const fogKey = Math.round(clamp(1 - Math.max(0, depth - distance + 85) / 1250, 0.52, 1) * 64);
  const fog = fogKey / 64;
  const cache = faceNormal.styles || (faceNormal.styles = []);
  if (cache[fogKey]) return cache[fogKey];
  let fill, edge, width;
  if (material === 'terrain') { fill = 0.006 + (1 - light) * 0.013; edge = 0.11; width = 0.28; }
  else if (material === 'rock') { fill = 0.012 + (1 - light) * 0.025; edge = 0.27; width = 0.37; }
  else if (material === 'fish') { fill = 0.012 + (1 - light) * 0.016; edge = 0.55; width = 0.28; }
  else { fill = 0.016 + (1 - light) * 0.028; edge = material === 'coral' ? 0.64 : 0.61; width = 0.20; }
  // Opaque blends hide the rear surface while retaining very light shading.
  const stroke = material === 'fish' ? `rgb(${Array(3).fill(Math.round(183 * fog * 0.78)).join(',')})` : mix(WATER, colour, edge * fog);
  return (cache[fogKey] = { fill: mix(WATER, colour, fill * fog), stroke, width });
}

function inverseDepth(triangle, x, y) {
  const {a,b,c}=triangle;
  const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
  if(Math.abs(den)<1e-8) return null;
  const u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/den;
  const v=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/den;
  return {value:u/a.z+v/b.z+(1-u-v)/c.z,inside:u>=-.0001&&v>=-.0001&&u+v<=1.0001};
}

function hidesPoint(triangle, point) {
  if(point.x<triangle.xmin||point.x>triangle.xmax||point.y<triangle.ymin||point.y>triangle.ymax) return false;
  const depth=inverseDepth(triangle,point.x,point.y);
  return depth?.inside && 1/depth.value<point.z-.55;
}

function nearerPolygon(reef, fish) {
  // Clip the reef face where its perspective-correct depth is in front of this fish face.
  const vertices=[reef.a,reef.b,reef.c].map(p=>({...p,d:1/p.z-(inverseDepth(fish,p.x,p.y)?.value??Infinity)-1e-8}));
  const polygon=[];
  for(let i=0;i<3;i++) {
    const a=vertices[i],b=vertices[(i+1)%3];
    if(a.d>=0) polygon.push(a);
    if((a.d>=0)!==(b.d>=0)) {
      const t=a.d/(a.d-b.d);
      polygon.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
    }
  }
  return polygon;
}

function spatialIndex(triangles,width,height,cell) {
  const columns=Math.ceil(width/cell),rows=Math.ceil(height/cell),bins=new Map();
  for(const triangle of triangles) {
    triangle.minDepth=Math.min(triangle.a.z,triangle.b.z,triangle.c.z);
    const x0=Math.max(0,Math.floor(triangle.xmin/cell)),x1=Math.min(columns-1,Math.floor(triangle.xmax/cell));
    const y0=Math.max(0,Math.floor(triangle.ymin/cell)),y1=Math.min(rows-1,Math.floor(triangle.ymax/cell));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
      const key=y*columns+x;
      if(!bins.has(key))bins.set(key,[]);
      bins.get(key).push(triangle);
    }
  }
  return {triangles,bins,columns,cell};
}

export class Reef {
  props = { fish: true };

  seedReef(s) {
    if (!(s.w > 0 && s.h > 0)) return;
    s.reefCompact = s.w < 600;
    const layout=reefBank(s.reefCompact);
    s.reefScene = groundScene(extendedFloor(s.reefCompact), layout.map(prepare),s.reefCompact);
    s.reefGeometryStats = {
      meshes: s.reefScene.length,
      vertices: s.reefScene.reduce((sum, object) => sum + object.vertices.length, 0),
      triangles: s.reefScene.reduce((sum, object) => sum + object.faces.length, 0),
    };
  }

  stepReef(s) { this.drawReef(s); }

  drawReef(s) {
    if (!s.ctx || !Number.isFinite(s.w) || !Number.isFinite(s.h) || s.w <= 0 || s.h <= 0) return;
    if (!s.reefScene || s.reefCompact !== (s.w < 600)) this.seedReef(s);
    if(!s.reefSkipCache && typeof OffscreenCanvas==='function') {
      this.drawCachedReef(s);
      return;
    }
    const { ctx } = s, time = Number.isFinite(s.t) ? s.t / 60 : 0;
    const cam = camera(s.w, s.h, time, s.reefCompact), triangles = [], landmarks = [];
    const objects=s.reefScene.map(object=>!object.motion?object:this.props.motion===false?
      coralSection(object,false):movingCoral(object,time));
    if (this.props.fish ?? true) {
      for (let i = 0; i < 4; i += 1) objects.push(movingFish(time, i, s.reefCompact));
    }

    for (const object of objects) {
      const points = object.vertices.map(p => cam.project(p));
      object.faces.forEach((face, faceIndex) => {
        const a = points[face[0]], b = points[face[1]], c = points[face[2]];
        const xmin = Math.min(a.x, b.x, c.x), xmax = Math.max(a.x, b.x, c.x);
        const ymin = Math.min(a.y, b.y, c.y), ymax = Math.max(a.y, b.y, c.y);
        if (xmax < -2 || xmin > s.w + 2 || ymax < -2 || ymin > s.h + 2) return;
        const depth = (a.z + b.z + c.z) / 3;
        const shade = style(object.material, object.normals[faceIndex], depth, cam.distance);
        const subdivide=object.coral && (object.subdivide || Math.max(xmax-xmin,ymax-ymin)>18);
        triangles.push({ a, b, c, depth, xmin, xmax, ymin, ymax, subdivide, ...shade });
      });
      for (const index of object.nodes) landmarks.push({ ...points[index], material: object.material });
    }

    triangles.sort((a, b) => b.depth - a.depth);
    ctx.save(); ctx.clearRect(0, 0, s.w, s.h);
    ctx.fillStyle = '#0C1630'; ctx.fillRect(0, 0, s.w, s.h);
    if(this.props.motion!==false)waterDrift(ctx,s.w,s.h,time);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const triangle of triangles) {
      ctx.fillStyle = triangle.fill; ctx.strokeStyle = triangle.stroke; ctx.lineWidth = triangle.width;
      ctx.beginPath(); ctx.moveTo(triangle.a.x, triangle.a.y); ctx.lineTo(triangle.b.x, triangle.b.y); ctx.lineTo(triangle.c.x, triangle.c.y); ctx.closePath();
      ctx.fill(); ctx.stroke();
      if (triangle.subdivide) {
        const {a,b,c}=triangle;
        // Projected 3D edge midpoints give four fine faces on the same surface.
        const midpoint=(p,q)=>({x:(p.x*p.z+q.x*q.z)/(p.z+q.z),y:(p.y*p.z+q.y*q.z)/(p.z+q.z)});
        const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
        ctx.lineWidth=.24;
        ctx.beginPath();ctx.moveTo(ab.x,ab.y);ctx.lineTo(bc.x,bc.y);ctx.lineTo(ca.x,ca.y);ctx.closePath();ctx.stroke();
      }
    }

    // A spatial index makes perspective-correct landmark occlusion cheap.
    // Hidden rear nodes/fish do not shine through nearer branches or rocks.
    const cell = 54, columns = Math.ceil(s.w / cell), bins = new Map();
    triangles.forEach(triangle => {
      const x0 = Math.max(0, Math.floor(triangle.xmin / cell)), x1 = Math.min(columns - 1, Math.floor(triangle.xmax / cell));
      const y0 = Math.max(0, Math.floor(triangle.ymin / cell)), y1 = Math.min(Math.ceil(s.h / cell) - 1, Math.floor(triangle.ymax / cell));
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
        const key = y * columns + x;
        if (!bins.has(key)) bins.set(key, []);
        bins.get(key).push(triangle);
      }
    });
    let visibleNodes = 0;
    for (const point of landmarks) {
      if (point.x < 0 || point.x > s.w || point.y < 0 || point.y > s.h) continue;
      const nearby = bins.get(Math.floor(point.y / cell) * columns + Math.floor(point.x / cell)) || [];
      const hidden = nearby.some(({ a, b, c, xmin, xmax, ymin, ymax }) => {
        if (point.x < xmin || point.x > xmax || point.y < ymin || point.y > ymax) return false;
        const den = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
        if (Math.abs(den) < 1e-8) return false;
        const u = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / den;
        const v = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / den;
        if (u < -0.0001 || v < -0.0001 || u + v > 1.0001) return false;
        const depth = 1 / (u / a.z + v / b.z + (1 - u - v) / c.z);
        return depth < point.z - 0.55;
      });
      if (hidden) continue;
      const fog = clamp(1 - Math.max(0, point.z - cam.distance + 85) / 1250, 0.5, 1);
      ctx.fillStyle = point.material === 'fish' ? `rgb(${Array(3).fill(Math.round(195 * fog)).join(',')})`
        : mix(WATER, point.material === 'coral' ? CORAL : PALE, fog * 0.90);
      ctx.beginPath(); ctx.arc(point.x, point.y, point.material === 'fish' ? .85 : s.reefCompact ? .65 : .8, 0, TAU); ctx.fill();
      visibleNodes += 1;
    }
    ctx.restore();
    s.reefFrameStats = { triangles: triangles.length, visibleNodes, fish: this.props.fish === false ? 0 : 4 };
    if(s.reefSkipCache) s.reefOcclusion={triangles,bins,columns,cell};
  }

  drawCachedReef(s) {
    const {ctx}=s,dpr=Math.min(ctx.getTransform?.()?.a||1,2);
    let cache=s.reefCache;
    if(!cache||cache.w!==s.w||cache.h!==s.h||cache.dpr!==dpr||cache.scene!==s.reefScene) {
      const canvas=new OffscreenCanvas(Math.ceil(s.w*dpr),Math.ceil(s.h*dpr));
      const paint=canvas.getContext('2d');
      paint.setTransform(dpr,0,0,dpr,0,0);
      const state={...s,ctx:paint,reefSkipCache:true},still=new Reef();
      still.props={fish:false,motion:false};still.drawReef(state);
      cache=s.reefCache={w:s.w,h:s.h,dpr,scene:s.reefScene,canvas,
        ...spatialIndex(state.reefOcclusion.triangles,s.w,s.h,18),stats:state.reefFrameStats,tipOccluders:new Map()};
    }
    ctx.clearRect(0,0,s.w,s.h);ctx.drawImage(cache.canvas,0,0,s.w,s.h);
    const time=Number.isFinite(s.t)?s.t/60:0,cam=camera(s.w,s.h,time,s.reefCompact),faces=[],nodes=[];
    if(this.props.motion!==false)waterDrift(ctx,s.w,s.h,time);
    const moving=this.props.motion===false?[]:s.reefScene.filter(object=>object.motion)
      .map(object=>movingCoral(coralSection(object,true),time));
    if(this.props.fish!==false)for(let i=0;i<4;i++)moving.push(movingFish(time,i,s.reefCompact));
    for(const object of moving) {
      const points=object.vertices.map(p=>cam.project(p));
      object.faces.forEach((face,j)=>{
        const [a,b,c]=face.map(index=>points[index]);
        const xmin=Math.min(a.x,b.x,c.x),xmax=Math.max(a.x,b.x,c.x),ymin=Math.min(a.y,b.y,c.y),ymax=Math.max(a.y,b.y,c.y);
        if(xmax<0||xmin>s.w||ymax<0||ymin>s.h)return;
        const depth=(a.z+b.z+c.z)/3;
        faces.push({a,b,c,xmin,xmax,ymin,ymax,depth,tipKey:object.motion?`${object.name}:${j}`:null,
          ...style(object.material,object.normals[j],depth,cam.distance)});
      });
      nodes.push(...object.nodes.map(index=>({...points[index],material:object.material})));
    }
    faces.sort((a,b)=>b.depth-a.depth);
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
    for(const face of faces) {
      ctx.save();
      let nearby=face.tipKey?cache.tipOccluders.get(face.tipKey):null;
      if(!nearby) {
        const candidates=new Set(),pad=face.tipKey?12:0;
        const x0=Math.max(0,Math.floor((face.xmin-pad)/cache.cell)),x1=Math.min(cache.columns-1,Math.floor((face.xmax+pad)/cache.cell));
        const y0=Math.max(0,Math.floor((face.ymin-pad)/cache.cell)),y1=Math.min(Math.ceil(s.h/cache.cell)-1,Math.floor((face.ymax+pad)/cache.cell));
        const farDepth=Math.max(face.a.z,face.b.z,face.c.z)+pad;
        for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)for(const reef of cache.bins.get(y*cache.columns+x)||[]) {
          if(reef.minDepth<farDepth&&reef.xmax>=face.xmin-pad&&reef.xmin<=face.xmax+pad&&reef.ymax>=face.ymin-pad&&reef.ymin<=face.ymax+pad)candidates.add(reef);
        }
        nearby=[...candidates];
        if(face.tipKey)cache.tipOccluders.set(face.tipKey,nearby);
      }
      for(const reef of nearby) {
        if(reef.xmax<face.xmin||reef.xmin>face.xmax||reef.ymax<face.ymin||reef.ymin>face.ymax)continue;
        const polygon=nearerPolygon(reef,face);
        if(polygon.length<3)continue;
        ctx.beginPath();ctx.rect(face.xmin-2,face.ymin-2,face.xmax-face.xmin+4,face.ymax-face.ymin+4);
        ctx.moveTo(polygon[0].x,polygon[0].y);
        for(const p of polygon.slice(1))ctx.lineTo(p.x,p.y);
        ctx.closePath();ctx.clip('evenodd');
      }
      ctx.fillStyle=face.fill;ctx.strokeStyle=face.stroke;ctx.lineWidth=face.width;
      ctx.beginPath();ctx.moveTo(face.a.x,face.a.y);ctx.lineTo(face.b.x,face.b.y);ctx.lineTo(face.c.x,face.c.y);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.restore();
    }
    let visibleNodes=0;
    for(const point of nodes) {
      if(point.x<0||point.x>s.w||point.y<0||point.y>s.h)continue;
      const nearby=cache.bins.get(Math.floor(point.y/cache.cell)*cache.columns+Math.floor(point.x/cache.cell))||[];
      if(nearby.some(triangle=>hidesPoint(triangle,point))||faces.some(triangle=>hidesPoint(triangle,point)))continue;
      const fog=clamp(1-Math.max(0,point.z-cam.distance+85)/1250,.5,1);
      ctx.fillStyle=point.material==='fish'?`rgb(${Array(3).fill(Math.round(195*fog)).join(',')})`
        :mix(WATER,point.material==='coral'?CORAL:PALE,fog*.9);
      ctx.beginPath();ctx.arc(point.x,point.y,point.material==='fish'?.85:s.reefCompact?.65:.8,0,TAU);ctx.fill();visibleNodes++;
    }
    ctx.restore();
    s.reefFrameStats={triangles:cache.stats.triangles+faces.length,visibleNodes:cache.stats.visibleNodes+visibleNodes,
      fish:this.props.fish===false?0:4,movingCorals:moving.filter(object=>object.motion).length,cached:true};
  }
}
