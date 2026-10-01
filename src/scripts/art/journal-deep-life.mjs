// Native wire geometry, drawn in CSS pixels. References: Australian Museum
// Myctophidae; MBARI rattail fish; NOAA glass sponges and deep-water sea pens.
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
  return {vertices,lines,outline,eyeLine,eye,photophores,grenadier};
}
const LANTERNFISH = fishMesh(false), GRENADIER = fishMesh(true);
const FISH = [
  {mesh:LANTERNFISH,x:.84,y:.135,length:78,speed:8.2,direction:-1,phase:.8,opacity:.37},
  {mesh:LANTERNFISH,x:.11,y:.43,length:66,speed:6.7,direction:1,phase:3.2,opacity:.30},
  {mesh:LANTERNFISH,x:.88,y:.65,length:58,speed:7.4,direction:-1,phase:5.8,opacity:.27},
  {mesh:GRENADIER,x:.16,y:null,length:116,speed:5.3,direction:1,phase:2.1,opacity:.37},
];

/** Three lanternfish and a bottom-associated rattail; two lanternfish on phones. */
export function drawDeepFish(ctx, scene, time = 0, current = 0, scroll = 0) {
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
  ctx.restore();
}

const habitats = new WeakMap();
const makePath = lines => {
  if(typeof Path2D==='undefined')return null;
  const path=new Path2D();for(const line of lines)trace(path,line);return path;
};
function attachment(x,y,radius) {
  const ring=Array.from({length:7},(_,i)=>{
    const angle=i*TAU/6,r=radius*(1+.08*Math.sin((i%6)*2.7));
    return [x+Math.cos(angle)*r,y+4+Math.sin(angle)*r*.22];
  });
  const top=[x-radius*.08,y-3],lines=[ring];
  for(let i=0;i<6;i++)lines.push([top,ring[i]]);
  const middle=ring.map(p=>[lerp(top[0],p[0],.57),lerp(top[1],p[1],.57)-1]);
  lines.push(middle);
  for(let i=0;i<6;i++)lines.push([middle[i],ring[(i+1)%6]]);
  return {lines,path:makePath(lines)};
}
function habitat(scene) {
  if(habitats.has(scene))return habitats.get(scene);
  const {width,height,compact,size}=scene,root=height-12;
  const sponges=(compact?[[16,122,18,.08],[width-13,155,21,-.10]]
    :[[25,196,26,.09],[83,125,19,-.06],[width-31,243,32,-.12]]).map(([x,tall,radius,lean],seed)=>{
    const points=[],lines=[],rows=8,segments=8;
    for(let row=0;row<=rows;row++) {
      const u=row/rows,ring=[];
      const reach=radius*(.15+.86*Math.sin(u*Math.PI*.57)**1.1);
      for(let i=0;i<segments;i++) {
        const a=i*TAU/segments+u*.24;
        ring.push(points.length);
        points.push([x+(u*tall*lean+Math.cos(a)*reach)*size,
          root-u*tall*size+Math.sin(a)*reach*size*.28*(.3+.7*u)]);
      }
      lines.push([...ring,ring[0]]);
      if(row)for(let i=0;i<segments;i++)lines.push([ring[i]-segments,ring[i]]);
    }
    // A narrow rim and alternating diagonal bracing read as a glass lattice.
    for(let row=1;row<rows;row+=2)for(let i=0;i<segments;i+=2)lines.push([row*segments+i,(row+1)*segments+(i+1)%segments]);
    const wire=lines.map(line=>line.map(i=>points[i]));
    const rim=Array.from({length:segments+1},(_,i)=>points[rows*segments+i%segments]);
    const roots=Array.from({length:3},(_,i)=>[[x,root-3],[x+(i-1)*radius*size*.35,root-1],
      [x+(i-1)*radius*size*.66,root+1]]);
    return {wire,rim,roots,wirePath:makePath(wire),rimPath:makePath([rim,...roots]),
      foot:attachment(x,root,radius*size*.69),seed};
  });
  const pens=(compact?[[width-37,204,-.08],[32,174,.05]]
    :[[width-87,310,-.08],[54,279,.055]]).map(([x,tall,lean],seed)=>({x,root,height:tall*size,lean,seed,
      foot:attachment(x,root,11*size)}));
  const result={sponges,pens};habitats.set(scene,result);return result;
}

/** Glass sponges stay attached; only the slender sea pens yield to the current. */
export function drawDeepHabitat(ctx, scene, time = 0, current = 0) {
  const {sponges,pens}=habitat(scene);
  ctx.save();ctx.strokeStyle='#91A6C6';ctx.lineWidth=.43;
  for(const {foot} of [...sponges,...pens]) {
    ctx.globalAlpha=scene.compact?.16:.22;
    if(foot.path)ctx.stroke(foot.path);
    else {ctx.beginPath();for(const line of foot.lines)trace(ctx,line);ctx.stroke();}
  }
  for(const sponge of sponges) {
    ctx.globalAlpha=scene.compact?.14:.20;
    if(sponge.wirePath)ctx.stroke(sponge.wirePath);
    else {ctx.beginPath();for(const line of sponge.wire)trace(ctx,line);ctx.stroke();}
    ctx.globalAlpha=scene.compact?.24:.31;ctx.lineWidth=.57;
    if(sponge.rimPath)ctx.stroke(sponge.rimPath);
    else {ctx.beginPath();trace(ctx,sponge.rim);for(const line of sponge.roots)trace(ctx,line);ctx.stroke();}
    ctx.lineWidth=.43;
  }
  for(const pen of pens) {
    const point=u=>[pen.x+pen.height*(pen.lean*u+u*u*(current*.018+
      .012*Math.sin(time*.32-u*2.5+pen.seed))),pen.root-pen.height*u];
    ctx.globalAlpha=scene.compact?.18:.26;ctx.lineWidth=.50;ctx.beginPath();
    trace(ctx,Array.from({length:17},(_,i)=>point(i/16)));
    for(let rib=0;rib<12;rib++) {
      const u=.29+rib*.057,root=point(u);
      const width=Math.sin((u-.19)/.86*Math.PI)**.75*pen.height*.085;
      for(const side of [-1,1]) {
        const end=[root[0]+side*width,root[1]-pen.height*.045];
        trace(ctx,[root,[lerp(root[0],end[0],.60),lerp(root[1],end[1],.35)],end]);
      }
    }
    ctx.stroke();
    ctx.globalAlpha*=.75;ctx.lineWidth=.4;ctx.beginPath();
    for(const side of [-1,1])trace(ctx,[[pen.x,pen.root-4],[pen.x+side*4,pen.root],[pen.x+side*10,pen.root+1]]);
    ctx.stroke();
  }
  ctx.restore();
}
