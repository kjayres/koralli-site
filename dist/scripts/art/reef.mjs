import { ORGANIC_CORALS } from './reef-organic.mjs?v=34d51cbcb8d7';
import { reefHabitat, reefFloorHeight as floorHeight } from './reef-habitat.mjs?v=34d51cbcb8d7';
import { reefTerrain, reefRockFragments } from './reef-terrain.mjs?v=34d51cbcb8d7';
import { reefCurrent, reefPlankton } from './reef-current.mjs?v=34d51cbcb8d7';
import { movingTurtle } from './reef-turtle.mjs?v=34d51cbcb8d7';
import { fishPose } from './reef-fish-motion.mjs?v=34d51cbcb8d7';
import { reefSurfaceSteps, reefActorPreparationSteps, paintReefActors, reefInverseDepthAt } from './reef-surface.mjs?v=34d51cbcb8d7';

const TAU = Math.PI * 2;
const WATER = [12, 22, 48];
const PALE = [143, 165, 255];
const CORAL = [255, 102, 85];
const FISH_GREY = [195, 195, 195];
const TIP_START=.08;
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
  // Chromis viridis: a short, deep, compressed body and a deeply forked tail.
  // Proportions: ICAR-CMFRI, Prioritized Species for Mariculture in India (2017).
  const vertices = [[26, 0, .5]], faces = [], segments = 12;
  const rings = [[24.5, 1.4, 2.0], [22, 2.8, 4.6], [17, 4.2, 8.9], [10, 4.9, 11.6],
    [2, 4.8, 12.7], [-6, 4.0, 11.3], [-13, 2.6, 8.0], [-19, 1.3, 4.0], [-24, .6, 1.7]];
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
  fin([[16,9.3,10.2],[11,11.2,12.9],[6,12.2,13.7],[1,12.6,14.0],[-4,11.8,14.2],
    [-9,10.0,14.2],[-13,8.0,12.8],[-17,5.4,9.3],[-21,2.8,3.7]]
    .map(([x,z,top])=>[[x,0,z],[x-1.4,0,top]]));
  fin([[1,-11.0,-11.8],[-4,-10.5,-12.8],[-9,-8.8,-13.4],[-14,-6.5,-11.0],[-20,-2.8,-3.9]]
    .map(([x,z,bottom])=>[[x,0,z],[x-1.8,0,bottom]]));
  fin(Array.from({length:9},(_,i)=>{
    const u=(i-4)/4;
    return [[-23.7,0,u*1.7],[-26.8-8.8*Math.abs(u)**.8,0,u*13.3]];
  }));
  for(const side of [-1,1])fin(Array.from({length:5},(_,i)=>{
    const t=i/4;
    return [[13-4*t,side*(4.4+.4*t),1-3*t],
      [10-13*Math.sin(t*Math.PI/2),side*(4.8+4*Math.sin(t*Math.PI)),1-4.8*t]];
  }));
  const eyes=[vertices.push([21.4,2.93,2.0])-1,vertices.push([21.4,-2.93,2.0])-1];
  return {vertices,faces,nodes:eyes,material:'fish'};
}
const FISH = makeFish();


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
    coral: Boolean(source.kind), subdivide: !source.bank, motion:Boolean(source.motion),flex:source.flex||0,burial:source.burial||0,
    growth: source.kind ? ORGANIC_CORALS[source.kind].vertices.map(vertex => clamp(vertex[2])) : null,
    normals: faces.map(face => normal(vertices[face[0]], vertices[face[1]], vertices[face[2]])),
  };
}

function groundScene(terrain, objects, compact) {
  for (const coral of objects) {
    if (!coral.coral) continue;
    const [anchorX, anchorY] = coral.anchor;
    const ground = floorHeight(anchorX, anchorY / 3.1, compact);
    const oldBase = coral.base;
    coral.base = ground - coral.burial;
    coral.vertices = coral.vertices.map(([x,y,z]) => {
      const localHeight = clamp((z - oldBase) / coral.height);
      // Carry the root's local support gradually into the lower colony. A rapid
      // falloff let broad plates cut back through a rising rock shoulder.
      const conformity = 1 - localHeight;
      const localGround = floorHeight(x, y / 3.1, compact);
      return [x, y, z - oldBase + coral.base + (localGround - ground) * conformity];
    });
    coral.normals = coral.faces.map(face => normal(...face.map(i => coral.vertices[i])));
  }
  return [terrain, ...objects];
}

export function movingFish(time, index, compact) {
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
  return { ...FISH, name: `Blue-green chromis ${index + 1}`, vertices,
    normals: FISH.faces.map(face => normal(vertices[face[0]], vertices[face[1]], vertices[face[2]])) };
}

function movingCoral(object, time) {
  const flow = reefCurrent(time, object.anchor[0] / 1300, object.anchor[1] / 1100);
  const vertices = object.vertices.map(([x,y,z], index) => {
    const height = object.growth[index];
    const bend = Math.pow(clamp((height - TIP_START) / (1 - TIP_START)), 2);
    const wave = Math.sin(time * .52 - height * 2.8 + object.index * .79);
    const displacement = object.height * object.flex * bend;
    return [x + (flow.x + wave * .22) * displacement,
      y + (flow.y * .5 + wave * .12) * displacement, z - Math.abs(flow.x) * displacement * .08];
  });
  // Gentle bending retains the base shading; the mesh and depth move together.
  return {...object, vertices};
}

function coralSection(object,tips) {
  if(!object.sections) {
    const high=index=>object.growth[index]>TIP_START;
    object.sections=[false,true].map(moving=>{
      const indices=object.faces.flatMap((face,index)=>face.some(high)===moving?[index]:[]);
      return {faces:indices.map(index=>object.faces[index]),normals:indices.map(index=>object.normals[index]),
        nodes:object.nodes.filter(index=>high(index)===moving)};
    });
  }
  return {...object,...object.sections[tips?1:0]};
}

function waterDrift(ctx, width, height, time) {
  const compact = width < 600, count = compact ? 26 : 52;
  for (let i = 0; i < count; i++) {
    const p = reefPlankton(time, i, compact);
    ctx.fillStyle = mix(WATER, PALE, p.alpha);
    const x = (p.x + 1) * .5 * width;
    const y = height * (.12 + (p.y + 1) * .37);
    ctx.beginPath(); ctx.arc(x, y, p.size * (.48 + (p.z + 1) * .20), 0, TAU); ctx.fill();
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

const STYLES = new Map();
function style(material, faceNormal, depth, distance) {
  const colour = material === 'fish' ? FISH_GREY : material === 'coral' ? CORAL : PALE;
  const lightStep = Math.round(Math.abs(dot(faceNormal, [-0.303, -0.505, 0.808])) * 32);
  const light = lightStep / 32;
  const fogKey = Math.round(clamp(1 - Math.max(0, depth - distance + 85) / 1250, 0.52, 1) * 64);
  const fog = fogKey / 64;
  let cache = STYLES.get(material);
  if (!cache) { cache = []; STYLES.set(material, cache); }
  const key = fogKey * 33 + lightStep;
  if (cache[key]) return cache[key];
  let fill, edge, width;
  if (material === 'terrain') { fill = 0.006 + (1 - light) * 0.013; edge = 0.11; width = 0.28; }
  else if (material === 'rock') { fill = 0.012 + (1 - light) * 0.025; edge = 0.27; width = 0.37; }
  else if (material === 'limestone') { fill = 0.012 + light * 0.058; edge = .30 + light * .12; width = .28; }
  else if (material === 'fish') { fill = 0.012 + (1 - light) * 0.016; edge = 0.55; width = 0.28; }
  else { fill = 0.016 + (1 - light) * 0.028; edge = material === 'coral' ? 0.64 : 0.61; width = 0.20; }
  // Opaque blends hide the rear surface while retaining very light shading.
  const stroke = material === 'fish' ? `rgb(${Array(3).fill(Math.round(183 * fog * 0.78)).join(',')})` : mix(WATER, colour, edge * fog);
  return (cache[key] = { fill: mix(WATER, colour, fill * fog), stroke, width });
}

function finishSteps(steps) {
  let result=steps.next();
  while(!result.done)result=steps.next();
  return result.value;
}

export class Reef {
  props = { fish: true, turtles: true };

  seedReef(s) {
    if (s.reefScene && s.reefCompact === (s.w < 600)) return;
    finishSteps(this.seedReefSteps(s));
  }

  *seedReefSteps(s) {
    if (!(s.w > 0 && s.h > 0)) return;
    s.reefCompact = s.w < 600;
    const layout=reefHabitat(s.reefCompact);
    yield;
    const scene=[...reefTerrain(s.reefCompact),...reefRockFragments(layout,s.reefCompact)];
    yield;
    for(let i=0;i<layout.length;i++) {
      scene.push(groundScene(null,[prepare(layout[i],i)],s.reefCompact)[1]);
      yield;
    }
    s.reefScene = scene;
    s.reefGeometryStats = {
      meshes: s.reefScene.length,
      vertices: s.reefScene.reduce((sum, object) => sum + object.vertices.length, 0),
      triangles: s.reefScene.reduce((sum, object) => sum + object.faces.length, 0),
    };
  }

  stepReef(s) { this.drawReef(s); }

  async prewarmReef(s, isCurrent = () => true) {
    const state={...s},started=performance.now(),stats={slices:0,maxSliceMs:0,durationMs:0};
    const run=async steps=>{
      let result;
      do {
        if(!isCurrent()){steps.return();return null;}
        const start=performance.now();
        do { result=steps.next(); } while(!result.done&&performance.now()-start<8);
        stats.slices++;stats.maxSliceMs=Math.max(stats.maxSliceMs,performance.now()-start);
        if(!result.done)await new Promise(resolve=>setTimeout(resolve,0));
      } while(!result.done);
      return result.value;
    };
    if(!state.reefScene||state.reefCompact!==(state.w<600))await run(this.seedReefSteps(state));
    if(!isCurrent())return false;
    const cache=await run(this.staticCacheSteps(state));
    if(!isCurrent()||!cache)return false;
    cache.actorWorkspace=await run(reefActorPreparationSteps(state.ctx,state.w,state.h,cache.surface));
    if(!isCurrent()||!cache.actorWorkspace)return false;
    stats.durationMs=performance.now()-started;
    Object.assign(s,{reefScene:state.reefScene,reefCompact:state.reefCompact,
      reefGeometryStats:state.reefGeometryStats,reefCache:cache,reefWarmStats:stats});
    return true;
  }

  drawReef(s) {
    if (!s.ctx || !Number.isFinite(s.w) || !Number.isFinite(s.h) || s.w <= 0 || s.h <= 0) return;
    if (!s.reefScene || s.reefCompact !== (s.w < 600)) this.seedReef(s);
    if(!s.reefSkipCache && (typeof OffscreenCanvas==='function' || s.ctx.canvas?.ownerDocument)) {
      this.drawCachedReef(s);
      return;
    }
    finishSteps(this.directReefSteps(s));
  }

  *directReefSteps(s) {
    const { ctx } = s, time = Number.isFinite(s.t) ? s.t / 60 : 0;
    const cam = camera(s.w, s.h, time, s.reefCompact), triangles = [], landmarks = [];
    const objects=s.reefScene.map(object=>!object.motion?object:this.props.motion===false?
      coralSection(object,false):movingCoral(object,time));
    if (this.props.fish ?? true) {
      for (let i = 0; i < 4; i += 1) objects.push(movingFish(time, i, s.reefCompact));
    }
    if (this.props.turtles !== false) for (let i = 0; i < 2; i++) objects.push(movingTurtle(time, s.reefCompact, i));

    for (const object of objects) {
      const points = object.vertices.map(p => cam.project(p));
      for(let faceIndex=0;faceIndex<object.faces.length;faceIndex++) {
        if(faceIndex%256===0)yield;
        const face=object.faces[faceIndex];
        const a = points[face[0]], b = points[face[1]], c = points[face[2]];
        const xmin = Math.min(a.x, b.x, c.x), xmax = Math.max(a.x, b.x, c.x);
        const ymin = Math.min(a.y, b.y, c.y), ymax = Math.max(a.y, b.y, c.y);
        if (xmax < -2 || xmin > s.w + 2 || ymax < -2 || ymin > s.h + 2) continue;
        const depth = (a.z + b.z + c.z) / 3;
        const shade = style(object.material, object.normals[faceIndex], depth, cam.distance);
        const subdivide=object.coral && (object.subdivide || Math.max(xmax-xmin,ymax-ymin)>18);
        triangles.push({ a, b, c, depth, xmin, xmax, ymin, ymax, subdivide, ...shade });
      }
      for (const index of object.nodes) landmarks.push({ ...points[index], material: object.material });
    }

    if (!s.reefSkipCache) triangles.sort((a, b) => b.depth - a.depth);
    ctx.save(); ctx.clearRect(0, 0, s.w, s.h);
    ctx.fillStyle = '#0C1630'; ctx.fillRect(0, 0, s.w, s.h);
    if(this.props.motion!==false)waterDrift(ctx,s.w,s.h,time);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (s.reefSkipCache) s.reefSurfaceStats = yield* reefSurfaceSteps(ctx, triangles, s.w, s.h);
    else for (const triangle of triangles) {
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

    const surface = s.reefSurfaceStats;
    let visibleNodes = 0;
    for (const point of landmarks) {
      if (point.x < 0 || point.x > s.w || point.y < 0 || point.y > s.h) continue;
      const hidden = surface && 1 / (point.z - .55) < reefInverseDepthAt(surface, point.x, point.y);
      if (hidden) continue;
      const fog = clamp(1 - Math.max(0, point.z - cam.distance + 85) / 1250, 0.5, 1);
      ctx.fillStyle = point.material === 'fish' ? `rgb(${Array(3).fill(Math.round(195 * fog)).join(',')})`
        : mix(WATER, point.material === 'coral' ? CORAL : PALE, fog * 0.90);
      ctx.beginPath(); ctx.arc(point.x, point.y, point.material === 'fish' ? .85 : s.reefCompact ? .65 : .8, 0, TAU); ctx.fill();
      visibleNodes += 1;
    }
    ctx.restore();
    s.reefFrameStats = { triangles: triangles.length, visibleNodes, fish: this.props.fish === false ? 0 : 4,
      turtles: this.props.turtles === false ? 0 : 2 };
  }

  drawCachedReef(s) {
    const {ctx}=s,dpr=Math.min(ctx.getTransform?.()?.a||1,2);
    let cache=s.reefCache;
    if(!cache||cache.w!==s.w||cache.h!==s.h||cache.dpr!==dpr||cache.scene!==s.reefScene) {
      cache=s.reefCache=finishSteps(this.staticCacheSteps(s));
    }
    ctx.clearRect(0,0,s.w,s.h);ctx.drawImage(cache.canvas,0,0,s.w,s.h);
    const time=Number.isFinite(s.t)?s.t/60:0,cam=camera(s.w,s.h,time,s.reefCompact),faces=[],nodes=[];
    if(this.props.motion!==false)waterDrift(ctx,s.w,s.h,time);
    const moving=this.props.motion===false?[]:s.reefScene.filter(object=>object.motion)
      .map(object=>movingCoral(coralSection(object,true),time));
    if(this.props.fish!==false)for(let i=0;i<4;i++)moving.push(movingFish(time,i,s.reefCompact));
    if(this.props.turtles!==false)for(let i=0;i<2;i++)moving.push(movingTurtle(time,s.reefCompact,i));
    for(const object of moving) {
      const points=object.vertices.map(p=>cam.project(p));
      object.faces.forEach((face,j)=>{
        const a=points[face[0]],b=points[face[1]],c=points[face[2]];
        const xmin=Math.min(a.x,b.x,c.x),xmax=Math.max(a.x,b.x,c.x),ymin=Math.min(a.y,b.y,c.y),ymax=Math.max(a.y,b.y,c.y);
        if(xmax<0||xmin>s.w||ymax<0||ymin>s.h)return;
        const depth=(a.z+b.z+c.z)/3;
        faces.push({a,b,c,xmin,xmax,ymin,ymax,depth,
          ...style(object.material,object.normals[j],depth,cam.distance)});
      });
      nodes.push(...object.nodes.map(index=>({...points[index],material:object.material})));
    }
    ctx.save();
    const actors = paintReefActors(ctx,faces,s.w,s.h,{underlay:cache.surface,workspace:cache.actorWorkspace});
    cache.actorWorkspace = actors.workspace;
    let visibleNodes=0;
    for(const point of nodes) {
      if(point.x<0||point.x>s.w||point.y<0||point.y>s.h)continue;
      if(1/(point.z-.55)<cache.actorWorkspace.depthAt(point.x,point.y))continue;
      const fog=clamp(1-Math.max(0,point.z-cam.distance+85)/1250,.5,1);
      ctx.fillStyle=point.material==='fish'?`rgb(${Array(3).fill(Math.round(195*fog)).join(',')})`
        :mix(WATER,point.material==='coral'?CORAL:PALE,fog*.9);
      ctx.beginPath();ctx.arc(point.x,point.y,point.material==='fish'?.85:s.reefCompact?.65:.8,0,TAU);ctx.fill();visibleNodes++;
    }
    ctx.restore();
    s.reefFrameStats={triangles:cache.stats.triangles+faces.length,visibleNodes:cache.stats.visibleNodes+visibleNodes,
      fish:this.props.fish===false?0:4,turtles:this.props.turtles===false?0:2,
      movingCorals:moving.filter(object=>object.motion).length,cached:true};
  }

  *staticCacheSteps(s) {
    const dpr=Math.min(s.ctx.getTransform?.()?.a||1,2);
    const canvas=typeof OffscreenCanvas==='function' ? new OffscreenCanvas(Math.ceil(s.w*dpr),Math.ceil(s.h*dpr))
      :s.ctx.canvas.ownerDocument.createElement('canvas');
    canvas.width=Math.ceil(s.w*dpr);canvas.height=Math.ceil(s.h*dpr);
    const paint=canvas.getContext('2d');
    if(!paint)throw new Error('Reef cache canvas is unavailable.');
    paint.setTransform(dpr,0,0,dpr,0,0);
    const state={...s,ctx:paint,reefSkipCache:true},still=new Reef();
    still.props={fish:false,turtles:false,motion:false};
    yield* still.directReefSteps(state);
    return {w:s.w,h:s.h,dpr,scene:s.reefScene,canvas,surface:state.reefSurfaceStats,stats:state.reefFrameStats};
  }
}
