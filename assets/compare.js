(() => {
  'use strict';
  const ns='http://www.w3.org/2000/svg',plans=window.IKEA_CONCEPT_PLANS;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  const node=(tag,attrs,parent)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));parent.append(e);return e;};
  const bottom=[[170,650],[920,1010],[1380,685],[630,325]],top=[[153,300],[920,550],[1398,270],[750,70]];
  const corner=(i,z)=>bottom[i].map((v,k)=>v+(top[i][k]-v)*z/6);
  const point=(u,v,z)=>{const [l,f,r,b]=[0,1,2,3].map(i=>corner(i,z));return [0,1].map(k=>b[k]*(1-u)*(1-v)+r[k]*u*(1-v)+f[k]*u*v+l[k]*(1-u)*v);};
  const centroid=p=>{let u=0,v=0,n=0;for(const c of p.c)for(let i=1;i<c.length;i+=2){u+=c[i];v+=c[i+1];n++;}return [u/(n||1),v/(n||1)];};
  const pathAt=(commands,z)=>commands.map(([op,...a])=>{if(op==='Z')return 'Z';let result=[];for(let i=0;i<a.length;i+=2)result.push(...point(a[i],a[i+1],z).map(x=>x.toFixed(2)));return op+result.join(' ');}).join('');
  // Split each distinct concept floor spatially, starting near opposite corners.
  // Each side is ordered outward from its own origin rather than random path batches.
  const scene=window.IKEA_INTERIOR_SCENE;
  const geometry=scene.geometry;
  const gallery=document.querySelector('.plan-gallery');
  window.IKEA_CONCEPT_FLOORS.forEach(({key,name},i)=>{
    const article=document.createElement('article'),title=document.createElement('h3');
    title.textContent=(i<6?`${i+1}F`:'ROOF')+' / '+name;article.append(title);
    const svg=node('svg',{viewBox:'0 0 1000 1000',role:'img','aria-label':name+' 평면도'},article);
    plans[key].forEach(p=>{const d=p.c.map(([op,...a])=>op+a.map(v=>(v*1000).toFixed(2)).join(' ')).join('');node('path',{d,fill:'none',stroke:p.w==='wall'?'#24494c':'#8a9c99','stroke-width':p.w==='wall'?3:1.5,'stroke-linecap':'round','stroke-linejoin':'round'},svg);});
    gallery.append(article);
  });
  const views=[...document.querySelectorAll('.preview')].map(panel=>{
    const svg=panel.querySelector(':scope > svg');
    const material=window.IKEA_GROWING_RENDER.mount(svg,'preview-material-'+panel.dataset.variant);
    const image=material.base;
    const drawing=node('g',{'aria-hidden':'true'},svg);
    const layers=geometry.map(({kind,batches},floor)=>{
      const g=node('g',{'data-floor':floor<6?floor+1:'roof','data-plan':kind},drawing);
      const paths=batches.map(batch=>({el:node('path',{d:batch.d,fill:'none',stroke:scene.style(batch).color,'stroke-width':scene.style(batch).width,'data-detail':batch.kind,'stroke-linejoin':'round','stroke-linecap':'round','vector-effect':'non-scaling-stroke',opacity:0,pathLength:1,'stroke-dasharray':1,'stroke-dashoffset':1},g),...batch}));
      return paths;
    });
    return {panel,image,material,layers,variant:panel.dataset.variant};
  });
  let frame=0,start=0,pausedAt=0,inspect='all';
  const loop=document.querySelector('#loop'),seek=document.querySelector('#seek');
  function render(ms){
    const t=ms/1000;
    if(document.activeElement!==seek)seek.value=t.toFixed(1);
    views.forEach(({panel,image,material,layers,variant})=>{
      window.IKEA_GROWING_RENDER.paint(material,t,variant,inspect);
      layers.forEach((batches,floor)=>{
        batches.forEach(batch=>{
        const state=scene.sample(t,floor,batch,variant,inspect);
        batch.el.setAttribute('opacity',state.opacity.toFixed(4));
        batch.el.setAttribute('stroke-dashoffset',state.offset.toFixed(4));
        });
      });
      panel.classList.toggle('ready',inspect==='all'&&t>(variant==='a'?scene.timeline.renderStart:scene.timeline.header));
      const full=inspect==='all'||inspect==='interior';
      const cy=full?-65:260-Number(inspect)*62;
      panel.querySelector(':scope > svg').setAttribute('viewBox',`-70 ${cy} 1700 ${full?1170:850}`);
    });
  }
  function tick(now){if(!start)start=now;let elapsed=now-start;if(elapsed>=15000&&loop.checked){start=now;elapsed=0;}render(elapsed);if(elapsed<15000||loop.checked)frame=requestAnimationFrame(tick);}
  function replay(){cancelAnimationFrame(frame);start=0;render(0);if(reduced)render(15000);else frame=requestAnimationFrame(tick);}
  const overview=document.querySelector('#plan-overview');
  const closeGallery=()=>{gallery.hidden=true;document.querySelector('.comparison').hidden=false;overview.setAttribute('aria-pressed','false');};
  const selectFloor=value=>{closeGallery();inspect=value;document.querySelectorAll('[data-inspect]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.inspect===inspect));if(inspect==='all')replay();else{cancelAnimationFrame(frame);render(6000);}};
  overview.onclick=()=>{const show=gallery.hidden;gallery.hidden=!show;document.querySelector('.comparison').hidden=show;overview.setAttribute('aria-pressed',show);if(show)cancelAnimationFrame(frame);else selectFloor('all');};
  document.querySelectorAll('[data-inspect]').forEach(b=>b.onclick=()=>selectFloor(b.dataset.inspect));
  document.querySelector('#replay').onclick=()=>selectFloor('all');
  seek.oninput=()=>{const t=Number(seek.value);if(!Number.isFinite(t))return;cancelAnimationFrame(frame);inspect='all';closeGallery();loop.checked=false;document.querySelectorAll('[data-inspect]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.inspect==='all'));render(Math.max(0,Math.min(15,t))*1000);};
  loop.onchange=()=>{if(loop.checked)selectFloor('all');};
  document.querySelectorAll('[data-view]').forEach(b=>{if(b.tagName!=='BUTTON')return;b.onclick=()=>{document.querySelector('.comparison').dataset.view=b.dataset.view;document.querySelectorAll('button[data-view]').forEach(e=>e.setAttribute('aria-pressed',e===b));};});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pausedAt=performance.now();cancelAnimationFrame(frame);}else{if(start&&pausedAt)start+=performance.now()-pausedAt;pausedAt=0;frame=requestAnimationFrame(tick);}});
  render(0);const preload=new Image();preload.onload=replay;preload.onerror=replay;preload.src='assets/ikea-building-isolated.png';
})();
