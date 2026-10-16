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
    if(geometryCache.size>=512) geometryCache.delete(geometryCache.keys().next().value);
    geometryCache.set(key,create());
  }
  return geometryCache.get(key);
};
const add = (a,b) => a.length===2 ? [a[0]+b[0],a[1]+b[1]] : [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub = (a,b) => a.length===2 ? [a[0]-b[0],a[1]-b[1]] : [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul = (a,s) => a.length===2 ? [a[0]*s,a[1]*s] : [a[0]*s,a[1]*s,a[2]*s];
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length = a => Math.hypot(a[0],a[1],a[2]);
const unit = a => mul(a,1/(length(a)||1));
const mix = (a,b,t) => a.length===2
  ? [a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t]
  : [a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t,a[2]*(1-t)+b[2]*t];
const number = n => Number(n.toFixed(3));
const pair = point => `${number(point[0])},${number(point[1])}`;

function bounds(points) {
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  for (let i=0; i<points.length; i++) {
    const x=points[i][0], y=points[i][1];
    if (x<minX) minX=x;
    if (y<minY) minY=y;
    if (x>maxX) maxX=x;
    if (y>maxY) maxY=y;
  }
  return [minX,minY,maxX,maxY];
}

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

/**
 * heading is in radians: 0 faces world +y; Math.PI faces world -y.
 * target is the desired world [x,y,z] contact point (right hand, or the centre
 * between both hands for seated/holding-records poses). Unreachable contacts
 * are clamped to a 17-unit arm, and returned in each arm's hand metadata.
 *
 * Returns separately sortable {name,x,y,z,depth,role,markup} parts. Only contact
 * forearms/hands have role='reach'. Supply an instance-unique id when several
 * figures share an SVG.
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
  const seated=pose==='seated', lean=pose==='collaborating';
  const hipZ=seated?13:21, shoulderZ=seated?26:lean?32:34;
  const leanForward=seated?1:lean?2.7:0;
  const headZ=seated?33.5:lean?39.5:41.5;
  const parts=[], body=[];
  const ellipsoidGeometry=(centre,radii) => {
    const geometry=cachedGeometry(`ellipsoid:${centre}:${radii}:${heading}`,()=>{
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
      return {points:rings.flat()};
    });
    const points=geometry.points.map(projected), outline=hull(points);
    return {d:roundedPath(outline),outline};
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
  const limb=(joints,radii,shade=.065,shoulderClip='',attachment='') => {
    const contours=joints.slice(1).map((joint,i)=>roundedPath(hull([...sphereOutline(joints[i],radii[i]),...sphereOutline(joint,radii[i+1])])));
    const paths=contours.map(d=>`<path d="${d}"/>`).join('');
    const seam=shoulderClip&&attachment?`<g clip-path="url(#${shoulderClip})"><path d="${attachment}" fill="${PAPER}" stroke="none"/><path d="${attachment}" fill="${CORAL}" fill-opacity="${shade}" stroke="none"/></g>`:'';
    return `<g fill="${CORAL}" stroke="${CORAL}" stroke-width="1.44" stroke-linejoin="round">${paths}</g>${seam}<g fill="${PAPER}" stroke="none">${paths}</g><g fill="${CORAL}" stroke="none" opacity="${shade}">${paths}</g>`;
  };
  const canonicalDepth = point => .45 * (point[0] + point[1]) + .405 * point[2];

  for (const side of [-1,1]) {
    const hip=local(side*2.6,0,hipZ), knee=local(side*2.8,seated?8:0,11.5), ankle=local(side*3,seated?9:.4,1.5);
    body.push({order:canonicalDepth(knee),markup:limb([hip,knee,ankle],[1.9,1.55,1.15],.075)});
    const foot=local(side*3,seated?10.7:2,1);
    body.push({order:canonicalDepth(foot),markup:ellipsoid(foot,[1.45,3,1],.1)});
  }
  const {torso,torsoCentre}=cachedGeometry(`torso:${x}:${y}:${heading}:${pose}`,()=>{
    const torso=[];
    for (const [z,uRadius,vRadius,v] of [[hipZ,3.6,2.3,0],[hipZ+5,3.25,2.2,leanForward*.4],[shoulderZ,4.6,2.4,leanForward],[shoulderZ+1,3.8,2.1,leanForward]]) {
      for(let i=0;i<16;i++) {
        const theta=TAU*i/16;
        torso.push(local(uRadius*Math.cos(theta),v+vRadius*Math.sin(theta),z));
      }
    }
    const torsoCentre=local(0,leanForward*.5,(hipZ+shoulderZ)/2);
    return {torso,torsoCentre};
  });
  const projectedTorso=torso.map(projected);
  const torsoD=roundedPath(hull(projectedTorso));
  const torsoOrder=canonicalDepth(torsoCentre);
  body.push({order:torsoOrder,markup:painted(torsoD,.075)});
  const neck=local(0,leanForward,shoulderZ+2.7), head=local(0,leanForward+.2,headZ);
  const neckGeometry=ellipsoidGeometry(neck,[1.45,1.4,1.7],false), headGeometry=ellipsoidGeometry(head,[3.0,3.25,3.5],false);
  const headOrder=canonicalDepth(head);
  body.push({order:headOrder,markup:painted(neckGeometry.d,.065)+painted(headGeometry.d,.045)});
  const shoulderClipId=`${prefix}-body-surface-0`;
  const bodyDefinitions=`<defs><clipPath id="${shoulderClipId}"><path d="${torsoD}"/></clipPath></defs>`;

  const defaultTarget=pose==='pointing'?local(8,12,34):pose==='seated'?local(0,13,20.5):pose==='holding-records'?local(0,8,25):local(4,12,20.5);
  const centreTarget=target||defaultTarget;
  const hands=[];
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
    if (reaching) hands.push(hand);
    const attachmentEnd=mix(shoulder,elbow,.3);
    const attachment=roundedPath(hull([...sphereOutline(shoulder,1.8),...sphereOutline(attachmentEnd,1.6)]));
    const handGeometry=ellipsoidGeometry(hand,[.9,1.05,.9],false);
    const handMarkup=painted(handGeometry.d,.055);
    const elbowOrder=canonicalDepth(elbow);
    const behindTorso=elbowOrder<torsoOrder;
    const reachesAcrossFrontSurface=reaching && pose!=='holding-records' && target && (x+y < target[0]+target[1]-4);
    if (behindTorso && !reachesAcrossFrontSurface) {
      body.push({order:Math.min(elbowOrder,torsoOrder-.05)+side*.001,markup:limb([shoulder,elbow,hand],[1.65,1.3,.9],.075)+handMarkup});
    } else if (pose==='holding-records') {
      body.push({order:headOrder+.02+side*.001,markup:limb([shoulder,elbow],[1.65,1.3],.075,shoulderClipId,attachment)});
      body.push({order:headOrder+.08+side*.001,markup:limb([elbow,hand],[1.3,.9],.075)+handMarkup});
    } else if (reachesAcrossFrontSurface) {
      body.push({order:Math.max(elbowOrder,torsoOrder+.05)+side*.001,markup:limb([shoulder,elbow],[1.65,1.3],.075,shoulderClipId,attachment)});
      const forearmAt=mix(elbow,hand,.5);
      parts.push({name:`${armName}-forearm`,x:forearmAt[0],y:forearmAt[1],z:forearmAt[2],depth:depth(forearmAt),role:'reach',
        markup:limb([elbow,hand],[1.3,.9],.075)+handMarkup,visibility:{hiddenFaces:0},hand:handMetadata});
    } else {
      body.push({order:Math.max(elbowOrder,headOrder+.02)+side*.001,markup:limb([shoulder,elbow,hand],[1.65,1.3,.9],.075,shoulderClipId,attachment)+handMarkup});
    }
  }
  if(pose==='holding-records' && hands.length===2) {
    const corners=[add(hands[0],[0,0,-4]),add(hands[1],[0,0,-4]),add(hands[1],[0,0,4]),add(hands[0],[0,0,4])];
    const d=`M${corners.map(point=>pair(projected(point))).join('L')}Z`;
    body.push({order:headOrder+.05,markup:painted(d,.035)});
  }
  body.sort((a,b) => a.order-b.order);
  parts.unshift({name:'human-body',x,y,z:(hipZ+headZ)/2,role:'body',markup:`${bodyDefinitions}<g data-figure="${kind}" data-pose="${pose}" data-human-geometry="world">${body.map(part=>part.markup).join('')}</g>`});
  return parts;
}
