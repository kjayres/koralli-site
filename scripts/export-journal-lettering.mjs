import { writeFileSync } from 'node:fs';

const destination = new URL('../src/assets/artwork/', import.meta.url);
const line = (a,b,opacity=1) => `<path d="M${a.map(n=>n.toFixed(2)).join(' ')}L${b.map(n=>n.toFixed(2)).join(' ')}" opacity="${opacity}"/>`;
const dot = (x,y,r=.8) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}" fill="currentColor" stroke="none"/>`;
function save(name,width,height,colour,marks) {
  writeFileSync(new URL(`journal-${name}.svg`,destination),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none" color="${colour}"><g stroke="currentColor" stroke-width=".65" stroke-linecap="round" stroke-linejoin="round">${marks.join('')}</g></svg>\n`);
}

const urchin=[];
for(let i=0;i<45;i++) {
  const a=Math.PI+i/44*Math.PI;
  const length=25+11*(.5+.5*Math.sin(i*2.31));
  const base=[50+Math.cos(a)*15,63+Math.sin(a)*10];
  const tip=[50+Math.cos(a)*length,63+Math.sin(a)*length*1.08];
  urchin.push(line(base,tip,.55+(i%3)*.15));
  if(i%5===0)urchin.push(dot(...base));
}
for(let j=0;j<5;j++) {
  const r=4+j*3;
  urchin.push(`<path d="M${50-r} 63 Q${50-r-2} ${63-r*1.9} 50 ${63-r} Q${50+r+2} ${63-r*1.9} ${50+r} 63" opacity=".55"/>`);
}
urchin.push('<path d="M31 64Q50 67 69 64"/>');
save('urchin',100,70,'#ff9684',urchin);

const coral=[];
const branches=[[[33,88],[31,66],[38,44],[33,19],[36,5]],[[34,80],[20,63],[18,45],[8,33]],[[32,68],[47,57],[51,39],[62,25]],[[36,50],[23,35],[21,17]],[[20,62],[6,56],[3,44]],[[49,51],[64,45],[68,35]],[[33,25],[44,18],[48,9]]];
for(const [j,points] of branches.entries()) {
  for(let i=0;i<points.length-1;i++) {
    const a=points[i],b=points[i+1],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    const normal=[-dy/length,dx/length],width=2.1-i*.25-j*.08;
    const edge=(p,s)=>[p[0]+normal[0]*width*s,p[1]+normal[1]*width*s];
    coral.push(line(edge(a,1),edge(b,1)),line(edge(a,-1),edge(b,-1)));
    for(let k=0;k<4;k++) {
      const p=[a[0]+dx*k/4,a[1]+dy*k/4],q=[a[0]+dx*(k+1)/4,a[1]+dy*(k+1)/4];
      coral.push(line(edge(p,k%2?1:-1),edge(q,k%2?-1:1),.5));
    }
    if(i===points.length-2)coral.push(dot(...b,1));
  }
}
save('coral',72,92,'#adc1ff',coral);

const fronds=[];
for(let blade=0;blade<3;blade++) {
  const left=[],right=[];
  const height=[80,94,65][blade],lean=[-18,4,25][blade];
  for(let row=0;row<=20;row++) {
    const t=row/20,y=98-t*height;
    const centre=27+lean*t*t+Math.sin(t*6+blade)*5*t;
    const width=Math.sin(Math.PI*t)**.7*(blade===1?3.7:3);
    left.push([centre-width,y]);right.push([centre+width,y]);
    if(row)fronds.push(line(left[row-1],left[row],.85),line(right[row-1],right[row],.85),line(left[row-1],right[row],.45));
    if(row%2===0)fronds.push(line(left[row],right[row],.5));
  }
  fronds.push(dot(...left[20],.65));
}
save('fronds',60,100,'#b7c9ff',fronds);
