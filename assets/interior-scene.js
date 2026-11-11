// Shared sequence for the product hero and the A/B preview.
// Two overlapping rising streams: interior leads, envelope follows continuously.
// Vegetation is absent from all linework and appears only in the final image.
(() => {
  const project=window.IKEA_BUILDING_MODEL.project;
  const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  const timeline={interiorStart:.15,interiorDraw:5.8,exteriorStart:.45,exteriorDraw:6.4,renderStart:7.25,renderDuration:1.0,plantsStart:8.35,plantsDuration:1.45,header:10.25,end:11.8};
  const pathAt=(commands,z)=>commands.map(([op,...a])=>{if(op==='Z')return 'Z';const out=[];for(let i=0;i<a.length;i+=2)out.push(...project([a[i],a[i+1],z]).map(v=>v.toFixed(2)));return op+out.join(' ');}).join('');
  const geometry=Array.from({length:7},(_,floor)=>{
    const key=floor<6?'floor-'+(floor+1):'roof',batches=[];
    const interiors=window.IKEA_CONCEPT_PLANS[key].filter(p=>p.kind!=='landscape'&&p.kind!=='perimeter').map(p=>{
      let u=0,v=0,n=0;for(const c of p.c)for(let i=1;i<c.length;i+=2){u+=c[i];v+=c[i+1];n++;}
      u/=n||1;v/=n||1;const side=u>v?1:0;
      return {...p,side,distance:side?Math.hypot(1-u,v):Math.hypot(u,1-v),d:pathAt(p.c,floor)};
    });
    for(const side of [0,1])for(const weight of ['wall','detail'])for(let batch=0;batch<10;batch++){
      const ordered=interiors.filter(p=>p.side===side&&p.w===weight).sort((a,b)=>a.distance-b.distance);
      const paths=ordered.slice(Math.floor(batch*ordered.length/10),Math.floor((batch+1)*ordered.length/10));
      if(paths.length)batches.push({d:paths.map(p=>p.d).join(''),weight,side,phase:'interior',kind:'interior-'+weight,delay:batch*.018+(weight==='detail'?.04:0)});
    }
    // Use only explicitly authored architectural geometry, with no photographed
    // foliage contours leaking into windows or the facade. Planting locations stay empty.
    for(const side of [0,1])for(const phase of ['frame','facade'])for(let batch=0;batch<10;batch++){
      const paths=window.IKEA_BUILDING_MODEL.layers[floor].filter((p,i)=>
        p.side===side&&p.kind!=='landscape'&&p.kind!=='interior'&&
        (p.kind==='structure'?'frame':'facade')===phase&&i%10===batch);
      if(paths.length)batches.push({d:paths.map(p=>p.d).join(''),weight:'context',side,phase,kind:phase==='frame'?'exterior-frame':'window-detail',delay:.04+batch*.018});
    }
    return {kind:key,batches};
  });
  const blend=(t,variant,inspect='all')=>variant==='b'&&inspect==='all'?ease((t-timeline.renderStart)/timeline.renderDuration):0;
  function sample(t,floor,batch,variant,inspect='all'){
    const focus=inspect!=='all',visible=!focus||inspect==='interior'||Number(inspect)===floor;
    if(focus){
      if(inspect==='interior')return {offset:0,opacity:floor<6&&batch.phase==='interior'?(batch.weight==='wall'?1:.9):0};
      return {offset:0,opacity:visible?(batch.phase==='interior'?(batch.weight==='wall'?1:.9):batch.phase==='frame'?.34:.42):0};
    }
    let local,draw,alpha;
    if(batch.phase==='interior'){
      local=t-timeline.interiorStart-floor*timeline.interiorDraw/8-batch.delay-batch.side*.055;
      draw=timeline.interiorDraw/4;
      alpha=batch.weight==='wall'?1:.9;
    }else{
      local=t-timeline.exteriorStart-floor*timeline.exteriorDraw/8-batch.delay-batch.side*.055;
      draw=timeline.exteriorDraw/4;
      alpha=batch.phase==='frame'?.34:.42;
    }
    // The drawing front spans two storeys: each next floor starts before the
    // preceding floor finishes. There are no floor stops or alternating phases.
    return {offset:1-ease(local/draw),opacity:alpha*ease(local/.3)*(1-blend(t,variant))};
  }
  const style=batch=>batch.phase==='interior'
    ?{color:batch.weight==='wall'?'#123f78':'#24699b',width:batch.weight==='wall'?1.25:.85}
    :{color:'#52758e',width:batch.phase==='frame'?.95:.8};
  window.IKEA_INTERIOR_SCENE={geometry,sample,blend,style,timeline};
})();
