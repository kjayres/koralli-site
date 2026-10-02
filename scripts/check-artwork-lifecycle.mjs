import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile('src/scripts/site.js', 'utf8');
const probes = '\nexport { canvasStates, paint, renderBuilding, schedule, prepareArtwork };';
function element() {
  const classes = new Set(), attributes = new Map(), events = new Map();
  return {
    classList: { add: s => classes.add(s), remove: s => classes.delete(s), contains: s => classes.has(s), toggle: (s, on) => on ? classes.add(s) : classes.delete(s) },
    style: { setProperty(k,v) { this[k] = v; }, removeProperty(k) { delete this[k]; } },
    dataset: {}, innerHTML: '<static-building/>',
    setAttribute: (k,v) => attributes.set(k,v), getAttribute: k => attributes.get(k) || null, removeAttribute(k) { attributes.delete(k); if(k==='style') this.style={setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}}; },
    addEventListener: (name, callback) => events.set(name, callback), events,
    querySelector: () => null,
    getBoundingClientRect: () => ({ width:600,height:440,top:0,bottom:440 }),
    clientWidth:600, clientHeight:440
  };
}
async function setup({kind, reduced=false, building=false, importFailure, firstFailure=false, deferredReef=false, journalLettering=false}={}) {
  const imports=[], errors=[], observers=[], frames=new Map(), events=new Map();
  const warmups=[],resizers=[];
  let nextFrame=0, failDraw=firstFailure, calls=0, failBuilding=false, clearCalls=0, letterCalls=0, boundsReads=0;
  const journalDraws=[]; let canvasTop=0, headingTop=100;
  const host=element(), canvas=element();
  canvas.dataset.art=kind; canvas.parentElement=host;
  canvas.getContext=()=>({clearRect(){clearCalls++;},setTransform(){}});
  const heading=element();
  if(kind==='journal-water') {
    host.getBoundingClientRect=()=>({width:600,height:2200,top:canvasTop,bottom:canvasTop+2200});
    canvas.getBoundingClientRect=()=>{boundsReads++;return host.getBoundingClientRect();};
    heading.getBoundingClientRect=()=>{boundsReads++;return{top:headingTop,bottom:headingTop+100};};
  }
  const section=element(), svg=element(), chamber=element();
  const panels=Array.from({length:4},element), depths=Array.from({length:4},(_,i)=>({...element(),dataset:{depth:String(i)}}));
  svg.setAttribute('viewBox','0 -160 700 860');
  section.querySelector=s=>s==='.company-building'?svg:s==='.building-sticky'?chamber:null;
  const motion={matches:reduced,addEventListener:(n,cb)=>events.set(`motion:${n}`,cb)};
  const selectors={'.building-section':building?section:null,'.journal-opening h1':kind==='journal-water'?heading:null};
  if(kind==='journal-water'&&journalLettering)selectors['[data-journal-frond], [data-journal-coral]']=element();
  const document={ hidden:false, documentElement:{scrollHeight:3000}, querySelector:s=>selectors[s] || null, querySelectorAll:s=>s==='canvas[data-art]'?(kind?[canvas]:[]):s==='[data-depth-panel]'?(building?panels:[]):s==='[data-depth]'?(building?depths:[]):[], addEventListener:(n,cb)=>events.set(n,cb) };
  const draw=()=>{calls++;if(failDraw)throw Error('Test draw failure');};
  const modules={
    './art/wave.mjs':{drawWave:draw},
    './art/journal-water.mjs':{drawJournalWater(...args){draw();journalDraws.push(args);}},
    './art/journal-lettering.mjs':{initJournalLettering(){return()=>letterCalls++;}},
    './art/reef.mjs':{Reef:class{seedReef(){} drawReef(){draw();} stepReef(){draw();}}},
    './art/building.mjs':{updateBuilding(){if(failBuilding)throw Error('Test building draw failure');return{phase:0};}},
  };
  if(deferredReef)modules['./art/reef.mjs'].Reef.prototype.prewarmReef=(state,isCurrent)=>new Promise((resolve,reject)=>warmups.push({isCurrent,finish:()=>resolve(isCurrent()),fail:()=>reject(Error('Test cache failure'))}));
  const context=vm.createContext({document,console:{error:(...e)=>errors.push(e.join(' '))},matchMedia:()=>motion,devicePixelRatio:1,innerWidth:1440,innerHeight:950,scrollY:0,scrollTo(){},URL,location:{pathname:'/'},
    addEventListener:(n,cb)=>events.set(n,cb),requestAnimationFrame:cb=>{frames.set(++nextFrame,cb);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),
    ResizeObserver:class{constructor(callback){resizers.push(callback);}observe(){}},IntersectionObserver:class{constructor(callback,options){this.callback=callback;this.options=options;observers.push(this);} observe(node){this.target=node;}disconnect(){}},
  });
  const mod=new vm.SourceTextModule(source+probes,{context,importModuleDynamically:async path=>{
    imports.push(path);
    if(path===importFailure)throw Error('Test import failure');
    assert.ok(modules[path],`Unexpected import ${path}`);
    const entries=Object.entries(modules[path]);
    const imported=new vm.SyntheticModule(entries.map(([k])=>k),function(){for(const [k,v]of entries)this.setExport(k,v);},{context});
    await imported.link(()=>{});await imported.evaluate();return imported;
  }});
  await mod.link(()=>{});await mod.evaluate();
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  await settle();
  return {api:mod.namespace,host,canvas,section,svg,chamber,panels,depths,imports,errors,frames,events,document,motion,observers,settle,warmups,resizers,
    setDrawFailure(v){failDraw=v;},setBuildingFailure(v){failBuilding=v;},calls:()=>calls,
    clearCalls:()=>clearCalls,letterCalls:()=>letterCalls,boundsReads:()=>boundsReads,journalDraws,
    setJournalPosition(canvasY,headingY){canvasTop=canvasY;headingTop=headingY;},
    flush(now=1000){const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(now);},
    async intersect(visible=true){for(const o of observers)o.callback([{isIntersecting:visible}]);await settle();},
  };
}
{
  const t=await setup();assert.deepEqual(t.imports,[]);assert.equal(t.errors.length,0);assert.equal(t.frames.size,0);assert.ok(!t.events.has('scroll'),'Pages without scroll-dependent artwork install no scroll callback');
}
{
  const t=await setup({kind:'reef'});
  assert.deepEqual(t.imports,[]);assert.equal(t.host.classList.contains('art-ready'),false);
  await t.intersect();
  assert.deepEqual(t.imports,['./art/reef.mjs']);assert.ok(t.host.classList.contains('art-ready'));assert.ok(t.frames.size>0);
  t.setDrawFailure(true);t.api.paint(t.api.canvasStates[0],1/60);
  assert.ok(t.host.classList.contains('art-failed'));assert.equal(t.host.classList.contains('art-ready'),false);
  const count=t.calls();t.api.paint(t.api.canvasStates[0],1/60);assert.equal(t.calls(),count);assert.equal(t.errors.length,1);
}
{
  const t=await setup({kind:'reef',importFailure:'./art/reef.mjs'});await t.intersect();
  assert.ok(t.host.classList.contains('art-failed'));assert.equal(t.host.classList.contains('art-ready'),false);assert.equal(t.frames.size,0);
}
{
  const t=await setup({kind:'wave',firstFailure:true});
  assert.ok(t.host.classList.contains('art-failed'));assert.equal(t.host.classList.contains('art-ready'),false);assert.deepEqual(t.imports,['./art/wave.mjs']);
}
{
  const t=await setup({kind:'reef',reduced:true});await t.intersect();
  assert.ok(t.host.classList.contains('art-ready'));assert.equal(t.calls(),1);assert.equal(t.frames.size,0);
}
{
  const t=await setup({kind:'reef',deferredReef:true});
  const nearby=t.observers.find(o=>o.options?.rootMargin==='1800px');assert.ok(nearby,'Reef preloads before it reaches the viewport');
  nearby.callback([{isIntersecting:true}]);await t.settle();
  assert.equal(t.warmups.length,1);assert.equal(t.calls(),0);assert.equal(t.frames.size,0);
  t.host.getBoundingClientRect=()=>({width:700,height:440});t.resizers.forEach(resize=>resize());
  assert.equal(t.warmups.length,2);assert.equal(t.warmups[0].isCurrent(),false,'Resize invalidates the pending warm-up');
  t.warmups[0].finish();await t.settle();assert.equal(t.calls(),0);assert.equal(t.host.classList.contains('art-ready'),false);
  t.document.hidden=true;t.events.get('visibilitychange')();assert.equal(t.warmups[1].isCurrent(),false,'Hidden tab cancels unfinished work');
  t.warmups[1].finish();await t.settle();assert.equal(t.calls(),0);
  t.document.hidden=false;t.events.get('visibilitychange')();assert.equal(t.warmups.length,3);
  t.warmups[2].finish();await t.settle();assert.equal(t.calls(),1);assert.ok(t.host.classList.contains('art-ready'));
  assert.equal(t.frames.size,0,'A completed offscreen warm-up must not start an animation loop');
  t.observers.find(o=>!o.options).callback([{isIntersecting:true}]);
  assert.equal(t.calls(),1,'Entering the viewport must not repeat the initial heavy paint');assert.equal(t.frames.size,1);
}
{
  const t=await setup({kind:'reef',deferredReef:true});await t.intersect();
  t.warmups[0].fail();await t.settle();
  assert.ok(t.host.classList.contains('art-failed'));assert.equal(t.host.classList.contains('art-ready'),false);
  assert.equal(t.calls(),0);assert.equal(t.errors.length,1);assert.equal(t.frames.size,0,'Cache failure leaves the still and no animation loop');
}
{
  const t=await setup({kind:'wave'});
  assert.ok(t.host.classList.contains('art-ready'));assert.equal(t.frames.size,0); // offscreen: no animation RAF
  await t.intersect();assert.equal(t.frames.size,1);
  t.document.hidden=true;t.events.get('visibilitychange')();assert.equal(t.frames.size,0);
}
{
  const t=await setup({building:true});
  assert.deepEqual(t.imports,['./art/building.mjs']);assert.ok(t.section.classList.contains('building-enhanced'));
  assert.equal(t.panels.filter(p=>p.getAttribute('aria-hidden')==='false').length,1);
  assert.equal(t.depths[0].getAttribute('aria-current'),'step');
  t.setBuildingFailure(true);t.api.renderBuilding(true);
  assert.equal(t.section.classList.contains('building-enhanced'),false);
  assert.ok(t.panels.every(p=>p.getAttribute('aria-hidden')===null&&p.style.visibility===undefined));
  assert.equal(t.svg.innerHTML,'<static-building/>');assert.equal(t.svg.getAttribute('viewBox'),'0 -160 700 860');
  t.api.renderBuilding(true);assert.equal(t.errors.length,1);
}
{
  const t=await setup({building:true,importFailure:'./art/building.mjs'});
  assert.equal(t.section.classList.contains('building-enhanced'),false);assert.ok(t.panels.every(p=>!p.getAttribute('aria-hidden')));
}
{
  const t=await setup({kind:'journal-water'});
  assert.deepEqual(t.imports,['./art/journal-water.mjs'],'A plain journal heading needs no lettering module');
  assert.equal(t.letterCalls(),0);assert.ok(t.host.classList.contains('art-ready'));
  await t.intersect();t.flush();assert.equal(t.frames.size,1,'Journal water animates with a plain heading');
  assert.equal(t.errors.length,0);
}
{
  const t=await setup({kind:'journal-water',journalLettering:true}),state=t.api.canvasStates[0];
  assert.deepEqual(t.imports,['./art/journal-water.mjs','./art/journal-lettering.mjs']);
  assert.equal(t.letterCalls(),1);assert.equal(t.clearCalls(),0,'The journal renderer owns its only canvas clear');
  t.flush();const reads=t.boundsReads();
  for(let i=0;i<20;i++)t.api.paint(state,1/60);
  assert.equal(t.boundsReads(),reads,'Animation frames reuse cached DOM bounds');
  const before=t.letterCalls();
  t.setJournalPosition(-1100,-1000);t.events.get('scroll')();
  t.api.paint(state,1/60);
  assert.equal(t.letterCalls(),before,'Hidden heading paths are not rewritten');
  assert.equal(state.viewport.top,815);assert.equal(state.viewport.bottom,2335);
  const updated=t.boundsReads();t.flush();assert.equal(t.boundsReads(),updated,'Scroll and animation callbacks share one bounds refresh');
  t.setJournalPosition(0,100);t.events.get('scroll')();t.api.paint(state,1/60);
  assert.equal(t.letterCalls(),before+1,'Heading resumes at the current scene time before it enters view');
  await t.intersect();t.flush();assert.equal(t.frames.size,1);
  t.document.hidden=true;t.events.get('visibilitychange')();assert.equal(t.frames.size,0,'Hidden journal tabs stop drawing');
  t.document.hidden=false;t.events.get('visibilitychange')();assert.equal(t.frames.size,1);
  await t.intersect(false);t.flush();assert.equal(t.frames.size,0,'The journal stops when its canvas is offscreen');
}
{
  const t=await setup({kind:'journal-water',reduced:true});
  assert.equal(t.journalDraws.at(-1)[4].viewport,undefined,'Reduced motion renders the complete still for scrolling');
  await t.intersect();t.flush();assert.equal(t.frames.size,0,'Reduced motion never starts an animation loop');
}
console.log('Artwork lifecycle passed: scoped imports, fallbacks, reef prewarm cancellation, reduced motion, cached journal viewport, offscreen heading/tab/canvas suspension and empty-page scroll handling.');
