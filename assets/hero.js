(() => {
  'use strict';
  const hero=document.querySelector('.main-hero'),header=document.querySelector('.site-header');
  const scene=window.IKEA_INTERIOR_SCENE,ns='http://www.w3.org/2000/svg';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=scene.timeline.end*1000;
  const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  const node=(tag,attrs,parent)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));parent.append(e);return e;};
  hero.replaceChildren();
  const svg=node('svg',{class:'building-stage',viewBox:'-50 -70 1650 1200',role:'img','aria-label':'실내부터 완성되는 이케아 건물, 도로와 전차 선로, 주변 도시 건물과 광장을 걷는 사람들'},hero);
  const city=window.IKEA_CITY_SCENE.mount(svg);
  const material=window.IKEA_GROWING_RENDER.mount(svg,'main-material');
  const image=material.base;
  const layers=scene.geometry.map(({batches},floor)=>{
    const g=node('g',{'data-floor':floor<6?floor+1:'roof','data-plan':'interior-first'},svg);
    const paths=batches.map(batch=>({el:node('path',{d:batch.d,class:'plan-stroke','data-detail':batch.kind,'data-phase':batch.phase,stroke:scene.style(batch).color,'stroke-width':scene.style(batch).width,opacity:0,pathLength:1,'stroke-dasharray':1,'stroke-dashoffset':1},g),...batch}));
    return {g,paths};
  });
  let frame=0,start=0,finished=false,pausedAt=0;
  function render(ms){
    const t=ms/1000,blend=scene.blend(t,'b');
    layers.forEach(({g,paths},floor)=>{
      g.setAttribute('opacity',1);
      paths.forEach(batch=>{const state=scene.sample(t,floor,batch,'b');batch.el.setAttribute('opacity',state.opacity.toFixed(4));batch.el.setAttribute('stroke-dashoffset',state.offset.toFixed(4));});
    });
    window.IKEA_GROWING_RENDER.paint(material,t,'b');
    window.IKEA_CITY_SCENE.paint(city,t);
    header.inert=t<scene.timeline.header;document.body.classList.toggle('hero-ready',!header.inert);finished=ms>=duration;
  }
  function tick(now){if(!start)start=now;const elapsed=now-start;render(Math.min(elapsed,duration));if(elapsed<duration)frame=requestAnimationFrame(tick);}
  function finish(){cancelAnimationFrame(frame);render(duration);}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pausedAt=performance.now();cancelAnimationFrame(frame);}else if(!finished){if(start&&pausedAt)start+=performance.now()-pausedAt;pausedAt=0;frame=requestAnimationFrame(tick);}});
  header.inert=true;render(0);
  const preload=new Image();preload.onload=()=>{if(reduced)finish();else frame=requestAnimationFrame(tick);};preload.onerror=finish;preload.src='assets/ikea-building-isolated.png';
})();

