// Image-aligned architectural line model. Coordinates match the 1536x1024 render.
// Window bays, recessed glazing, terrace rails and stairs are drawn in 3D before color.
(() => {
  'use strict';
  const bottom=[[170,650],[920,1010],[1380,685],[630,325]];
  const top=[[153,300],[920,550],[1398,270],[750,70]];
  const corner=(i,z)=>bottom[i].map((v,k)=>v+(top[i][k]-v)*z/6);
  const project=([u,v,z])=>{const [l,f,r,b]=[0,1,2,3].map(i=>corner(i,z));return [0,1].map(k=>b[k]*(1-u)*(1-v)+r[k]*u*(1-v)+f[k]*u*v+l[k]*(1-u)*v);};
  const layers=Array.from({length:7},()=>[]);
  const add=(floor,pts,kind='structure',side=0,close=false)=>{
    const pixels=pts.map(project),d=pixels.map((p,i)=>(i?'L':'M')+p.map(x=>x.toFixed(2)).join(' ')).join('')+(close?'Z':'');
    layers[Math.min(6,floor)].push({d,kind,side});
  };
  const face=(which,t,z,inset=0)=>which===0?[t,1-inset,z]:[1-inset,1-t,z];
  const panel=(floor,which,a,b,z0,z1,inset=.045,kind='window')=>add(floor,[face(which,a,z0,inset),face(which,b,z0,inset),face(which,b,z1,inset),face(which,a,z1,inset)],kind,which,true);
  function planter(floor,which,t,z,large=false){
    const a=face(which,t,z,.015),p=project(a),rx=large?13:8,ry=rx*.3,h=large?21:14;
    const path=(d,kind='landscape')=>layers[floor].push({d,kind,side:which});
    const x=p[0],y=p[1];
    path(`M${x-rx} ${y-h}C${x-rx} ${y-h-ry*2} ${x+rx} ${y-h-ry*2} ${x+rx} ${y-h}L${x+rx*.7} ${y}Q${x} ${y+4} ${x-rx*.7} ${y}Z`);
    path(`M${x} ${y-h}L${x-1} ${y-h-(large?28:19)}`);
    const r=large?24:16,cy=y-h-r*1.1;
    // Non-repeating crowns with trunks and branching, matching the planted terraces.
    let pts=[];for(let i=0;i<=28;i++){const angle=i/28*Math.PI*2,rr=r*(.86+.13*Math.sin(i*2.7+t*20));pts.push([x+Math.cos(angle)*rr,cy+Math.sin(angle)*rr*.91]);}
    path(pts.map((q,i)=>(i?'L':'M')+q.map(v=>v.toFixed(2)).join(' ')).join('')+'Z');
    for(let i=0;i<3;i++){const dx=(i-1)*r*.5;path(`M${x} ${y-h-8}L${x+dx} ${cy-3}M${x+dx-5} ${cy+6}L${x+dx+5} ${cy-4}`);}
  }
  const bays=[[0,.095,.205,.325,.465,.605,.745,.875,1],[0,.12,.255,.385,.515,.645,.775,.895,1]];
  for(let floor=0;floor<6;floor++){
    const z=floor;
    for(let which=0;which<2;which++){
      // Slab noses and their thickness, exposed at the perimeter.
      for(const zz of [z,z+.045,z+1])add(floor,[face(which,0,zz),face(which,1,zz)],'structure',which);
      const bs=bays[which];
      for(let i=0;i<bs.length;i++)for(const offset of [-.002,.002])add(floor,[face(which,bs[i]+offset,z),face(which,bs[i]+offset,z+1)],'structure',which);
      for(let bay=0;bay<bs.length-1;bay++){
        const a=bs[bay]+.009,b=bs[bay+1]-.009,w=b-a;
        const stairVoid=which===0&&(bay===1||bay===2);
        const balcony=(bay+floor*2+(which?1:0))%5===0;
        // Setback ceiling/floor returns show the depth between outside columns and glass.
        for(const t of [a,b]){add(floor,[face(which,t,z+.07),face(which,t,z+.07,.055)],'detail',which);add(floor,[face(which,t,z+.92),face(which,t,z+.92,.055)],'detail',which);}
        if(stairVoid)continue;
        panel(floor,which,a,b,z+.09,z+.91,.055);
        for(const ratio of [.25,.5,.75])add(floor,[face(which,a+w*ratio,z+.1,.055),face(which,a+w*ratio,z+.9,.055)],'window',which);
        add(floor,[face(which,a,z+.7,.055),face(which,b,z+.7,.055)],'detail',which);
        if(which===1&&floor<3&&bay>3){
          // Opaque service louvers in the right-hand lower facade.
          for(let slat=0;slat<10;slat++){const zz=z+.14+slat*.071;add(floor,[face(which,a,zz,.052),face(which,b,zz,.052)],'louver',which);}
        }else if(balcony){
          for(const zz of [z+.35,z+.41])add(floor,[face(which,a,zz,.005),face(which,b,zz,.005)],'rail',which);
          for(let j=0;j<=5;j++){const t=a+w*j/5;add(floor,[face(which,t,z+.07,.005),face(which,t,z+.41,.005)],'rail',which);}
          planter(floor,which,(a+b)/2,z+.07,true);
        }else{
          // Recessed room boxes are deliberately staggered, like the source image.
          if((floor+bay)%3===1)panel(floor,which,a+w*.13,b-w*.13,z+.25,z+.73,.066,'interior');
          if((floor+bay)%4===0){add(floor,[face(which,a+w*.25,z+.2,.06),face(which,a+w*.25,z+.35,.06),face(which,b-w*.2,z+.35,.06),face(which,b-w*.2,z+.2,.06)],'interior',which);}
        }
      }
    }
    // The prominent external zigzag stair on the left facade is part of the model.
    const start=floor%2?.32:.11,end=floor%2?.11:.32;
    for(const shift of [0,.045,.14])add(floor,[face(0,start,z+.09+shift,.007),face(0,end,z+.89+shift,.007)],'stair',0);
    for(let tread=0;tread<=18;tread++){
      const q=tread/18,t=start+(end-start)*q,zz=z+.09+q*.8;
      add(floor,[face(0,t,zz,.007),face(0,t+.021,zz,.007)],'stair',0);
      if(tread%3===0)add(floor,[face(0,t,zz,.007),face(0,t,zz+.14,.007)],'rail',0);
    }
    add(floor,[face(0,.09,z+.09,.007),face(0,.34,z+.09,.007)],'stair',0);
    // A few visible plants are not a uniform facade pattern.
    if(floor!==3){planter(floor,0,.43,z+.08);planter(floor,1,.7,z+.08);}
    // Beams and columns between rooms connect the facade to the central structure.
    for(const u of [.22,.5,.78])add(floor,[[u,.08,z+.04],[u,.92,z+.04]],'structure',u>.5?1:0);
    for(const v of [.23,.5,.77])add(floor,[[.08,v,z+.04],[.92,v,z+.04]],'structure',v<.5?1:0);
    for(const [u,v] of [[.22,.23],[.5,.5],[.78,.77]])add(floor,[[u,v,z+.04],[u,v,z+1]],'structure',u>.5?1:0);
    // Interior floor returns around the central lightwell, visible through glazing.
    if(floor>2)add(floor,[[.44,.4,z+.04],[.44,.56,z+.04],[.58,.56,z+.04],[.58,.4,z+.04]],'interior',0,true);
  }
  // Open roof pergolas and their solar-panel modules, not a flat box lid.
  const roof=6;
  const uBands=[.02,.15,.29,.43,.57,.71,.85,.98],vBands=[.02,.17,.33,.5,.67,.83,.98];
  for(const u of uBands)add(6,[[u,.015,roof],[u,.99,roof]],'roof',u>.5?1:0);
  for(const v of vBands)add(6,[[.015,v,roof],[.99,v,roof]],'roof',v<.5?1:0);
  for(const u of [.04,.3,.57,.84,.98])for(const v of [.04,.5,.98])add(6,[[u,v,roof-.02],[u,v,roof+.28]],'roof',u>.5?1:0);
  for(const [u,v,w,h] of [[.05,.12,.23,.16],[.34,.06,.23,.15],[.65,.08,.25,.16],[.65,.72,.28,.17],[.1,.68,.23,.16]]){
    add(6,[[u,v,roof+.02],[u+w,v,roof+.02],[u+w,v+h,roof+.02],[u,v+h,roof+.02]],'solar',u>.5?1:0,true);
    for(let j=1;j<7;j++){const x=u+w*j/7;add(6,[[x,v,roof+.02],[x,v+h,roof+.02]],'solar',u>.5?1:0);}
    for(let j=1;j<3;j++){const y=v+h*j/3;add(6,[[u,y,roof+.02],[u+w,y,roof+.02]],'solar',u>.5?1:0);}
  }
  // Roof pavilions and the varied heights of the garden crowns.
  for(const [u,v,w,h] of [[.57,.37,.23,.19],[.2,.3,.13,.19]]){
    add(6,[[u,v,6],[u,v,6.3],[u+w,v,6.3],[u+w,v,6]],'roof',1);
    add(6,[[u+w,v,6.3],[u+w,v+h,6.3],[u,v+h,6.3],[u,v,6.3]],'roof',1);
    add(6,[[u+w,v+h,6.3],[u+w,v+h,6]],'roof',1);
  }
  // Trees on both roof edges and in the open roof garden.
  for(const [which,t] of [[0,.06],[0,.23],[0,.43],[0,.64],[0,.83],[1,.09],[1,.28],[1,.49],[1,.74],[1,.92]])planter(6,which,t,6.03,true);
  // Image-aligned IKEA sign outlines and letter strokes anchor the crossfade.
  for(const [which,a,b,z] of [[0,.61,.745,3.15],[1,.78,.91,5.1]]){
    panel(Math.min(5,Math.floor(z)),which,a,b,z,z+.55,.004,'sign');
    const width=(b-a)/5;
    for(let i=0;i<4;i++)add(Math.min(5,Math.floor(z)),[face(which,a+width*(i+.6),z+.12,.002),face(which,a+width*(i+.6),z+.44,.002),face(which,a+width*(i+1.25),z+.44,.002)],'sign',which);
  }
  window.IKEA_BUILDING_MODEL={layers,project};
})();
