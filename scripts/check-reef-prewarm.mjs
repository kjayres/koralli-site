import assert from 'node:assert/strict';
import { Reef } from '../src/scripts/art/reef.mjs';

// Capture the actual raster and drawing command stream without a browser GPU.
class Canvas {
  constructor(width,height) { this.width=width;this.height=height; }
  getContext() {
    if(this.context)return this.context;
    const ctx={canvas:this,dpr:1,commands:2166136261,image:null,
      mark(...values){for(const value of values){const text=String(value);for(let i=0;i<text.length;i++)this.commands=Math.imul(this.commands^text.charCodeAt(i),16777619)>>>0;}},
      setTransform(a){this.dpr=a;},getTransform(){return{a:this.dpr,b:0,c:0,d:this.dpr};},
      save(){},restore(){},clearRect(){},
      beginPath(){this.mark('begin');},closePath(){this.mark('close');},
      moveTo(...args){this.mark('move',...args);},lineTo(...args){this.mark('line',...args);},arc(...args){this.mark('arc',...args);},
      fillRect(...args){this.mark('rectangle',this.fillStyle,...args);},
      fill(){this.mark('fill',this.fillStyle);},stroke(){this.mark('stroke',this.strokeStyle,this.lineWidth);},
      createImageData(width,height){return{data:new Uint8ClampedArray(width*height*4)};},
      putImageData(image){this.image=image;},drawImage(canvas){this.image=canvas.getContext().image;this.mark('image');},
    };
    return this.context=ctx;
  }
}
globalThis.OffscreenCanvas=Canvas;
const makeState=(w,h)=>({w,h,t:0,ctx:new Canvas(w,h).getContext()});

for(const [width,height] of [[960,440],[390,440]]) {
  const synchronous=makeState(width,height),synchronousReef=new Reef();
  synchronousReef.drawReef(synchronous);
  const cooperative=makeState(width,height),cooperativeReef=new Reef();
  let yielded=false;setTimeout(()=>{yielded=true;},0);
  assert.equal(await cooperativeReef.prewarmReef(cooperative),true);
  assert.ok(yielded&&cooperative.reefWarmStats.slices>1,'Warm-up yields to browser work');
  assert.deepEqual(cooperative.reefGeometryStats,synchronous.reefGeometryStats);
  assert.deepEqual(cooperative.reefCache.surface.depthBuffer,synchronous.reefCache.surface.depthBuffer,'Identical static depth');
  assert.deepEqual(cooperative.reefCache.canvas.getContext().image.data,synchronous.reefCache.canvas.getContext().image.data,'Identical filled raster');
  assert.equal(cooperative.reefCache.canvas.getContext().commands,synchronous.reefCache.canvas.getContext().commands,'Identical static wire and node drawing commands');
  assert.deepEqual(cooperative.reefCache.actorWorkspace.baseDepth,synchronous.reefCache.actorWorkspace.baseDepth,'Actor depth is already prepared');
  const cache=cooperative.reefCache,scene=cooperative.reefScene;
  cooperativeReef.drawReef(cooperative);
  assert.equal(cooperative.reefCache,cache,'First visible paint reuses the prepared cache');
  cooperative.w+=8;cooperativeReef.seedReef(cooperative);
  assert.equal(cooperative.reefScene,scene,'Resizing within one layout keeps the geometry');
  console.log(`${width}px: identical static raster, depth and wire commands; ${cooperative.reefWarmStats.slices} warm-up slices.`);
}

const cancelled=makeState(390,440);let generation=0;
setTimeout(()=>{cancelled.w=420;generation++;},0);
assert.equal(await new Reef().prewarmReef(cancelled,()=>generation===0),false);
assert.equal(cancelled.reefCache,undefined);
assert.equal(cancelled.reefScene,undefined,'A cancelled or resized warm-up must not commit old geometry');
console.log('Reef prewarm checks passed: rendering parity, cooperative yielding, prepared actor depth, cache reuse and cancellation.');
