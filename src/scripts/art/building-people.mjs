// Building-local figures. The original editable Figma figures remain untouched.
// Every joint and silhouette is projected from the room's world coordinates.
const PAPER = 'var(--building-paper, #F3F0E8)';
const CORAL = 'var(--building-coral, #FF6655)';
const TAU = Math.PI * 2;
// Static world-space poses are shared across scrolling frames. Projection and
// visibility are still evaluated at the exact current angle, without snapping.
const geometryCache=new Map();
const cachedGeometry=(key,create)=>{
  if(!geometryCache.has(key)) {
    if(geometryCache.size>=160) geometryCache.delete(geometryCache.keys().next().value);
    geometryCache.set(key,create());
  }
  return geometryCache.get(key);
};
const add = (a,b) => a.map((v,i) => v+b[i]);
const sub = (a,b) => a.map((v,i) => v-b[i]);
const mul = (a,s) => a.map(v => v*s);
const dot = (a,b) => a.reduce((sum,v,i) => sum+v*b[i],0);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length = a => Math.hypot(...a);
const unit = a => mul(a,1/(length(a)||1));
const mix = (a,b,t) => add(mul(a,1-t),mul(b,t));
const number = n => Number(n.toFixed(3));
const pair = point => point.map(number).join(',');

function hull(points) {
  const sorted = points.map(p => [p[0],p[1]]).sort((a,b) => a[0]-b[0] || a[1]-b[1]);
  const turn = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const half = input => {
    const result=[];
    for (const point of input) {
      while (result.length>1 && turn(result.at(-2),result.at(-1),point)<=0) result.pop();
      result.push(point);
    }
    return result;
  };
  return [...half(sorted).slice(0,-1),...half(sorted.slice().reverse()).slice(0,-1)];
}

// Rounded joins retain a human silhouette without outlining a polygon mesh.
function roundedPath(points) {
  const midpoint = (a,b) => [(a[0]+b[0])/2,(a[1]+b[1])/2];
  let d=`M${pair(midpoint(points.at(-1),points[0]))}`;
  points.forEach((point,i) => { d+=`Q${pair(point)} ${pair(midpoint(point,points[(i+1)%points.length]))}`; });
  return d+'Z';
}

function painted(d, shade=.065) {
  return `<path d="${d}" fill="${PAPER}" stroke="none"/><path d="${d}" fill="${CORAL}" fill-opacity="${shade}" stroke="${CORAL}" stroke-width=".72" stroke-linejoin="round"/>`;
}

// Visibility uses small surface meshes only as depth masks. The visible artwork
// retains its rounded outlines; no mesh edges are drawn. A projected triangle
// has linear viewing depth, so its overlap with a nearer triangle can be clipped
// exactly with half-planes rather than sampled into pixels.
function surfaceMesh(rings, outward) {
  const faces=[];
  const addFace=(a,b,c)=>{
    const centre=mul(add(add(a,b),c),1/3);
    if(dot(cross(sub(b,a),sub(c,a)),outward(centre))<0) [b,c]=[c,b];
    faces.push([a,b,c]);
  };
  for(let row=1;row<rings.length;row++) for(let i=0;i<rings[row].length;i++) {
    const j=(i+1)%rings[row].length;
    addFace(rings[row-1][i],rings[row][i],rings[row][j]);
    addFace(rings[row-1][i],rings[row][j],rings[row-1][j]);
  }
  return faces;
}

function capsuleMesh(a,b,ra,rb) {
  return cachedGeometry(`capsule:${a}:${b}:${ra}:${rb}`,()=>{
  const axis=unit(sub(b,a)), span=length(sub(b,a));
  const u=unit(cross(axis,Math.abs(axis[2])<.9?[0,0,1]:[0,1,0])), v=cross(axis,u);
  const tangent=Math.acos(Math.max(-1,Math.min(1,(ra-rb)/(span||1))));
  const rings=[];
  for(const [centre,radius,from,to] of [[a,ra,Math.PI,tangent],[b,rb,tangent,0]]) {
    // These hidden depth facets are finer than the visible .72-unit outline.
    // The separately authored 20-point capsule silhouette is unchanged.
    for(let row=0;row<=2;row++) {
      const phi=from+(to-from)*row/2;
      rings.push(Array.from({length:8},(_,i)=>{
        const radial=add(mul(u,Math.cos(TAU*i/8)),mul(v,Math.sin(TAU*i/8)));
        return add(centre,add(mul(axis,radius*Math.cos(phi)),mul(radial,radius*Math.sin(phi))));
      }));
    }
  }
    return surfaceMesh(rings,point=>sub(point,add(a,mul(axis,Math.max(0,Math.min(span,dot(sub(point,a),axis)))))));
  });
}

function projectedFaces(mesh,project,depth,view) {
  const result=[], vertices=new Map();
  const vertex=point=>{
    if(!vertices.has(point)) vertices.set(point,[...project(point),depth(point)]);
    return vertices.get(point);
  };
  for(const face of mesh) {
    if(dot(cross(sub(face[1],face[0]),sub(face[2],face[0])),view)<=1e-9) continue;
    const points=face.map(vertex);
    const [a,b,c]=points, determinant=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(Math.abs(determinant)<1e-6) continue;
    const dx=((b[2]-a[2])*(c[1]-a[1])-(c[2]-a[2])*(b[1]-a[1]))/determinant;
    const dy=((b[0]-a[0])*(c[2]-a[2])-(c[0]-a[0])*(b[2]-a[2]))/determinant;
    result.push({points,at:p=>a[2]+dx*(p[0]-a[0])+dy*(p[1]-a[1]),
      sign:Math.sign(determinant),bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]});
  }
  return result;
}

function clipHalfPlane(points,inside) {
  const result=[];
  for(let i=0;i<points.length;i++) {
    const a=points[i], b=points[(i+1)%points.length], da=inside(a), db=inside(b);
    if(da>=0) result.push(a);
    if((da<0)!==(db<0)) result.push(mix(a,b,da/(da-db)));
  }
  return result;
}

function hiddenSurface(arm,body) {
  let path='';
  for(const a of arm) for(const b of body) {
    if(a.bounds[2]<b.bounds[0] || b.bounds[2]<a.bounds[0] || a.bounds[3]<b.bounds[1] || b.bounds[3]<a.bounds[1]) continue;
    let polygon=a.points.map(p=>p.slice(0,2));
    for(let edge=0;edge<3 && polygon.length;edge++) {
      const u=b.points[edge], v=b.points[(edge+1)%3];
      polygon=clipHalfPlane(polygon,p=>b.sign*((v[0]-u[0])*(p[1]-u[1])-(v[1]-u[1])*(p[0]-u[0])));
    }
    if(polygon.length) polygon=clipHalfPlane(polygon,p=>b.at(p)-a.at(p)-.015);
    if(polygon.length>2) path+=`M${polygon.map(pair).join('L')}Z`;
  }
  return path;
}

/**
 * heading is in radians: 0 faces world +y; Math.PI faces world -y.
 * target is the desired world [x,y,z] contact point (right hand, or the centre
 * between both hands for seated/holding-records poses). Unreachable contacts
 * are clamped to a 17-unit arm, and returned in each arm's hand metadata.
 *
 * Returns separately sortable {name,x,y,z,depth,role,markup} parts. Only contact
 * forearms/hands have role='reach'. Each segment carries its own body-depth mask,
 * so overlaying a hand above its work surface cannot reveal a far arm through
 * the torso. Supply an instance-unique id when several figures share an SVG.
 */
export function humanParts({project,x,y,heading=0,pose='standing',kind='man',target,id}={}) {
  if (typeof project!=='function' || ![x,y,heading].every(Number.isFinite)) throw new TypeError('A figure needs project and finite world coordinates.');
  if (!['man','woman'].includes(kind)) throw new RangeError('Building figures must be human.');
  const aliases={leaning:'collaborating',reading:'holding-records'};
  pose=aliases[pose]||pose;
  if (!['standing','pointing','collaborating','seated','holding-records'].includes(pose)) throw new RangeError('Unknown building pose: '+pose);
  if (target && (!Array.isArray(target) || target.length!==3 || !target.every(Number.isFinite))) throw new TypeError('A hand target must be a finite world [x,y,z] point.');
  const forward=[Math.sin(heading),Math.cos(heading),0], right=[Math.cos(heading),-Math.sin(heading),0];
  const local=(u,v,z) => [x+right[0]*u+forward[0]*v,y+right[1]*u+forward[1]*v,z];
  const projectedVertices=new Map(), vertexDepths=new Map();
  const projected=point => {
    if(!projectedVertices.has(point)) projectedVertices.set(point,project(...point));
    return projectedVertices.get(point);
  };
  const depth=point => {
    if(!vertexDepths.has(point)) vertexDepths.set(point,project(point[0],point[1],0)[1]+.405*point[2]);
    return vertexDepths.get(point);
  };
  const prefix=String(id||`human-${x}-${y}-${heading}-${pose}`).replace(/[^a-zA-Z0-9_-]/g,'_');
  const cameraOrigin=projected([0,0,0]);
  const cameraAxes=[[1000,0,0],[0,1000,0],[0,0,1000]].map(point=>mul(sub(projected(point),cameraOrigin),.001));
  const view=cross(cameraAxes.map(a=>a[0]),cameraAxes.map(a=>a[1]));
  const seated=pose==='seated', lean=pose==='collaborating';
  const hipZ=seated?13:21, shoulderZ=seated?26:lean?32:34;
  const leanForward=seated?1:lean?2.7:0;
  const headZ=seated?33.5:lean?39.5:41.5;
  const parts=[], body=[], occluders=[];
  const shape=(worldPoints,shade=.065) => painted(roundedPath(hull(worldPoints.map(projected))),shade);
  const ellipsoidGeometry=(centre,radii,mesh=false) => {
    const geometry=cachedGeometry(`ellipsoid:${centre}:${radii}:${heading}:${mesh}`,()=>{
    const rings=[];
    for (let latitude=0;latitude<=6;latitude++) {
      const phi=-Math.PI/2+Math.PI*latitude/6;
      const ring=[];
      for (let longitude=0;longitude<16;longitude++) {
        const theta=TAU*longitude/16;
        ring.push(add(centre,add(add(mul(right,radii[0]*Math.cos(phi)*Math.cos(theta)),mul(forward,radii[1]*Math.cos(phi)*Math.sin(theta))),[0,0,radii[2]*Math.sin(phi)])));
      }
      rings.push(ring);
    }
      return {points:rings.flat(),mesh:mesh?surfaceMesh(rings,point=>sub(point,centre)):null};
    });
    const points=geometry.points.map(projected);
    return {d:roundedPath(hull(points)),mesh:geometry.mesh,bounds:bounds(points)};
  };
  const ellipsoid=(centre,radii,shade=.065)=>painted(ellipsoidGeometry(centre,radii).d,shade);

  // Project a world-space sphere into its screen ellipse. Joining the endpoint
  // ellipses gives a rounded capsule even when a limb points towards the viewer.
  const origin=projected([0,0,0]);
  const axes=[[1,0,0],[0,1,0],[0,0,1]].map(point=>sub(projected(point),origin));
  const xx=axes.reduce((sum,a)=>sum+a[0]*a[0],0), yy=axes.reduce((sum,a)=>sum+a[1]*a[1],0), xy=axes.reduce((sum,a)=>sum+a[0]*a[1],0);
  const tilt=.5*Math.atan2(2*xy,xx-yy), spread=Math.hypot(xx-yy,2*xy);
  const major=Math.sqrt((xx+yy+spread)/2), minor=Math.sqrt((xx+yy-spread)/2);
  const sphereOutline=(centre,radius)=>{
    const point=projected(centre), result=[];
    for(let sample=0;sample<20;sample++) {
      const theta=TAU*sample/20, u=radius*major*Math.cos(theta), v=radius*minor*Math.sin(theta);
      result.push([point[0]+u*Math.cos(tilt)-v*Math.sin(tilt),point[1]+u*Math.sin(tilt)+v*Math.cos(tilt)]);
    }
    return result;
  };
  // Paint all capsule outlines, then their joined fill. Internal outlines are
  // covered, retaining a single soft silhouette without visible joint circles.
  // Unlike offsetting one projected centreline, this cannot fold into a bow tie
  // when the projected elbow reverses direction during a room turn.
  const limb=(joints,radii,shade=.065,strokeMask='') => {
    const contours=joints.slice(1).map((joint,i)=>roundedPath(hull([...sphereOutline(joints[i],radii[i]),...sphereOutline(joint,radii[i+1])])));
    const paths=contours.map(d=>`<path d="${d}"/>`).join('');
    return `<g fill="${CORAL}" stroke="${CORAL}" stroke-width="1.44" stroke-linejoin="round"${strokeMask?` mask="url(#${strokeMask})"`:''}>${paths}</g><g fill="${PAPER}" stroke="none">${paths}</g><g fill="${CORAL}" stroke="none" opacity="${shade}">${paths}</g>`;
  };
  const bounds=points=>[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
  const overlaps=(a,b)=>a[2]>=b[0] && b[2]>=a[0] && a[3]>=b[1] && b[3]>=a[1];
  const maskedSegment=(name,markup,outline,mesh,restrict=true)=>{
    const extent=bounds(outline);
    const relevant=occluders.map((body,i)=>({body,i})).filter(({body})=>overlaps(extent,body.bounds));
    if(!relevant.length && !restrict) return {markup,hiddenFaces:0};
    const faces=relevant.length?projectedFaces(mesh,projected,depth,view):[];
    const hidden=relevant.map(({body,i})=>{
      body.faces ||= projectedFaces(body.mesh,projected,depth,view);
      return {i,path:hiddenSurface(faces,body.faces)};
    }).filter(body=>body.path);
    const maskId=`${prefix}-${name}-visibility`;
    const xs=outline.map(p=>p[0]), ys=outline.map(p=>p[1]);
    const left=Math.min(...xs)-2, top=Math.min(...ys)-2, width=Math.max(...xs)-left+2, height=Math.max(...ys)-top+2;
    const mask=`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="${number(left)}" y="${number(top)}" width="${number(width)}" height="${number(height)}" style="mask-type:luminance"><path d="${roundedPath(hull(outline))}" fill="white" stroke="white" stroke-width="1.6"/>${hidden.map(({i,path})=>`<g clip-path="url(#${prefix}-body-surface-${i})"><path d="${path}" fill="black" stroke="black" stroke-width="1.6" stroke-linejoin="round"/></g>`).join('')}</mask>`;
    return {markup:`<defs>${mask}</defs><g mask="url(#${maskId})">${markup}</g>`,hiddenFaces:hidden.reduce((count,item)=>count+(item.path.match(/M/g)||[]).length,0)};
  };

  for (const side of [-1,1]) {
    const hip=local(side*2.6,0,hipZ), knee=local(side*2.8,seated?8:0,11.5), ankle=local(side*3,seated?9:.4,1.5);
    body.push({at:knee,markup:limb([hip,knee,ankle],[1.9,1.55,1.15],.075)});
    const foot=local(side*3,seated?10.7:2,1);
    body.push({at:foot,markup:ellipsoid(foot,[1.45,3,1],.1)});
  }
  const torso=[], torsoRings=[];
  for (const [z,uRadius,vRadius,v] of [[hipZ,3.6,2.3,0],[hipZ+5,3.25,2.2,leanForward*.4],[shoulderZ,4.6,2.4,leanForward],[shoulderZ+1,3.8,2.1,leanForward]]) {
    const ring=[];
    for(let i=0;i<16;i++) {
      const theta=TAU*i/16;
      ring.push(local(uRadius*Math.cos(theta),v+vRadius*Math.sin(theta),z));
    }
    torso.push(...ring);torsoRings.push(ring);
  }
  const torsoCentre=local(0,leanForward*.5,(hipZ+shoulderZ)/2);
  const torsoD=roundedPath(hull(torso.map(projected)));
  // The painted torso is a convex silhouette. Its waist ring sits inside that
  // solid, so it must not make a hollow occluder underneath the visible fill.
  const torsoMesh=surfaceMesh([torsoRings[0],...torsoRings.slice(2)],point=>[point[0]-torsoCentre[0],point[1]-torsoCentre[1],0]);
  const top=torsoRings.at(-1), topCentre=local(0,leanForward,shoulderZ+1);
  for(let i=0;i<top.length;i++) torsoMesh.push([topCentre,top[i],top[(i+1)%top.length]]);
  body.push({at:torsoCentre,markup:painted(torsoD,.075)});
  const neck=local(0,leanForward,shoulderZ+2.7), head=local(0,leanForward+.2,headZ);
  const neckGeometry=ellipsoidGeometry(neck,[1.45,1.4,1.7],true), headGeometry=ellipsoidGeometry(head,[3.0,3.25,3.5],true);
  for(const geometry of [{d:torsoD,mesh:torsoMesh,bounds:bounds(torso.map(projected))},neckGeometry,headGeometry]) {
    occluders.push({d:geometry.d,mesh:geometry.mesh,bounds:geometry.bounds});
  }
  body.sort((a,b) => depth(a.at)-depth(b.at));
  const bodyDefinitions=`<defs>${occluders.map((body,i)=>`<clipPath id="${prefix}-body-surface-${i}"><path d="${body.d}"/></clipPath>`).join('')}</defs>`;
  parts.push({name:'human-body',x,y,z:(hipZ+headZ)/2,role:'body',markup:`${bodyDefinitions}<g data-figure="${kind}" data-pose="${pose}" data-human-geometry="world">${body.map(part=>part.markup).join('')}</g>`});
  // A head is above a desk even when its footpoint sorts behind that desk.
  // Give this separate part its actual viewing depth instead of the footpoint.
  parts.push({name:'human-head',x:head[0],y:head[1],z:head[2],depth:depth(head),role:'head',
    markup:painted(neckGeometry.d,.065)+painted(headGeometry.d,.045)});

  const defaultTarget=pose==='pointing'?local(8,12,34):pose==='seated'?local(0,13,20.5):pose==='holding-records'?local(0,8,25):local(4,12,20.5);
  const centreTarget=target||defaultTarget;
  for (const side of [-1,1]) {
    const reaching=pose==='seated'||pose==='holding-records'||(side===1 && (pose==='pointing'||pose==='collaborating'));
    const shoulder=local(side*4.25,leanForward,shoulderZ);
    const requested=reaching
      ? add(centreTarget,mul(right,(pose==='seated'?2.8:pose==='holding-records'?3.7:0)*side))
      : local(side*5.3,.5,seated?13:18);
    const delta=sub(requested,shoulder), distance=length(delta), reach=17;
    const direction=distance>1e-8?unit(delta):[0,0,-1], used=Math.max(1.01,Math.min(reach-.001,distance));
    const hand=add(shoulder,mul(direction,used));
    const bendHint=add(mul(right,side*.35),[0,0,-1]);
    let bend=sub(bendHint,mul(direction,dot(bendHint,direction)));
    if(length(bend)<1e-6) bend=right;
    bend=unit(bend);
    const upper=9,lower=8,along=(upper*upper-lower*lower+used*used)/(2*used),across=Math.sqrt(Math.max(0,upper*upper-along*along));
    const elbow=add(add(shoulder,mul(direction,along)),mul(bend,across));
    const armName=side<0?'human-left-arm':'human-right-arm';
    const handMetadata={requested,position:hand,clamped:Math.abs(used-distance)>1e-6,distance,reach};
    // A shoulder is joined to the torso, not a ball resting on its surface.
    // Remove the internal proximal contour only where that attachment overlaps
    // the torso silhouette. Its outer boundary and all depth masks remain.
    const attachmentEnd=mix(shoulder,elbow,.3);
    const attachment=roundedPath(hull([...sphereOutline(shoulder,1.8),...sphereOutline(attachmentEnd,1.6)]));
    const jointId=`${prefix}-${armName}-joined-shoulder`;
    const jointBounds=bounds([...sphereOutline(shoulder,3),...sphereOutline(elbow,3),...sphereOutline(hand,3)]);
    const jointDefinition=`<mask id="${jointId}" maskUnits="userSpaceOnUse" x="${number(jointBounds[0])}" y="${number(jointBounds[1])}" width="${number(jointBounds[2]-jointBounds[0])}" height="${number(jointBounds[3]-jointBounds[1])}" style="mask-type:luminance"><rect x="${number(jointBounds[0])}" y="${number(jointBounds[1])}" width="${number(jointBounds[2]-jointBounds[0])}" height="${number(jointBounds[3]-jointBounds[1])}" fill="white" stroke="none"/><g clip-path="url(#${prefix}-body-surface-0)"><path d="${attachment}" fill="black" stroke="black" stroke-width="1.6"/></g></mask>`;
    const armArtwork=limb([shoulder,elbow,hand],[1.65,1.3,.9],.075,jointId);
    const artworkId=`${prefix}-${armName}-artwork`;
    // Reuse the joined arm artwork inside each bone's visibility region. This
    // preserves the smooth elbow without drawing a circular joint or seam.
    for(const [segment,a,b,ra,rb,role] of [
      ['upper',shoulder,elbow,1.65,1.3,'arm'],
      ['forearm',elbow,hand,1.3,.9,reaching?'reach':'arm'],
    ]) {
      const at=mix(a,b,.5), name=`${armName}-${segment}`;
      const visibility=maskedSegment(name,`<use href="#${artworkId}"/>`,[...sphereOutline(a,ra),...sphereOutline(b,rb)],capsuleMesh(a,b,ra,rb));
      const definitions=segment==='upper'?`<defs>${jointDefinition}<g id="${artworkId}">${armArtwork}</g></defs>`:'';
      parts.push({name,x:at[0],y:at[1],z:at[2],depth:depth(at),role,markup:definitions+visibility.markup,
        visibility:{hiddenFaces:visibility.hiddenFaces},...(segment==='forearm'?{hand:handMetadata}:{})});
    }
    const handGeometry=ellipsoidGeometry(hand,[.9,1.05,.9],true);
    const handVisibility=maskedSegment(`${armName}-hand`,painted(handGeometry.d,.055),hull(handGeometry.mesh.flat().map(projected)),handGeometry.mesh,false);
    parts.push({name:`${armName}-hand`,x:hand[0],y:hand[1],z:hand[2],depth:depth(hand),role:reaching?'reach':'arm',markup:handVisibility.markup});
  }
  if(pose==='holding-records') {
    const hands=parts.filter(part=>part.role==='reach' && part.hand).map(part=>part.hand.position);
    const centre=mix(hands[0],hands[1],.5);
    const corners=[add(hands[0],[0,0,-4]),add(hands[1],[0,0,-4]),add(hands[1],[0,0,4]),add(hands[0],[0,0,4])];
    const d=`M${corners.map(point=>pair(projected(point))).join('L')}Z`;
    parts.push({name:'held-record',x:centre[0],y:centre[1],z:centre[2],role:'document',markup:painted(d,.035)});
  }
  return parts;
}
