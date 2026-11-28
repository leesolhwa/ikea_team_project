const sceneLineWidth=0.7;
function lineOpacity(light){return .40+.24*light;}
function makeRenderer(canvas){
  const gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});
  if(!gl)return painter(canvas);
  const program=gl.createProgram();
  function attach(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));gl.attachShader(program,sh);}
  attach(gl.VERTEX_SHADER,`attribute vec3 pos; attribute float tone; attribute float objectId;
    uniform vec3 eye; uniform vec4 rot; uniform vec2 lens; uniform vec2 haloOffset; uniform float selected;
    varying float t; varying float active; varying float dist; varying float ahead; uniform vec2 heading; uniform vec2 roll; uniform float barrel;
    void main(){vec3 p=pos-eye;dist=length(p);ahead=dot(p.xz,heading)/max(length(p.xz),.001);float x=p.x*rot.x+p.z*rot.y;
      float z=p.x*rot.y-p.z*rot.x;float y=p.y*rot.z-z*rot.w;
      z=z*rot.z+p.y*rot.w;t=tone;active=objectId>0.5 && abs(objectId-selected)<0.25 ? 1. : 0.;
      vec2 q=vec2((x*roll.x-y*roll.y)*lens.x,(x*roll.y+y*roll.x)*lens.y);
      if(barrel>0. && z>.05){vec2 n=q/z;float r2=dot(n*vec2(lens.y/lens.x,1.),n*vec2(lens.y/lens.x,1.))*.5;q=n*(1.+barrel*r2)*z;}
      gl_Position=vec4(q+haloOffset*z,z*1.002-0.08008,z);}`);
  attach(gl.FRAGMENT_SHADER,`precision mediump float;uniform vec3 paper;uniform vec3 edge;uniform float opacity;uniform float alpha;uniform float reveal;uniform float boost;uniform float fog;uniform float nearPass;uniform float strongOnly;uniform float lit;varying float t;varying float active;varying float dist;varying float ahead;
    void main(){
      if(t>3.5){float f=clamp(ahead,0.,1.);float far=mix(5.,13.,f*f);float k=reveal*(1.-smoothstep(far*.4,far,dist))*mix(.3,1.,clamp(ahead*.6+.4,0.,1.));k*=smoothstep(.5,1.5,dist);if(k<.02)discard;gl_FragColor=vec4(mix(paper,edge,.42*k),alpha);return;}
      float op=t>2.5 ? .74 : (t>.4&&t<.6 ? opacity*.45 : opacity);
      op=mix(op,.97,boost*clamp(ahead,0.,1.)*(1.-smoothstep(3.,14.,dist)));
      op*=1.-fog*.78*smoothstep(5.,17.,dist);
      // 원근: 먼 선은 흐리게, 가까운 선은 굵게(nearPass에서 한 번 더 그림)
      // 원근감: 가까운 선은 진하게, 먼 선은 연하게. 불 켰을 때(lit) 더 강하게.
      op=mix(op,.98,(1.-smoothstep(1.2,6.,dist))*(.25+.45*lit));
      op*=1.-(.6+.28*lit)*smoothstep(3.5-1.5*lit,18.-4.*lit,dist);
      if(strongOnly>.5){if(t<2.5||t>3.5)discard;gl_FragColor=vec4(mix(paper,edge,mix(op,1.,active)),alpha);return;}
      if(nearPass>.5){float k=1.-smoothstep(1.8,6.,dist);if(k<.04||t<-.5)discard;gl_FragColor=vec4(mix(paper,edge,mix(op,1.,active)*k),alpha);return;}
      gl_FragColor=vec4(t<-.5?paper:mix(paper,edge,mix(op,1.,active)),alpha);}`);
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const u={};for(const n of ['eye','rot','lens','paper','edge','selected','opacity','haloOffset','alpha','reveal','heading','boost','roll','fog','nearPass','barrel','strongOnly','lit'])u[n]=gl.getUniformLocation(program,n);
  const a=gl.getAttribLocation(program,'pos'),t=gl.getAttribLocation(program,'tone'),id=gl.getAttribLocation(program,'objectId'),v=[];
  const DIST=LENSV[1]>0,L=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
  for(const f of faces){const P=f.points;
    if(DIST&&P.length===4&&Math.max(L(P[0],P[1]),L(P[1],P[2]))>.7){
      const nu=Math.ceil(L(P[0],P[1])/.5),nv=Math.ceil(L(P[1],P[2])/.5),G=(i,j)=>mix(mix(P[0],P[1],i/nu),mix(P[3],P[2],i/nu),j/nv);
      for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const q=[G(i,j),G(i+1,j),G(i+1,j+1),G(i,j+1)];for(const p of [q[0],q[1],q[2],q[0],q[2],q[3]])v.push(...p,-1,f.objectId);}
    }else for(let i=1;i<P.length-1;i++)for(const p of [P[0],P[i],P[i+1]])v.push(...p,-1,f.objectId);}
  const count=v.length/5;
  const centers=new Map();{const acc=new Map();for(const f of faces){if(!f.objectId)continue;let c=acc.get(f.objectId);if(!c){c=[1e9,-1e9,1e9,-1e9,1e9,-1e9];acc.set(f.objectId,c);}for(const p of f.points){c[0]=Math.min(c[0],p[0]);c[1]=Math.max(c[1],p[0]);c[2]=Math.min(c[2],p[1]);c[3]=Math.max(c[3],p[1]);c[4]=Math.min(c[4],p[2]);c[5]=Math.max(c[5],p[2]);}}
    for(const [id,c] of acc)centers.set(id,[(c[0]+c[1])/2,(c[2]+c[3])/2,(c[4]+c[5])/2]);}
  // 시안 H2: 대표 가구·조형물 선을 물체 중심 쪽으로 1.6cm 안쪽에 한 줄 더(얇은 두 줄)
  const inward=(p,id)=>{const c=centers.get(id);if(!c)return p;const d=[c[0]-p[0],c[1]-p[1],c[2]-p[2]],l=Math.hypot(...d)||1;return [p[0]+d[0]/l*.016,p[1]+d[1]/l*.016,p[2]+d[2]/l*.016];};
  const ranges=new Map();
  for(const [a,b,n,id] of [...edges].sort((a,b)=>a[3]-b[3])){
    if(!ranges.has(id))ranges.set(id,{start:v.length/5,length:0});
    const tone=heroIds.includes(id)?(n===.5?2.9:3):n,k=DIST?Math.max(1,Math.ceil(L(a,b)/.4)):1;
    for(let i=0;i<k;i++){ranges.get(id).length+=2;v.push(...mix(a,b,i/k),tone,id,...mix(a,b,(i+1)/k),tone,id);}
    if(HSTYLE===2&&(tone===3||tone===2.8)&&id){ranges.get(id).length+=2;v.push(...inward(a,id),tone,id,...inward(b,id),tone,id);}
  }
  const total=v.length/5;
  // 곡면 윤곽선: 두 이웃 면 중 하나만 카메라를 향하면 그 공유선이 윤곽입니다.
  const sil=silEdges.map(([a,b,c1,t1,c2,t2,tone,id])=>({a,b,c1,n1:[t1[0]-c1[0],t1[1]-c1[1],t1[2]-c1[2]],c2,n2:[t2[0]-c2[0],t2[1]-c2[1],t2[2]-c2[2]],tone:heroIds.includes(id)?3:tone,id}));
  const silBuf=gl.createBuffer(),silData=new Float32Array(sil.length*20);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(t);gl.vertexAttribPointer(t,1,gl.FLOAT,false,20,12);
  gl.enableVertexAttribArray(id);gl.vertexAttribPointer(id,1,gl.FLOAT,false,20,16);
  function bindScene(){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(t);gl.vertexAttribPointer(t,1,gl.FLOAT,false,20,12);gl.enableVertexAttribArray(id);gl.vertexAttribPointer(id,1,gl.FLOAT,false,20,16);}
  // 시안4: 이전 프레임을 배경색으로 살짝만 덮어 잔상을 남깁니다.
  const fp=gl.createProgram();
  for(const [type,src] of [[gl.VERTEX_SHADER,'attribute vec2 q;void main(){gl_Position=vec4(q,0.,1.);}'],[gl.FRAGMENT_SHADER,'precision mediump float;uniform vec4 c;void main(){gl_FragColor=c;}']]){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);gl.attachShader(fp,sh);}
  gl.linkProgram(fp);const fq=gl.getAttribLocation(fp,'q'),fc=gl.getUniformLocation(fp,'c'),fbuf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,fbuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  function fade(col,k){gl.useProgram(fp);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    for(let i=0;i<8;i++)gl.disableVertexAttribArray(i);
    gl.bindBuffer(gl.ARRAY_BUFFER,fbuf);gl.enableVertexAttribArray(fq);gl.vertexAttribPointer(fq,2,gl.FLOAT,false,0,0);gl.uniform4f(fc,col[0],col[1],col[2],k);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.disableVertexAttribArray(fq);}
  bindScene();
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  // Native WebGL lines can be limited to one raster pixel. Map that pixel to the requested CSS stroke width.
  gl.lineWidth(1);
  return function(cam,light,selected=0,reveal=0,heading=[0,-1]){
    resizeCanvas(canvas,1/sceneLineWidth);gl.uniform1f(u.reveal,SLATS?reveal:0.);gl.uniform1f(u.boost,MODE===2?reveal:MODE===5?.55*reveal:0);gl.uniform1f(u.fog,MODE===5?reveal:0);gl.uniform2f(u.heading,heading[0],heading[1]);const {width:w,height:h}=canvas;
    const [back,outline]=colors(light).map(rgb=>rgb.map(v=>v/255));
    gl.viewport(0,0,w,h);gl.clearColor(...back,1);
    if(MODE===4&&reveal>.05){fade(back,.30+.7*(1-reveal));gl.useProgram(program);bindScene();gl.clear(gl.DEPTH_BUFFER_BIT);}else gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform3fv(u.paper,back);gl.uniform3fv(u.edge,outline);
    gl.uniform1f(u.opacity,lineOpacity(light));gl.uniform1f(u.lit,light);
    gl.uniform1f(u.selected,selected);
    gl.uniform2f(u.haloOffset,0,0);gl.uniform1f(u.alpha,1);
    gl.uniform3f(u.eye,cam.x,cam.y||EYE,cam.z);gl.uniform2f(u.roll,Math.cos(cam.roll||0),Math.sin(cam.roll||0));gl.uniform4f(u.rot,Math.cos(cam.yaw),Math.sin(cam.yaw),Math.cos(cam.pitch),Math.sin(cam.pitch));
    const focal=(w/h<1?1.05:1.25)*(MODE===3?1-.24*reveal:1)*(1-(cam.wide||0))*LENSV[0];gl.uniform1f(u.barrel,LENSV[1]);
    gl.uniform2f(u.lens,focal*h/w,focal);
    gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);gl.drawArrays(gl.TRIANGLES,0,count);gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.drawArrays(gl.LINES,count,total-count);
    let sn=0;{const ex=cam.x,ey=cam.y||EYE,ez=cam.z;
      for(const e of sil){const s1=e.n1[0]*(ex-e.c1[0])+e.n1[1]*(ey-e.c1[1])+e.n1[2]*(ez-e.c1[2]),s2=e.n2[0]*(ex-e.c2[0])+e.n2[1]*(ey-e.c2[1])+e.n2[2]*(ez-e.c2[2]);
        if((s1>0)!==(s2>0)){silData.set([...e.a,e.tone,e.id,...e.b,e.tone,e.id],sn*10);sn++;
          if(HSTYLE===2&&e.tone>2.5){silData.set([...inward(e.a,e.id),e.tone,e.id,...inward(e.b,e.id),e.tone,e.id],sn*10);sn++;}}}}
    if(sn){gl.bindBuffer(gl.ARRAY_BUFFER,silBuf);gl.bufferData(gl.ARRAY_BUFFER,silData.subarray(0,sn*10),gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(a,3,gl.FLOAT,false,20,0);gl.vertexAttribPointer(t,1,gl.FLOAT,false,20,12);gl.vertexAttribPointer(id,1,gl.FLOAT,false,20,16);
      gl.drawArrays(gl.LINES,0,sn*2);bindScene();}
    // 가까운 선만 0.7px씩 옆으로 한 번 더 그려 굵어 보이게 합니다.
    gl.uniform1f(u.nearPass,1);
    for(const [ox,oy] of [[.7,0],[0,.7]]){gl.uniform2f(u.haloOffset,2*ox/canvas.clientWidth,2*oy/canvas.clientHeight);gl.drawArrays(gl.LINES,count,total-count);
      if(sn){gl.bindBuffer(gl.ARRAY_BUFFER,silBuf);gl.vertexAttribPointer(a,3,gl.FLOAT,false,20,0);gl.vertexAttribPointer(t,1,gl.FLOAT,false,20,12);gl.vertexAttribPointer(id,1,gl.FLOAT,false,20,16);gl.drawArrays(gl.LINES,0,sn*2);bindScene();}}
    gl.uniform1f(u.nearPass,0);gl.uniform2f(u.haloOffset,0,0);
    // 시안 H1: 대표 가구·조형물만 사방 1px씩 겹쳐 그려 굵게
    if(HSTYLE===1){gl.uniform1f(u.strongOnly,1);
      for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1],[.7,.7]]){gl.uniform2f(u.haloOffset,2*ox/canvas.clientWidth,2*oy/canvas.clientHeight);gl.drawArrays(gl.LINES,count,total-count);
        if(sn){gl.bindBuffer(gl.ARRAY_BUFFER,silBuf);gl.vertexAttribPointer(a,3,gl.FLOAT,false,20,0);gl.vertexAttribPointer(t,1,gl.FLOAT,false,20,12);gl.vertexAttribPointer(id,1,gl.FLOAT,false,20,16);gl.drawArrays(gl.LINES,0,sn*2);bindScene();}}
      gl.uniform1f(u.strongOnly,0);gl.uniform2f(u.haloOffset,0,0);}
    const range=selected&&ranges.get(selected);
    if(range){
      // Screen-space halo around the visible edges; the room depth buffer masks it.
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
      for(const [radius,weight] of [[1.1,.09],[2.4,.04]]){
        gl.uniform1f(u.alpha,weight);
        for(let j=0;j<8;j++){
          const angle=j*Math.PI/4;
          gl.uniform2f(u.haloOffset,2*radius*Math.cos(angle)/canvas.clientWidth,2*radius*Math.sin(angle)/canvas.clientHeight);
          gl.drawArrays(gl.LINES,range.start,range.length);
        }
      }
      gl.depthMask(true);gl.disable(gl.BLEND);
    }
  };
}
function colors(light){
  // 불 켰을 때: 흰 배경 위 남색 선(흐린 회색 대신)으로 또렷하게
  return [[3+252*light,8+247*light,23+232*light],[255-239*light,255-225*light,255-191*light]];
}
function resizeCanvas(c,s=Math.min(window.devicePixelRatio||1,1.6)){
  const w=Math.round(c.clientWidth*s),h=Math.round(c.clientHeight*s);
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
}
// Pick the nearest rendered triangle, including non-interactive walls as occluders.
function makePicker(){
  const triangles=[];
  for(const {points,objectId} of faces){
    const a=points[0];
    for(let i=1;i<points.length-1;i++){
      const b=points[i],c=points[i+1];
      triangles.push([a[0],a[1],a[2],b[0]-a[0],b[1]-a[1],b[2]-a[2],c[0]-a[0],c[1]-a[1],c[2]-a[2],objectId]);
    }
  }
  return function(cam,x,y,w,h){
    // 화면 렌즈(L2: 화각·배럴 왜곡)와 똑같이 되돌려서 호버 위치를 맞춥니다.
    let nx=(x-w/2)/(w/2),ny=(h/2-y)/(h/2);
    if(LENSV[1]){const x0=nx,y0=ny;for(let i=0;i<8;i++){const sc=1+LENSV[1]*((nx*w/h)**2+ny**2)*.5;nx=x0/sc;ny=y0/sc;}}
    const k=h*(w/h<1?1.05:1.25)*LENSV[0]/2,side=nx*(w/2)/k,up=ny*(h/2)/k;
    const depth=Math.cos(cam.pitch)-up*Math.sin(cam.pitch),sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw);
    const dx=cy*side+sy*depth,dy=Math.sin(cam.pitch)+up*Math.cos(cam.pitch),dz=sy*side-cy*depth;
    let nearest=40,id=0;
    for(const t of triangles){
      const px=dy*t[8]-dz*t[7],py=dz*t[6]-dx*t[8],pz=dx*t[7]-dy*t[6];
      const det=t[3]*px+t[4]*py+t[5]*pz;
      if(Math.abs(det)<1e-8)continue;
      const ax=cam.x-t[0],ay=EYE-t[1],az=cam.z-t[2];
      const u=(ax*px+ay*py+az*pz)/det;if(u<0||u>1)continue;
      const qx=ay*t[5]-az*t[4],qy=az*t[3]-ax*t[5],qz=ax*t[4]-ay*t[3];
      const v=(dx*qx+dy*qy+dz*qz)/det;if(v<0||u+v>1)continue;
      const z=(t[6]*qx+t[7]*qy+t[8]*qz)/det;
      if(z>=.04&&z<nearest){nearest=z;id=t[9];}
    }
    return id;
  };
}
// Depth-sorted perspective is also available when hardware acceleration is off.
function painter(c){
  const ctx=c.getContext('2d');
  return function(cam,light,selected=0,reveal=0,heading=[0,-1]){
    resizeCanvas(c);const w=c.width,h=c.height,k=h*(w/h<1?1.05:1.25)*LENSV[0]/2;
    const [bg,outline]=colors(light).map(rgb=>'rgb('+rgb.join(',')+')'),cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw),cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
    function view([x,y,z]){x-=cam.x;z-=cam.z;y-=EYE;const d=x*sy-z*cy;return [x*cy+z*sy,y*cp-d*sp,d*cp+y*sp];}
    function clip(a,b){let t=(.07-a[2])/(b[2]-a[2]);return [a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),.07];}
    function screen(p){return [w/2+p[0]*k/p[2],h/2-p[1]*k/p[2]];}
    const draw=[];
    for(const {points,objectId} of faces){
      const p=points.map(view),vs=[];
      for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if(a[2]>=.07)vs.push(a);if((a[2]>=.07)!==(b[2]>=.07))vs.push(clip(a,b));}
      if(vs.length>2)draw.push([vs.reduce((s,q)=>s+q[2],0)/vs.length,vs,-1,objectId]);
    }
    for(const [first,last,t,id] of edges){
      if(t===4&&reveal<.02)continue;
      let a=view(first),b=view(last);if(a[2]<.07&&b[2]<.07)continue;
      if(a[2]<.07)a=clip(a,b);if(b[2]<.07)b=clip(b,a);draw.push([(a[2]+b[2])/2-.012,[a,b],t,id]);
    }
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.lineWidth=sceneLineWidth*w/c.clientWidth;
    ctx.strokeStyle=outline;
    for(const [,vs,t,id] of draw.sort((a,b)=>b[0]-a[0])){
      ctx.beginPath();vs.forEach((v,i)=>ctx[i?'lineTo':'moveTo'](...screen(v)));
      if(t<0){
        ctx.closePath();ctx.globalAlpha=1;ctx.fillStyle=bg;ctx.fill();
      }
      else{
        const glow=selected>0&&selected===id;
        if(t===4){const m=Math.hypot((vs[0][0]+vs[1][0])/2,(vs[0][1]+vs[1][1])/2,(vs[0][2]+vs[1][2])/2),f=Math.max(0,Math.min(1,vs[0][2]/Math.max(m,.001))),far=5+8*f*f,k=reveal*(1-Math.min(1,Math.max(0,(m-far*.4)/(far*.6))))*(.3+.7*Math.min(1,f*.6+.4));if(k<.02)continue;ctx.globalAlpha=.6*k;ctx.stroke();continue;}
        ctx.globalAlpha=glow ? 1 : (heroIds.includes(id)||t>2.5&&t<3.5) ? .74 : (t===.5?lineOpacity(light)*.45:lineOpacity(light));ctx.shadowColor=outline;
        ctx.shadowBlur=glow?3*w/c.clientWidth:0;ctx.stroke();ctx.shadowBlur=0;
      }
    }
    ctx.globalAlpha=1;
  };
}
