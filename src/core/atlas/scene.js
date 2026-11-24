// The coordinate system uses metres, with the rear wall at z=0.
const faces=[], edges=[], obstacles=[], walls=[], footprints=[];
let stroke=1, objectId=0, objectCount=0;
function place(model,...args){
  objectId=++objectCount;
  model(...args);
  objectId=0;
}
function poly(points,outline=true){
  faces.push({points,objectId});
  if(outline) loop(points);
}
function line(a,b,t=stroke){edges.push([a,b,t,objectId]);}
function loop(p,t=stroke){p.forEach((v,i)=>line(v,p[(i+1)%p.length],t));}
function box(x,y,z,w,h,d,outline=true){
  const v=[];
  for(let j=0;j<2;j++)for(let k=0;k<2;k++)for(let i=0;i<2;i++)v.push([x+(i-.5)*w,y+j*h,z+(k-.5)*d]);
  for(const ids of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]])poly(ids.map(i=>v[i]),false);
  if(outline)for(const [i,j] of [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]])line(v[i],v[j]);
}
function rect(x,z,w,d,furniture=true){
  const b={x,z,w,d}; obstacles.push(b); (furniture?footprints:walls).push(b);
}
function cylinder(x,y,z,r1,r2,h,n=24){
  const a=[],b=[];
  for(let i=0;i<n;i++){let t=i*2*Math.PI/n;a.push([x+r1*Math.cos(t),y,z+r1*Math.sin(t)]);b.push([x+r2*Math.cos(t),y+h,z+r2*Math.sin(t)]);}
  poly(a);poly(b);for(let i=0;i<n;i++)poly([a[i],a[(i+1)%n],b[(i+1)%n],b[i]],false);
  for(let i=0;i<n;i+=Math.max(1,n/8|0))line(a[i],b[i],0);
}
function cushion(x,y,z,w,h,d,r=.12){
  const rings=[];
  for(const [dy,inset] of [[0,.05],[.055,0],[h-.052,0],[h,.05]]){
    const ring=[];
    for(const [sx,sz,start] of [[1,1,0],[-1,1,90],[-1,-1,180],[1,-1,270]])
      for(let i=0;i<5;i++){
        const a=(start+i*22.5)*Math.PI/180;
        ring.push([x+sx*(w/2-r-inset)+r*Math.cos(a),y+dy,z+sz*(d/2-r-inset)+r*Math.sin(a)]);
      }
    rings.push(ring);
  }
  poly(rings[0],false);poly(rings[3],false);
  for(let j=1;j<4;j++)for(let i=0;i<20;i++)poly([rings[j-1][i],rings[j-1][(i+1)%20],rings[j][(i+1)%20],rings[j][i]],false);
  loop(rings[1]);loop(rings[3]);for(const i of [0,5,10,15])line(rings[1][i],rings[2][i],0);
}
function table(x,z,w,d,h=.74){
  box(x,h-.09,z,w,.09,d);
  for(const dx of [-1,1])for(const dz of [-1,1])box(x+dx*(w/2-.12),0,z+dz*(d/2-.12),.075,h-.09,.075);
  rect(x,z,w,d);
}
function chair(x,z,sign=1){
  cushion(x,.42,z,.58,.12,.56,.08);box(x,.53,z+sign*.24,.54,.43,.07);
  for(const a of [-.23,.23])for(const b of [-.21,.21])box(x+a,0,z+b,.045,.42,.045);
  rect(x,z,.58,.58);
}
function sofa(x,z,w){
  rect(x,z,w,1.22);
  for(const a of [-1,1])for(const b of [-1,1])box(x+a*(w/2-.21),0,z+b*.44,.10,.18,.10);
  cushion(x,.16,z,w,.27,1.22);
  for(let j=0;j<3;j++){
    const pw=(w-.34)/3,px=x+(j-1)*pw;
    cushion(px,.42,z+.1,pw-.025,.21,.86);
    cushion(px,.48,z-.43,pw-.025,.65,.30,.09);
  }
  for(const a of [-1,1])cushion(x+a*(w/2-.10),.4,z,.20,.44,1.17,.07);
}
function shelves(x,z,w,h=2.45){
  const d=.47;
  rect(x,z,w,d);
  for(const side of [-1,1])box(x+side*(w/2-.035),0,z,.07,h,d);
  let bays=Math.max(1,Math.round(w/1.26)),bw=w/bays;
  for(let i=1;i<bays;i++)box(x-w/2+i*bw,0,z,.045,h,d);
  for(let j=0;j<5;j++)box(x,j*(h-.06)/4,z,w,.06,d);
  for(let i=0;i<bays;i++)for(let j=1;j<=3;j++){
    const bx=x-w/2+bw*i+.22,by=j*(h-.06)/4+.06;
    if((i+j)%3===0)cylinder(bx+.21,by,z,.09,.14,.22,16);
    else for(let b=0;b<3+(i+j)%3;b++)box(bx+b*.084,by,z,.072,.23+(b*j%4)*.039,.24);
  }
}
function lamp(x,z,h=1.65){
  cylinder(x,0,z,.26,.26,.055);cylinder(x,.055,z,.021,.021,h-.055,12);
  cylinder(x,h-.06,z,.36,.22,.37,32);
}
function art(x,z,w,h,y){
  box(x,y,z,w,h,.05);loop([[x-w*.43,y+.06,z+.03],[x+w*.43,y+.06,z+.03],[x+w*.43,y+h-.06,z+.03],[x-w*.43,y+h-.06,z+.03]],0);
}
function plant(x,z,size=1){
  cylinder(x,0,z,.18*size,.25*size,.45*size);
  for(let i=0;i<12;i++){
    let a=i*2.4,r=(.25+(i%4)*.08)*size,h=(.70+(i%5)*.13)*size;
    let tip=[x+Math.cos(a)*r,h,z+Math.sin(a)*r],base=[x,.36*size,z],mid=[(x+tip[0])/2,h+.11*size,(z+tip[2])/2];
    let leaf=[base,[mid[0]+.07*Math.sin(a),mid[1],mid[2]-.07*Math.cos(a)],tip,[mid[0]-.07*Math.sin(a),mid[1],mid[2]+.07*Math.cos(a)]];
    poly(leaf);line(base,tip,0);
  }
}
function bed(x,z){
  rect(x,z,2.65,3.55);box(x,.12,z,2.65,.32,3.55);cushion(x,.44,z,2.58,.26,3.45);
  cushion(x,.68,z+.39,2.61,.13,2.52);box(x,.12,z-1.73,2.69,1.18,.12);
  for(const dx of [-.63,.63])cushion(x+dx,.7,z-1.13,1.07,.17,.65);
  for(const d of [.0,.07])line([x-1.24,.82,z-.48+d],[x+1.24,.82,z-.48+d],0);
}
const height=3.5;
function wall(x1,z1,x2,z2){const w=Math.abs(x2-x1)||.16,d=Math.abs(z2-z1)||.16,x=(x1+x2)/2,z=(z1+z2)/2;box(x,0,z,w,height,d);rect(x,z,w,d,false);}
function header(x1,z1,x2,z2){box((x1+x2)/2,2.87,(z1+z2)/2,Math.abs(x2-x1)||.16,.63,Math.abs(z2-z1)||.16);}
function rug(x,z,w,d){
  const y=.012;
  poly([[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]],false);
  loop(faces[faces.length-1].points,0);
  for(let i=-w/2+.1;i<w/2;i+=.12)for(const sign of [-1,1])line([x+i,y,z+sign*d/2],[x+i,y,z+sign*(d/2+.065)],0);
}
// Inward normals define which side of each opening belongs to its room.
const doorways=[
  {x:5.7,z:15.55,nx:0,nz:-1,width:2.5},
  {x:8.96,z:5.10,nx:0,nz:-1,width:2.15},
  {x:18.15,z:2.64,nx:-1,nz:0,width:1.98},
  {x:21.10,z:11.55,nx:1,nz:0,width:1.60},
  {x:19.82,z:7.15,nx:0,nz:-1,width:2.44}
];
function caseOpening(d){
  const half=d.width/2;
  for(const s of [-half,half]){
    const x=d.x-d.nz*s,z=d.z+d.nx*s;
    box(x,0,z,d.nx?.24:.105,2.84,d.nx?.105:.24);
    rect(x,z,d.nx?.24:.105,d.nx?.105:.24,false);
  }
  box(d.x,2.82,d.z,d.nx?.24:d.width+.105,.12,d.nx?d.width+.105:.24);
  box(d.x,.002,d.z,d.nx?.22:d.width,.014,d.nx?d.width:.22);
}
function build(){
  // Orthogonal approximation traced from the upper wall rims in map.png.
  function chain(points){for(let i=1;i<points.length;i++)wall(...points[i-1],...points[i]);}
  chain([[0,18],[0,0],[1.4,0],[1.4,2.4],[5.15,2.4],[5.15,-1.1],[10.55,-1.1],[10.55,-7.4],[14.85,-7.4],[14.85,-5.6],[17,-5.6],[17,-4.65],[22.55,-4.65],[22.55,-2.25],[26.9,-2.25],[26.9,7.05],[27.45,7.05],[27.45,16.9],[21.4,16.9],[21.4,18.15],[12.45,18.15]]);
  wall(0,18,10.05,18);
  header(10.05,18.08,12.45,18.08);
  // Rear display bay, central bedroom and the smaller study in front of it.
  chain([[4.85,6.8],[4.85,5.1],[7.85,5.1]]);
  wall(11.5,.8,11.5,7.25);
  wall(11.5,7.25,13.7,7.25);
  wall(13.7,6.25,14.35,6.25);
  chain([[16.8,6.25],[18.15,6.25],[18.15,3.65]]);
  chain([[13.7,5.9],[13.7,-.4],[17.9,-.4]]);
  wall(18.15,-.4,18.15,1.6);
  wall(13.7,7.25,13.7,12.1);
  chain([[13.7,7.25],[18.15,7.25],[18.15,12.1]]);
  chain([[10.0,11.25],[10,7.6],[10.8,7.6]]);
  // Right-hand kitchen and front suite share the corridor on their west side.
  wall(18.5,-4.65,18.5,-1.35);
  chain([[23.45,2.95],[23.45,4.65],[25.3,4.65]]);
  chain([[21.1,10.75],[21.1,7.15],[27.45,7.15]]);
  wall(21.1,12.35,21.1,14.25);
  wall(12.75,15.25,21.4,15.25);
  wall(21.4,15.25,21.4,18.15);
  // Tall glazing and the row of small tables along the front edge.
  for(let x=.42;x<21.4;x+=1.42){
    if(x>9.8&&x<12.65)continue;
    const z=x<10?17.89:18.03;
    box(x,0,z,.045,3.16,.055);
    line([x,.83,z-.04],[Math.min(x+1.38,x<10?9.95:21.38),.83,z-.04],0);
  }
  for(const x of [13.6,15.45,17.3,19.15,20.55]){
    place(table,x,16.42,.94,.64);place(chair,x,17.15);
  }
  for(let x=.5;x<27.4;x+=2.8){line([x,.002,-4.6],[x,.002,17.96],0);line([x,3.49,-4.6],[x,3.49,17.96],0);}
  for(let z=-4.5;z<18;z+=2.8){line([0,.002,z],[27.4,.002,z],0);line([0,3.49,z],[27.4,3.49,z],0);}
  for(let x=2;x<27;x+=4.4)for(let z=2;z<18;z+=4.7)place(box,x,3.46,z,.77,.048,.28);
  // Open lounge on the left, with freestanding displays rather than a dividing wall.
  place(sofa,6.2,12.35,3.0);place(rug,6.2,14.05,4.65,2.85);place(table,6.25,13.85,1.62,.78,.38);
  place(cylinder,6.1,.38,13.8,.11,.14,.16);place(lamp,8.24,12.35);
  place(table,2.65,11.8,.95,1.8,.5);place(shelves,6.3,5.53,2.6,1.55);
  place(shelves,3.38,2.75,2.75);place(table,3.7,7.1,.96,1.66,.52);
  place(table,7.55,2.04,2.15,1.02);place(chair,6.99,3.03);place(chair,8.12,3.03);
  place(table,12.2,-5.86,1.88,.84);place(chair,12.2,-4.98);
  place(bed,15.95,2.35);place(shelves,15.7,.0,2.8,1.82);place(table,17.58,1.95,.57,.60,.48);
  place(table,15.8,9.77,1.85,.87);place(chair,15.8,10.56);place(shelves,15.85,7.57,2.64,1.92);
  // The reference shows a daybed and a tall reading light in the front-right room.
  place(bed,24.53,11.25);place(lamp,26.22,10.42,1.93);place(plant,26.46,15.36,1.15);
  for(let i=0;i<4;i++){const x=19.6+i*1.32;place(box,x,0,-2.02,1.3,.93,.78);place(box,x,1.56,-2.13,1.29,.71,.49);}
  rect(21.58,-2.02,5.26,.78);place(table,21.66,2.53,2.68,1.17,.77);
  for(const dx of [-.8,0,.8])for(const sign of [-1,1])place(chair,21.66+dx,2.53+sign*.95,sign);
  place(cylinder,21.66,2.36,2.53,.41,.14,.28);line([21.66,2.64,2.53],[21.66,3.48,2.53],0);
  // Short wing walls at the open living and dining bays retain the open plan.
  wall(3.5,15.55,4.45,15.55);wall(6.95,15.55,8.32,15.55);
  wall(10.04,5.1,10.56,5.1);
  wall(18.18,7.15,18.60,7.15);
  doorways.forEach(caseOpening);
  buildExit();
}
const exitDoor={x:11.25,z:18.08,width:2.4};
function buildExit(){
  const {x,z,width}=exitDoor,left=x-width/2,right=x+width/2;
  for(const jamb of [left,right])box(jamb,0,z,.12,2.88,.34);
  box(x,2.74,z,width,.14,.34);
  box(x,.008,z,width,.025,.38);
  // Two glazed leaves, held open outwards; the middle remains traversable.
  for(const side of [-1,1]){
    const hinge=x+side*(width/2-.06),end=hinge-side*.37,far=z+1.05;
    const leaf=[[hinge,.04,z],[end,.04,far],[end,2.7,far],[hinge,2.7,z]];
    loop(leaf);loop(leaf.map(([a,b,c])=>[a+.032*side,b,c]));
    for(const y of [.22,1.02,2.52])line([hinge,y,z],[end,y,far]);
    line([end+side*.08,.91,far-.14],[end+side*.08,1.27,far-.14]);
  }
  // A small architectural exit pictogram mounted above the lintel.
  box(x,2.97,z-.13,.69,.28,.04);
  const front=z-.158;
  for(const [a,b] of [[[0,.045],[0,.222]],[[0,.222],[-.077,.145]],[[0,.222],[.077,.145]]])
    line([x+a[0],2.97+a[1],front],[x+b[0],2.97+b[1],front],2);
  for(const edge of [left-.74,right+.74])line([edge,.015,z],[edge,.015,z+5],0);
  for(const dz of [1.45,2.95,4.45])line([left-.74,.015,z+dz],[right+.74,.015,z+dz],0);
  for(const side of [-1,1]){box(x+side*2.8,0,z+3.85,1.48,.42,.82);place(plant,x+side*2.8,z+3.85,1.32);}
}
build();
