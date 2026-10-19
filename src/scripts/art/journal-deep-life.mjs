// Native wire geometry, drawn in CSS pixels. References: Australian Museum
// Myctophidae and MBARI rattail fish.
const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = value => value * value * (3 - 2 * value);
const wrap = (value, span) => ((value % span) + span) % span;
const lerp = (a, b, t) => a + (b - a) * t;
const trace = (ctx, points) => {
  ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
};

function fishMesh(grenadier) {
  const stations = grenadier
    ? [[-.99,.004,.005],[-.79,.019,.014],[-.58,.039,.024],[-.36,.064,.034],[-.15,.098,.047],
      [.06,.139,.068],[.24,.156,.082],[.40,.108,.063],[.51,.034,.030]]
    : [[-.39,.020,.014],[-.30,.057,.032],[-.18,.098,.048],[-.04,.130,.060],
      [.10,.146,.073],[.23,.141,.082],[.35,.111,.073],[.43,.073,.049],[.48,.023,.018]];
  const vertices = [], lines = [], outline = [[], []], detail = 8;
  for (const [row, [x, radius, depth]] of stations.entries()) {
    const ring = [];
    for (let i = 0; i < detail; i++) {
      const angle = i * TAU / detail;
      ring.push(vertices.length);
      vertices.push([x, Math.cos(angle) * radius, Math.sin(angle) * depth]);
    }
    lines.push([...ring, ring[0]]);
    if (row) for (let i = 0; i < detail; i++) lines.push([ring[i] - detail, ring[i]]);
    outline[0].push(ring[0]); outline[1].push(ring[4]);
  }
  const tailTip=vertices.push([grenadier?-1.05:-.40,0,0])-1;
  const nose=vertices.push([grenadier?.535:.495,0,0])-1;
  for(const contour of outline){contour.unshift(tailTip);contour.push(nose);}
  const add = points => { const indices = points.map(point => vertices.push(point) - 1); lines.push(indices); return indices; };
  const fin = (root, edge, end, count) => {
    add([root, edge, end, root]);
    for (let rib = 1; rib < count; rib++) {
      const u = rib / count;
      add([root.map((v, i) => lerp(v, end[i], u * .75)), edge.map((v, i) => lerp(v, end[i], u))]);
    }
  };
  if (grenadier) {
    fin([.17,-.15,0],[.08,-.31,0],[-.12,-.10,0],5);
    // Long low dorsal/anal membranes meet the taper, with no separate tail fork.
    for (const side of [-1,1]) {
      add([[.0,side*.12,0],[-.28,side*.105,0],[-.56,side*.063,0],[-1.03,side*.006,0]]);
      for (let rib=0;rib<6;rib++) {
        const u=rib/6,x=-.12-u*.82,radius=.10*(1-u);
        add([[x,side*radius*.7,0],[x-.025,side*(radius+.021*(1-u)),0]]);
      }
    }
    add([[.40,.094,.04],[.39,.15,.05],[.37,.185,.065]]); // Chin barbel.
  } else {
    fin([.07,-.143,0],[-.03,-.248,0],[-.20,-.095,0],5);
    fin([-.02,.13,0],[-.17,.214,0],[-.32,.055,0],4);
    const tail = [[-.38,-.023,0],[-.63,-.15,0],[-.54,0,0],[-.63,.15,0],[-.38,.023,0]];
    add([...tail,tail[0]]);
    for (let rib=1;rib<6;rib++) {
      const u=rib/6;
      add([[-.39,lerp(-.02,.02,u),0],[-.54-.09*Math.abs(u*2-1),lerp(-.15,.15,u),0]]);
    }
  }
  fin([.22,.04,.075],[.05,.18,.18],[.02,.075,.071],4);
  add([[.28,-.104,.063],[.21,-.049,.084],[.20,.032,.082],[.27,.119,.063]]);
  const eye = grenadier ? [.369,-.044,.067] : [.363,-.040,.068];
  const eyeRadius = grenadier ? .051 : .046;
  const eyeRing = Array.from({length:13},(_,i)=>[
    eye[0]+Math.cos(i*TAU/12)*eyeRadius,eye[1]+Math.sin(i*TAU/12)*eyeRadius,eye[2]+.008]);
  const eyeLine = add(eyeRing);
  const photophores = grenadier ? [] : [
    [.31,.088,.058],[.23,.109,.056],[.12,.12,.052],[.02,.11,.048],[-.08,.098,.042],[-.19,.077,.035],[-.29,.043,.025]];
  const bounds = [0, 1, 2].map(axis => Math.max(...vertices.map(point => Math.abs(point[axis]))));
  return {vertices,lines,outline,eyeLine,eye,photophores,grenadier,bounds};
}
const LANTERNFISH = fishMesh(false), GRENADIER = fishMesh(true);
const FISH = [
  {mesh:LANTERNFISH,x:.84,y:.135,length:78,speed:8.2,direction:-1,phase:.8,opacity:.37},
  {mesh:LANTERNFISH,x:.11,y:.43,length:66,speed:6.7,direction:1,phase:3.2,opacity:.30},
  {mesh:LANTERNFISH,x:.88,y:.65,length:58,speed:7.4,direction:-1,phase:5.8,opacity:.27},
  {mesh:GRENADIER,x:.16,y:null,length:116,speed:5.3,direction:1,phase:2.1,opacity:.37},
];

/** Three lanternfish and a bottom-associated rattail; two lanternfish on phones. */
export function drawDeepFish(ctx, scene, time = 0, current = 0, scroll = 0, viewport) {
  const {width,height,compact,size} = scene;
  ctx.save(); ctx.strokeStyle='#B5C4DF'; ctx.fillStyle='#C5D7EF';
  for (const [index,item] of FISH.entries()) {
    if (compact && index===1) continue;
    const length=item.length*(compact?.76:size),margin=length*1.8;
    const travel=item.speed*time+7*Math.sin(time*.055+item.phase);
    const x=wrap(item.x*width+margin+item.direction*travel,width+2*margin)-margin;
    if(x < -margin*.8 || x > width+margin*.8) continue;
    const y=(item.y===null?height-(compact?133:181)*size:item.y*height)
      +8*Math.sin(time*.08+item.phase)+3*Math.sin(time*.21+item.phase)+scroll*4;
    const edge=Math.min(x,width-x)/width;
    const quiet=1-.76*smooth(clamp((edge-.075)/.18,0,1));
    const alpha=item.opacity*quiet;
    const yaw=.28+.12*Math.sin(time*.07+item.phase),cy=Math.cos(yaw),sy=Math.sin(yaw);
    const pitch=.02*current+.025*Math.cos(time*.12+item.phase),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const [bx,by,bz]=item.mesh.bounds,depth=bz+.075;
    const reach=((bx*Math.abs(cy)+depth*Math.abs(sy))*Math.abs(sp)+(by+depth*.24)*Math.abs(cp))*length+2;
    if(viewport && (y+reach<viewport.top || y-reach>viewport.bottom)) continue;
    const project=([px,py,pz])=>{
      const tail=clamp((.23-px)/(item.mesh.grenadier?1.25:.85),0,1)**1.8;
      pz+=tail*(item.mesh.grenadier?.075:.07)*Math.sin(time*(item.mesh.grenadier?1.8:3.1)+px*5+item.phase);
      const xx=px*cy+pz*sy,yy=py+pz*.24;
      return [x+item.direction*(xx*cp-yy*sp)*length,y+(xx*sp+yy*cp)*length];
    };
    const points=item.mesh.vertices.map(project);
    ctx.globalAlpha=alpha*.48;ctx.lineWidth=.43;ctx.beginPath();
    for(const line of item.mesh.lines)trace(ctx,line.map(i=>points[i]));
    ctx.stroke();ctx.globalAlpha=alpha;ctx.lineWidth=.59;ctx.beginPath();
    for(const line of [...item.mesh.outline,item.mesh.eyeLine])trace(ctx,line.map(i=>points[i]));
    ctx.stroke();
    ctx.globalAlpha=alpha*.90;ctx.beginPath();ctx.arc(...project(item.mesh.eye),Math.max(.48,length*.014),0,TAU);ctx.fill();
    // Photophores are small steady points, never blinking lights behind the copy.
    ctx.globalAlpha=alpha*.94;ctx.beginPath();
    for(const point of item.mesh.photophores){const p=project(point);ctx.moveTo(p[0]+.65,p[1]);ctx.arc(...p,.65,0,TAU);}
    ctx.fill();
  }
  drawDeepMechFish(ctx, scene, time, current, scroll, viewport);
  ctx.restore();
}

/**
 * The Redesigner's Aquatic Mech Suit exploring the deep ocean in Views from the Reef:
 * An articulated wireframe deep-sea exosuit gliding horizontally through the open water
 * with a water-filled spherical dome cockpit housing a coral reef fish inside.
 */
function drawDeepMechFish(ctx, scene, time = 0, current = 0, scroll = 0, viewport) {
  const { width, height, compact, size } = scene;
  const scale = (compact ? 0.78 : size) * 1.05;
  const margin = 120 * scale;
  const speed = 9.5;
  const phase = 1.6;
  const travel = speed * time + 9 * Math.sin(time * 0.06 + phase);
  const x = wrap(0.24 * width + margin + travel, width + 2 * margin) - margin;
  if (x < -margin * 0.85 || x > width + margin * 0.85) return;

  const y = 0.285 * height + 10 * Math.sin(time * 0.09 + phase) + 3.5 * Math.cos(time * 0.22 + phase) + scroll * 5;
  const reach = 64 * scale;
  if (viewport && (y + reach < viewport.top || y - reach > viewport.bottom)) return;

  const edge = Math.min(x, width - x) / width;
  const quiet = 1 - 0.65 * smooth(clamp((edge - 0.08) / 0.18, 0, 1));
  const alpha = 0.46 * quiet;

  // Forward-tilted deep-sea swimming trim (~18 deg pitch + gentle current sway)
  const pitch = -0.24 + 0.03 * current + 0.04 * Math.sin(time * 0.14 + phase);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const map = (lx, ly) => [
    x + (lx * cp - ly * sp) * scale,
    y + (lx * sp + ly * cp) * scale,
  ];
  const poly = (pts, close = true) => {
    const mapped = pts.map(([lx, ly]) => map(lx, ly));
    trace(ctx, mapped);
    if (close) ctx.closePath();
  };

  ctx.save();
  ctx.strokeStyle = '#9BB2FF';
  ctx.fillStyle = '#0E1B38';

  // 1. Articulated hydro-fin legs kicking in an alternating scissor stroke
  const kickA = Math.sin(time * 2.2) * 5.2;
  const kickB = -kickA;
  ctx.lineWidth = 0.65;
  for (const [legIdx, kick] of [[-1, kickA], [1, kickB]]) {
    const hip = [-14, 6 + legIdx * 2.2];
    const knee = [-30, 10 + kick * 0.55 + legIdx * 2.4];
    const ankle = [-45, 13 + kick + legIdx * 2.4];
    const finTip1 = [-58, 11 + kick * 1.15 + legIdx * 2.0];
    const finTip2 = [-55, 19 + kick * 1.15 + legIdx * 2.6];

    ctx.globalAlpha = alpha * (legIdx < 0 ? 0.62 : 0.92);
    ctx.beginPath();
    poly([
      [hip[0], hip[1] - 2.4],
      [knee[0], knee[1] - 2.1],
      [knee[0], knee[1] + 2.1],
      [hip[0], hip[1] + 2.4],
    ]);
    poly([
      [knee[0], knee[1] - 1.9],
      [ankle[0], ankle[1] - 1.7],
      [ankle[0], ankle[1] + 1.7],
      [knee[0], knee[1] + 1.9],
    ]);
    poly([ankle, finTip1, finTip2]);
    ctx.fill();
    ctx.stroke();

    // Knee & ankle servo joints
    const [kx, ky] = map(...knee);
    const [ax, ay] = map(...ankle);
    ctx.beginPath();
    ctx.moveTo(kx + 2.1 * scale, ky);
    ctx.arc(kx, ky, 2.1 * scale, 0, TAU);
    ctx.moveTo(ax + 1.7 * scale, ay);
    ctx.arc(ax, ay, 1.7 * scale, 0, TAU);
    ctx.stroke();
  }

  // 2. Pressurized Mech Torso & Hydro-Thruster Dive Pack
  ctx.globalAlpha = alpha * 0.95;
  ctx.fillStyle = '#101F3F';
  ctx.lineWidth = 0.72;
  ctx.beginPath();
  // Main chassis hull
  poly([
    [-16, -9],
    [10, -11],
    [16, -4],
    [12, 9],
    [-14, 10],
    [-19, 2],
  ]);
  // Dorsal hydro-thruster pack
  poly([
    [-22, -12],
    [-4, -13],
    [-2, -9],
    [-20, -7],
  ]);
  ctx.fill();
  ctx.stroke();

  // Internal chassis structural ribs + thruster wake rings
  ctx.globalAlpha = alpha * 0.55;
  ctx.lineWidth = 0.48;
  ctx.beginPath();
  poly([[-8, -9], [-8, 9]], false);
  poly([[2, -10], [2, 9]], false);
  poly([[-15, 0], [13, 0]], false);
  for (let w = 0; w < 2; w++) {
    const pulse = ((time * 0.9 + w * 0.5) % 1);
    const [wx, wy] = map(-25 - pulse * 14, -9.5);
    const wr = (2.2 + pulse * 3.0) * scale;
    ctx.moveTo(wx + wr, wy);
    ctx.arc(wx, wy, wr, 0, TAU);
  }
  ctx.stroke();

  // 3. Water-Filled Spherical Glass Dome Cockpit (front/head of the mech at [24, -2])
  const [dx, dy] = map(24, -2);
  const domeR = 13.5 * scale;
  ctx.globalAlpha = alpha * 0.32;
  ctx.fillStyle = '#1D396B';
  ctx.beginPath();
  ctx.moveTo(dx + domeR, dy);
  ctx.arc(dx, dy, domeR, 0, TAU);
  ctx.fill();

  // Dome outer ring, brass/blue collar flange, and geodesic latitude/longitude ribs
  ctx.globalAlpha = alpha * 0.98;
  ctx.strokeStyle = '#B5C8FF';
  ctx.lineWidth = 0.78;
  ctx.beginPath();
  ctx.moveTo(dx + domeR, dy);
  ctx.arc(dx, dy, domeR, 0, TAU);
  poly([[11, -10.5], [15, -11.5], [15, 7.5], [11, 6.5]]);
  ctx.stroke();

  // Water surface ripple & tiny air bubbles inside the dome cockpit
  ctx.globalAlpha = alpha * 0.55;
  ctx.lineWidth = 0.46;
  ctx.beginPath();
  const waterPts = [];
  for (let i = -5; i <= 5; i++) {
    const u = i / 5;
    const wx = dx + u * domeR * 0.86;
    const wy = dy - domeR * 0.42 + Math.sin(time * 2.4 + u * 3.2) * 1.1 * scale;
    waterPts.push([wx, wy]);
  }
  trace(ctx, waterPts);
  const [b1x, b1y] = [dx - 3.5 * scale, dy - (3 + ((time * 4) % 5)) * scale];
  const [b2x, b2y] = [dx + 4.2 * scale, dy - (2 + ((time * 4 + 2.5) % 5)) * scale];
  ctx.moveTo(b1x + 0.9 * scale, b1y);
  ctx.arc(b1x, b1y, 0.9 * scale, 0, TAU);
  ctx.moveTo(b2x + 0.7 * scale, b2y);
  ctx.arc(b2x, b2y, 0.7 * scale, 0, TAU);
  ctx.stroke();

  // 4. The Coral Reef Fish (#FF6655) swimming happily inside the water-filled cockpit!
  const fishBobX = dx + Math.sin(time * 1.7) * 2.2 * scale;
  const fishBobY = dy + 1.0 * scale + Math.cos(time * 2.3) * 1.5 * scale;
  const tailWag = Math.sin(time * 6.5) * 1.8 * scale;
  const fPts = [
    [fishBobX + 6.2 * scale, fishBobY],
    [fishBobX + 2.2 * scale, fishBobY - 3.3 * scale],
    [fishBobX - 3.2 * scale, fishBobY - 2.1 * scale],
    [fishBobX - 5.2 * scale, fishBobY - 0.6 * scale + tailWag * 0.3],
    [fishBobX - 8.4 * scale, fishBobY - 3.4 * scale + tailWag],
    [fishBobX - 6.8 * scale, fishBobY + tailWag * 0.5],
    [fishBobX - 8.4 * scale, fishBobY + 3.4 * scale + tailWag],
    [fishBobX - 5.2 * scale, fishBobY + 0.6 * scale + tailWag * 0.3],
    [fishBobX - 3.2 * scale, fishBobY + 2.1 * scale],
    [fishBobX + 2.2 * scale, fishBobY + 3.3 * scale],
  ];
  ctx.globalAlpha = Math.min(0.92, alpha * 1.75);
  ctx.fillStyle = '#FF6655';
  ctx.strokeStyle = '#FF6655';
  ctx.lineWidth = 0.68;
  ctx.beginPath();
  trace(ctx, fPts);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fish eye & pectoral fin inside dome
  ctx.fillStyle = '#F3F0E8';
  ctx.beginPath();
  ctx.moveTo(fishBobX + 4.3 * scale, fishBobY - 0.7 * scale);
  ctx.arc(fishBobX + 3.6 * scale, fishBobY - 0.7 * scale, 0.7 * scale, 0, TAU);
  ctx.fill();

  // 5. Foreground articulated mechanical arm & manipulator claw swept along the hull
  const armSway = Math.sin(time * 1.4 + 0.8) * 2.2;
  const sh = [6, 5];
  const el = [-4, 13 + armSway * 0.6];
  const wr = [12, 15 + armSway];
  ctx.globalAlpha = alpha * 0.92;
  ctx.strokeStyle = '#9BB2FF';
  ctx.fillStyle = '#101F3F';
  ctx.lineWidth = 0.68;
  ctx.beginPath();
  poly([
    [sh[0] - 2, sh[1] - 1.8],
    [el[0] - 1.8, el[1] - 1.8],
    [el[0] + 1.8, el[1] + 1.8],
    [sh[0] + 2, sh[1] + 1.8],
  ]);
  poly([
    [el[0] - 1.5, el[1] - 1.6],
    [wr[0] - 1.5, wr[1] - 1.6],
    [wr[0] + 1.5, wr[1] + 1.6],
    [el[0] + 1.5, el[1] + 1.6],
  ]);
  ctx.fill();
  ctx.stroke();

  // Pincer claw tips
  ctx.beginPath();
  poly([[wr[0], wr[1] - 1.2], [wr[0] + 5.2, wr[1] - 2.8], [wr[0] + 7.2, wr[1] - 0.8]], false);
  poly([[wr[0], wr[1] + 1.2], [wr[0] + 5.2, wr[1] + 2.8], [wr[0] + 7.2, wr[1] + 0.8]], false);
  ctx.stroke();

  ctx.restore();
}

