// Architecture is a fixed tree-free render. Only genuine botanical cutouts grow.
(() => {
  const ns='http://www.w3.org/2000/svg',parts=window.IKEA_TREE_PARTS;
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  function mount(svg,prefix){
    const make=(tag,attrs,parent)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));parent.append(el);return el;};
    const base=make('image',{href:'assets/ikea-building-bare.png',x:0,y:0,width:1536,height:1024,opacity:0,'data-render':'architecture'},svg);
    const defs=make('defs',{},svg);
    const trees=parts.map((p,i)=>{
      const id=prefix+'-botanical-'+i;
      const clip=make('clipPath',{id,clipPathUnits:'userSpaceOnUse'},defs);
      make('path',{d:p.d},clip);
      const g=make('g',{'data-foliage':i,'data-plant':p.id,'data-root':p.x+','+p.y,opacity:0},svg);
      const cutout=make('g',{'clip-path':'url(#'+id+')'},g);
      make('image',{href:'assets/ikea-trees-only.png',x:0,y:0,width:1536,height:1024,'data-image-role':'botanical-only'},cutout);
      return {g,...p};
    });
    return {base,trees};
  }
  function paint(render,t,variant,inspect='all'){
    const scene=window.IKEA_INTERIOR_SCENE,active=variant==='b'&&inspect==='all';
    render.base.setAttribute('opacity',active?scene.blend(t,'b').toFixed(4):0);
    render.trees.forEach((p,i)=>{
      const delay=((i*17)%23)*.017;
      const q=active?clamp((t-scene.timeline.plantsStart-delay)/scene.timeline.plantsDuration):0;
      // A smooth, uniformly scaled tree grows from its actual trunk base.
      // No clipping wipe, no stretching, no building pixels in this layer.
      const size=.015+.985*smooth(q);
      p.g.setAttribute('opacity',smooth(q/.12).toFixed(4));
      p.g.setAttribute('transform',`translate(${p.x} ${p.y}) scale(${size.toFixed(5)}) translate(${-p.x} ${-p.y})`);
    });
  }
  window.IKEA_GROWING_RENDER={mount,paint};
})();
