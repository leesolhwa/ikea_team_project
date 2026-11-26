const sceneLineWidth=0.7;
function lineOpacity(dark){return dark ? 0.25 : 0.37;}
function makeRenderer(canvas){
  const gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});
  if(!gl)return painter(canvas);
  const program=gl.createProgram();
  function attach(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));gl.attachShader(program,sh);}
  attach(gl.VERTEX_SHADER,`attribute vec3 pos; attribute float tone; attribute float objectId;
    uniform vec3 eye; uniform vec4 rot; uniform vec2 lens; uniform vec2 haloOffset; uniform float selected;
    varying float t; varying float active;
    void main(){vec3 p=pos-eye;float x=p.x*rot.x+p.z*rot.y;
      float z=p.x*rot.y-p.z*rot.x;float y=p.y*rot.z-z*rot.w;
      z=z*rot.z+p.y*rot.w;t=tone;active=objectId>0.5 && abs(objectId-selected)<0.25 ? 1. : 0.;
      gl_Position=vec4(vec2(x*lens.x,y*lens.y)+haloOffset*z,z*1.002-0.08008,z);}`);
  attach(gl.FRAGMENT_SHADER,`precision mediump float;uniform vec3 paper;uniform vec3 edge;uniform float opacity;uniform float alpha;varying float t;varying float active;
    void main(){gl_FragColor=vec4(t<-.5?paper:mix(paper,edge,mix(t>2.5 ? .66 : opacity,.90,active)),alpha);}`);
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const u={};for(const n of ['eye','rot','lens','paper','edge','selected','opacity','haloOffset','alpha'])u[n]=gl.getUniformLocation(program,n);
  const a=gl.getAttribLocation(program,'pos'),t=gl.getAttribLocation(program,'tone'),id=gl.getAttribLocation(program,'objectId'),v=[];
  for(const f of faces)for(let i=1;i<f.points.length-1;i++)for(const p of [f.points[0],f.points[i],f.points[i+1]])v.push(...p,-1,f.objectId);
  const count=v.length/5;
  const ranges=new Map();
  for(const [a,b,n,id] of [...edges].sort((a,b)=>a[3]-b[3])){
    if(!ranges.has(id))ranges.set(id,{start:v.length/5,length:0});
    const tone=heroIds.includes(id)?3:n; ranges.get(id).length+=2;v.push(...a,tone,id,...b,tone,id);
  }
  const total=v.length/5;
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(t);gl.vertexAttribPointer(t,1,gl.FLOAT,false,20,12);
  gl.enableVertexAttribArray(id);gl.vertexAttribPointer(id,1,gl.FLOAT,false,20,16);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  // Native WebGL lines can be limited to one raster pixel. Map that pixel to the requested CSS stroke width.
  gl.lineWidth(1);
  return function(cam,dark,selected=0){
    resizeCanvas(canvas,1/sceneLineWidth);const {width:w,height:h}=canvas;
    const [back,outline]=colors(dark).map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));
    gl.viewport(0,0,w,h);gl.clearColor(...back,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform3fv(u.paper,back);gl.uniform3fv(u.edge,outline);
    gl.uniform1f(u.opacity,lineOpacity(dark));
    gl.uniform1f(u.selected,selected);
    gl.uniform2f(u.haloOffset,0,0);gl.uniform1f(u.alpha,1);
    gl.uniform3f(u.eye,cam.x,1.57,cam.z);gl.uniform4f(u.rot,Math.cos(cam.yaw),Math.sin(cam.yaw),Math.cos(cam.pitch),Math.sin(cam.pitch));
    const focal=w/h<1?1.22:1.53;
    gl.uniform2f(u.lens,focal*h/w,focal);
    gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);gl.drawArrays(gl.TRIANGLES,0,count);gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.drawArrays(gl.LINES,count,total-count);
    const range=selected&&ranges.get(selected);
    if(range){
      // Screen-space halo around the visible edges; the room depth buffer masks it.
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
      for(const [radius,weight] of [[1.2,.035]]){
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
function colors(dark){return dark?['#030817','#FFFFFF']:['#FFFFFF','#808080'];}
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
    const k=h*(w/h<1?1.22:1.53)/2,side=(x-w/2)/k,up=(h/2-y)/k;
    const depth=Math.cos(cam.pitch)-up*Math.sin(cam.pitch),sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw);
    const dx=cy*side+sy*depth,dy=Math.sin(cam.pitch)+up*Math.cos(cam.pitch),dz=sy*side-cy*depth;
    let nearest=40,id=0;
    for(const t of triangles){
      const px=dy*t[8]-dz*t[7],py=dz*t[6]-dx*t[8],pz=dx*t[7]-dy*t[6];
      const det=t[3]*px+t[4]*py+t[5]*pz;
      if(Math.abs(det)<1e-8)continue;
      const ax=cam.x-t[0],ay=1.57-t[1],az=cam.z-t[2];
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
  return function(cam,dark,selected=0){
    resizeCanvas(c);const w=c.width,h=c.height,k=h*(w/h<1?1.22:1.53)/2;
    const [bg,outline]=colors(dark),cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw),cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
    function view([x,y,z]){x-=cam.x;z-=cam.z;y-=1.57;const d=x*sy-z*cy;return [x*cy+z*sy,y*cp-d*sp,d*cp+y*sp];}
    function clip(a,b){let t=(.07-a[2])/(b[2]-a[2]);return [a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),.07];}
    function screen(p){return [w/2+p[0]*k/p[2],h/2-p[1]*k/p[2]];}
    const draw=[];
    for(const {points,objectId} of faces){
      const p=points.map(view),vs=[];
      for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if(a[2]>=.07)vs.push(a);if((a[2]>=.07)!==(b[2]>=.07))vs.push(clip(a,b));}
      if(vs.length>2)draw.push([vs.reduce((s,q)=>s+q[2],0)/vs.length,vs,-1,objectId]);
    }
    for(const [first,last,t,id] of edges){
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
        ctx.globalAlpha=glow ? 0.90 : heroIds.includes(id) ? .66 : lineOpacity(dark);ctx.shadowColor=outline;
        ctx.shadowBlur=glow?3*w/c.clientWidth:0;ctx.stroke();ctx.shadowBlur=0;
      }
    }
    ctx.globalAlpha=1;
  };
}
