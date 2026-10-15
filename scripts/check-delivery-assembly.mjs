import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import * as artwork from '../src/scripts/art/delivery-assembly.mjs';

const {fragments, fragmentPose, assemblyDuration, pictureSize, deliveryArtwork} = artwork;
const controller = readFileSync(new URL('../src/scripts/delivery-view.mjs', import.meta.url), 'utf8');
const close = (actual, expected, message) => assert.ok(Math.abs(actual-expected)<1e-8, message);

test('shared fragments cover the painting and finish at its exact original coordinates', () => {
  const edges = new Map();
  let area = 0;
  for (const fragment of fragments) {
    const points = fragment.points;
    for (let i=0; i<points.length; i++) {
      const a=points[i], b=points[(i+1)%points.length], c=points[(i+2)%points.length];
      assert.ok((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])>0, 'Fragments remain convex');
      area += (a[0]*b[1]-a[1]*b[0])/2;
      const key=[a.join(','),b.join(',')].sort().join('|');
      if (!edges.has(key)) edges.set(key, []);
      edges.get(key).push([a,b]);
    }
    for (const pose of [fragmentPose(fragment,assemblyDuration),fragmentPose(fragment,0,true)]) {
      pose.matrix.forEach((value,i)=>close(value,[1,0,0,1,0,0][i],'Final transform is the identity'));
      assert.equal(pose.opacity,1);
    }
  }
  close(area,pictureSize.width*pictureSize.height,'Fragments cover the full picture area');
  for (const shared of edges.values()) {
    if (shared.length===2) {
      assert.deepEqual(shared[0][0],shared[1][1]);
      assert.deepEqual(shared[0][1],shared[1][0]);
    } else {
      assert.equal(shared.length,1,'No edge belongs to more than two fragments');
      const [a,b]=shared[0];
      assert.ok((a[0]===b[0] && [0,pictureSize.width].includes(a[0])) ||
        (a[1]===b[1] && [0,pictureSize.height].includes(a[1])), 'Unshared edges belong to the picture boundary');
    }
  }
  const svg=deliveryArtwork();
  const section=readFileSync(new URL('../src/sections/work-delivery.html', import.meta.url),'utf8');
  assert.ok(section.includes(svg),'Published section matches its native artwork generator');
  const asset=/<image\b[^>]*href="\/([^"]+)"/.exec(svg)?.[1];
  assert.ok(asset && existsSync(new URL('../src/'+asset,import.meta.url)),'The original painting asset exists');
  assert.match(svg,/<g data-delivery-complete><use href="#delivery-painting"\/>/,'The complete still uses the original image');
});

test('fragments remain finite, upright and inside the 655-unit viewport throughout assembly', () => {
  const svg=deliveryArtwork();
  const [,left,top,width,height]=/viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg).map(Number);
  const [,offsetX,offsetY]=/<g transform="translate\(([\d.]+) ([\d.]+)\)">/.exec(svg).map(Number);
  assert.equal(height,655);
  for (let frame=0; frame<=240; frame++) for (const fragment of fragments) {
    const {matrix,opacity}=fragmentPose(fragment,assemblyDuration*frame/240);
    assert.ok(matrix.every(Number.isFinite));
    const [a,b,c,d,e,f]=matrix;
    assert.ok(a*d-b*c>0,'No collapsed or mirrored fragment');
    assert.ok(opacity>=0 && opacity<=1);
    for (const [x,y] of fragment.points) {
      const px=a*x+c*y+e+offsetX, py=b*x+d*y+f+offsetY;
      assert.ok(px>=left && px<=left+width && py>=top && py<=top+height,'No clipped moving fragment');
    }
  }
});

async function setup({reduced=false,cached=false}={}) {
  const frames=new Map(), events=new Map(), motionEvents=new Map(), images=[];
  let observer, nextFrame=0, now=1000;
  function element() {
    const classes=new Set();
    return {style:{},dataset:{},attributes:{},events:new Map(),
      classList:{add:name=>classes.add(name),contains:name=>classes.has(name)},
      setAttribute(name,value){this.attributes[name]=String(value);},
      getAttribute(name){return this.attributes[name]??null;},
      addEventListener(name,callback){this.events.set(name,callback);}};
  }
  const figure=element(), pieces=fragments.map(element), moving=element(), complete=element(), floor=element(), button=element(), painting=element();
  painting.setAttribute('href','./assets/images/matisse-dance-1910.jpg');
  const nodes={'[data-delivery-pieces]':moving,'[data-delivery-complete]':complete,'[data-delivery-floor]':floor,'[data-delivery-replay]':button,image:painting};
  figure.querySelector=selector=>nodes[selector];
  figure.querySelectorAll=()=>pieces;
  const document={hidden:false,querySelectorAll:()=>[figure],addEventListener:(name,callback)=>events.set(name,callback)};
  const motion={matches:reduced,addEventListener:(name,callback)=>motionEvents.set(name,callback)};
  const context=vm.createContext({document,matchMedia:()=>motion,
    Image:class {constructor(){this.complete=cached;this.naturalWidth=cached?1473:0;images.push(this);}},
    IntersectionObserver:class {constructor(callback){observer=callback;}observe(){}},
    requestAnimationFrame:callback=>{frames.set(++nextFrame,callback);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id)});
  const imported=new vm.SyntheticModule(Object.keys(artwork),function(){for(const [key,value] of Object.entries(artwork))this.setExport(key,value);},{context});
  const module=new vm.SourceTextModule(controller,{context});
  await module.link(specifier=>{assert.equal(specifier,'./art/delivery-assembly.mjs');return imported;});
  await module.evaluate();
  assert.equal(images.length,1);
  assert.equal(images[0].src,painting.getAttribute('href'),'Preload the image actually used by this SVG');
  return {figure,pieces,moving,complete,button,frames,
    load(){images[0].complete=true;images[0].naturalWidth=1473;images[0].onload();},
    fail(){images[0].onerror();},
    intersect(ratio){observer([{isIntersecting:ratio>0,intersectionRatio:ratio}]);},
    tick(count=1){for(let i=0;i<count;i++){now+=1000/60;const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(now));}},
    hide(value){document.hidden=value;events.get('visibilitychange')();},
    reduce(value){motion.matches=value;motionEvents.get('change')();},
    replay(){button.events.get('click')();},
    pose(){return JSON.stringify(pieces.map(piece=>piece.attributes));}};
}

test('loading and visibility gate the sequence; pauses preserve position, completion holds and replay restarts', async () => {
  const t=await setup();
  t.intersect(.5);t.tick(300);
  assert.equal(t.frames.size,0,'Loading must not consume the assembly');
  assert.equal(t.moving.style.display,'none');
  assert.equal(t.complete.style.display,'');
  assert.equal(t.button.hidden,true);
  t.intersect(.19);t.load();
  assert.equal(t.frames.size,0,'Less than 20% visible must not start');
  t.intersect(.2);t.tick(45);
  assert.equal(t.figure.dataset.deliveryState,'assembling');
  assert.equal(t.button.disabled,true);
  for (const pause of ['viewport','tab']) {
    const held=t.pose();
    if(pause==='viewport')t.intersect(.19);else t.hide(true);
    assert.equal(t.frames.size,0);
    t.tick(600);
    assert.equal(t.pose(),held);
    if(pause==='viewport')t.intersect(.5);else t.hide(false);
    t.tick();assert.equal(t.pose(),held,'Resume must not jump by the hidden interval');
    t.tick(10);
  }
  t.tick(300);
  assert.equal(t.figure.dataset.deliveryState,'complete');
  assert.equal(t.frames.size,0);
  assert.equal(t.moving.style.display,'none');
  assert.equal(t.complete.style.display,'');
  assert.equal(t.button.disabled,false);
  t.tick(600);assert.equal(t.frames.size,0,'The completed painting holds without a loop');
  t.replay();assert.equal(t.figure.dataset.deliveryState,'assembling');assert.equal(t.frames.size,1);
});

test('cached loading, reduced motion and failed images never leave an unwanted animation loop', async () => {
  const cached=await setup({cached:true});
  assert.equal(cached.frames.size,0);cached.intersect(.5);assert.equal(cached.frames.size,1);
  cached.tick(10);cached.reduce(true);
  assert.equal(cached.figure.dataset.deliveryState,'complete');assert.equal(cached.frames.size,0);
  assert.equal(cached.button.hidden,true);cached.replay();assert.equal(cached.frames.size,0);
  const reduced=await setup({reduced:true});reduced.intersect(.5);reduced.load();
  assert.equal(reduced.figure.dataset.deliveryState,'complete');assert.equal(reduced.frames.size,0);
  assert.equal(reduced.complete.style.display,'');assert.equal(reduced.button.hidden,true);
  const failed=await setup();failed.intersect(.5);failed.fail();failed.tick(300);
  assert.ok(failed.figure.classList.contains('delivery-unavailable'));
  assert.equal(failed.frames.size,0);assert.equal(failed.moving.style.display,'none');assert.equal(failed.button.hidden,true);
});
