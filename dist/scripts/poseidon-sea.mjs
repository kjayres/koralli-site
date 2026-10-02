// One image supplies colour only: every visible mark in the live scene is a WebGL point.
import { createThunder } from './poseidon-thunder.mjs?v=34d51cbcb8d7';

const VERTEX = `
precision highp float;
attribute vec2 a_position;
attribute vec3 a_colour;
attribute float a_seed;
attribute float a_kind;
uniform float u_time, u_size, u_ratio, u_aspect, u_flash, u_surge;
varying vec3 v_colour;
varying float v_alpha, v_kind;
float band(float a, float b, float c, float d, float x) {
  return smoothstep(a,b,x) * (1.0-smoothstep(c,d,x));
}
void main() {
  vec2 p = a_position;
  float head = 1.0-smoothstep(.82,1.0,length((p-vec2(.707,.264))/vec2(.054,.116)));
  head = max(head,band(.681,.69,.745,.755,p.x)*band(.225,.245,.402,.417,p.y));
  float robeRight = .768+.04*smoothstep(.50,.79,p.y);
  float body = band(.626,.651,robeRight,robeRight+.018,p.x) * band(.29,.34,.792,.82,p.y);
  float cape = band(.51,.572,.636,.67,p.x) * band(.40,.48,.75,.81,p.y);
  float staff = max(band(.728,.737,.78,.79,p.x)*band(.035,.06,.21,.25,p.y),
    band(.749,.754,.761,.767,p.x)*band(.18,.23,.775,.80,p.y));
  float arms = band(.643,.651,.778,.79,p.x)*band(.329,.342,.625,.646,p.y);
  float figure = max(max(head,body),max(max(cape,staff),arms));
  float sea = smoothstep(.535,.62,p.y) * (1.0-figure);
  float sky = (1.0-smoothstep(.45,.57,p.y)) * (1.0-figure);
  float phase = p.x*18.0 + p.y*11.0 - u_time*.83;
  p.x += cape*(1.0-arms)*.0025*sin(u_time*.64+a_position.y*8.0);
  vec2 flow = vec2(.007*sin(phase),.010*cos(phase*.8));
  vec2 curl = (a_position-vec2(.32,.77))*vec2(u_aspect,1.0);
  flow += vec2(-curl.y/u_aspect,curl.x)*.025*sin(u_time*.67-length(curl)*17.0)*exp(-length(curl)*3.0);
  float response = u_surge*pow(.5+.5*cos(length((a_position-vec2(.65,.77))*vec2(u_aspect,1.0))*18.0-u_time*1.35),4.0);
  p += flow*sea*(1.0+u_surge*.65);
  p.y -= response*sea*.009;
  p += vec2(.0025*sin(u_time*.15+a_position.y*3.0),.001*sin(u_time*.18))*sky;
  float perimeter = band(0.0,.03,.97,1.0,a_position.x)*band(0.0,.03,.97,1.0,a_position.y);
  p = mix(a_position,p,perimeter);
  v_colour = a_colour;
  float foam = pow(.5+.5*sin(phase),5.0)*sea;
  v_colour = mix(v_colour,vec3(.957,.941,.906),foam*(.055+u_surge*.06)+response*sea*.055);
  v_alpha = 1.0;
  v_kind = a_kind;
  gl_PointSize = u_size*(.9+.2*a_seed)*u_ratio;
  if (a_kind > 1.5) {
    float fall = fract(a_position.y+u_time*.09);
    p = vec2(a_position.x+fall*.075, .03+fall*.58);
    v_alpha = sin(fall*3.14159)*.22*(1.0-figure);
    gl_PointSize = 3.2*u_ratio;
  } else if (a_kind > .5) {
    p = a_position;
    v_alpha = u_flash;
    gl_PointSize = 1.2*u_ratio;
  }
  gl_Position = vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.0,1.0);
}`;
const FRAGMENT = `
precision mediump float;
varying vec3 v_colour;
varying float v_alpha, v_kind;
void main() {
  vec2 p = gl_PointCoord-.5;
  float edge = 1.0-smoothstep(.35,.5,length(p));
  if (v_kind > 1.5) edge = (1.0-smoothstep(.08,.17,abs(p.x-p.y*.45))) * (1.0-smoothstep(.35,.5,abs(p.y)));
  gl_FragColor = vec4(v_colour,edge*v_alpha);
}`;
const hash = value => {
  let n = value|0;
  n = Math.imul(n^(n>>>16),0x21f0aaad); n = Math.imul(n^(n>>>15),0x735a2d97);
  return ((n^(n>>>15))>>>0)/4294967296;
};
function seaSurge(time) {
  const cycle = time % 22;
  const ease = value => { const x = Math.max(0,Math.min(1,value)); return x*x*(3-2*x); };
  return ease((cycle-5)/3)*(1-ease((cycle-11)/4));
}

function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return null;
  const shader = (type, source) => {
    const object = gl.createShader(type); gl.shaderSource(object,source); gl.compileShader(object);
    if (!gl.getShaderParameter(object,gl.COMPILE_STATUS)) { gl.deleteShader(object); throw new Error('Poseidon shader unavailable'); }
    return object;
  };
  const program = gl.createProgram(), vertex = shader(gl.VERTEX_SHADER,VERTEX), fragment = shader(gl.FRAGMENT_SHADER,FRAGMENT);
  gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Poseidon renderer unavailable');
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for (const [name,size,offset] of [['a_position',2,0],['a_colour',3,8],['a_seed',1,20],['a_kind',1,24]]) {
    const location = gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location,size,gl.FLOAT,false,28,offset);
  }
  const uniforms = Object.fromEntries(['time','size','ratio','aspect','flash','surge'].map(name => [name,gl.getUniformLocation(program,`u_${name}`)]));
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(.957,.941,.906,1);
  return { gl, uniforms, count: 0, columns: 1 };
}

function sampleScene(renderer,image,rect) {
  const compact = window.innerWidth < 720, aspect = image.naturalWidth/image.naturalHeight;
  const left = compact ? Math.max(0,-rect.left/rect.width-.03) : 0;
  const right = compact ? Math.min(1,(window.innerWidth-rect.left)/rect.width+.03) : 1;
  const columns = Math.min(1100,Math.ceil(Math.sqrt((compact ? 100000 : 600000)*aspect/Math.max(.15,right-left))));
  const rows = Math.round(columns/aspect), scratch = document.createElement('canvas');
  scratch.width = columns; scratch.height = rows;
  const ctx = scratch.getContext('2d',{willReadFrequently:true});
  if (!ctx) throw new Error('Poseidon image unavailable');
  ctx.drawImage(image,0,0,columns,rows);
  const pixels = ctx.getImageData(0,0,columns,rows).data;
  const data = new Float32Array((Math.ceil(columns*(right-left)+2)*rows+1000)*7);
  let index = 0;
  const point = (x,y,r,g,b,seed,kind=0) => {
    if (kind<.5) {
      const luminance=r*.22+g*.70+b*.08;
      if (kind<.5 && luminance>.943) return;
      const ink=Math.pow(Math.max(0,Math.min(1,(.957-luminance)/.8)),.9);
      r=.957-(.957-.12)*ink; g=.941-(.941-.28)*ink; b=.906-(.906-.67)*ink;
    }
    data[index++]=x; data[index++]=y; data[index++]=r; data[index++]=g; data[index++]=b; data[index++]=seed; data[index++]=kind;
  };
  for (let y=0;y<rows;y++) for (let x=0;x<columns;x++) {
    if ((x+.5)/columns<left || (x+.5)/columns>right) continue;
    const i=y*columns+x, seed=hash(i+3);
    const u=(x+.5+(seed-.5)*.45)/columns, v=(y+.5+(hash(i+9)-.5)*.45)/rows;
    const p=i*4;
    point(u,v,pixels[p]/255,pixels[p+1]/255,pixels[p+2]/255,seed);
  }
  for (let i=0;i<240;i++) {
    const x=.025+hash(i+800)*.92;
    if (x<.52 || x>.85) point(x,hash(i+1100),.89,.91,.94,hash(i),2);
  }
  const visibleRight=Math.min(1,(window.innerWidth-rect.left)/rect.width);
  const boltRight=visibleRight-.014, boltLeft=Math.min(.894,Math.max(.804,boltRight-.062));
  const placeBolt=([x,y])=>[visibleRight<.966 ? boltLeft+(x-.894)/.054*(boltRight-boltLeft) : x,y];
  const bolt = [[.906,.095],[.894,.15],[.906,.19],[.895,.235],[.916,.273],[.911,.323],[.929,.381],[.918,.43],[.935,.49]].map(placeBolt);
  const segments = bolt.slice(1).map((end,i)=>[bolt[i],end]);
  segments.push([bolt[3],placeBolt([.939,.278])],[placeBolt([.939,.278]),placeBolt([.948,.337])]);
  for (const [a,b] of segments) for (let i=0;i<48;i++) {
    const t=i/48;
    point(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,.68,.76,.88,0,1);
  }
  renderer.gl.bufferData(renderer.gl.ARRAY_BUFFER,data.subarray(0,index),renderer.gl.STATIC_DRAW);
  renderer.count=index/7; renderer.columns=columns;
}

function enhanceScene(figure) {
  const image=figure.querySelector('img'), canvas=figure.querySelector('canvas[data-poseidon-water]');
  if (!image || !canvas) return;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const thunder=createThunder(figure);
  const soundButton=figure.closest('.agent-opening')?.querySelector('[data-poseidon-sound]');
  const soundAvailable=!!soundButton && !soundButton.hidden;
  let renderer, prepared='', visible=false, frame=0, previous=0, elapsed=0, painted=0, currentPhase='';
  let width=0, height=0, ratio=1, nextStrike=7, strikeStart=-99, strikeNumber=0;
  const fallback=() => { figure.classList.remove('is-poseidon-live'); cancelAnimationFrame(frame); frame=0; previous=0; thunder.stop(); if(soundButton)soundButton.hidden=true; };
  function draw() {
    if (!renderer || !renderer.count) return;
    const {gl,uniforms}=renderer;
    if (visible && !document.hidden && !motion.matches && elapsed>=nextStrike) {
      strikeStart=elapsed; nextStrike=elapsed+10+hash(++strikeNumber+501)*8;
      thunder.strike(.7);
    }
    const time=motion.matches?0:elapsed;
    const cycle=time%22, phase=cycle<5 || cycle>=15?'calm':cycle<8?'building':cycle<11?'crest':'settling';
    if (phase!==currentPhase) { figure.dataset.poseidonPhase=phase; currentPhase=phase; }
    const age=elapsed-strikeStart, flash=!motion.matches && age>=0 && age<.7 ? Math.sin(age/.7*Math.PI)**2*.72 : 0;
    gl.viewport(0,0,canvas.width,canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uniforms.time,time); gl.uniform1f(uniforms.surge,seaSurge(time)); gl.uniform1f(uniforms.size,width/renderer.columns*1.04);
    gl.uniform1f(uniforms.ratio,ratio); gl.uniform1f(uniforms.aspect,width/height); gl.uniform1f(uniforms.flash,flash);
    gl.drawArrays(gl.POINTS,0,renderer.count);
    figure.classList.add('is-poseidon-live');
  }
  function tick(now) {
    frame=0;
    if (!visible || document.hidden || motion.matches || !renderer) return;
    if (previous) elapsed+=Math.min((now-previous)/1000,.05);
    previous=now;
    if (now-painted>=1000/30) { draw(); painted=now-((now-painted)%(1000/30)); }
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    if (soundButton) soundButton.hidden=!soundAvailable || motion.matches || !renderer?.count;
    if (!visible || document.hidden || motion.matches || !renderer?.count || !width || !height) {
      cancelAnimationFrame(frame); frame=0; previous=0;
      thunder.stop();
    } else if (!frame) frame=requestAnimationFrame(tick);
  }
  function prepare() {
    if (!image.naturalWidth) return;
    const rect=image.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width=rect.width; height=rect.height; ratio=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*ratio); canvas.height=Math.round(height*ratio);
    const key=[image.currentSrc||image.src,window.innerWidth<720,Math.round(rect.left/20),Math.round(width/20)].join(':');
    try {
      renderer ||= createRenderer(canvas);
      if (!renderer) return;
      if (key!==prepared) {
        sampleScene(renderer,image,rect); prepared=key;
        figure.dataset.poseidonGrains=String(renderer.count);
      }
      draw(); sync();
    } catch { renderer=null; fallback(); }
  }
  function checkVisibility() {
    const rect=figure.getBoundingClientRect();
    visible=rect.bottom>0 && rect.top<window.innerHeight && rect.right>0 && rect.left<window.innerWidth; sync();
  }
  image.addEventListener('load',prepare);
  document.addEventListener('visibilitychange',sync);
  motion.addEventListener('change',()=>{prepare();sync();});
  window.addEventListener('resize',prepare,{passive:true});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer=null;prepared='';fallback();});
  canvas.addEventListener('webglcontextrestored',prepare);
  if ('ResizeObserver' in window) new ResizeObserver(prepare).observe(image);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(figure);
  else window.addEventListener('scroll',checkVisibility,{passive:true});
  checkVisibility();
  if (image.complete) prepare();
}
function initialise() { document.querySelectorAll('figure[data-poseidon-art]').forEach(enhanceScene); }
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',initialise,{once:true});
else initialise();
