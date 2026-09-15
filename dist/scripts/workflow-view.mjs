import { projects } from '../content/projects.mjs';
import { stones, loops } from '../content/workflow-art.mjs';
import { botanicalConnectorMarkup } from './art/botanical-seaweed.mjs';

export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const point = ([x,y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
const number = value => Number(value.toFixed(3));

function layout(project, compact) {
  if (!compact) return { positions: loops[project.stages.length], width: 1100, height: 690, stoneWidth: 238 };
  const positions = project.stages.map((_, i) => {
    const row = Math.floor(i / 2);
    const column = row % 2 ? 1 - i % 2 : i % 2;
    return [column ? 302 : 98, 95 + row * 168];
  });
  return { positions, width: 400, height: Math.ceil(project.stages.length / 2) * 168 + 50, stoneWidth: 194 };
}

// Phone connections use the original Figma leaves on continuous curved stems.
// Their bases and directions are sampled from the same cubic as the stem.
function connector(a, b, index) {
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  const normal=[-dy/length,dx/length];
  const c=[a,[a[0]+dx*.25+normal[0]*12,a[1]+dy*.25+normal[1]*12],
    [b[0]-dx*.25-normal[0]*8,b[1]-dy*.25-normal[1]*8],b];
  const leaves=[.43,.62].map((t,i)=>{
    const u=1-t;
    const at=axis=>u*u*u*c[0][axis]+3*u*u*t*c[1][axis]+3*u*t*t*c[2][axis]+t*t*t*c[3][axis];
    const tangent=axis=>3*u*u*(c[1][axis]-c[0][axis])+6*u*t*(c[2][axis]-c[1][axis])+3*t*t*(c[3][axis]-c[2][axis]);
    return {x:at(0),y:at(1),angle:Math.atan2(tangent(1),tangent(0))*180/Math.PI,length:i?16:20,side:i?-1:1,variant:index+i};
  });
  return botanicalConnectorMarkup(`M${point(c[0])} C${point(c[1])} ${point(c[2])} ${point(c[3])}`,leaves);
}

function mobileConnections(positions,height) {
  let paths=positions.slice(0,-1).map((p,i)=>connector(p,positions[i+1],i)).join('');
  const a=positions.at(-1),b=positions[0];
  const side=a[0]>200?386:14;
  const d=`M${point(a)} C${point([a[0],a[1]+95])} ${point([side,a[1]+85])} ${side} ${a[1]+20} L${side} 52 C${side} 2 ${b[0]} 2 ${point(b)}`;
  paths+=botanicalConnectorMarkup(d,[{x:side,y:height*.5,angle:-90,length:20,side:side>200?-1:1,variant:2}]);
  return `<svg class="flow-seaweed" viewBox="0 0 400 ${height}" aria-hidden="true">${paths}</svg>`;
}

export function diagramMarkup(project, compact = false, selected = 0) {
  const {positions,width,height,stoneWidth}=layout(project,compact);
  const connections=compact?mobileConnections(positions,height):`<img class="flow-seaweed" src="./assets/artwork/workflow-loop-${positions.length}.svg" width="1100" height="690" alt="">`;
  const buttons=positions.map((p,i)=>{
    const art=stones[i],bounds=art.text;
    const placement=`left:${number(p[0]/width*100)}%;top:${number(p[1]/height*100)}%;width:${number(stoneWidth/width*100)}%;aspect-ratio:${art.width}/${art.height};transform:translate(-${number(art.anchor.x/art.width*100)}%,-${number(art.anchor.y/art.height*100)}%)`;
    const labelBox=`left:${number(bounds.x/art.width*100)}%;top:${number(bounds.y/art.height*100)}%;width:${number(bounds.width/art.width*100)}%;height:${number(bounds.height/art.height*100)}%`;
    return `<button type="button" class="flow-stone" id="flow-step-${i}" data-flow-step="${i}" role="tab" aria-selected="${selected===i}" aria-controls="flow-detail" tabindex="${selected===i?0:-1}" style="${placement}" aria-label="Step ${i+1}: ${escapeHTML(project.stages[i][0])}"><img src="./assets/artwork/stone-${i+1}.svg" alt="" width="${art.width}" height="${art.height}"><span class="flow-stone-copy" style="${labelBox}"><span class="flow-number">0${i+1}</span><span class="flow-stone-title">${escapeHTML(project.stoneLabels[i])}</span></span></button>`;
  }).join('');
  return `<div class="flow-drawing" style="aspect-ratio:${width}/${height}" data-layout="${compact?'compact':'orbit'}">${connections}<div class="flow-steps" role="tablist" aria-label="${escapeHTML(project.name)} workflow steps">${buttons}</div></div>`;
}

export function detailMarkup(project, stage = 0) {
  const [name,phase,description] = project.stages[stage];
  return `<p class="eyebrow blue" data-flow-phase>0${stage+1} / ${escapeHTML(phase)}</p><h3 data-flow-title>${escapeHTML(name)}</h3><p data-flow-description>${escapeHTML(description)}</p><p class="flow-detail-hint mono">SELECT A STONE TO EXPLORE</p>`;
}

export function workbenchMarkup() {
  const project = projects[0];
  return `<div class="work-picker" role="group" aria-label="Choose an illustrative project">${projects.map((p,i)=>`<button type="button" data-work="${p.id}" aria-pressed="${i===0}"><span class="mono">0${i+1}</span><span>${escapeHTML(p.name)}</span><i aria-hidden="true">↗</i></button>`).join('')}</div>
  <div class="workflow-heading"><div><p class="eyebrow" data-work-theme>${project.theme}</p><h3 data-work-name>${project.name}</h3></div><p data-work-intro>${project.intro}</p></div>
  <div class="workflow-orbit"><div data-flow-drawing>${diagramMarkup(project)}</div><div id="flow-detail" class="flow-detail" role="tabpanel" tabindex="0" aria-labelledby="flow-step-0">${detailMarkup(project)}</div></div>
  <div class="workflow-outcome"><span class="eyebrow">WORKING TOWARDS</span><p data-work-outcome>${project.outcome}</p><span class="mono" data-work-count>${project.stages.length} STEPS / AN ITERATIVE PATH</span></div>`;
}

export function initWorkflows(onSelect = () => {}) {
  const root = document.querySelector('[data-workbench]');
  if (!root) return;
  let project = projects[0], selected=0;
  const breakpoint = matchMedia('(max-width: 759px)');
  const drawing=root.querySelector('[data-flow-drawing]');
  const detail=root.querySelector('#flow-detail');
  function render() {
    drawing.innerHTML=diagramMarkup(project,breakpoint.matches,selected);
    detail.innerHTML=detailMarkup(project,selected);
    detail.setAttribute('aria-labelledby',`flow-step-${selected}`);
    root.querySelectorAll('[data-work]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.work===project.id)));
    root.querySelector('[data-work-theme]').textContent=project.theme;
    root.querySelector('[data-work-name]').textContent=project.name;
    root.querySelector('[data-work-intro]').textContent=project.intro;
    root.querySelector('[data-work-outcome]').textContent=project.outcome;
    root.querySelector('[data-work-count]').textContent=`${project.stages.length} STEPS / AN ITERATIVE PATH`;
  }
  function selectStep(index, focus = false) {
    selected=index;
    detail.innerHTML=detailMarkup(project,selected);
    detail.setAttribute('aria-labelledby',`flow-step-${selected}`);
    root.querySelectorAll('[data-flow-step]').forEach((b,i)=>{b.setAttribute('aria-selected',String(i===selected));b.tabIndex=i===selected?0:-1;});
    if (focus) root.querySelector(`[data-flow-step="${index}"]`).focus();
  }
  root.addEventListener('click',event=>{
    const work=event.target.closest('[data-work]');
    if (work) {
      project=projects.find(p=>p.id===work.dataset.work);selected=0;render();
      onSelect(projects.indexOf(project));
      return;
    }
    const stone=event.target.closest('[data-flow-step]');
    if (stone) {
      selectStep(Number(stone.dataset.flowStep));
      if (breakpoint.matches) {detail.focus({preventScroll:true});detail.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
    }
  });
  root.addEventListener('keydown',event=>{
    const stone=event.target.closest('[data-flow-step]');if(!stone)return;
    const n=project.stages.length;
    const direction={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[event.key];
    if(direction===undefined&&!['Home','End'].includes(event.key))return;
    event.preventDefault();
    selectStep(event.key==='Home'?0:event.key==='End'?n-1:(selected+direction+n)%n,true);
  });
  breakpoint.addEventListener('change',render);
  render();
}
