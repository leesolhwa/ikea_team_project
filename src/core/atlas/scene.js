const mapWalls=[];
// The coordinate system uses metres, with the rear wall at z=0.
const faces=[], edges=[], obstacles=[], walls=[], footprints=[];
let stroke=1, objectId=0, objectCount=0;
const silEdges=[]; // 곡면 윤곽선 후보: [a,b,c1,tip1,c2,tip2,tone,objectId]. 매 프레임 보이는 윤곽만 그립니다.
function silPts(si){const r=[];for(const e of silEdges.slice(si))for(let k=0;k<6;k++)r.push(e[k]);return r;}
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
  for(let i=0;i<n;i+=Math.max(1,n/8|0))line(a[i],b[i],.5);
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
let height=3.0; // 쇼룸 칸막이 높이. 외벽만 층고(CEIL)까지 올립니다.
// ── 쇼룸 골조 · 소품 (미니맵에는 그리지 않는 요소들) ──
const CEIL=8.2; // 층고: 실제 대형 매장처럼 높게
function panel(x1,z1,x2,z2,h=2.6){
  // 쇼룸 부스 칸막이: 미니맵 벽(mapWalls)에는 넣지 않습니다.
  const w=Math.abs(x2-x1)||.1,d=Math.abs(z2-z1)||.1;box((x1+x2)/2,0,(z1+z2)/2,w,h,d);
}
function glazing(x1,z1,x2,z2){
  const w=Math.abs(x2-x1)||.16,d=Math.abs(z2-z1)||.16,x=(x1+x2)/2,z=(z1+z2)/2,len=Math.max(w,d);
  box(x,0,z,w,.5,d);box(x,3.3,z,w,CEIL-3.3,d);
  const n=Math.max(1,Math.round(len/1.6));
  for(let i=0;i<=n;i++){const t=i/n;box(x1+(x2-x1)*t,.5,z1+(z2-z1)*t,x1===x2?.09:.06,2.8,x1===x2?.06:.09);}
}
function boxSofa(x,z,w,d=.98){
  // 팔걸이·등받이·좌석 외곽선이 한 덩어리로 이어지는 소파
  rect(x,z,w,d);
  for(const a of [-1,1])for(const b of [-1,1])box(x+a*(w/2-.12),0,z+b*(d/2-.12),.05,.12,.05);
  box(x,.12,z,w,.3,d);
  box(x,.42,z-d/2+.11,w-.36,.4,.22);
  for(const a of [-1,1])box(x+a*(w/2-.09),.42,z,.18,.2,d);
  const n=w>2.2?3:2,sw=(w-.36)/n;
  for(let j=0;j<n;j++){const px=x-(w-.36)/2+sw*(j+.5);box(px,.42,z+.11,sw,.12,d-.22);}
  for(let j=1;j<n;j++){const px=x-(w-.36)/2+sw*j;line([px,.54,z-d/2+.22],[px,.82,z-d/2+.22],.5);}
}
function armchair(x,z,a=0){
  pose(x,z,a,()=>{rect(0,0,.8,.8);box(0,.1,0,.8,.32,.8);box(0,.42,-.29,.8,.42,.22);for(const s of [-1,1])box(s*.33,.42,.06,.14,.2,.68);
    for(const s of [-1,1])for(const t of [-1,1])box(s*.32,0,t*.32,.04,.1,.04);});
}
function cafeChair(x,z,sign=1){
  const back=z+sign*.19;
  box(x,.44,z,.42,.035,.4);
  for(const u of [-.17,.17])for(const v of [-.16,.16])box(x+u,0,z+v,.025,.44,.025);
  for(const u of [-.17,.17])box(x+u,.47,back,.025,.42,.025);
  contour(Array.from({length:13},(_,i)=>{const a=i*Math.PI/12;return [x-.17*Math.cos(a),.82+.07*Math.sin(a),back];}));
  line([x-.17,.64,back],[x+.17,.64,back]);
}
function diningSet(x,z,w=1.4,d=.8,n=2){
  table(x,z,w,d);
  for(let i=0;i<n;i++){const u=x-w/2+w*(i+.5)/n;cafeChair(u,z-d/2-.22,-1);cafeChair(u,z+d/2+.22,1);}
}
function tableLamp(x,y,z){
  cylinder(x,y,z,.075,.075,.025,14);cylinder(x,y+.025,z,.012,.012,.26,8);cylinder(x,y+.25,z,.17,.1,.2,22);
}
function pendantDome(x,z,y,r,top){line([x,y+.34,z],[x,top,z],.5);cylinder(x,y,z,r,r*.72,.16,30);cylinder(x,y+.16,z,r*.72,.06,.18,30);}
function pendantDrum(x,z,y,r,top){line([x,y+.28,z],[x,top,z],.5);cylinder(x,y,z,r,r,.28,32);}
function steelShelf(x,z,w,h,a=0){
  pose(x,z,a,()=>{
    const d=.5;rect(0,0,w,d);
    for(const u of [-w/2,w/2])for(const v of [-d/2,d/2])box(u,0,v,.045,h,.045);
    for(const y of [.12,h*.38,h*.66,h-.03])box(0,y,0,w,.03,d);
    for(let i=0;i<3;i++){
      const bx=-w/2+.45+i*(w-.9)/2;
      box(bx,h*.38+.03,0,.42,.3,.34);line([bx-.07,h*.38+.24,.172],[bx+.07,h*.38+.24,.172],.5);
      for(let k=0;k<3;k++)box(bx,h*.66+.03+k*.07,0,.44,.06,.3);
      box(bx,.15,0,.46,.32,.36);
    }
  });
}
function binShelf(x,z,w,a=0){
  // 아이방 수납장(바구니형)
  pose(x,z,a,()=>{
    box(0,0,0,w,.94,.44);
    const cols=Math.round(w/.42);
    for(let i=0;i<cols;i++)for(let j=0;j<3;j++){
      const u=-w/2+w*(i+.5)/cols,y=.08+j*.28;
      loop([[u-.16,y,.225],[u+.16,y,.225],[u+.16,y+.2,.225],[u-.16,y+.2,.225]],.5);
    }
  });
}
function kidsBed(x,z,a=0){
  pose(x,z,a,()=>{box(0,0,0,.98,.32,1.98);box(0,.32,.05,.92,.14,1.86);box(0,0,-.99,.98,.85,.06);box(0,0,.99,.98,.55,.06);
    box(.18,.46,-.68,.5,.1,.32);});
}
function desk(x,z,w,a=0){
  pose(x,z,a,()=>{box(0,.72,0,w,.03,.7);for(const s of [-1,1])box(s*(w/2-.04),0,0,.05,.72,.66);
    box(w/2-.3,0,.0,.4,.6,.55);for(const y of [.2,.4])line([w/2-.48,y,.276],[w/2-.12,y,.276],.5);
    tableLamp(-w/2+.25,.75,-.15);box(-.1,.75,-.18,.5,.32,.02);});
}
function officeChair(x,z,a=0){
  pose(x,z,a,()=>{for(let i=0;i<5;i++){const t=i*Math.PI*2/5;line([0,.06,0],[.3*Math.cos(t),.06,.3*Math.sin(t)]);}
    cylinder(0,.06,0,.025,.025,.36,8);box(0,.42,0,.48,.07,.46);box(0,.56,.22,.44,.5,.05);});
}
function wardrobe(x,z,w,h,a=0){
  pose(x,z,a,()=>{box(0,0,0,w,h,.6);
    const n=Math.round(w/.5);for(let i=1;i<n;i++){const u=-w/2+w*i/n;line([u,.05,.305],[u,h-.05,.305],i%2?.5:1);}
    for(let i=0;i<n;i+=2){const u=-w/2+w*(i+1)/n;for(const s of [-.04,.04])box(u+s,h*.46,.31,.012,.22,.02);}});
}
function kitchenRun(x,z,w,a=0,uppers=true){
  pose(x,z,a,()=>{
    box(0,0,0,w,.88,.6);box(0,.88,0,w+.04,.04,.64);
    if(uppers)box(0,1.48,-.13,w,.72,.34);
    for(let u=-w/2+.6;u<w/2-.01;u+=.6){line([u,.06,.305],[u,.84,.305],.5);if(uppers)line([u,1.5,.045],[u,2.18,.045],.5);}
    loop([[-w/4-.35,.925,-.15],[-w/4+.35,.925,-.15],[-w/4+.35,.925,.18],[-w/4-.35,.925,.18]],.5);
    for(const u of [w/4-.2,w/4+.2])cylinder(u,.92,0,.11,.11,.01,18);
  });
}
function stool(x,z){cylinder(x,.64,z,.18,.18,.04,18);for(const s of [-1,1])for(const t of [-1,1])line([x+s*.12,.64,z+t*.12],[x+s*.16,0,z+t*.16]);line([x-.14,.3,z-.14],[x+.14,.3,z-.14],.5);}
function shoeCabinet(x,z,w,a=0){pose(x,z,a,()=>{box(0,0,0,w,1.0,.3);line([-w/2+.02,.5,.152],[w/2-.02,.5,.152],.5);box(0,1.35,-.13,.6,.9,.03);
  for(let i=0;i<4;i++)line([w/2+.15+i*.12,0,0],[w/2+.15+i*.12,1.75,-.05],.5);});}
function shoppingCart(x,z,a=0){
  // 이케아 쇼핑 카트: 철망 바구니 + 손잡이 + 바퀴
  pose(x,z,a,()=>{
    const b=[[-.27,.42,-.42],[.27,.42,-.42],[.3,.42,.38],[-.3,.42,.38]],t=[[-.3,.88,-.48],[.3,.88,-.48],[.33,.88,.44],[-.33,.88,.44]];
    loop(b);loop(t);for(let i=0;i<4;i++)line(b[i],t[i]);
    for(let k=1;k<4;k++)line([-.31,.42+k*.115,-.45],[.31,.42+k*.115,-.45],.5);
    for(let k=1;k<5;k++){const u=-.3+k*.12;line([u,.42,.38],[u*1.1,.88,.44],.5);}
    poly([b[0],b[1],b[2],b[3]],false);
    for(const s of [-1,1]){line([s*.3,.88,.44],[s*.31,1.02,.62]);line([s*.25,.42,.36],[s*.25,.1,.4]);line([s*.25,.42,-.4],[s*.25,.1,-.38]);}
    line([-.31,1.02,.62],[.31,1.02,.62]);line([-.25,.1,-.38],[.25,.1,-.38]);line([-.25,.1,.4],[.25,.1,.4]);
    for(const s of [-1,1])for(const v of [-.38,.4])cylinder(s*.25,0,v,.05,.05,.04,10);
    line([-.28,.22,-.36],[.28,.22,-.36],.5);line([-.28,.22,.34],[.28,.22,.34],.5);
  });
}
function trayCart(x,z,a=0){
  // 레스토랑 쟁반 반납 카트
  pose(x,z,a,()=>{
    for(const s of [-1,1])for(const t of [-1,1])box(s*.28,.06,t*.2,.03,1.5,.03);
    for(let k=0;k<6;k++){box(0,.18+k*.24,0,.6,.02,.44);if(k%2===0)box(0,.2+k*.24,0,.5,.015,.36);}
    box(0,1.56,0,.62,.03,.46);
    for(const s of [-1,1])for(const t of [-1,1])cylinder(s*.28,0,t*.2,.05,.05,.05,10);
  });
}
function servingLine(x,z,len){
  // 배식대: 앞쪽(+z) 쟁반 레일, 위 유리 가림막, 쟁반 더미
  box(x,0,z,len,.9,.75);box(x,.9,z,len+.06,.05,.8);
  for(let u=-len/2+.9;u<len/2;u+=.9)line([x+u,.08,z+.377],[x+u,.84,z+.377],.5);
  box(x,.86,z+.62,len-.2,.04,.07);box(x,.86,z+.52,len-.2,.02,.02);
  for(let u=-len/2+.2;u<=len/2-.2;u+=1.2)box(x+u,0,z+.62,.04,.86,.04);
  for(let u=-len/2+.5;u<len/2;u+=1.2){line([x+u,1.35,z-.05],[x+u+.9,1.35,z-.05]);line([x+u,.95,z-.05],[x+u,1.35,z-.05],.5);line([x+u+.9,.95,z-.05],[x+u+.9,1.35,z-.05],.5);}
  for(let k=0;k<6;k++)box(x-len/2+.35,.95+k*.025,z+.15,.46,.02,.34);
}
function column(x,z){
  box(x,0,z,.42,CEIL-.55,.42);
  loop([[x-.26,.01,z-.26],[x+.26,.01,z-.26],[x+.26,.01,z+.26],[x-.26,.01,z+.26]],.5);
}
function trees(points){
  for(const [x1,z1,x2,z2] of points){
    const n=Math.round(Math.hypot(x2-x1,z2-z1)/.3),pts=[];
    for(let i=0;i<=n;i++){const t=i/n,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t,s=x+z;pts.push([x,2.4+.6*Math.sin(s*1.7)+.4*Math.sin(s*.6+1)+.3*Math.abs(Math.sin(s*3.1)),z]);}
    contour(pts);
  }
}
function duct(x0,x1,y,z,r){
  // 원형 덕트: 일정 간격 링 + 위아래·옆 길이선 + 행거
  const n=16,rings=[];
  for(let x=x0;x<=x1+.001;x+=1.2){const g=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;g.push([x,y+r*Math.sin(a),z+r*Math.cos(a)]);}rings.push(g);loop(g,.5);}
  for(let j=1;j<rings.length;j++)for(let i=0;i<n;i++)poly([rings[j-1][i],rings[j-1][(i+1)%n],rings[j][(i+1)%n],rings[j][i]],false);
  for(const i of [0,n/4,n/2,3*n/4])line(rings[0][i],rings.at(-1)[i]);
  for(let x=x0+.6;x<x1;x+=3.6)line([x,y+r,z],[x,CEIL-.86,z],.5);
}
function cableTray(x0,x1,y,z,w=.4){
  // 사다리형 케이블 트레이: 양쪽 레일 + 촘촘한 가로대
  for(const s of [-1,1])box((x0+x1)/2,y,z+s*w/2,x1-x0,.06,.03);
  for(let x=x0;x<=x1;x+=.3)line([x,y+.01,z-w/2],[x,y+.01,z+w/2],.5);
  for(let x=x0+.8;x<x1;x+=3.4){line([x,y+.06,z-w/2],[x,CEIL-.86,z-w/2],.5);line([x,y+.06,z+w/2],[x,CEIL-.86,z+w/2],.5);}
}
function shell(){
  const X0=0,X1=29.45,Z0=-7.4,Z1=18.15;
  // 큰 보 + 촘촘한 작은 보(1.7m) + 그 아래 얇은 중도리(1.4m)
  for(let z=Z0+1.2;z<Z1;z+=4.2){
    box((X0+X1)/2,CEIL-.55,z,X1-X0,.55,.26);
    for(const s of [-1,1])line([X0,CEIL-.48,z+s*.135],[X1,CEIL-.48,z+s*.135],.5);
  }
  for(let x=.85;x<X1;x+=1.7)box(x,CEIL-.86,(Z0+Z1)/2,.12,.3,Z1-Z0);
  for(let z=Z0+.7;z<Z1;z+=1.4)line([X0,CEIL-.9,z],[X1,CEIL-.9,z],.5);
  // 덕트와 케이블 트레이
  duct(.6,28.8,CEIL-1.7,3.0,.32);duct(.6,28.8,CEIL-1.7,12.6,.32);
  cableTray(.4,29,CEIL-2.6,7.6);cableTray(.4,29,CEIL-2.6,16.4);
  // 트랙 조명: 레일을 4.6m 높이로 길게 내려 달아 시야에 들어오게
  for(let z=Z0+3.3;z<Z1;z+=4.2){
    const y=4.6;
    box((X0+X1)/2,y,z,X1-X0,.045,.06);
    for(let x=.85;x<X1;x+=3.4)line([x,y+.045,z],[x,CEIL-.86,z],.5);
    for(let x=1.0;x<X1;x+=1.8)spot(x,y,z);
  }
}
function spot(x,y,z){cylinder(x,y-.04,z,.03,.03,.04,8);cylinder(x,y-.27,z,.085,.07,.23,16);}
// ── 폭신한 소파: 둥근 모서리 쿠션, 외곽선은 모두 닫힌 고리로 이어집니다 ──
function roundRing(x,y,z,w,d,r,n=5){
  r=Math.max(.012,Math.min(r,w/2-.001,d/2-.001));const p=[];
  for(const [sx,sz,a0] of [[1,1,0],[-1,1,90],[-1,-1,180],[1,-1,270]])
    for(let i=0;i<=n;i++){const a=(a0+90*i/n)*Math.PI/180;p.push([x+sx*(w/2-r)+r*Math.cos(a),y,z+sz*(d/2-r)+r*Math.sin(a)]);}
  return p;
}
function pillow(x,y,z,w,h,d,r=.08,b=.04){
  // 둥근 쿠션: 위·아래 모서리를 원호로 굴리고, 평면 모서리도 둥글게 합니다.
  b=Math.min(b,h*.48,w/2-.01,d/2-.01);const bb=Math.min(.03,b*.6),spec=[];
  for(let k=0;k<=2;k++){const a=k/2*Math.PI/2;spec.push([bb*(1-Math.sin(a)),bb*(1-Math.cos(a))]);}
  for(let k=0;k<=5;k++){const a=k/5*Math.PI/2;spec.push([h-b+b*Math.sin(a),b*(1-Math.cos(a))]);}
  const rings=spec.map(([dy,ins])=>roundRing(x,y+dy,z,w-2*ins,d-2*ins,Math.max(.012,r-ins*.6)));
  const m=rings[0].length,top=rings.length-1;
  for(let j=1;j<rings.length;j++)for(let i=0;i<m;i++)poly([rings[j-1][i],rings[j-1][(i+1)%m],rings[j][(i+1)%m],rings[j][i]],false);
  poly(rings[0],false);poly(rings[top],false);
  loop(rings[0]);loop(rings[3]);loop(rings[top-1],.5);
  const q=m/4;
  for(let c=0;c<4;c++){const i=Math.round(c*q+q/2)%m;contour(rings.map(g=>g[i]));}
}
function puffySofa(x,z,w,d=1.0){
  rect(x,z,w,d);
  for(const a of [-1,1])for(const b of [-1,1])cylinder(x+a*(w/2-.16),0,z+b*(d/2-.16),.03,.025,.1,10);
  pillow(x,.1,z,w,.3,d,.14,.08);
  pillow(x,.38,z-d/2+.09,w-.44,.56,.18,.08,.08);
  for(const a of [-1,1])pillow(x+a*(w/2-.13),.1,z+.01,.26,.58,d-.02,.13,.125);
  const n=w>2.2?3:2,sw=(w-.5)/n;
  for(let j=0;j<n;j++){
    const px=x-(w-.5)/2+sw*(j+.5);
    pillow(px,.38,z+.1,sw-.005,.19,d-.22,.16,.085);
    pillow(px,.54,z-d/2+.25,sw-.01,.5,.26,.15,.12);
  }
}
// ── 지나갈 때 밀도가 확 올라가는 선(리빌 라인, tone 4) ──
// 평소엔 안 보이다가 걷는 동안 카메라 가까이(약 3~7m)에 있는 것만 나타납니다.
const REVEAL=4;
function wallFraming(){
  for(const b of walls){
    if(!b.h)continue;
    const along=b.w>=b.d,L=along?b.w:b.d,T=along?b.d:b.w;if(L<.6)continue;
    const H=Math.min(b.h,3.0);
    for(const s of [-1,1]){
      const o=s*(T/2+.012);
      const P=(u,y)=>along?[b.x-L/2+u,y,b.z+o]:[b.x+o,y,b.z-L/2+u];
      const n=Math.max(1,Math.round(L/1.2)),cw=L/n;
      for(let i=0;i<=n;i++)line(P(i*cw,0),P(i*cw,H),REVEAL);
      for(const y of [0.02,H/2,H])line(P(0,y),P(L,y),REVEAL);
      for(let i=0;i<n;i++)for(const [y1,y2] of [[0,H/2],[H/2,H]]){
        line(P(i*cw,y1),P((i+1)*cw,y2),REVEAL);line(P((i+1)*cw,y1),P(i*cw,y2),REVEAL);
      }
    }
  }
}
function passageTruss(cx,cz,dx,dz,W,D=2.6,H=2.9){
  // 출입구에 늘 세워져 있는 철골 트러스 터널(브릿지).
  // 기본 골조는 항상 보이고, 걷는 동안에는 같은 구조물에 보강선(tone 4)이 진행 방향으로 촘촘하게 더해집니다.
  const nx=-dz,nz=dx,P=(s,u,y)=>[cx+dx*s+nx*u,y,cz+dz*s+nz*u],hw=W/2;
  const st=[];for(let s=-D/2;s<=D/2+.001;s+=D/4)st.push(s);
  const post=(s,u)=>{const [x,,z]=P(s,u,0);box(x,0,z,.07,H,.07);};
  for(const s of st){post(s,-hw);post(s,hw);const [x,,z]=P(s,0,0);box(x,H-.07,z,Math.abs(nx)*W+.07||.07,.07,Math.abs(nz)*W+.07||.07);}
  for(const u of [-hw,hw]){line(P(-D/2,u,H),P(D/2,u,H));line(P(-D/2,u,.02),P(D/2,u,.02));}
  for(let i=1;i<st.length;i++){
    const a=st[i-1],b=st[i];
    for(const u of [-hw,hw])line(i%2?P(a,u,0):P(b,u,0),i%2?P(b,u,H):P(a,u,H));
    // 걷는 동안 촘촘해지는 보강선
    const m=(a+b)/2;
    for(const u of [-hw,hw]){
      line(i%2?P(b,u,0):P(a,u,0),i%2?P(a,u,H):P(b,u,H),REVEAL);
      line(P(m,u,0),P(m,u,H),REVEAL);
      for(const y of [H*.25,H*.5,H*.75])line(P(a,u,y),P(b,u,y),REVEAL);
      line(P(a,u,H*.5),P(m,u,H),REVEAL);line(P(m,u,H),P(b,u,H*.5),REVEAL);line(P(a,u,H*.5),P(m,u,0),REVEAL);line(P(m,u,0),P(b,u,H*.5),REVEAL);
    }
    line(P(a,-hw,H),P(b,hw,H),REVEAL);line(P(a,hw,H),P(b,-hw,H),REVEAL);
    for(const k of [-.25,0,.25])line(P(a,k*W,H),P(b,k*W,H),REVEAL);
  }
}
// 시안 선택(#v1~#v4). 1번만 형태가 달라지고, 2~4번은 화면 효과만 다릅니다.
const MODE=(()=>{try{const m=/v([1-5])/.exec(location.hash);return m?+m[1]:5}catch(e){return 5}})();
function portalTunnel(cx,cz,dx,dz,W,D=3.6,step=.32,H=2.95){
  // 시안1: 출입구·통로에 늘 서 있는 반복 프레임 터널(대각선 없음). 지나갈 때 같은 선들이 연달아 스쳐 밀도가 올라갑니다.
  const nx=-dz,nz=dx,P=(s,u,y)=>[cx+dx*s+nx*u,y,cz+dz*s+nz*u],hw=W/2,n=Math.round(D/step);
  for(let i=0;i<=n;i++){
    const s=-D/2+i*D/n;
    for(const u of [-hw,hw]){const [x,,z]=P(s,u,0);box(x,0,z,.05,H,.05);}
    const [x,,z]=P(s,0,0);box(x,H-.06,z,Math.abs(nx)*W+.05||.05,.06,Math.abs(nz)*W+.05||.05);
  }
  for(const u of [-hw,hw])for(const y of [.02,H*.5])line(P(-D/2,u,y),P(D/2,u,y),.5);
  // 이동할 때만: 터널 옆면 세로 살(8cm) + 천장 살(16cm) → 통과하는 순간 밀도 최고점
  if(SLATS){for(const u of [-hw,hw])for(let s=-D/2+.04;s<D/2;s+=.08)line(P(s,u,.05),P(s,u,H-.08),REVEAL);
    for(let s=-D/2+.08;s<D/2;s+=.16)line(P(s,-hw,H-.07),P(s,hw,H-.07),REVEAL);}
  for(const k of [-.33,0,.33])line(P(-D/2,k*W,H-.06),P(D/2,k*W,H-.06),.5);
}

// 걷는 동선(app.js 카메라 경로와 같은 좌표). 각 구간의 처음·끝(방 안 정지 지점 근처)은 뺍니다.
const WALK_LEGS=[
  [[11.25,19.03],[7.15,16.75],[6.4,15.95],[6.58,15.04]],
  [[6.58,15.04],[8.78,12.85],[8.96,9.25],[8.96,5.10],[8.88,4.40]],
  [[8.88,4.40],[13.12,4.86],[14.72,5.54]],
  [[14.72,5.54],[15.48,6.56],[16.32,6.76],[19.40,6.76],[20.42,11.36],[21.43,11.60],[24.12,13.57]],
  [[24.12,13.57],[21.48,11.62],[20.40,11.36],[19.90,7.15],[21.72,5.30]],
  [[21.72,5.30],[25.6,5.55],[26.9,5.55],[29.85,5.55]]
];
const WALK_PTS=(()=>{const out=[];for(const leg of WALK_LEGS){const pts=[];for(let i=1;i<leg.length;i++){const [a,b]=[leg[i-1],leg[i]],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.25);for(let k=0;k<n;k++)pts.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);}
  let L=0;const acc=pts.map((p,i)=>i?(L+=Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1])):0);
  pts.forEach((p,i)=>{if(acc[i]>1.4&&acc[i]<L-1.4)out.push(p);});}return out;})();
function wallSlats(){
  // 이동할 때만, 동선 옆으로 지나가는 벽 면에만 세로 줄눈(15cm). 방 안 벽·대각선은 없음.
  for(const b of walls){
    if(!b.h)continue;
    const along=b.w>=b.d,L=along?b.w:b.d,T=along?b.d:b.w;if(L<.6)continue;
    const H=Math.min(b.h,3.0);
    for(const s of [-1,1]){
      const o=s*(T/2+.012),P=(u,y)=>along?[b.x-L/2+u,y,b.z+o]:[b.x+o,y,b.z-L/2+u];
      const nrm=along?[0,s]:[s,0],n=Math.max(2,Math.round(L/SLAT_GAP));
      for(let i=1;i<n;i++){const p=P(i*L/n,0);
        const near=WALK_PTS.some(([x,z])=>{const dx=x-p[0],dz=z-p[2];return dx*nrm[0]+dz*nrm[1]>.05&&dx*dx+dz*dz<1.9*1.9;});
        if(near)line(P(i*L/n,.06),P(i*L/n,H-.04),REVEAL);}
    }
  }
}
function revealLayer(){
  if(SLATS)wallSlats();
  if(MODE!==1&&MODE!==5)return;
  // 프레임 터널은 방 안이 아니라 통로 쪽(문 바깥)에만 세웁니다. 가구 위로 겹치지 않게.
  portalTunnel(11.25,18.9,0,1,2.3,2.0);
  // 섹션 도착 화면을 가리는 터널(3D room·Store & Family·Restaurant 문 앞)은 세우지 않습니다.
  doorways.forEach((d,i)=>{if(i>=2)return;const D=2.4,W=Math.min(d.width-.1,2.1);portalTunnel(d.x-d.nx*(D/2+.05),d.z-d.nz*(D/2+.05),d.nx,d.nz,W,D);});
  portalTunnel(11.5,4.72,1,0,1.95,3.2);portalTunnel(12.9,4.96,1,0,1.95,1.5);portalTunnel(26.9,5.55,1,0,1.3,2.4);
  portalTunnel(24.2,5.65,1,0,1.8,3.0);
}

// ── 더 폭신한 소파(레퍼런스: 낮고 깊은 모듈 소파 + 큰 쿠션 + 던져 둔 쿠션) ──
function tiltX(build,py,pz,a){
  const fi=faces.length,ei=edges.length,si=silEdges.length;build();
  const pts=new Set(faces.slice(fi).flatMap(f=>f.points));for(const [p,q] of edges.slice(ei)){pts.add(p);pts.add(q);}for(const p of silPts(si))pts.add(p);
  const c=Math.cos(a),s=Math.sin(a);
  for(const p of pts){const dy=p[1]-py,dz=p[2]-pz;p[1]=py+dy*c-dz*s;p[2]=pz+dy*s+dz*c;}
}
function plump(x,y,z,w,h,d,r,b,crown=.03){
  // pillow + 윗면이 살짝 부푼 쿠션
  pillow(x,y,z,w,h,d,r,b);
  const top=y+h,n=8,cx=x,cz=z;
  for(let k=1;k<=3;k++){const s=1-k/3.4,yy=top+crown*Math.sin(k/3*Math.PI/2);
    const ring=roundRing(cx,yy,cz,(w-2*b)*s,(d-2*b)*s,Math.max(.02,(r-b*.6)*s),4);poly(ring,false);}
}
function throwPillow(x,y,z,yaw,tilt,sz=.5,t=.17){
  // 모서리가 뾰족하게 집힌 던짐 쿠션. 가운데 재봉선만 또렷하게.
  const outline=[];const N=10;
  for(let side=0;side<4;side++)for(let i=0;i<N;i++){
    const u=i/N,sag=.055*Math.sin(u*Math.PI);
    const c=[[-1,-1],[1,-1],[1,1],[-1,1]],a=c[side],b=c[(side+1)%4];
    let px=(a[0]+(b[0]-a[0])*u)*sz/2,py=(a[1]+(b[1]-a[1])*u)*sz/2;
    const nx=-(b[1]-a[1]),ny=(b[0]-a[0]);px-=nx*sag*.5;py-=ny*sag*.5;outline.push([px,py]);
  }
  pose(x,z,yaw,()=>tiltX(()=>{
    const layers=[[-.5,.62],[-.32,.9],[0,1],[.32,.9],[.5,.62]].map(([k,s])=>outline.map(([px,py])=>[px*s,py*s+sz/2,k*t]));
    const m=outline.length;
    for(let j=1;j<layers.length;j++)for(let i=0;i<m;i++)poly([layers[j-1][i],layers[j-1][(i+1)%m],layers[j][(i+1)%m],layers[j][i]],false);
    poly(layers[0],false);poly(layers[4],false);
    loop(layers[2]);loop(layers[3],.5);
  },0,0,tilt),y);
}
function plushSofa(x,z,w,d=1.1){
  // 쿠션(던짐 쿠션) 없이, 좌석·등받이 자체를 크게 부풀린 소파
  rect(x,z,w,d);
  for(const a of [-1,1])for(const b of [-1,1])box(x+a*(w/2-.2),0,z+b*(d/2-.18),.12,.06,.06);
  pillow(x,.06,z,w-.5,.28,d,.1,.07);
  for(const a of [-1,1])pillow(x+a*(w/2-.15),.06,z,.32,.6,d,.12,.13);
  pillow(x,.34,z-d/2+.1,w-.5,.4,.2,.08,.08);
  const n=2,sw=(w-.6)/n;
  for(let j=0;j<n;j++){const px=x-(w-.6)/2+sw*(j+.5);plump(px,.34,z+.07,sw-.004,.25,d-.16,.22,.12,.06);}
  for(let j=0;j<n;j++){const px=x-(w-.6)/2+sw*(j+.5);tiltX(()=>plump(px,.54,z-d/2+.3,sw-.03,.62,.32,.2,.15,.05),.54,z-d/2+.3,-.16);}
}
// ── HEJ! 입체 글자: 앞·뒤 외곽선 + 안쪽 한 줄 + 두께선. 면은 선 없이 채워 가림만 담당 ──
const GLYPH={
  H:{w:.75,o:[[0,0],[.22,0],[.22,.39],[.53,.39],[.53,0],[.75,0],[.75,1],[.53,1],[.53,.61],[.22,.61],[.22,1],[0,1]],r:[[0,0,.22,1],[.53,0,.22,1],[.22,.39,.31,.22]]},
  E:{w:.62,o:[[0,0],[.62,0],[.62,.2],[.22,.2],[.22,.4],[.55,.4],[.55,.6],[.22,.6],[.22,.8],[.62,.8],[.62,1],[0,1]],r:[[0,0,.22,1],[.22,0,.4,.2],[.22,.4,.33,.2],[.22,.8,.4,.2]]},
  J:{w:.62,o:[[0,0],[.48,0],[.62,.14],[.62,1],[.4,1],[.4,.22],[0,.22]],r:[[0,0,.48,.22],[.4,.1,.22,.9]]},
  '!':{w:.22,o:[[0,.3],[.22,.3],[.22,1],[0,1]],o2:[[0,0],[.22,0],[.22,.2],[0,.2]],r:[[0,.3,.22,.7],[0,0,.22,.2]]}
};
function inset(o,k){
  // 직교 다각형 안쪽 오프셋(간단 버전): 각 꼭짓점을 이웃 변의 안쪽 법선 합만큼 이동
  const n=o.length,area=o.reduce((s,p,i)=>s+p[0]*o[(i+1)%n][1]-o[(i+1)%n][0]*p[1],0)>0?1:-1;
  return o.map((p,i)=>{const a=o[(i-1+n)%n],b=o[(i+1)%n];
    const e1=[p[0]-a[0],p[1]-a[1]],e2=[b[0]-p[0],b[1]-p[1]],l1=Math.hypot(...e1),l2=Math.hypot(...e2);
    const n1=[-e1[1]/l1*area,e1[0]/l1*area],n2=[-e2[1]/l2*area,e2[0]/l2*area];
    const m=[n1[0]+n2[0],n1[1]+n2[1]],dot=n1[0]*n2[0]+n1[1]*n2[1],s=k/(1+dot);
    return [p[0]+m[0]*s,p[1]+m[1]*s];});
}
function hejSign(cx,cy,cz,angle,H=.9,D=.14,word='HEJ!'){
  const gap=.2*H;let total=0;for(const ch of word)total+=GLYPH[ch].w*H+gap;total-=gap;
  pose(cx,cz,angle,()=>{
    let x0=-total/2;
    for(const ch of word){
      const g=GLYPH[ch],P=(u,v,z)=>[x0+u*H,cy+v*H,z];
      for(const [rx,ry,rw,rh] of g.r){const a=P(rx,ry,0),b=P(rx+rw,ry+rh,0);
        const xs=[a[0],b[0]],ys=[a[1],b[1]];
        for(const z of [-D/2,D/2])poly([[xs[0],ys[0],z],[xs[1],ys[0],z],[xs[1],ys[1],z],[xs[0],ys[1],z]],false);}
      for(const o of [g.o,g.o2].filter(Boolean)){
        const f=o.map(([u,v])=>P(u,v,D/2)),bk=o.map(([u,v])=>P(u,v,-D/2));
        loop(f,2.8);loop(bk,.5);f.forEach((p,i)=>line(p,bk[i],1));
        for(let i=0;i<o.length;i++){const a=o[i],b=o[(i+1)%o.length];
          const q=[[a[0],a[1]],[b[0],b[1]]].map(([u,v])=>P(u,v,0));
          poly([[q[0][0],q[0][1],D/2],[q[1][0],q[1][1],D/2],[q[1][0],q[1][1],-D/2],[q[0][0],q[0][1],-D/2]],false);}
        loop(inset(o,.045).map(([u,v])=>P(u,v,D/2+.002)),1);
      }
      x0+=g.w*H+gap;
    }
  });
}

function hejFlat(cx,cy,z,H=.9){
  // 벽지에 그린 듯한 얇은 HEJ!: 획 하나짜리 선(모노라인)으로만.
  const W={H:.56,E:.46,J:.44,'!':.04},gap=.24*H;
  let total=0;for(const ch of 'HEJ!')total+=W[ch]*H+gap;total-=gap;
  let x0=cx-total/2;const P=(u,v)=>[x0+u*H,cy+v*H,z];
  const seg=pts=>contour(pts.map(([u,v])=>P(u,v)));
  for(const ch of 'HEJ!'){
    if(ch==='H'){seg([[0,0],[0,1]]);seg([[.56,0],[.56,1]]);seg([[0,.52],[.56,.52]]);}
    if(ch==='E'){seg([[.46,1],[0,1],[0,0],[.46,0]]);seg([[0,.52],[.4,.52]]);}
    if(ch==='J'){const hook=[];for(let i=0;i<=10;i++){const a=Math.PI*i/10;hook.push([.22-.22*Math.cos(a),.22-.22*Math.sin(a)]);}
      seg([[.44,1],[.44,.22],...hook.slice().reverse().slice(1)]);}
    if(ch==='!'){seg([[.02,1],[.02,.26]]);const r=.028,c=[];for(let i=0;i<=12;i++){const a=i/12*Math.PI*2;c.push([.02+r*Math.cos(a),.05+r*Math.sin(a)]);}seg(c);}
    x0+=W[ch]*H+gap;
  }
}

// 모노라인 HEJ! 획 데이터(가로 u, 세로 v, 높이 1 기준)
function hejStrokes(){
  const W={H:.56,E:.46,J:.44,'!':.04},gap=.24,out=[];let x=0;
  for(const ch of 'HEJ!'){
    const S=p=>out.push(p.map(([u,v])=>[x+u,v]));
    if(ch==='H'){S([[0,0],[0,1]]);S([[.56,0],[.56,1]]);S([[0,.52],[.56,.52]]);}
    if(ch==='E'){S([[.46,1],[0,1],[0,0],[.46,0]]);S([[0,.52],[.4,.52]]);}
    if(ch==='J'){const h=[];for(let i=0;i<=10;i++){const a=Math.PI*i/10;h.push([.22-.22*Math.cos(a),.22-.22*Math.sin(a)]);}S([[.44,1],[.44,.22],...h.reverse().slice(1)]);}
    if(ch==='!'){S([[.02,1],[.02,.26]]);const c=[];for(let i=0;i<=12;i++){const a=i/12*Math.PI*2;c.push([.02+.028*Math.cos(a),.05+.028*Math.sin(a)]);}S(c);}
    x+=W[ch]+gap;
  }
  return {strokes:out,width:x-gap};
}
function clipSeg(a,b,r){
  // Liang–Barsky: 사각형 r=[x0,y0,x1,y1] 안쪽만 남깁니다.
  let t0=0,t1=1;const dx=b[0]-a[0],dy=b[1]-a[1];
  for(const [p,q] of [[-dx,a[0]-r[0]],[dx,r[2]-a[0]],[-dy,a[1]-r[1]],[dy,r[3]-a[1]]]){
    if(p===0){if(q<0)return null;continue;}const t=q/p;if(p<0){if(t>t1)return null;if(t>t0)t0=t;}else{if(t<t0)return null;if(t<t1)t1=t;}}
  return [[a[0]+dx*t0,a[1]+dy*t0],[a[0]+dx*t1,a[1]+dy*t1]];
}
function wallGraphic(rect,z,items,tone=1){
  // items: [{ox,oy,size}] → 벽 사각형 밖으로 나간 획은 잘라냅니다.
  const {strokes}=hejStrokes();
  for(const it of items)for(const st of strokes){
    const pts=st.map(([u,v])=>[it.ox+u*it.size,it.oy+v*it.size]);
    for(let i=1;i<pts.length;i++){const c=clipSeg(pts[i-1],pts[i],rect);if(c)line([c[0][0],c[0][1],z],[c[1][0],c[1][1],z],tone);}
  }
}
function hejSculpture(cx,cy,cz,angle,H=1.3,D=.12){
  // 천장에 매단 와이어 조형물: 같은 획을 앞뒤 두 겹으로, 끝점을 이어 철사 느낌
  const {strokes,width}=hejStrokes();
  pose(cx,cz,angle,()=>{
    for(const st of strokes){
      const f=st.map(([u,v])=>[(u-width/2)*H,cy+v*H,D/2]),bk=st.map(([u,v])=>[(u-width/2)*H,cy+v*H,-D/2]);
      contour(f);contour(bk,.5);line(f[0],bk[0]);line(f.at(-1),bk.at(-1));
    }
    for(const u of [-width/2*H+.1,width/2*H-.1])line([u,cy+H,0],[u,CEIL-.86,0],.5);
  });
}

function silGrid(all,center,tone=1){
  // 링 격자(닫힌 고리들)에서 이웃한 두 면이 공유하는 선을 윤곽선 후보로 등록합니다.
  const m=all[0].length,L=all.length,face=(pts)=>{
    const c=[0,0,0];for(const p of pts)for(let k=0;k<3;k++)c[k]+=p[k]/pts.length;
    const u=[pts[2][0]-pts[0][0],pts[2][1]-pts[0][1],pts[2][2]-pts[0][2]],v=[pts[3%pts.length][0]-pts[1][0],pts[3%pts.length][1]-pts[1][1],pts[3%pts.length][2]-pts[1][2]];
    let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(...n)||1;n=n.map(x=>x/l);
    if(n[0]*(c[0]-center[0])+n[1]*(c[1]-center[1])+n[2]*(c[2]-center[2])<0)n=n.map(x=>-x);
    return [c,[c[0]+n[0]*.05,c[1]+n[1]*.05,c[2]+n[2]*.05]];
  };
  const Q=[];for(let j=1;j<L;j++){Q[j]=[];for(let i=0;i<m;i++)Q[j][i]=face([all[j-1][i],all[j-1][(i+1)%m],all[j][(i+1)%m],all[j][i]]);}
  const bottom=face([all[0][0],all[0][Math.floor(m/3)],all[0][Math.floor(2*m/3)]]),top=face([all[L-1][0],all[L-1][Math.floor(m/3)],all[L-1][Math.floor(2*m/3)]]);
  bottom[1]=[bottom[0][0],bottom[0][1]-.05,bottom[0][2]];top[1]=[top[0][0],top[0][1]+.05,top[0][2]];
  const add=(a,b,f1,f2)=>silEdges.push([a,b,f1[0],f1[1],f2[0],f2[1],tone,objectId]);
  for(let j=1;j<L;j++)for(let i=0;i<m;i++)add(all[j-1][i],all[j][i],Q[j][(i-1+m)%m],Q[j][i]);
  for(let j=0;j<L;j++)for(let i=0;i<m;i++){const f1=j===0?bottom:Q[j],f2=j===L-1?top:Q[j+1];add(all[j][i],all[j][(i+1)%m],j===0?bottom:Q[j][i],j===L-1?top:Q[j+1][i]);}
}
function seamPillow(x,y,z,w,h,d,r=.14,bulge=.035,crown=.04){
  // 솔기 2줄(항상) + 곡면 윤곽선(보이는 쪽만, 매 프레임 계산) → 어느 각도에서도 외곽이 끊기지 않습니다.
  const R=(yy,ins)=>roundRing(x,yy,z,w-2*ins,d-2*ins,Math.max(.02,r-ins*.5),6);
  const rings=[R(y,.025),R(y+.02,0),R(y+h*.3,-bulge*.8),R(y+h*.5,-bulge),R(y+h*.7,-bulge*.8),R(y+h-.02,0),R(y+h,.035)];
  const cap=[1,2,3].map(k=>{const s=1-k/3.6;return roundRing(x,y+h+crown*Math.sin(k/3*Math.PI/2),z,(w-.07)*s,(d-.07)*s,Math.max(.02,(r-.02)*s),6);});
  const all=[...rings,...cap],m=all[0].length;
  for(let j=1;j<all.length;j++)for(let i=0;i<m;i++)poly([all[j-1][i],all[j-1][(i+1)%m],all[j][(i+1)%m],all[j][i]],false);
  poly(all[0],false);poly(all.at(-1),false);
  loop(rings[1]);loop(rings[5]);
  silGrid(all,[x,y+h/2,z]);
}
function fluffySofa(x,z,w,d=1.12){
  rect(x,z,w,d);
  for(const a of [-1,1])for(const b of [-1,1])box(x+a*(w/2-.22),0,z+b*(d/2-.2),.1,.06,.06);
  seamPillow(x,.06,z,w-.66,.26,d-.02,.08,.02,0);
  for(const a of [-1,1])seamPillow(x+a*(w/2-.17),.06,z,.34,.66,d,.14,.03,.035);
  seamPillow(x,.32,z-d/2+.12,w-.7,.42,.22,.08,.02,.02);
  const n=2,sw=(w-.68)/n;
  for(let j=0;j<n;j++){const px=x-(w-.68)/2+sw*(j+.5);seamPillow(px,.32,z+.08,sw-.012,.22,d-.2,.2,.045,.055);}
  for(let j=0;j<n;j++){const px=x-(w-.68)/2+sw*(j+.5);tiltX(()=>seamPillow(px,.54,z-d/2+.32,sw-.04,.6,.3,.2,.05,.04),.54,z-d/2+.32,-.17);}
}

// ── 매거진 랙 시안 ──
function mag(x,y,z,tilt=0,w=.21,h=.28,yaw=0,cover=0){
  // 잡지 한 권: 표지(제호 띠·큰 사진·기사 제목 줄·바코드) + 옆면 종이 결
  pose(x,z,yaw,()=>tiltX(()=>{
    box(0,0,0,w,h,.014);
    const f=.008,L=-w/2,R=w/2,D=.5;
    // 제호(잡지 이름) 띠: 굵은 글자처럼 짧은 막대 + 아래 밑줄
    const tb=h*.855,tt=h*.965;
    // 제호 글자 'HOME' (선 한 줄 글씨)
    {const cw=(w-.04)/4,g=cw*.18,X=i=>L+.02+i*cw+g,Wd=cw-2*g,S=pts=>contour(pts.map(([u,v])=>[u,v,f]));
      S([[X(0),tb],[X(0),tt]]);S([[X(0)+Wd,tb],[X(0)+Wd,tt]]);S([[X(0),(tb+tt)/2],[X(0)+Wd,(tb+tt)/2]]);
      {const c=X(1)+Wd/2,ry=(tt-tb)/2,o=[];for(let i=0;i<=16;i++){const a=i/16*Math.PI*2;o.push([c+Wd/2*Math.cos(a),(tb+tt)/2+ry*Math.sin(a)]);}S(o);}
      S([[X(2),tb],[X(2),tt],[X(2)+Wd/2,(tb+tt)/2],[X(2)+Wd,tt],[X(2)+Wd,tb]]);
      S([[X(3)+Wd,tt],[X(3),tt],[X(3),tb],[X(3)+Wd,tb]]);S([[X(3),(tb+tt)/2],[X(3)+Wd*.8,(tb+tt)/2]]);}
    line([L+.02,h*.83,f],[R-.02,h*.83,f]);
    // 표지 사진 칸 + 안에 소파 실루엣(인테리어 잡지)
    const p0=h*.3,p1=h*.79;loop([[L+.02,p0,f],[R-.02,p0,f],[R-.02,p1,f],[L+.02,p1,f]]);
    const sx=w*.3,sy=p0+h*.09;contour([[-sx,sy,f],[-sx,sy+h*.13,f],[-sx*.8,sy+h*.13,f],[-sx*.8,sy+h*.06,f],[sx*.8,sy+h*.06,f],[sx*.8,sy+h*.13,f],[sx,sy+h*.13,f],[sx,sy,f],[-sx,sy,f]],D);
    contour([[-sx*.7,sy+h*.06,f],[-sx*.7,sy+h*.19,f],[sx*.7,sy+h*.19,f],[sx*.7,sy+h*.06,f]],D);
    // 기사 제목 줄(왼쪽 아래) + 바코드(오른쪽 아래)
    for(const [yy,len] of [[h*.22,.62],[h*.16,.48],[h*.1,.55]])line([L+.02,yy,f],[L+.02+(w-.04)*len*.7,yy,f],D);
    const bx=R-.055;loop([[bx,h*.05,f],[R-.015,h*.05,f],[R-.015,h*.15,f],[bx,h*.15,f]],D);
    for(let i=1;i<5;i++)line([bx+i*.008,h*.06,f],[bx+i*.008,h*.14,f],D);
    // 오른쪽 옆면 종이 결
    for(const zz of [-.003,.003])line([R+.001,.01,zz],[R+.001,h-.01,zz],D);
  },0,0,tilt),y);
}
function tube(a,b){line(a,b);}
const RACKS={
  // A: 철제 파이프 + 가죽 슬링(레퍼런스 사진 느낌). 파이프는 이중선으로 굵게.
  A(){
    const W=.5,D=.36,H=.62,p=[];
    for(const s of [-1,1]){const x=s*W/2;
      const prof=[[x,.02,-D/2],[x,.02,D/2],[x,H*.55,D/2+.04],[x,H,D/2-.02],[x,H,-D/2+.02],[x,H*.55,-D/2-.04],[x,.02,-D/2]];
      contour(prof);contour(prof.map(([a,b,c])=>[a-s*.022,b,c]));
      cylinder(x-s*.011,0,-D/2,.018,.018,.02,8);cylinder(x-s*.011,0,D/2,.018,.018,.02,8);}
    for(const z of [-D/2+.02,D/2-.02])line([-W/2,H,z],[W/2,H,z]);
    const sl=[];for(let i=0;i<=12;i++){const t=i/12,z=-D/2+.03+(D-.06)*t;sl.push([0,H-.03-.38*Math.sin(t*Math.PI),z]);}
    for(const s of [-1,1])contour(sl.map(([,y,z])=>[s*(W/2-.03),y,z]));
    for(let i=1;i<sl.length;i++)poly([[-(W/2-.03),...sl[i-1].slice(1)],[W/2-.03,...sl[i-1].slice(1)],[W/2-.03,...sl[i].slice(1)],[-(W/2-.03),...sl[i].slice(1)]],false);
    for(const [z,t,yw] of [[-.09,.32,-.06],[-.02,.16,.05],[.05,.0,-.03],[.11,-.14,.04]])mag(0,.26,z,t,.32,.44,yw);
  },
  // B: 벽 기대는 3단 경사 진열대(서점 진열대처럼 표지가 정면)
  B(){
    const W=.9,H=1.25;
    for(const s of [-1,1]){contour([[s*W/2,0,.28],[s*W/2,H,-.08],[s*W/2,H,-.16],[s*W/2,0,-.16],[s*W/2,0,.28]]);}
    for(let k=0;k<3;k++){const y=.18+k*.38,z=.2-k*.1;box(0,y,z,W,.025,.08);box(0,y+.025,z+.035,W,.05,.012);
      for(const u of [-.3,0,.3])mag(u,y+.03,z-.02,-.22,.22,.3);}
  },
  // C: 3단 원형 회전 스탠드(가는 기둥 + 원판 + 꽂힌 잡지)
  C(){
    cylinder(0,0,0,.24,.24,.03,30);cylinder(0,.03,0,.018,.018,1.15,10);
    for(const [y,r] of [[.25,.24],[.6,.21],[.95,.18]]){cylinder(0,y,0,r,r,.025,30);
      for(let i=0;i<5;i++){const a=i/5*Math.PI*2;mag(Math.sin(a)*r*.62,y+.025,Math.cos(a)*r*.62,-.18,.16,.22,a);}}
  },
  // D: 낮은 나무 상자 2칸 + 위에 펼친 잡지 더미(라운지 테이블형)
  D(){
    box(0,0,0,.8,.42,.36);line([0,.04,.181],[0,.38,.181],.5);
    for(const u of [-.2,.2])for(let k=0;k<4;k++)mag(u-.07+k*.045,.04,-.04,-.08-k*.07,.22,.3,0);
    for(let k=0;k<4;k++)box(-.08+k*.03,.42+k*.012,.0+k*.01,.24,.012,.3);
    mag(.18,.47,.02,-1.45,.22,.3,.3);
  }
};
function rackMock(k){pose(23.38,11.57,.15,RACKS[k]);}

// ── A(슬링) 계열 시안 ──
function tubeLine(pts,o=.02){contour(pts);contour(pts.map(([x,y,z])=>[x+o,y,z]));}
function roundPath(pts,r=.06,n=5){
  // 꺾이는 꼭짓점을 반지름 r로 둥글린 경로(벤트 파이프)
  const out=[pts[0]];
  for(let i=1;i<pts.length-1;i++){const p=pts[i],a=pts[i-1],b=pts[i+1];
    const da=Math.hypot(...p.map((v,k)=>v-a[k])),db=Math.hypot(...p.map((v,k)=>v-b[k])),ra=Math.min(r,da/2),rb=Math.min(r,db/2);
    const s=p.map((v,k)=>v+(a[k]-v)*ra/da),e=p.map((v,k)=>v+(b[k]-v)*rb/db);
    for(let j=0;j<=n;j++){const t=j/n,q=(1-t)*(1-t),w=2*(1-t)*t,u=t*t;out.push(s.map((v,k)=>q*v+w*p[k]+u*e[k]));}
  }
  out.push(pts.at(-1));return out;
}
function sling(W,D,top,dip,z0=0){
  // 가죽 슬링: 앞뒤 레일 사이에 처진 한 장. 양 옆 가장자리 곡선 + 아래로 처진 면.
  const n=14,edge=[];for(let i=0;i<=n;i++){const t=i/n;edge.push([0,top-dip*Math.sin(t*Math.PI),z0-D/2+D*t]);}
  const L=edge.map(([,y,z])=>[-W/2,y,z]),R=edge.map(([,y,z])=>[W/2,y,z]);
  for(let i=1;i<=n;i++)poly([L[i-1],R[i-1],R[i],L[i]],false);
  contour(L);contour(R);for(let i=3;i<n;i+=4)line(L[i],R[i],.5);
}
function magFan(n,y,w,h,spread=.16){for(let i=0;i<n;i++){const k=i-(n-1)/2;mag(k*.012,y,k*.055,.1-k*spread,w,h,k*.04);}}
const RACKS2={
  // A1: X자 교차 다리(접이식) + 가죽 슬링
  A1(){
    const W=.46,D=.42,H=.6;
    for(const s of [-1,1]){const x=s*W/2;tubeLine([[x,0,-D/2],[x,H,D/2]],-s*.022);tubeLine([[x,0,D/2],[x,H,-D/2]],-s*.022);
      cylinder(x-s*.011,H*.5-.02,0,.02,.02,.04,10);}
    for(const z of [-D/2,D/2])tubeLine([[-W/2,H,z],[W/2,H,z]],0);
    sling(W-.04,D,H-.02,.26);magFan(4,.3,.32,.5,.12);
  },
  // A2: 한 줄로 구부린 파이프(벤트 튜브) + 위 손잡이 + 캔버스 슬링
  A2(){
    // 뒤는 높고 앞은 낮은 벤트 파이프 랙: 앞쪽이 트여서 잡지 표지가 정면으로 보입니다.
    const W=.5,D=.34,hb=.62,hf=.26,hd=.9;
    for(const s of [-1,1]){const x=s*W/2;
      const p=roundPath([[x,0,-D/2-.05],[x,hb,-D/2],[x,hd,-D/2+.05],[x,hb,-D/2+.1],[x,hf,D/2],[x,0,D/2+.05]],.08,6);tubeLine(p,-s*.022);
      line([x,0,-D/2-.05],[x,0,D/2+.05],.5);}
    tubeLine(roundPath([[-W/2,hd,-D/2+.05],[W/2,hd,-D/2+.05]],.05),0);
    tubeLine([[-W/2,hf,D/2],[W/2,hf,D/2]],0);tubeLine([[-W/2,hb-.04,-D/2+.02],[W/2,hb-.04,-D/2+.02]],0);
    // 앞이 낮게 처진 가죽 슬링
    const n=14,E=[];for(let i=0;i<=n;i++){const t=i/n;E.push([hb-.06+(hf-hb+.06)*t-.12*Math.sin(t*Math.PI),-D/2+.04+(D-.04)*t]);}
    const Lr=E.map(([y,z])=>[-(W/2-.03),y,z]),Rr=E.map(([y,z])=>[W/2-.03,y,z]);
    for(let i=1;i<=n;i++)poly([Lr[i-1],Rr[i-1],Rr[i],Lr[i]],false);contour(Lr);contour(Rr);
    // 잡지 3권: 맨 앞 표지는 다 보이고, 뒤 두 권은 제호만 살짝
    mag(-.07,.27,-.07,-.42,.3,.4,.06);
    mag(.07,.25,-.02,-.36,.3,.4,-.05);
    mag(0,.2,.05,-.3,.31,.42,0);
  },
  // A3: 원목 프레임 + 가죽 슬링 + 손잡이 구멍 상판
  A3(){
    const W=.5,D=.38,H=.62;
    for(const s of [-1,1])for(const z of [-1,1])box(s*(W/2-.02),0,z*(D/2-.02),.04,H,.04);
    for(const z of [-1,1])box(0,H-.05,z*(D/2-.02),W,.05,.04);
    for(const s of [-1,1])box(s*(W/2-.02),H,0,.04,.22,.04);box(0,H+.2,0,W,.04,.05);
    for(const s of [-1,1])box(s*(W/2-.02),.12,0,.04,.04,D-.04);
    sling(W-.08,D-.08,H-.06,.26);
    for(const [z,t] of [[-.07,.22],[.0,.05],[.07,-.12]])mag(0,.3,z,t,.32,.5);
  },
  // A4: 벽에 기대는 사다리형 2단 슬링
  A4(){
    const W=.52,H=1.15;
    for(const s of [-1,1])tubeLine([[s*W/2,0,.3],[s*W/2,H,-.06]],-s*.022);
    for(const [y,z] of [[.28,.22],[.72,.07]]){
      for(const zz of [z-.13,z+.13])tubeLine([[-W/2,y+.18,zz],[W/2,y+.18,zz]],0);
      pose(0,z,0,()=>sling(W-.06,.26,y+.18,.16),0);
      for(const [dz,t] of [[-.04,.15],[.04,-.05]])mag(0,y+.06,z+dz,t,.28,.38);}
  }
};
// 카메라 눈높이(m). 낮출수록 천장이 더 많이 보여 공간감이 커집니다. 시안: #E57 #E35 #E15
const EYE=(()=>{try{const m=/E(\d\d)/.exec(location.hash);return m?1+(+m[1])/100:1.35}catch(e){return 1.35}})();
// 화각·왜곡 시안(#L0~#L3): [초점거리 배율, 배럴 왜곡 세기]
const LENSV=(()=>{try{const m=/L([0-3])/.exec(location.hash);return [[1,0],[.84,0],[.84,.13],[.76,.22]][m?+m[1]:2]}catch(e){return [.84,.13]}})();

// ── 새 합판 라운지 의자(시안): 한 장으로 휜 좌판+등판 셸 + 양옆 썰매형 합판 다리 ──
function plyProfile(){
  // 측면 윤곽(z 앞뒤, y 높이): 등받이 위 → 허리 → 좌판 → 앞 끝이 살짝 말림
  return [...cubic([-.40,.96],[-.36,.70],[-.30,.42],[-.16,.37]),...cubic([-.16,.37],[.02,.33],[.26,.37],[.36,.40]).slice(1),...cubic([.36,.40],[.42,.41],[.45,.37],[.44,.33]).slice(1)];
}
function plyLounge(){
  pose(7.15,2.85,1.92,()=>{
    const prof=plyProfile(),W=.6,T=.028;
    // 셸 두께 방향 법선(측면 평면 안에서)
    const nrm=prof.map((p,i)=>{const a=prof[Math.max(0,i-1)],b=prof[Math.min(prof.length-1,i+1)];const dz=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dz,dy)||1;return [dy/l,-dz/l];});
    const layer=(k,x)=>prof.map(([z,y],i)=>[x,y+nrm[i][1]*T*k,z+nrm[i][0]*T*k]);
    // 위/아래 면
    const tl=layer(0,-W/2),tr=layer(0,W/2),bl=layer(1,-W/2),br=layer(1,W/2);
    strip(tl,tr);strip(bl,br);strip(tl,bl);strip(tr,br);
    contour(tl);contour(tr);contour(bl);contour(br);
    // 합판 결(두께 안쪽 겹 선) — 옆면에만, 얇게
    for(const x of [-W/2-.001,W/2+.001])contour(layer(.5,x),.5);
    for(const i of [0,prof.length-1]){line(tl[i],tr[i]);line(bl[i],br[i]);line(tl[i],bl[i]);line(tr[i],br[i]);}
    // 썰매형 다리: 바닥 → 앞 곡선 → 좌판 밑 → 뒤 곡선 → 바닥 (닫힌 고리)
    const run=roundPath([[0,.02,-.42],[0,.02,.40],[0,.30,.30],[0,.31,-.14],[0,.02,-.42]],.11,7);
    for(const x of [-.25,.25]){
      const a=run.map(([,y,z])=>[x-.022,y,z]),b=run.map(([,y,z])=>[x+.022,y,z]);
      strip(a,b);contour(a);contour(b);
    }
    // 다리와 셸을 잇는 받침 블록
    for(const x of [-.25,.25])box(x,.31,.06,.06,.04,.24);
  });
}
// 대표 가구 선 스타일 시안: #H1 굵게, #H2 얇게 두 줄
const HSTYLE=(()=>{try{return +((/H([012])/.exec(location.hash)||[])[1]??2)}catch(e){return 2}})();
// 시안: 이동할 때 벽 줄눈(#S1 켜기)
const SLAT_GAP=(()=>{try{const m=/G(\d\d)/.exec(location.hash);return m?+m[1]/100:.10}catch(e){return .10}})(); // 줄눈 간격(m): 10cm
const SLATS=(()=>{try{return !/S0/.test(location.hash)}catch(e){return true}})(); // 기본 켬, #S0 끔
const MOCK=(()=>{try{return (/(hejA|hejB|hejW|hejF|hejX|hejP|hejS)/.exec(location.hash)||[])[1]||'hejS'}catch(e){return 'hejS'}})(); // 기본: 천장 HEJ! 조형물
// 지나갈 때 광각: #w20 → 화각 20% 넓힘. 글자 근처를 지날 때만 켜집니다.
const WIDE=(()=>{try{const m=/w(\d\d)/.exec(location.hash);return m?+m[1]/100:0}catch(e){return 0}})();
const HEJ_AT={hejA:[9.0,16.0,5.5],hejB:[5.7,9.5,7.5],hejF:[5.7,9.5,7.5],hejW:[0,12,13]}[MOCK]||null;

// 쇼룸 채우기: 원래 평면도(미니맵) 안의 빈 곳을 부스로 채웁니다.
function furnish(){
  shell();
  for(const [x,z] of [[11.5,7.25],[13.7,7.25],[18.15,7.25],[13.7,-.4],[18.15,-.4],[4.85,5.1],[10,7.6],[21.1,7.15],[13.7,12.1],[18.15,12.1],[12.75,15.25],[21.4,15.25],[23.45,2.95],[18.5,-1.35],[10.55,-1.1],[5.15,2.4],[14.85,-5.6],[22.55,-2.25]])column(x,z);

  // 입구 현관 부스: 신발장·거울·코트걸이
  place(()=>{panel(.15,15.7,4.2,15.7);});
  place(shoeCabinet,1.4,16.05,1.4);place(armchair,3.3,16.7,-.6);place(plant,.5,17.3,.9);
  // 입구 오른쪽: 오픈 철제 선반 (마켓홀 느낌)
  place(steelShelf,10.6,16.4,1.8,2.1,0);

  // 거실 서쪽 벽면: 미디어 수납 + 보조 의자
  place(armchair,1.0,13.9,1.2);place(()=>{box(.35,0,10.6,.45,.55,2.4);box(.35,.55,10.6,.06,1.1,1.8);});
  place(plant,.6,8.0,1.2);
  // 거실 북쪽 B구역: 서재 코너
  place(desk,2.2,5.8,1.4,Math.PI);place(officeChair,2.2,5.05,Math.PI);place(armchair,1.0,3.9,1.9);place(lamp,.55,4.6,1.5);

  // 북쪽 끝(C): 아이방 부스
  place(kidsBed,11.4,-5.9,0);place(binShelf,13.9,-6.95,1.4,0);place(rug,12.8,-4.4,2.6,1.8);
  place(binShelf,14.55,-3.4,1.3,-Math.PI/2);place(pendantDrum,12.8,-4.4,2.2,.32,CEIL-.86);place(plant,10.95,-2.0,.8);
  // 북쪽 가운데(D): 홈오피스 부스
  place(desk,16.0,-5.0,1.6,0);place(officeChair,16.0,-4.3,0);place(shelves,17.6,-1.0,1.6,2.0);
  place(wardrobe,15.25,-2.2,1.0,2.0,Math.PI/2);place(lamp,14.6,-4.55,1.5);

  // 가운데(E): 다이닝 부스
  place(diningSet,11.9,9.6,1.6,.9,2);place(pendantDome,11.9,9.6,2.0,.36,CEIL-.86);
  place(()=>{box(13.35,0,9.6,.45,.8,2.0);for(const v of [-.5,0,.5])line([13.12,.06,9.6+v],[13.12,.74,9.6+v],.5);});
  place(plant,10.5,8.1,.9);
  // 앞쪽 가운데: 키친 부스 (카페 벽을 등지고)
  place(kitchenRun,15.3,14.85,4.6,Math.PI);
  place(()=>{box(15.3,0,13.15,2.4,.9,.9);box(15.3,.9,13.15,2.5,.04,1.0);});
  for(const u of [-.8,0,.8])place(stool,15.3+u,12.45);
  place(pendantDome,14.6,13.15,2.15,.26,CEIL-.86);place(pendantDome,16.0,13.15,2.15,.26,CEIL-.86);
  // 서재(F) 보강
  place(armchair,14.6,11.3,.6);place(rug,15.8,10.2,2.6,2.0);place(lamp,17.7,11.6,1.55);
  // 통로(G) 서쪽: 철제 선반 줄
  place(steelShelf,18.5,9.4,2.4,2.1,Math.PI/2);place(steelShelf,18.5,13.75,2.2,2.1,Math.PI/2);
  // 라운지 뒤쪽(H): 옷장 시스템 벽
  place(wardrobe,24.4,16.5,4.0,2.3,Math.PI);place(armchair,26.4,13.6,-.9);

  // 레스토랑: 배식대 · 쟁반 카트 · 테이블
  place(servingLine,20.5,-3.7,3.6);
  place(()=>{box(20.5,0,-4.42,3.8,1.9,.3);box(20.5,1.9,-4.42,3.8,.06,.36);for(const u of [-1.2,0,1.2])line([20.5+u,.1,-4.265],[20.5+u,1.8,-4.265],.5);});
  for(const u of [0,.7])place(trayCart,22.9+u,-1.6,0);
  for(const [x,z] of [[24.9,.5],[24.9,-1.25],[19.55,.2]])place(diningSet,x,z,1.2,.72,2);
  place(pendantDome,24.9,-.2,3.1,.42,CEIL-.86);place(pendantDome,19.55,.2,3.1,.42,CEIL-.86);
  trees([[18,-10,27,-10]]); // 북쪽 통창 너머만. 출구 쪽(동쪽)에는 두지 않습니다.
  // 출구 통로: 쇼핑 카트 줄
  for(let i=0;i<4;i++)place(shoppingCart,28.45,8.2+i*.62,0);
  for(let i=0;i<3;i++)place(shoppingCart,28.45,12.6+i*.62,0);
  place(shoppingCart,19.4,4.7,.5);
  // 섹션 방 안도 빽빽하게
  place(shelves,1.75,9.7,1.9,2.2);place(pendantDome,4.3,12.4,2.3,.3,CEIL-.86);place(cylinder,7.7,0,12.9,.3,.3,.4,24);
  place(armchair,9.7,1.0,-2.3);place(pendantDome,7.15,2.85,2.4,.28,CEIL-.86);
  place(pendantDrum,15.9,2.4,2.25,.4,CEIL-.86);place(rug,15.94,2.4,3.0,2.2);
  place(armchair,22.2,10.2,.9);place(rug,24.5,10.7,3.4,2.4);place(steelShelf,21.45,8.95,2.2,2.0,Math.PI/2);
}


function wall(x1,z1,x2,z2){const _w=walls.length;mapWalls.push([[x1,z1],[x2,z2]]);if(["22.55,-2.25,26.9,-2.25", "26.9,-2.25,26.9,4.85", "0,18,10.05,18", "21.4,18.15,12.45,18.15"].includes([x1,z1,x2,z2].join(','))){glazing(x1,z1,x2,z2);return;}const w=Math.abs(x2-x1)||.16,d=Math.abs(z2-z1)||.16,x=(x1+x2)/2,z=(z1+z2)/2;box(x,0,z,w,height,d);rect(x,z,w,d,false);walls[walls.length-1].h=height;}
function header(x1,z1,x2,z2){box((x1+x2)/2,2.84,(z1+z2)/2,Math.abs(x2-x1)||.16,height-2.84,Math.abs(z2-z1)||.16);}
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
const heroIds = [];

function hero(model, ...args) {
  const id=objectCount+1;
  place(model, ...args);
  heroIds.push(id);
}

// Build in object space, then place both the visible geometry and the picking faces.
function pose(x, z, angle, buildModel, dy=0) {
  const fi = faces.length, ei = edges.length, si = silEdges.length;
  buildModel();
  const points = new Set(faces.slice(fi).flatMap(f => f.points));
  for (const [a,b] of edges.slice(ei)) { points.add(a); points.add(b); }
  for (const p of silPts(si)) points.add(p);
  const c = Math.cos(angle), s = Math.sin(angle);
  for (const p of points) {
    const [u,,v] = p;
    p[0] = x + u*c + v*s;
    p[2] = z - u*s + v*c;
    p[1] += dy;
  }
}

function cubic(start, a, b, end, steps=10) {
  return Array.from({length:steps+1},(_,i)=>{
    const t=i/steps, s=1-t;
    return start.map((v,j)=>s*s*s*v+3*s*s*t*a[j]+3*s*t*t*b[j]+t*t*t*end[j]);
  });
}

// Join adjacent profiles with solid picking faces, outlining only the design seams.
function strip(a,b) {
  for(let i=1;i<a.length;i++)poly([a[i-1],a[i],b[i],b[i-1]],false);
}
function contour(points) {
  for(let i=1;i<points.length;i++)line(points[i-1],points[i]);
}
function plywoodChair(){
  pose(7.15,2.85,1.92,()=>{
    const back=cubic([-.56,1.14],[-.48,.98],[-.37,.58],[-.22,.47]);
    const seat=cubic([-.22,.47],[-.06,.34],[.29,.39],[.48,.46]);
    const profile=[...back,...seat.slice(1)];
    // Surface of a single bent ply shell, with gently rounded front and back corners.
    const ends=[];
    for(const side of [-1,1]){
      const top=profile.map(([z,y],i)=>[side*(.405-.027*Math.exp(-i)-.022*Math.exp(i-profile.length+1)),y,z]);
      const bottom=top.map(([x,y,z])=>[x,y-.024,z]);
      strip(top,bottom);contour(top);contour(bottom);ends.push({top,bottom});
    }
    strip(ends[0].top,ends[1].top);strip(ends[0].bottom,ends[1].bottom);
    for(const i of [0,profile.length-1])poly([ends[0].top[i],ends[1].top[i],ends[1].bottom[i],ends[0].bottom[i]]);
    // Two load-bearing plywood cheeks, with a scalloped foot opening.
    for(const side of [-1,1]){
      const top=cubic([-.52,.065],[-.40,.44],[-.30,.61],[.07,.50]).concat(cubic([.07,.50],[.34,.48],[.45,.36],[.56,.055]).slice(1));
      const lower=top.map(([z])=>[z,.022+.15*Math.pow(Math.max(0,Math.cos((z-.025)/1.075*Math.PI)),1.8)]);
      const skins=[.408,.435].map(w=>[top,lower].map(p=>p.map(([z,y])=>[side*w,y,z])));
      for(const [upper,base] of skins){strip(upper,base);contour(upper);contour(base);}
      strip(skins[0][0],skins[1][0]);strip(skins[0][1],skins[1][1]);
      for(const i of [0,top.length-1])poly([skins[0][0][i],skins[0][1][i],skins[1][1][i],skins[1][0][i]]);
      box(side*.437,.30,-.21,.008,.135,.019);
    }
  });
}

function slidingDoor(){
  // Existing east-facing bedroom opening. The panel overlaps the wall to the north.
  const x=18.27;
  box(x,.025,1.73,.062,2.72,1.96);
  for(const dz of [-.94,.94])box(x+.037,.036,1.73+dz,.014,2.70,.022);
  box(x+.039,1.02,2.53,.011,.235,.071);
  box(x+.046,1.043,2.53,.005,.19,.047);
  box(x+.015,2.83,2.0,.17,.062,3.55);
  for(const z of [.97,2.42])box(x,2.736,z,.035,.10,.083);
}

// Lounge furniture seen through the doorway before the approved cover illustration resolves.
function loungeRack(){
  pose(23.38,11.57,.15,()=>{
    for(const x of [-.34,.34]){
      for(const z of [-.18,.18])box(x,0,z,.018,.55,.018);
      box(x,.18,0,.018,.018,.36);
    }
    for(const z of [-.18,.18])box(0,.52,z,.70,.025,.025);
    const front=[],back=[];
    for(let i=0;i<=24;i++){
      const a=Math.PI*i/24,y=.50-.24*Math.sin(a),z=.17*Math.cos(a);
      front.push([-.33,y,z]);back.push([.33,y,z]);
    }
    strip(front,back);contour(front);contour(back);
    const cover=[[-.22,.30,.12],[.22,.30,.12],[.22,.82,-.03],[-.22,.82,-.03]];
    poly(cover);contour(cover.slice(2).map(([x,y,z])=>[x,y+.008,z-.014]));
    function print(x,y){return [x,y,.122-(y-.30)*.15/.52];}
    const storefront=[[552.5,428.0,552.6,430.0],[552.6,430.0,552.6,432.0],[510.0,432.5,508.4,434.0],[511.4,434.0,510.0,432.5],[552.6,432.0,552.6,434.0],[508.4,434.0,508.5,436.0],[511.4,434.0,512.0,435.9],[512.1,436.0,512.0,435.9],[552.6,434.0,552.8,436.0],[508.5,436.0,508.7,438.0],[512.0,436.1,511.5,438.0],[512.1,436.0,514.0,436.8],[512.6,438.0,512.0,436.1],[516.0,437.0,514.0,436.8],[516.9,438.0,516.0,437.0],[524.0,436.5,522.5,438.0],[525.5,438.0,524.0,436.5],[552.8,436.0,553.2,438.0],[508.7,438.0,508.8,440.0],[511.5,438.0,512.0,439.7],[512.6,438.0,514.0,439.2],[512.2,440.0,512.0,439.7],[516.0,439.0,514.0,439.2],[516.9,438.0,518.0,438.6],[516.6,440.0,516.0,439.0],[519.5,440.0,518.0,438.6],[522.5,438.0,522.8,440.0],[525.5,438.0,526.0,438.9],[527.1,440.0,526.0,438.9],[553.2,438.0,554.0,439.2],[508.8,440.0,508.9,442.0],[512.2,440.0,512.6,442.0],[516.6,440.0,518.0,441.4],[519.5,440.0,520.0,440.8],[518.9,442.0,518.0,441.4],[521.2,442.0,520.0,440.8],[522.8,440.0,523.1,442.0],[526.0,441.7,525.5,442.0],[527.1,440.0,528.0,440.8],[526.3,442.0,526.0,441.7],[530.0,442.0,528.0,440.8],[530.0,442.0,530.0,442.0],[508.9,442.0,509.0,444.0],[512.6,442.0,512.8,444.0],[516.0,442.6,514.7,444.0],[517.3,444.0,516.0,442.6],[518.9,442.0,518.8,444.0],[521.2,442.0,521.3,444.0],[523.1,442.0,524.0,443.7],[525.5,442.0,526.0,442.4],[524.3,444.0,524.0,443.7],[526.3,442.0,528.0,443.3],[527.1,444.0,526.0,442.4],[530.0,442.0,528.0,443.3],[530.0,442.0,532.0,442.8],[530.5,444.0,530.0,442.0],[534.0,442.6,532.0,442.8],[535.4,444.0,534.0,442.6],[509.0,444.0,509.2,446.0],[512.8,444.0,513.0,446.0],[514.7,444.0,514.9,446.0],[517.3,444.0,517.2,446.0],[518.8,444.0,518.6,446.0],[521.3,444.0,521.3,446.0],[524.3,444.0,524.6,446.0],[527.1,444.0,527.5,446.0],[530.5,444.0,532.0,445.2],[533.0,446.0,532.0,445.2],[535.4,444.0,535.0,446.0],[509.2,446.0,509.9,448.0],[513.0,446.0,513.3,448.0],[514.9,446.0,516.0,447.1],[517.2,446.0,518.0,447.2],[517.4,448.0,516.0,447.1],[518.6,446.0,518.0,447.2],[521.3,446.0,521.1,448.0],[524.6,446.0,524.6,448.0],[527.5,446.0,527.4,448.0],[530.0,446.7,528.8,448.0],[531.3,448.0,530.0,446.7],[533.0,446.0,533.1,448.0],[535.0,446.0,535.0,448.0],[509.9,448.0,510.0,448.1],[510.6,450.0,510.0,448.1],[513.3,448.0,513.2,450.0],[517.4,448.0,518.0,448.7],[519.3,450.0,518.0,448.7],[521.1,448.0,520.8,450.0],[524.6,448.0,524.5,450.0],[527.4,448.0,527.5,450.0],[528.8,448.0,530.0,449.5],[531.3,448.0,532.0,448.6],[530.4,450.0,530.0,449.5],[533.1,448.0,532.0,448.6],[535.0,448.0,534.5,450.0],[510.6,450.0,510.6,452.0],[513.2,450.0,514.0,451.2],[516.0,450.8,514.0,451.2],[517.2,452.0,516.0,450.8],[519.3,450.0,520.0,451.0],[520.8,450.0,522.0,451.2],[521.0,452.0,520.0,451.0],[522.6,452.0,522.0,451.2],[524.5,450.0,524.5,452.0],[527.5,450.0,527.5,452.0],[530.4,450.0,532.0,451.6],[534.0,450.5,532.0,451.6],[534.5,450.0,536.0,451.2],[535.3,452.0,534.0,450.5],[536.2,452.0,536.0,451.2],[510.6,452.0,510.7,454.0],[514.0,452.8,513.3,454.0],[516.0,453.4,514.0,452.8],[517.2,452.0,518.0,452.6],[516.4,454.0,516.0,453.4],[520.0,452.4,518.0,452.6],[521.0,452.0,522.0,453.5],[521.8,454.0,520.0,452.4],[522.6,452.0,522.0,453.5],[524.5,452.0,524.6,454.0],[527.5,452.0,528.0,453.0],[530.0,452.8,528.0,453.0],[530.8,454.0,530.0,452.8],[535.3,452.0,535.2,454.0],[536.2,452.0,536.8,454.0],[510.7,454.0,510.7,456.0],[513.3,454.0,513.3,456.0],[516.4,454.0,518.0,455.4],[520.0,455.3,518.0,455.4],[521.8,454.0,520.0,455.3],[524.6,454.0,524.7,456.0],[528.0,455.0,527.2,456.0],[530.0,455.2,528.0,455.0],[530.8,454.0,532.0,454.7],[530.4,456.0,530.0,455.2],[534.0,455.7,532.0,454.7],[535.2,454.0,534.0,455.7],[536.8,454.0,537.3,456.0],[510.7,456.0,510.7,458.0],[513.3,456.0,513.3,458.0],[524.7,456.0,525.0,458.0],[527.2,456.0,527.1,458.0],[530.4,456.0,532.0,457.3],[534.0,456.7,532.0,457.3],[536.0,457.3,534.0,456.7],[537.3,456.0,536.0,457.3],[510.7,458.0,510.7,460.0],[513.3,458.0,513.2,460.0],[525.0,458.0,525.6,460.0],[527.1,458.0,528.0,459.4],[528.5,460.0,528.0,459.4],[396.0,461.1,395.2,462.0],[398.0,460.5,396.0,461.1],[400.0,460.7,398.0,460.5],[402.0,460.6,400.0,460.7],[404.0,460.8,402.0,460.6],[406.0,461.8,404.0,460.8],[406.2,462.0,406.0,461.8],[510.7,460.0,510.9,462.0],[513.2,460.0,513.1,462.0],[525.6,460.0,526.0,460.7],[526.5,462.0,526.0,460.7],[528.5,460.0,529.1,462.0],[392.0,462.6,390.8,464.0],[394.0,462.6,392.0,462.6],[395.2,462.0,396.0,463.9],[396.0,464.0,394.0,462.6],[396.1,464.0,396.0,463.9],[400.0,463.3,399.1,464.0],[402.0,463.3,400.0,463.3],[404.0,463.3,402.0,463.3],[405.4,464.0,404.0,463.3],[406.2,462.0,408.0,463.0],[410.0,462.8,408.0,463.0],[412.0,462.6,410.0,462.8],[414.0,462.6,412.0,462.6],[416.0,462.8,414.0,462.6],[418.0,463.6,416.0,462.8],[418.3,464.0,418.0,463.6],[510.9,462.0,511.4,464.0],[513.1,462.0,513.2,464.0],[526.5,462.0,526.7,464.0],[529.1,462.0,529.4,464.0],[388.0,464.6,386.7,466.0],[390.0,464.7,388.0,464.6],[390.8,464.0,392.0,465.4],[391.5,466.0,390.0,464.7],[394.0,465.4,392.0,465.4],[396.0,464.0,394.0,465.4],[396.1,464.0,397.2,466.0],[399.1,464.0,398.6,466.0],[405.4,464.0,406.0,464.6],[408.0,465.2,406.0,464.6],[410.0,465.3,408.0,465.2],[412.0,465.4,410.0,465.3],[414.0,465.3,412.0,465.4],[416.0,465.2,414.0,465.3],[417.7,466.0,416.0,465.2],[418.3,464.0,420.0,465.0],[422.0,464.8,420.0,465.0],[424.0,464.7,422.0,464.8],[426.0,464.7,424.0,464.7],[428.0,464.8,426.0,464.7],[430.0,465.6,428.0,464.8],[430.4,466.0,430.0,465.6],[511.4,464.0,512.0,464.9],[513.2,464.0,514.0,464.7],[513.0,466.0,512.0,464.9],[514.6,466.0,514.0,464.7],[526.7,464.0,526.7,466.0],[529.4,464.0,529.3,466.0],[384.0,466.7,382.3,468.0],[386.0,466.9,384.0,466.7],[386.7,466.0,388.0,467.3],[387.1,468.0,386.0,466.9],[390.0,467.3,388.0,467.3],[391.5,466.0,390.0,467.3],[397.2,466.0,398.0,467.2],[398.6,466.0,398.0,467.2],[417.7,466.0,418.0,466.3],[420.0,467.0,418.0,466.3],[422.0,467.2,420.0,467.0],[424.0,467.3,422.0,467.2],[426.0,467.2,424.0,467.3],[428.0,467.1,426.0,467.2],[429.9,468.0,428.0,467.1],[430.4,466.0,432.0,467.0],[434.0,466.8,432.0,467.0],[436.0,466.7,434.0,466.8],[438.0,466.7,436.0,466.7],[440.0,466.7,438.0,466.7],[442.0,467.0,440.0,466.7],[443.4,468.0,442.0,467.0],[513.0,466.0,512.9,468.0],[514.6,466.0,515.1,468.0],[526.7,466.0,526.6,468.0],[529.3,466.0,529.4,468.0],[378.0,469.5,377.6,470.0],[380.0,468.7,378.0,469.5],[382.0,468.7,380.0,468.7],[382.3,468.0,384.0,469.3],[382.9,470.0,382.0,468.7],[386.0,469.2,384.0,469.3],[387.1,468.0,386.0,469.2],[429.9,468.0,430.0,468.1],[432.0,469.1,430.0,468.1],[434.0,469.3,432.0,469.1],[436.0,469.3,434.0,469.3],[438.0,469.3,436.0,469.3],[440.0,469.2,438.0,469.3],[442.0,469.6,440.0,469.2],[443.4,468.0,444.0,468.6],[442.4,470.0,442.0,469.6],[446.0,468.8,444.0,468.6],[448.0,468.7,446.0,468.8],[450.0,468.7,448.0,468.7],[452.0,468.7,450.0,468.7],[454.0,469.1,452.0,468.7],[455.3,470.0,454.0,469.1],[512.9,468.0,512.8,470.0],[515.1,468.0,515.3,470.0],[526.6,468.0,526.7,470.0],[529.4,468.0,529.3,470.0],[374.0,471.0,373.2,472.0],[376.0,470.6,374.0,471.0],[377.6,470.0,376.0,470.6],[380.0,471.3,378.4,472.0],[382.0,471.1,380.0,471.3],[382.9,470.0,382.0,471.1],[400.0,471.8,399.8,472.0],[400.2,472.0,400.0,471.8],[442.4,470.0,444.0,471.1],[446.0,471.3,444.0,471.1],[448.0,471.3,446.0,471.3],[450.0,471.3,448.0,471.3],[452.0,471.2,450.0,471.3],[454.0,471.3,452.0,471.2],[455.3,470.0,456.0,470.6],[454.6,472.0,454.0,471.3],[458.0,470.9,456.0,470.6],[460.0,470.8,458.0,470.9],[462.0,470.7,460.0,470.8],[464.0,470.7,462.0,470.7],[466.0,471.0,464.0,470.7],[468.0,471.8,466.0,471.0],[468.2,472.0,468.0,471.8],[512.8,470.0,512.7,472.0],[515.3,470.0,515.3,472.0],[526.7,470.0,526.8,472.0],[529.3,470.0,529.2,472.0],[372.0,472.5,370.5,474.0],[373.2,472.0,374.0,473.2],[373.7,474.0,372.0,472.5],[376.0,473.4,374.0,473.2],[378.0,472.6,376.0,473.4],[378.4,472.0,378.0,472.6],[399.8,472.0,399.1,474.0],[400.2,472.0,400.9,474.0],[418.0,472.9,417.0,474.0],[420.0,473.3,418.0,472.9],[420.8,474.0,420.0,473.3],[454.6,472.0,456.0,473.0],[458.0,473.2,456.0,473.0],[460.0,473.3,458.0,473.2],[462.0,473.3,460.0,473.3],[464.0,473.2,462.0,473.3],[466.0,473.1,464.0,473.2],[467.1,474.0,466.0,473.1],[468.2,472.0,470.0,472.6],[472.0,472.6,470.0,472.6],[474.0,472.8,472.0,472.6],[476.0,473.0,474.0,472.8],[478.0,473.8,476.0,473.0],[478.2,474.0,478.0,473.8],[512.7,472.0,512.7,474.0],[515.3,472.0,515.3,474.0],[526.8,472.0,527.0,474.0],[529.2,472.0,528.9,474.0],[370.5,474.0,370.7,476.0],[373.7,474.0,373.3,476.0],[399.1,474.0,398.8,476.0],[400.9,474.0,401.2,476.0],[417.0,474.0,416.5,476.0],[420.8,474.0,422.0,475.4],[422.7,476.0,422.0,475.4],[426.0,474.4,424.3,476.0],[428.0,474.5,426.0,474.4],[429.7,476.0,428.0,474.5],[432.0,474.8,430.6,476.0],[434.0,474.9,432.0,474.8],[436.0,475.9,434.0,474.9],[436.1,476.0,436.0,475.9],[467.1,474.0,468.0,474.8],[470.0,475.3,468.0,474.8],[472.0,475.7,470.0,475.3],[474.0,475.1,472.0,475.7],[476.0,474.9,474.0,475.1],[478.0,474.7,476.0,474.9],[478.2,474.0,480.0,474.9],[478.3,476.0,478.0,474.7],[482.0,474.8,480.0,474.9],[484.0,474.7,482.0,474.8],[486.0,474.8,484.0,474.7],[488.0,474.9,486.0,474.8],[490.0,475.3,488.0,474.9],[491.0,476.0,490.0,475.3],[512.7,474.0,512.7,476.0],[515.3,474.0,515.3,476.0],[527.0,474.0,527.7,476.0],[528.9,474.0,529.3,476.0],[370.7,476.0,370.9,478.0],[373.3,476.0,373.0,478.0],[398.8,476.0,398.7,478.0],[401.2,476.0,401.3,478.0],[416.5,476.0,416.4,478.0],[422.7,476.0,423.1,478.0],[424.3,476.0,424.4,478.0],[429.7,476.0,429.9,478.0],[430.6,476.0,430.1,478.0],[436.1,476.0,437.2,478.0],[440.0,476.4,438.4,478.0],[442.0,476.5,440.0,476.4],[444.0,476.7,442.0,476.5],[446.0,476.8,444.0,476.7],[447.2,478.0,446.0,476.8],[472.0,476.8,471.3,478.0],[472.7,478.0,472.0,476.8],[478.3,476.0,480.0,477.0],[482.0,477.3,480.0,477.0],[484.0,477.3,482.0,477.3],[486.0,477.2,484.0,477.3],[488.0,477.0,486.0,477.2],[490.0,477.3,488.0,477.0],[491.0,476.0,492.0,476.6],[490.4,478.0,490.0,477.3],[494.0,476.7,492.0,476.6],[496.0,476.7,494.0,476.7],[498.0,476.7,496.0,476.7],[500.0,476.9,498.0,476.7],[502.0,477.3,500.0,476.9],[503.3,478.0,502.0,477.3],[512.7,476.0,512.8,478.0],[515.3,476.0,515.2,478.0],[527.7,476.0,528.0,476.5],[529.3,476.0,530.0,476.2],[528.8,478.0,528.0,476.5],[531.0,478.0,530.0,476.2],[370.9,478.0,371.5,480.0],[373.0,478.0,372.5,480.0],[398.7,478.0,398.7,480.0],[401.3,478.0,401.3,480.0],[416.4,478.0,416.4,480.0],[423.1,478.0,423.4,480.0],[424.4,478.0,424.4,480.0],[429.9,478.0,430.0,478.1],[430.1,478.0,430.0,478.1],[436.0,479.2,435.6,480.0],[437.2,478.0,436.0,479.2],[438.4,478.0,438.5,480.0],[447.2,478.0,447.6,480.0],[452.0,478.1,450.5,480.0],[454.0,478.4,452.0,478.1],[456.0,478.4,454.0,478.4],[458.0,479.5,456.0,478.4],[458.5,480.0,458.0,479.5],[471.3,478.0,470.9,480.0],[472.7,478.0,473.1,480.0],[490.4,478.0,492.0,479.2],[494.0,479.4,492.0,479.2],[496.0,479.4,494.0,479.4],[498.0,479.2,496.0,479.4],[500.0,479.0,498.0,479.2],[502.0,478.7,500.0,479.0],[503.3,478.0,504.0,478.8],[503.4,480.0,502.0,478.7],[506.0,478.8,504.0,478.8],[508.0,478.7,506.0,478.8],[510.0,478.7,508.0,478.7],[512.0,478.9,510.0,478.7],[512.8,478.0,512.0,478.9],[515.2,478.0,516.0,479.3],[517.0,480.0,516.0,479.3],[528.8,478.0,528.8,480.0],[531.0,478.0,531.3,480.0],[371.5,480.0,371.2,482.0],[372.5,480.0,372.7,482.0],[398.7,480.0,398.7,482.0],[401.3,480.0,401.2,482.0],[416.4,480.0,416.4,482.0],[423.4,480.0,423.5,482.0],[424.4,480.0,424.4,482.0],[435.6,480.0,435.5,482.0],[438.5,480.0,438.5,482.0],[447.6,480.0,447.4,482.0],[450.5,480.0,450.5,482.0],[458.5,480.0,459.5,482.0],[470.9,480.0,470.8,482.0],[473.1,480.0,473.2,482.0],[503.4,480.0,504.0,480.7],[506.0,481.3,504.0,480.7],[508.0,481.4,506.0,481.3],[510.0,481.3,508.0,481.4],[512.0,481.1,510.0,481.3],[514.0,481.6,512.0,481.1],[514.6,482.0,514.0,481.6],[517.0,480.0,518.0,481.0],[520.0,480.9,518.0,481.0],[522.0,480.8,520.0,480.9],[524.0,480.9,522.0,480.8],[526.0,481.0,524.0,480.9],[528.0,482.0,526.0,481.0],[528.8,480.0,528.0,482.0],[531.3,480.0,531.5,482.0],[371.2,482.0,372.0,483.3],[372.7,482.0,374.0,483.3],[372.7,484.0,372.0,483.3],[374.6,484.0,374.0,483.3],[398.7,482.0,399.0,484.0],[401.2,482.0,400.9,484.0],[416.4,482.0,416.4,484.0],[423.5,482.0,423.6,484.0],[424.4,482.0,424.5,484.0],[435.5,482.0,436.0,482.9],[437.1,484.0,436.0,482.9],[438.5,482.0,438.5,484.0],[447.4,482.0,447.4,484.0],[450.0,483.8,449.8,484.0],[450.5,482.0,450.0,483.8],[459.5,482.0,459.7,484.0],[470.8,482.0,470.6,484.0],[473.2,482.0,473.3,484.0],[514.6,482.0,515.0,484.0],[518.0,482.7,517.2,484.0],[520.0,483.3,518.0,482.7],[522.0,483.3,520.0,483.3],[524.0,483.2,522.0,483.3],[526.0,483.0,524.0,483.2],[528.0,482.0,526.0,483.0],[528.0,482.0,528.6,484.0],[531.5,482.0,532.0,483.3],[534.0,482.9,532.0,483.3],[536.0,482.8,534.0,482.9],[538.0,483.0,536.0,482.8],[540.0,483.4,538.0,483.0],[540.9,484.0,540.0,483.4],[372.7,484.0,372.7,486.0],[374.6,484.0,375.3,486.0],[399.0,484.0,400.0,486.0],[400.9,484.0,400.0,486.0],[416.4,484.0,418.0,485.5],[420.0,485.7,418.0,485.5],[421.6,486.0,420.0,485.7],[423.6,484.0,422.3,486.0],[424.5,484.0,424.8,486.0],[432.0,485.7,431.6,486.0],[432.3,486.0,432.0,485.7],[437.1,484.0,437.9,486.0],[438.5,484.0,438.2,486.0],[447.4,484.0,448.0,485.2],[449.8,484.0,448.0,485.2],[459.7,484.0,460.0,484.6],[461.2,486.0,460.0,484.6],[470.6,484.0,470.6,486.0],[473.3,484.0,473.3,486.0],[515.0,484.0,514.7,486.0],[517.2,484.0,517.3,486.0],[528.6,484.0,528.7,486.0],[532.0,484.5,531.3,486.0],[534.0,485.2,532.0,484.5],[536.0,485.2,534.0,485.2],[538.0,484.9,536.0,485.2],[540.0,484.5,538.0,484.9],[540.9,484.0,540.0,484.5],[372.7,486.0,372.6,488.0],[375.3,486.0,375.5,488.0],[400.0,486.0,400.0,486.0],[400.0,486.0,400.0,486.0],[421.6,486.0,422.0,486.3],[422.3,486.0,422.0,486.3],[424.8,486.0,426.0,487.2],[428.0,487.4,426.0,487.2],[430.0,487.3,428.0,487.4],[431.6,486.0,430.0,487.3],[432.3,486.0,434.0,487.5],[436.0,487.5,434.0,487.5],[437.9,486.0,436.0,487.5],[438.2,486.0,440.0,487.8],[440.9,488.0,440.0,487.8],[454.0,487.7,453.7,488.0],[455.4,488.0,454.0,487.7],[461.2,486.0,461.6,488.0],[470.6,486.0,471.1,488.0],[473.3,486.0,473.1,488.0],[514.7,486.0,514.6,488.0],[517.3,486.0,517.4,488.0],[528.7,486.0,528.7,488.0],[531.3,486.0,531.2,488.0],[372.6,488.0,372.6,490.0],[375.5,488.0,375.5,490.0],[440.9,488.0,442.0,488.7],[444.0,489.2,442.0,488.7],[446.0,489.4,444.0,489.2],[448.0,489.3,446.0,489.4],[450.0,489.5,448.0,489.3],[452.0,489.5,450.0,489.5],[453.7,488.0,452.0,489.5],[455.4,488.0,456.0,488.6],[458.0,489.6,456.0,488.6],[460.0,489.7,458.0,489.6],[461.6,488.0,460.0,489.7],[471.1,488.0,472.0,489.2],[473.1,488.0,472.0,489.2],[514.6,488.0,514.6,490.0],[517.4,488.0,517.4,490.0],[528.7,488.0,528.9,490.0],[531.2,488.0,531.2,490.0],[372.6,490.0,372.6,492.0],[375.5,490.0,375.4,492.0],[402.0,490.3,401.2,492.0],[402.9,492.0,402.0,490.3],[414.0,491.3,413.2,492.0],[416.0,490.6,414.0,491.3],[418.0,490.8,416.0,490.6],[420.0,491.0,418.0,490.8],[422.0,491.1,420.0,491.0],[424.0,491.4,422.0,491.1],[426.0,491.9,424.0,491.4],[426.2,492.0,426.0,491.9],[474.0,490.4,473.4,492.0],[474.6,492.0,474.0,490.4],[514.6,490.0,514.6,492.0],[517.4,490.0,517.3,492.0],[528.9,490.0,529.6,492.0],[531.2,490.0,532.0,491.6],[532.4,492.0,532.0,491.6],[372.6,492.0,372.7,494.0],[375.4,492.0,375.3,494.0],[401.2,492.0,400.8,494.0],[402.9,492.0,403.2,494.0],[408.0,493.0,406.8,494.0],[410.0,492.6,408.0,493.0],[412.0,492.9,410.0,492.6],[413.2,492.0,414.0,492.7],[412.9,494.0,412.0,492.9],[415.1,494.0,414.0,492.7],[418.0,493.1,416.9,494.0],[420.0,493.0,418.0,493.1],[422.0,492.8,420.0,493.0],[424.0,492.6,422.0,492.8],[426.0,492.1,424.0,492.6],[426.2,492.0,426.0,492.1],[432.0,493.4,431.0,494.0],[434.0,492.9,432.0,493.4],[436.0,492.8,434.0,492.9],[438.0,492.7,436.0,492.8],[440.0,492.7,438.0,492.7],[442.0,492.7,440.0,492.7],[444.0,492.7,442.0,492.7],[446.0,492.8,444.0,492.7],[448.0,493.0,446.0,492.8],[450.0,493.6,448.0,493.0],[451.2,494.0,450.0,493.6],[473.4,492.0,473.0,494.0],[474.6,492.0,475.1,494.0],[514.6,492.0,514.8,494.0],[517.3,492.0,517.1,494.0],[529.6,492.0,530.0,492.6],[530.6,494.0,530.0,492.6],[532.4,492.0,533.1,494.0],[372.7,494.0,372.8,496.0],[375.3,494.0,375.1,496.0],[400.8,494.0,400.3,496.0],[403.2,494.0,404.0,494.7],[406.0,496.0,404.0,494.7],[406.8,494.0,408.0,494.9],[410.0,495.4,408.0,494.9],[412.0,495.4,410.0,495.4],[412.9,494.0,414.0,495.3],[412.9,496.0,412.0,495.4],[415.1,494.0,414.0,495.3],[416.9,494.0,418.0,495.5],[420.0,495.9,418.0,495.5],[420.5,496.0,420.0,495.9],[431.0,494.0,432.0,494.5],[434.0,495.0,432.0,494.5],[436.0,495.3,434.0,495.0],[438.0,495.3,436.0,495.3],[440.0,495.3,438.0,495.3],[442.0,495.3,440.0,495.3],[444.0,495.3,442.0,495.3],[446.0,495.2,444.0,495.3],[448.0,495.0,446.0,495.2],[450.0,494.4,448.0,495.0],[451.2,494.0,450.0,494.4],[456.0,495.7,455.7,496.0],[458.0,494.9,456.0,495.7],[460.0,494.8,458.0,494.9],[462.0,494.8,460.0,494.8],[464.0,494.8,462.0,494.8],[466.0,494.8,464.0,494.8],[468.0,494.8,466.0,494.8],[470.0,495.0,468.0,494.8],[472.0,496.0,470.0,495.0],[473.0,494.0,472.0,496.0],[475.1,494.0,475.7,496.0],[514.8,494.0,515.3,496.0],[517.1,494.0,517.4,496.0],[530.6,494.0,530.7,496.0],[533.1,494.0,533.4,496.0],[372.8,496.0,373.3,498.0],[375.1,496.0,374.6,498.0],[396.0,497.3,395.3,498.0],[398.0,496.5,396.0,497.3],[399.5,498.0,398.0,496.5],[400.3,496.0,400.6,498.0],[404.0,497.8,403.7,498.0],[406.0,496.0,406.0,496.1],[404.3,498.0,404.0,497.8],[408.0,496.6,406.0,496.1],[410.0,496.7,408.0,496.6],[412.0,497.9,410.0,496.7],[412.9,496.0,414.0,496.7],[412.0,498.0,412.0,497.9],[416.0,497.2,414.0,496.7],[418.0,496.5,416.0,497.2],[420.0,496.1,418.0,496.5],[420.5,496.0,420.0,496.1],[430.0,497.5,428.2,498.0],[432.0,497.2,430.0,497.5],[434.0,497.0,432.0,497.2],[436.0,496.9,434.0,497.0],[438.0,496.9,436.0,496.9],[440.0,496.9,438.0,496.9],[442.0,496.9,440.0,496.9],[444.0,496.9,442.0,496.9],[446.0,497.1,444.0,496.9],[448.0,497.3,446.0,497.1],[450.0,497.7,448.0,497.3],[450.8,498.0,450.0,497.7],[455.7,496.0,456.0,496.2],[458.0,497.1,456.0,496.2],[460.0,497.3,458.0,497.1],[462.0,497.3,460.0,497.3],[464.0,497.3,462.0,497.3],[466.0,497.2,464.0,497.3],[468.0,497.1,466.0,497.2],[470.0,496.9,468.0,497.1],[472.0,496.0,470.0,496.9],[474.0,497.4,472.0,496.0],[475.7,496.0,474.0,497.4],[480.0,496.6,478.7,498.0],[482.0,497.9,480.0,496.6],[482.1,498.0,482.0,497.9],[515.3,496.0,516.0,497.0],[517.4,496.0,518.0,496.6],[516.9,498.0,516.0,497.0],[518.7,498.0,518.0,496.6],[530.7,496.0,530.6,498.0],[533.4,496.0,533.4,498.0],[373.3,498.0,374.0,499.7],[374.6,498.0,374.0,499.7],[394.0,498.8,392.2,500.0],[395.3,498.0,396.0,498.6],[395.1,500.0,394.0,498.8],[398.0,500.0,396.0,498.6],[399.5,498.0,400.0,498.7],[398.0,500.0,398.0,500.0],[400.6,498.0,400.0,498.7],[403.7,498.0,404.0,498.3],[404.3,498.0,404.0,498.3],[412.0,498.0,413.8,500.0],[428.2,498.0,430.0,498.4],[432.0,498.8,430.0,498.4],[434.0,498.9,432.0,498.8],[436.0,499.1,434.0,498.9],[438.0,499.1,436.0,499.1],[440.0,499.1,438.0,499.1],[442.0,499.1,440.0,499.1],[444.0,499.1,442.0,499.1],[446.0,498.9,444.0,499.1],[448.0,498.7,446.0,498.9],[450.0,498.3,448.0,498.7],[450.8,498.0,450.0,498.3],[460.0,499.8,459.2,500.0],[462.0,499.4,460.0,499.8],[464.0,499.2,462.0,499.4],[466.0,499.0,464.0,499.2],[468.0,499.0,466.0,499.0],[470.0,499.4,468.0,499.0],[472.0,498.9,470.0,499.4],[474.0,498.8,472.0,498.9],[476.0,498.8,474.0,498.8],[478.0,498.9,476.0,498.8],[478.7,498.0,480.0,499.4],[479.3,500.0,478.0,498.9],[482.0,498.1,480.0,499.4],[482.1,498.0,482.0,498.1],[516.9,498.0,516.9,500.0],[518.7,498.0,519.1,500.0],[530.6,498.0,530.6,500.0],[533.4,498.0,533.4,500.0],[388.0,501.8,387.8,502.0],[390.0,500.5,388.0,501.8],[392.0,500.1,390.0,500.5],[392.2,500.0,392.0,500.1],[395.1,500.0,396.0,501.2],[397.0,502.0,396.0,501.2],[398.0,500.0,400.0,501.2],[400.7,502.0,400.0,501.2],[404.0,501.2,403.3,502.0],[406.0,500.9,404.0,501.2],[407.6,502.0,406.0,500.9],[410.0,500.7,408.4,502.0],[412.0,500.4,410.0,500.7],[413.8,500.0,412.0,500.4],[418.0,500.6,416.8,502.0],[419.3,502.0,418.0,500.6],[422.0,501.7,421.6,502.0],[424.0,501.4,422.0,501.7],[426.0,501.1,424.0,501.4],[428.0,500.5,426.0,501.1],[430.0,500.7,428.0,500.5],[432.0,500.7,430.0,500.7],[434.0,500.5,432.0,500.7],[436.0,500.5,434.0,500.5],[438.0,500.6,436.0,500.5],[440.0,500.7,438.0,500.6],[442.0,500.6,440.0,500.7],[444.0,500.7,442.0,500.6],[446.0,500.8,444.0,500.7],[448.0,500.9,446.0,500.8],[450.0,501.0,448.0,500.9],[452.0,501.0,450.0,501.0],[454.0,501.0,452.0,501.0],[456.0,500.9,454.0,501.0],[458.0,500.9,456.0,500.9],[459.2,500.0,460.0,500.8],[459.1,502.0,458.0,500.9],[461.5,502.0,460.0,500.8],[472.0,501.9,472.0,502.0],[472.1,502.0,472.0,501.9],[476.0,501.4,475.1,502.0],[478.0,501.1,476.0,501.4],[479.3,500.0,478.0,501.1],[516.9,500.0,516.7,502.0],[519.1,500.0,519.4,502.0],[530.6,500.0,530.6,502.0],[533.4,500.0,533.4,502.0],[376.0,502.0,374.4,504.0],[378.0,502.9,376.0,502.0],[380.0,502.7,378.0,502.9],[382.0,502.5,380.0,502.7],[384.0,502.6,382.0,502.5],[386.0,503.3,384.0,502.6],[387.8,502.0,388.0,502.2],[386.8,504.0,386.0,503.3],[388.9,504.0,388.0,502.2],[392.0,503.5,390.9,504.0],[394.0,503.5,392.0,503.5],[396.0,502.9,394.0,503.5],[397.0,502.0,396.0,502.9],[400.7,502.0,400.7,504.0],[403.3,502.0,403.2,504.0],[407.6,502.0,407.7,504.0],[408.4,502.0,408.2,504.0],[416.8,502.0,417.2,504.0],[419.3,502.0,418.7,504.0],[421.6,502.0,422.0,502.3],[424.0,502.7,422.0,502.3],[426.0,502.9,424.0,502.7],[427.0,504.0,426.0,502.9],[430.0,503.4,429.1,504.0],[432.0,503.4,430.0,503.4],[434.0,503.4,432.0,503.4],[436.0,503.9,434.0,503.4],[438.0,503.4,436.0,503.9],[440.0,503.3,438.0,503.4],[442.0,503.4,440.0,503.3],[444.0,503.9,442.0,503.4],[446.0,503.2,444.0,503.9],[448.0,503.1,446.0,503.2],[450.0,503.0,448.0,503.1],[452.0,503.0,450.0,503.0],[453.6,504.0,452.0,503.0],[456.0,502.7,454.3,504.0],[458.0,502.4,456.0,502.7],[459.1,502.0,460.0,502.3],[459.0,504.0,458.0,502.4],[461.5,502.0,462.0,502.2],[461.2,504.0,460.0,502.3],[464.0,502.5,462.0,502.2],[466.0,502.6,464.0,502.5],[467.3,504.0,466.0,502.6],[470.0,503.4,468.8,504.0],[472.0,502.0,470.0,503.4],[472.1,502.0,473.7,504.0],[475.1,502.0,476.0,502.8],[478.0,503.0,476.0,502.8],[480.0,502.9,478.0,503.0],[482.0,502.7,480.0,502.9],[484.0,502.6,482.0,502.7],[486.0,502.7,484.0,502.6],[488.0,502.6,486.0,502.7],[490.0,502.6,488.0,502.6],[492.0,502.6,490.0,502.6],[494.0,502.7,492.0,502.6],[496.0,502.8,494.0,502.7],[498.0,503.2,496.0,502.8],[500.0,503.8,498.0,503.2],[500.8,504.0,500.0,503.8],[516.7,502.0,516.6,504.0],[519.4,502.0,519.4,504.0],[530.6,502.0,530.7,504.0],[533.4,502.0,533.3,504.0],[546.0,503.6,546.0,504.0],[546.0,504.0,546.0,503.6],[374.4,504.0,374.8,506.0],[378.0,505.1,377.2,506.0],[380.0,505.3,378.0,505.1],[382.0,505.7,380.0,505.3],[384.0,505.4,382.0,505.7],[386.0,504.8,384.0,505.4],[386.8,504.0,386.0,504.8],[388.9,504.0,389.3,506.0],[390.9,504.0,390.7,506.0],[400.7,504.0,401.0,506.0],[403.2,504.0,402.9,506.0],[407.7,504.0,408.0,505.0],[408.2,504.0,408.0,505.0],[417.2,504.0,417.9,506.0],[418.7,504.0,418.1,506.0],[427.0,504.0,426.8,506.0],[429.1,504.0,429.3,506.0],[436.0,504.3,435.1,506.0],[437.0,506.0,436.0,504.3],[444.0,504.6,443.5,506.0],[444.6,506.0,444.0,504.6],[453.6,504.0,452.1,506.0],[454.3,504.0,455.2,506.0],[459.0,504.0,459.2,506.0],[461.2,504.0,461.0,506.0],[467.3,504.0,467.1,506.0],[468.8,504.0,469.0,506.0],[473.7,504.0,474.0,504.4],[476.0,505.6,474.0,504.4],[478.0,505.1,476.0,505.6],[480.0,505.2,478.0,505.1],[482.0,505.3,480.0,505.2],[483.3,506.0,482.0,505.3],[486.0,505.4,484.8,506.0],[488.0,505.5,486.0,505.4],[489.2,506.0,488.0,505.5],[492.0,505.5,490.9,506.0],[494.0,505.2,492.0,505.5],[496.0,505.0,494.0,505.2],[497.1,506.0,496.0,505.0],[500.0,504.1,498.9,506.0],[500.8,504.0,500.0,504.1],[504.0,504.6,502.9,506.0],[505.1,506.0,504.0,504.6],[510.0,506.0,509.9,506.0],[512.0,504.7,510.0,506.0],[514.0,505.3,512.0,504.7],[516.0,504.8,514.0,505.3],[516.6,504.0,516.0,504.8],[519.4,504.0,520.0,504.7],[522.0,504.6,520.0,504.7],[524.0,504.5,522.0,504.6],[526.0,504.6,524.0,504.5],[528.0,504.7,526.0,504.6],[530.0,504.8,528.0,504.7],[530.7,504.0,530.0,504.8],[533.3,504.0,534.0,505.0],[536.0,504.9,534.0,505.0],[538.0,505.3,536.0,504.9],[540.0,505.6,538.0,505.3],[541.0,506.0,540.0,505.6],[546.0,504.0,544.8,506.0],[546.0,504.0,546.6,506.0],[374.8,506.0,374.7,508.0],[377.2,506.0,377.4,508.0],[389.3,506.0,389.3,508.0],[390.7,506.0,390.6,508.0],[400.0,508.0,400.0,508.0],[401.0,506.0,400.0,508.0],[402.9,506.0,402.6,508.0],[410.0,506.7,408.4,508.0],[412.0,506.8,410.0,506.7],[414.0,506.7,412.0,506.8],[416.0,506.6,414.0,506.7],[417.9,506.0,416.0,506.6],[418.1,506.0,420.0,506.5],[422.0,506.5,420.0,506.5],[424.0,506.5,422.0,506.5],[426.0,506.6,424.0,506.5],[426.8,506.0,426.0,506.6],[429.3,506.0,430.0,506.6],[432.0,506.7,430.0,506.6],[434.0,506.9,432.0,506.7],[435.1,506.0,434.0,506.9],[437.0,506.0,438.0,506.9],[440.0,507.0,438.0,506.9],[442.0,507.5,440.0,507.0],[443.5,506.0,442.0,507.5],[444.6,506.0,446.0,507.7],[447.4,508.0,446.0,507.7],[452.0,506.3,450.4,508.0],[452.1,506.0,452.0,506.3],[455.2,506.0,456.0,507.9],[458.0,507.5,456.0,507.9],[459.2,506.0,458.0,507.5],[461.0,506.0,462.0,507.5],[463.1,508.0,462.0,507.5],[467.1,506.0,466.7,508.0],[469.0,506.0,469.2,508.0],[483.3,506.0,483.3,508.0],[484.8,506.0,484.7,508.0],[489.2,506.0,489.6,508.0],[490.9,506.0,490.6,508.0],[497.1,506.0,497.1,508.0],[498.9,506.0,498.9,508.0],[502.9,506.0,503.2,508.0],[505.1,506.0,504.7,508.0],[509.9,506.0,510.0,506.0],[510.9,508.0,510.0,506.0],[514.0,506.7,513.2,508.0],[516.0,507.3,514.0,506.7],[516.5,508.0,516.0,507.3],[520.0,507.3,519.4,508.0],[522.0,507.5,520.0,507.3],[524.0,507.4,522.0,507.5],[524.9,508.0,524.0,507.4],[528.0,507.3,527.1,508.0],[530.0,507.3,528.0,507.3],[531.1,508.0,530.0,507.3],[536.0,507.1,534.3,508.0],[537.2,508.0,536.0,507.1],[540.0,506.3,538.7,508.0],[541.0,506.0,540.0,506.3],[544.8,506.0,544.8,508.0],[546.6,506.0,547.2,508.0],[374.7,508.0,374.6,510.0],[377.4,508.0,377.4,510.0],[384.0,509.0,382.5,510.0],[386.0,509.4,384.0,509.0],[388.0,509.5,386.0,509.4],[389.3,508.0,388.0,509.5],[390.6,508.0,391.3,510.0],[400.0,508.0,400.0,508.0],[402.0,508.7,400.0,508.0],[402.6,508.0,402.0,508.7],[408.4,508.0,410.0,509.5],[412.0,509.2,410.0,509.5],[414.0,509.3,412.0,509.2],[416.0,509.4,414.0,509.3],[418.0,509.5,416.0,509.4],[419.0,510.0,418.0,509.5],[422.0,509.5,420.9,510.0],[424.0,509.5,422.0,509.5],[426.0,509.4,424.0,509.5],[426.7,510.0,426.0,509.4],[430.0,509.4,429.3,510.0],[432.0,509.2,430.0,509.4],[434.0,509.1,432.0,509.2],[434.5,510.0,434.0,509.1],[438.0,509.0,437.5,510.0],[440.0,508.9,438.0,509.0],[442.0,508.5,440.0,508.9],[442.6,510.0,442.0,508.5],[446.0,508.5,445.6,510.0],[447.4,508.0,446.0,508.5],[450.4,508.0,450.5,510.0],[456.0,508.1,455.2,510.0],[458.0,508.5,456.0,508.1],[460.0,508.7,458.0,508.5],[461.1,510.0,460.0,508.7],[463.1,508.0,463.0,510.0],[466.7,508.0,466.7,510.0],[469.2,508.0,469.2,510.0],[476.0,508.2,474.7,510.0],[478.0,509.2,476.0,508.2],[480.0,509.1,478.0,509.2],[482.0,509.0,480.0,509.1],[483.3,508.0,482.0,509.0],[484.7,508.0,486.0,508.9],[488.0,508.8,486.0,508.9],[489.6,508.0,488.0,508.8],[490.6,508.0,492.0,508.3],[494.0,508.8,492.0,508.3],[496.0,508.8,494.0,508.8],[497.1,508.0,496.0,508.8],[498.9,508.0,500.0,508.8],[502.0,508.8,500.0,508.8],[503.2,508.0,502.0,508.8],[504.7,508.0,506.0,508.6],[508.0,508.6,506.0,508.6],[510.0,508.7,508.0,508.6],[510.9,508.0,510.0,508.7],[513.2,508.0,514.0,508.8],[516.0,508.8,514.0,508.8],[516.5,508.0,516.0,508.8],[519.4,508.0,520.0,508.7],[522.0,508.6,520.0,508.7],[524.0,508.9,522.0,508.6],[524.9,508.0,524.0,508.9],[527.1,508.0,528.0,508.9],[530.0,509.0,528.0,508.9],[531.1,508.0,530.0,509.0],[534.3,508.0,536.0,509.0],[537.2,508.0,536.0,509.0],[538.7,508.0,539.3,510.0],[542.0,509.6,541.6,510.0],[542.4,510.0,542.0,509.6],[544.8,508.0,545.1,510.0],[547.2,508.0,546.9,510.0],[374.6,510.0,374.7,512.0],[377.4,510.0,377.3,512.0],[382.5,510.0,384.0,511.6],[386.0,510.6,384.0,511.6],[388.0,510.5,386.0,510.6],[390.0,511.4,388.0,510.5],[391.3,510.0,390.0,511.4],[419.0,510.0,418.9,512.0],[420.9,510.0,421.2,512.0],[426.7,510.0,427.4,512.0],[429.3,510.0,428.6,512.0],[434.5,510.0,434.5,512.0],[437.5,510.0,437.4,512.0],[442.6,510.0,442.6,512.0],[445.6,510.0,445.4,512.0],[450.5,510.0,450.8,512.0],[455.2,510.0,454.9,512.0],[461.1,510.0,460.9,512.0],[463.0,510.0,463.2,512.0],[466.7,510.0,466.9,512.0],[469.2,510.0,469.1,512.0],[474.7,510.0,474.9,512.0],[478.0,510.8,477.1,512.0],[480.0,510.9,478.0,510.8],[482.0,511.1,480.0,510.9],[482.8,512.0,482.0,511.1],[486.0,511.0,485.2,512.0],[488.0,511.2,486.0,511.0],[490.0,511.3,488.0,511.2],[491.6,512.0,490.0,511.3],[494.0,511.2,492.5,512.0],[496.0,511.3,494.0,511.2],[496.9,512.0,496.0,511.3],[500.0,511.2,499.1,512.0],[502.0,511.2,500.0,511.2],[504.0,511.6,502.0,511.2],[505.8,512.0,504.0,511.6],[508.0,511.4,506.2,512.0],[510.0,511.3,508.0,511.4],[510.8,512.0,510.0,511.3],[514.0,511.2,513.2,512.0],[516.0,511.2,514.0,511.2],[517.5,512.0,516.0,511.2],[522.0,511.3,520.9,512.0],[524.0,511.1,522.0,511.3],[524.8,512.0,524.0,511.1],[528.0,511.1,527.1,512.0],[530.0,511.0,528.0,511.1],[532.0,511.2,530.0,511.0],[532.5,512.0,532.0,511.2],[536.0,510.9,535.5,512.0],[538.0,511.2,536.0,510.9],[539.3,510.0,540.0,511.1],[539.1,512.0,538.0,511.2],[541.6,510.0,540.0,511.1],[542.4,510.0,542.3,512.0],[545.1,510.0,545.2,512.0],[546.9,510.0,546.8,512.0],[374.7,512.0,374.9,514.0],[377.3,512.0,377.0,514.0],[384.0,513.1,383.7,514.0],[384.3,514.0,384.0,513.1],[404.0,512.6,403.2,514.0],[404.8,514.0,404.0,512.6],[418.9,512.0,418.8,514.0],[421.2,512.0,421.3,514.0],[427.4,512.0,428.0,512.7],[428.6,512.0,428.0,512.7],[434.5,512.0,434.6,514.0],[437.4,512.0,437.3,514.0],[442.6,512.0,442.6,514.0],[445.4,512.0,445.2,514.0],[450.8,512.0,450.6,514.0],[454.9,512.0,454.5,514.0],[460.9,512.0,460.8,514.0],[463.2,512.0,463.3,514.0],[466.9,512.0,467.5,514.0],[469.1,512.0,468.5,514.0],[474.9,512.0,474.8,514.0],[477.1,512.0,477.1,514.0],[482.8,512.0,482.9,514.0],[485.2,512.0,485.1,514.0],[491.6,512.0,491.3,514.0],[492.5,512.0,492.7,514.0],[496.9,512.0,497.0,514.0],[499.1,512.0,499.0,514.0],[505.8,512.0,505.6,514.0],[506.2,512.0,506.5,514.0],[510.8,512.0,510.8,514.0],[513.2,512.0,513.1,514.0],[517.5,512.0,518.0,512.9],[518.5,514.0,518.0,512.9],[520.9,512.0,521.3,514.0],[524.8,512.0,525.1,514.0],[527.1,512.0,527.1,514.0],[532.5,512.0,532.5,514.0],[535.5,512.0,535.5,514.0],[539.1,512.0,539.2,514.0],[542.3,512.0,542.5,514.0],[545.2,512.0,545.5,514.0],[546.8,512.0,548.0,513.2],[549.1,514.0,548.0,513.2],[374.9,514.0,375.1,516.0],[377.0,514.0,376.7,516.0],[383.7,514.0,383.3,516.0],[384.3,514.0,384.8,516.0],[403.2,514.0,402.8,516.0],[404.8,514.0,405.3,516.0],[410.0,515.1,409.7,516.0],[410.3,516.0,410.0,515.1],[418.8,514.0,418.6,516.0],[421.3,514.0,421.3,516.0],[434.6,514.0,435.1,516.0],[437.3,514.0,436.9,516.0],[442.6,514.0,442.8,516.0],[445.2,514.0,445.2,516.0],[450.6,514.0,450.5,516.0],[454.0,514.9,453.7,516.0],[454.5,514.0,454.0,514.9],[460.8,514.0,460.7,516.0],[463.3,514.0,463.3,516.0],[467.5,514.0,468.0,514.8],[468.5,514.0,468.0,514.8],[474.8,514.0,474.7,516.0],[477.1,514.0,477.2,516.0],[482.9,514.0,482.9,516.0],[485.1,514.0,485.0,516.0],[491.3,514.0,490.9,516.0],[492.7,514.0,493.1,516.0],[497.0,514.0,497.2,516.0],[499.0,514.0,498.8,516.0],[505.6,514.0,505.5,516.0],[506.5,514.0,506.5,516.0],[510.8,514.0,510.8,516.0],[513.1,514.0,513.2,516.0],[518.5,514.0,518.6,516.0],[521.3,514.0,521.6,516.0],[525.1,514.0,524.7,516.0],[527.1,514.0,528.0,514.8],[529.7,516.0,528.0,514.8],[532.5,514.0,532.1,516.0],[535.5,514.0,535.9,516.0],[539.2,514.0,538.2,516.0],[542.0,514.9,541.7,516.0],[542.5,514.0,544.0,516.0],[543.9,516.0,542.0,514.9],[545.5,514.0,544.0,516.0],[548.0,514.9,547.2,516.0],[549.1,514.0,548.0,514.9],[370.0,516.7,368.7,518.0],[371.9,518.0,370.0,516.7],[374.0,516.9,372.2,518.0],[375.1,516.0,374.0,516.9],[376.7,516.0,376.3,518.0],[383.3,516.0,382.9,518.0],[384.8,516.0,385.1,518.0],[402.8,516.0,402.5,518.0],[405.3,516.0,405.5,518.0],[409.7,516.0,409.2,518.0],[410.3,516.0,410.8,518.0],[418.6,516.0,418.4,518.0],[421.3,516.0,421.3,518.0],[430.0,516.7,429.4,518.0],[430.7,518.0,430.0,516.7],[435.1,516.0,436.0,517.5],[436.9,516.0,436.0,517.5],[442.8,516.0,443.0,518.0],[445.2,516.0,445.1,518.0],[450.5,516.0,450.6,518.0],[453.7,516.0,453.3,518.0],[460.7,516.0,460.6,518.0],[463.3,516.0,463.3,518.0],[474.7,516.0,474.9,518.0],[477.2,516.0,478.0,516.7],[480.0,516.7,478.0,516.7],[482.0,516.7,480.0,516.7],[482.9,516.0,482.0,516.7],[485.0,516.0,486.0,516.7],[488.0,516.8,486.0,516.7],[490.0,516.8,488.0,516.8],[490.9,516.0,490.0,516.8],[493.1,516.0,494.0,516.9],[496.0,517.1,494.0,516.9],[497.2,516.0,496.0,517.1],[498.8,516.0,500.0,517.7],[501.1,518.0,500.0,517.7],[505.5,516.0,504.4,518.0],[506.5,516.0,507.4,518.0],[510.8,516.0,510.9,518.0],[513.2,516.0,513.4,518.0],[518.6,516.0,518.4,518.0],[521.6,516.0,521.6,518.0],[524.7,516.0,526.0,517.4],[527.4,518.0,526.0,517.4],[529.7,516.0,528.4,518.0],[532.1,516.0,532.5,518.0],[535.9,516.0,535.4,518.0],[538.2,516.0,539.1,518.0],[541.7,516.0,542.0,516.6],[543.9,516.0,544.0,516.2],[543.5,518.0,542.0,516.6],[546.0,517.5,544.0,516.2],[547.2,516.0,548.0,517.9],[547.7,518.0,546.0,517.5],[548.2,518.0,548.0,517.9],[364.0,518.8,362.9,520.0],[365.8,520.0,364.0,518.8],[368.0,518.6,366.1,520.0],[368.7,518.0,370.0,519.3],[369.4,520.0,368.0,518.6],[371.9,518.0,370.0,519.3],[372.2,518.0,374.0,519.1],[374.4,520.0,374.0,519.1],[376.3,518.0,378.0,518.6],[380.0,518.9,378.0,518.6],[380.9,520.0,380.0,518.9],[382.9,518.0,382.8,520.0],[385.1,518.0,385.2,520.0],[392.0,518.6,390.8,520.0],[393.8,520.0,392.0,518.6],[402.5,518.0,402.5,520.0],[405.5,518.0,405.4,520.0],[409.2,518.0,409.0,520.0],[410.8,518.0,411.0,520.0],[418.4,518.0,418.2,520.0],[421.3,518.0,421.1,520.0],[429.4,518.0,428.8,520.0],[430.7,518.0,431.2,520.0],[443.0,518.0,443.4,520.0],[445.1,518.0,445.2,520.0],[450.6,518.0,450.9,520.0],[453.3,518.0,453.0,520.0],[460.6,518.0,460.7,520.0],[463.3,518.0,463.3,520.0],[470.0,519.2,469.7,520.0],[470.3,520.0,470.0,519.2],[474.9,518.0,475.3,520.0],[478.0,519.6,476.9,520.0],[480.0,519.4,478.0,519.6],[482.0,519.3,480.0,519.4],[484.0,519.4,482.0,519.3],[485.5,520.0,484.0,519.4],[488.0,519.2,486.5,520.0],[490.0,519.3,488.0,519.2],[492.0,519.4,490.0,519.3],[494.0,519.1,492.0,519.4],[496.0,518.9,494.0,519.1],[498.0,519.6,496.0,518.9],[500.0,518.7,498.0,519.6],[501.1,518.0,500.0,518.7],[504.4,518.0,505.4,520.0],[507.4,518.0,506.6,520.0],[510.9,518.0,511.9,520.0],[513.4,518.0,512.1,520.0],[518.4,518.0,518.5,520.0],[521.6,518.0,521.6,520.0],[527.4,518.0,527.1,520.0],[528.4,518.0,528.9,520.0],[532.5,518.0,532.6,520.0],[535.4,518.0,535.3,520.0],[539.1,518.0,539.0,520.0],[542.0,518.8,540.9,520.0],[543.5,518.0,542.0,518.8],[547.7,518.0,547.6,520.0],[548.2,518.0,548.4,520.0],[362.0,521.2,361.1,522.0],[362.9,520.0,364.0,521.2],[362.9,522.0,362.0,521.2],[365.8,520.0,366.0,520.1],[364.4,522.0,364.0,521.2],[366.1,520.0,366.0,520.1],[369.4,520.0,370.0,520.5],[371.8,522.0,370.0,520.5],[374.4,520.0,376.0,521.5],[377.0,522.0,376.0,521.5],[380.0,521.2,379.2,522.0],[380.9,520.0,382.0,520.5],[380.4,522.0,380.0,521.2],[382.8,520.0,384.0,521.1],[383.4,522.0,382.0,520.5],[385.2,520.0,384.0,521.1],[388.0,520.6,386.6,522.0],[389.8,522.0,388.0,520.6],[390.8,520.0,392.0,521.3],[393.8,520.0,392.0,521.3],[396.0,520.6,394.4,522.0],[397.5,522.0,396.0,520.6],[402.5,520.0,402.7,522.0],[405.4,520.0,405.1,522.0],[409.0,520.0,408.9,522.0],[411.0,520.0,411.1,522.0],[418.0,521.3,417.9,522.0],[418.2,520.0,418.0,521.3],[421.1,520.0,421.1,522.0],[428.8,520.0,428.5,522.0],[431.2,520.0,431.4,522.0],[438.0,520.1,437.1,522.0],[439.0,522.0,438.0,520.1],[443.4,520.0,444.0,520.4],[445.2,520.0,446.0,521.1],[445.8,522.0,444.0,520.4],[446.3,522.0,446.0,521.1],[450.9,520.0,452.0,521.9],[453.0,520.0,452.0,521.9],[456.0,520.1,455.2,522.0],[456.6,522.0,456.0,520.1],[460.7,520.0,461.0,522.0],[463.3,520.0,463.1,522.0],[469.7,520.0,469.4,522.0],[470.3,520.0,470.6,522.0],[475.3,520.0,476.0,521.2],[476.9,520.0,476.0,521.2],[485.5,520.0,485.1,522.0],[486.5,520.0,487.1,522.0],[505.4,520.0,505.2,522.0],[506.6,520.0,506.7,522.0],[511.9,520.0,512.0,520.1],[512.1,520.0,512.0,520.1],[518.5,520.0,518.5,522.0],[521.6,520.0,522.0,521.6],[524.0,521.1,522.0,521.6],[526.0,520.9,524.0,521.1],[527.1,520.0,526.0,520.9],[528.9,520.0,530.0,520.6],[532.0,520.7,530.0,520.6],[532.6,520.0,532.0,520.7],[535.3,520.0,536.0,520.5],[538.0,520.6,536.0,520.5],[539.0,520.0,538.0,520.6],[540.9,520.0,542.0,520.7],[544.0,520.7,542.0,520.7],[546.0,520.8,544.0,520.7],[547.6,520.0,546.0,520.8],[548.4,520.0,550.0,521.4],[550.9,522.0,550.0,521.4],[361.1,522.0,362.0,523.3],[362.9,522.0,364.0,522.5],[362.3,524.0,362.0,523.3],[364.4,522.0,366.0,523.6],[365.5,524.0,364.0,522.5],[368.0,522.8,366.0,523.6],[370.0,523.5,368.0,522.8],[371.8,522.0,372.0,522.5],[371.0,524.0,370.0,523.5],[373.0,524.0,372.0,522.5],[377.0,522.0,378.0,523.0],[379.2,522.0,378.0,523.0],[380.4,522.0,382.0,523.4],[383.4,522.0,384.0,522.9],[382.9,524.0,382.0,523.4],[386.0,523.4,384.0,522.9],[386.6,522.0,388.0,523.4],[386.6,524.0,386.0,523.4],[389.8,522.0,388.0,523.4],[394.4,522.0,396.0,523.4],[397.5,522.0,398.0,523.0],[397.2,524.0,396.0,523.4],[399.0,524.0,398.0,523.0],[402.7,522.0,403.0,524.0],[405.1,522.0,404.8,524.0],[408.9,522.0,409.0,524.0],[411.1,522.0,411.1,524.0],[417.9,522.0,418.0,522.2],[418.9,524.0,418.0,522.2],[421.1,522.0,421.1,524.0],[428.5,522.0,428.6,524.0],[431.4,522.0,431.3,524.0],[437.1,522.0,436.8,524.0],[439.0,522.0,439.3,524.0],[445.8,522.0,445.2,524.0],[446.3,522.0,447.0,524.0],[455.2,522.0,454.7,524.0],[456.6,522.0,457.0,524.0],[461.0,522.0,461.2,524.0],[463.1,522.0,463.0,524.0],[469.4,522.0,469.3,524.0],[470.6,522.0,470.7,524.0],[478.0,524.0,478.0,524.0],[478.0,524.0,478.0,524.0],[485.1,522.0,484.4,524.0],[487.1,522.0,488.0,523.0],[490.0,522.7,488.0,523.0],[492.0,522.6,490.0,522.7],[494.0,522.5,492.0,522.6],[496.0,522.5,494.0,522.5],[498.0,522.3,496.0,522.5],[500.0,522.2,498.0,522.3],[502.0,522.6,500.0,522.2],[504.0,522.6,502.0,522.6],[505.2,522.0,504.0,522.6],[506.7,522.0,508.0,522.6],[510.0,522.6,508.0,522.6],[512.0,522.3,510.0,522.6],[514.0,522.7,512.0,522.3],[516.0,523.1,514.0,522.7],[518.0,523.7,516.0,523.1],[518.5,522.0,518.0,523.7],[522.0,522.6,521.7,524.0],[524.0,522.8,522.0,522.6],[526.0,523.1,524.0,522.8],[528.0,523.7,526.0,523.1],[530.0,523.7,528.0,523.7],[531.4,524.0,530.0,523.7],[542.0,523.5,540.2,524.0],[544.0,523.3,542.0,523.5],[546.0,523.2,544.0,523.3],[548.0,523.1,546.0,523.2],[550.0,522.7,548.0,523.1],[550.9,522.0,550.0,522.7],[362.0,525.3,361.5,526.0],[362.3,524.0,364.0,525.5],[362.5,526.0,362.0,525.3],[365.5,524.0,364.0,525.5],[371.0,524.0,372.0,525.0],[373.0,524.0,372.0,525.0],[382.9,524.0,384.0,525.2],[384.7,526.0,384.0,525.2],[386.6,524.0,387.5,526.0],[397.2,524.0,398.0,524.9],[399.0,524.0,400.0,524.5],[398.7,526.0,398.0,524.9],[401.4,526.0,400.0,524.5],[403.0,524.0,404.0,526.0],[404.8,524.0,404.0,526.0],[409.0,524.0,409.0,526.0],[411.1,524.0,411.1,526.0],[418.9,524.0,419.4,526.0],[421.1,524.0,421.3,526.0],[424.0,525.8,423.4,526.0],[426.0,525.8,424.0,525.8],[426.2,526.0,426.0,525.8],[428.6,524.0,428.8,526.0],[431.3,524.0,431.1,526.0],[436.8,524.0,436.7,526.0],[439.3,524.0,439.3,526.0],[445.2,524.0,444.9,526.0],[447.0,524.0,447.5,526.0],[452.0,525.0,450.2,526.0],[454.0,524.5,452.0,525.0],[454.7,524.0,454.0,524.5],[457.0,524.0,458.0,524.8],[460.0,524.6,458.0,524.8],[461.2,524.0,460.0,524.6],[463.0,524.0,464.0,524.4],[466.0,524.6,464.0,524.4],[468.0,524.7,466.0,524.6],[469.3,524.0,468.0,524.7],[470.7,524.0,472.0,524.7],[474.0,524.8,472.0,524.7],[476.0,524.8,474.0,524.8],[478.0,524.0,476.0,524.8],[478.0,524.0,480.0,525.0],[482.0,525.1,480.0,525.0],[484.0,525.3,482.0,525.1],[484.4,524.0,486.0,525.9],[485.2,526.0,484.0,525.3],[488.0,525.6,486.0,525.9],[490.0,525.5,488.0,525.6],[492.0,525.4,490.0,525.5],[494.0,525.4,492.0,525.4],[496.0,525.4,494.0,525.4],[498.0,525.4,496.0,525.4],[500.0,525.3,498.0,525.4],[502.0,525.4,500.0,525.3],[504.0,525.8,502.0,525.4],[505.5,526.0,504.0,525.8],[520.0,525.9,519.5,526.0],[521.7,524.0,520.0,525.9],[531.4,524.0,532.0,524.3],[534.0,525.2,532.0,524.3],[536.0,525.0,534.0,525.2],[538.0,524.2,536.0,525.0],[540.0,524.1,538.0,524.2],[540.2,524.0,540.0,524.1],[361.5,526.0,361.1,528.0],[362.5,526.0,362.8,528.0],[384.7,526.0,384.8,528.0],[387.5,526.0,387.4,528.0],[398.7,526.0,398.7,528.0],[401.4,526.0,401.3,528.0],[404.0,526.0,404.0,526.0],[404.0,526.0,404.0,526.0],[409.0,526.0,408.7,528.0],[411.1,526.0,412.0,527.5],[414.0,527.0,412.0,527.5],[416.0,526.7,414.0,527.0],[418.0,526.6,416.0,526.7],[419.4,526.0,418.0,526.6],[421.3,526.0,422.0,526.2],[423.4,526.0,422.0,526.2],[426.2,526.0,428.0,526.4],[428.8,526.0,428.0,526.4],[431.1,526.0,432.0,526.6],[434.0,526.6,432.0,526.6],[436.0,526.7,434.0,526.6],[436.7,526.0,436.0,526.7],[439.3,526.0,440.0,526.8],[442.0,526.9,440.0,526.8],[444.0,526.9,442.0,526.9],[444.9,526.0,444.0,526.9],[447.5,526.0,448.0,526.7],[450.0,526.2,448.0,526.7],[450.2,526.0,452.0,527.2],[451.1,528.0,450.0,526.2],[454.0,527.3,452.0,527.2],[456.0,527.4,454.0,527.3],[458.0,527.2,456.0,527.4],[460.0,527.2,458.0,527.2],[462.0,527.4,460.0,527.2],[464.0,527.4,462.0,527.4],[466.0,527.3,464.0,527.4],[468.0,527.3,466.0,527.3],[470.0,527.4,468.0,527.3],[472.0,527.3,470.0,527.4],[474.0,527.3,472.0,527.3],[476.0,527.3,474.0,527.3],[478.0,527.2,476.0,527.3],[480.0,527.0,478.0,527.2],[482.0,526.8,480.0,527.0],[484.0,526.5,482.0,526.8],[485.2,526.0,484.0,526.5],[500.0,526.7,498.6,528.0],[501.9,528.0,500.0,526.7],[505.5,526.0,506.0,526.2],[508.0,526.8,506.0,526.2],[510.0,526.7,508.0,526.8],[512.0,526.8,510.0,526.7],[514.0,526.8,512.0,526.8],[516.0,526.6,514.0,526.8],[518.0,526.5,516.0,526.6],[519.5,526.0,518.0,526.5],[361.1,528.0,361.3,530.0],[362.8,528.0,362.7,530.0],[374.0,528.6,372.6,530.0],[375.9,530.0,374.0,528.6],[378.0,529.4,376.4,530.0],[380.0,529.0,378.0,529.4],[382.0,528.8,380.0,529.0],[384.0,528.7,382.0,528.8],[384.8,528.0,384.0,528.7],[387.4,528.0,388.0,528.5],[390.0,528.6,388.0,528.5],[392.0,528.6,390.0,528.6],[394.0,528.7,392.0,528.6],[396.0,528.8,394.0,528.7],[398.0,528.9,396.0,528.8],[398.7,528.0,398.0,528.9],[401.3,528.0,402.0,529.1],[404.0,529.2,402.0,529.1],[406.0,529.0,404.0,529.2],[408.0,529.6,406.0,529.0],[408.7,528.0,410.0,529.8],[409.3,530.0,408.0,529.6],[411.0,530.0,410.0,529.8],[414.0,529.6,412.7,530.0],[416.0,529.4,414.0,529.6],[418.0,529.3,416.0,529.4],[420.0,529.3,418.0,529.3],[422.0,529.4,420.0,529.3],[424.0,529.4,422.0,529.4],[426.0,529.4,424.0,529.4],[428.0,529.5,426.0,529.4],[430.0,529.5,428.0,529.5],[432.0,529.5,430.0,529.5],[434.0,529.4,432.0,529.5],[436.0,529.4,434.0,529.4],[438.0,529.2,436.0,529.4],[440.0,529.2,438.0,529.2],[442.0,529.2,440.0,529.2],[444.0,529.1,442.0,529.2],[446.0,529.0,444.0,529.1],[448.0,528.9,446.0,529.0],[450.0,528.7,448.0,528.9],[451.1,528.0,450.0,528.7],[458.0,529.8,456.9,530.0],[460.0,529.5,458.0,529.8],[462.0,529.3,460.0,529.5],[464.0,529.2,462.0,529.3],[466.0,529.1,464.0,529.2],[468.0,529.1,466.0,529.1],[470.0,529.1,468.0,529.1],[472.0,529.2,470.0,529.1],[474.0,529.4,472.0,529.2],[476.0,529.9,474.0,529.4],[476.1,530.0,476.0,529.9],[498.6,528.0,500.0,529.5],[501.9,528.0,502.0,529.2],[501.9,530.0,500.0,529.5],[504.0,529.4,502.0,529.2],[506.0,529.4,504.0,529.4],[508.0,529.4,506.0,529.4],[510.0,529.5,508.0,529.4],[512.0,529.5,510.0,529.5],[514.0,529.4,512.0,529.5],[516.0,529.3,514.0,529.4],[518.0,529.3,516.0,529.3],[520.0,529.2,518.0,529.3],[522.0,529.1,520.0,529.2],[524.0,529.1,522.0,529.1],[526.0,529.1,524.0,529.1],[528.0,529.0,526.0,529.1],[530.0,529.0,528.0,529.0],[532.0,529.0,530.0,529.0],[534.0,529.1,532.0,529.0],[536.0,529.2,534.0,529.1],[538.0,529.3,536.0,529.2],[540.0,529.4,538.0,529.3],[542.0,529.6,540.0,529.4],[544.0,529.8,542.0,529.6],[545.6,530.0,544.0,529.8],[361.3,530.0,362.0,530.8],[362.7,530.0,364.0,530.7],[362.5,532.0,362.0,530.8],[366.0,530.9,364.0,530.7],[368.0,531.0,366.0,530.9],[370.0,531.2,368.0,531.0],[372.0,531.4,370.0,531.2],[372.6,530.0,374.0,531.8],[373.3,532.0,372.0,531.4],[375.9,530.0,374.0,531.8],[376.4,530.0,378.0,531.1],[380.0,531.2,378.0,531.1],[382.0,531.2,380.0,531.2],[384.0,531.3,382.0,531.2],[386.0,531.4,384.0,531.3],[388.0,531.3,386.0,531.4],[390.0,531.3,388.0,531.3],[392.0,531.4,390.0,531.3],[394.0,531.3,392.0,531.4],[396.0,531.2,394.0,531.3],[398.0,531.2,396.0,531.2],[400.0,531.1,398.0,531.2],[402.0,531.0,400.0,531.1],[404.0,530.9,402.0,531.0],[406.0,530.7,404.0,530.9],[408.0,530.3,406.0,530.7],[409.3,530.0,408.0,530.3],[411.0,530.0,412.0,530.2],[412.7,530.0,412.0,530.2],[418.0,531.7,416.4,532.0],[420.0,531.5,418.0,531.7],[422.0,531.3,420.0,531.5],[424.0,531.1,422.0,531.3],[426.0,531.0,424.0,531.1],[428.0,531.0,426.0,531.0],[430.0,531.2,428.0,531.0],[431.2,532.0,430.0,531.2],[456.9,530.0,458.0,530.3],[460.0,530.6,458.0,530.3],[462.0,530.7,460.0,530.6],[464.0,530.9,462.0,530.7],[466.0,530.9,464.0,530.9],[468.0,531.0,466.0,530.9],[470.0,530.9,468.0,531.0],[472.0,530.8,470.0,530.9],[474.0,530.6,472.0,530.8],[476.0,530.1,474.0,530.6],[476.1,530.0,476.0,530.1],[480.0,532.0,480.0,532.0],[482.0,531.8,480.0,532.0],[484.0,531.2,482.0,531.8],[485.2,532.0,484.0,531.2],[501.9,530.0,502.0,530.1],[504.0,530.5,502.0,530.1],[506.0,530.5,504.0,530.5],[508.0,530.6,506.0,530.5],[510.0,530.5,508.0,530.6],[512.0,530.6,510.0,530.5],[514.0,530.6,512.0,530.6],[516.0,530.7,514.0,530.6],[518.0,530.8,516.0,530.7],[520.0,530.8,518.0,530.8],[522.0,530.9,520.0,530.8],[524.0,530.9,522.0,530.9],[526.0,530.9,524.0,530.9],[528.0,531.0,526.0,530.9],[530.0,531.0,528.0,531.0],[532.0,530.9,530.0,531.0],[534.0,530.9,532.0,530.9],[536.0,530.7,534.0,530.9],[538.0,530.6,536.0,530.7],[540.0,530.6,538.0,530.6],[542.0,530.5,540.0,530.6],[544.0,530.2,542.0,530.5],[545.6,530.0,544.0,530.2],[362.5,532.0,364.0,533.2],[366.0,533.1,364.0,533.2],[368.0,533.0,366.0,533.1],[370.0,532.9,368.0,533.0],[372.0,532.7,370.0,532.9],[373.3,532.0,372.0,532.7],[416.4,532.0,418.0,532.3],[420.0,532.5,418.0,532.3],[422.0,532.8,420.0,532.5],[424.0,532.9,422.0,532.8],[426.0,533.0,424.0,532.9],[428.0,533.0,426.0,533.0],[430.0,532.9,428.0,533.0],[431.2,532.0,430.0,532.9],[434.0,533.5,432.8,534.0],[436.0,532.8,434.0,533.5],[437.5,534.0,436.0,532.8],[480.0,532.0,480.0,532.0],[482.0,532.2,480.0,532.0],[484.0,532.7,482.0,532.2],[485.2,532.0,484.0,532.7],[432.8,534.0,434.0,534.6],[436.0,535.1,434.0,534.6],[437.5,534.0,438.0,534.3],[436.6,536.0,436.0,535.1],[439.5,536.0,438.0,534.3],[434.0,536.9,432.4,538.0],[436.0,536.9,434.0,536.9],[436.6,536.0,436.0,536.9],[439.5,536.0,438.8,538.0],[422.0,539.9,421.9,540.0],[424.0,539.1,422.0,539.9],[426.0,538.9,424.0,539.1],[428.0,538.9,426.0,538.9],[430.0,539.1,428.0,538.9],[432.0,539.8,430.0,539.1],[432.4,538.0,434.0,539.0],[432.0,540.0,432.0,539.8],[436.0,539.1,434.0,539.0],[438.0,538.9,436.0,539.1],[438.8,538.0,438.0,538.9],[412.0,541.9,411.5,542.0],[414.0,541.6,412.0,541.9],[416.0,541.4,414.0,541.6],[418.0,541.4,416.0,541.4],[420.0,541.9,418.0,541.4],[421.9,540.0,422.0,540.1],[420.1,542.0,420.0,541.9],[424.0,540.9,422.0,540.1],[426.0,541.1,424.0,540.9],[428.0,541.1,426.0,541.1],[430.0,541.0,428.0,541.1],[432.0,540.1,430.0,541.0],[432.0,540.0,432.0,540.1],[411.5,542.0,412.0,542.1],[414.0,542.3,412.0,542.1],[416.0,542.7,414.0,542.3],[418.0,542.7,416.0,542.7],[420.0,542.1,418.0,542.7],[420.1,542.0,420.0,542.1]];
    for(const [x1,y1,x2,y2] of storefront){
      line(print((x1-455)*.0018,.78-(y1-425)*.0018),print((x2-455)*.0018,.78-(y2-425)*.0018));
    }
  });
}
function servingTray(){
  pose(21.44,2.72,-.12,()=>{
    function oval(x,y,z,rx,rz){
      return Array.from({length:49},(_,i)=>{const a=i*Math.PI/24;return [x+rx*Math.cos(a),y,z+rz*Math.sin(a)];});
    }
    function rounded(y,w,d,r){
      const p=[];
      for(const [sx,sz,offset] of [[1,1,0],[-1,1,90],[-1,-1,180],[1,-1,270]]){
        for(let j=0;j<=8;j++){const a=(offset+90*j/8)*Math.PI/180;p.push([sx*(w/2-r)+r*Math.cos(a),y,sz*(d/2-r)+r*Math.sin(a)]);}
      }
      return [...p,p[0]];
    }
    const lower=rounded(.772,1.03,.66,.069),rim=rounded(.809,1.07,.70,.082),well=rounded(.79,.997,.626,.058);
    strip(lower,rim);strip(rim,well);poly(well.slice(0,-1),false);contour(lower);contour(rim);contour(well);
    const foot=oval(-.085,.791,.02,.197,.197),edge=oval(-.085,.827,.02,.253,.253),bowl=oval(-.085,.804,.02,.181,.181);
    strip(foot,edge);strip(edge,bowl);poly(bowl.slice(0,-1),false);contour(edge);contour(bowl);
    for(const [x,z,r] of [[-.155,-.044,.055],[-.049,-.050,.063],[-.111,.063,.061],[.009,.05,.05]]){
      const tiers=Array.from({length:7},(_,i)=>{const angle=.19+i*.22;return oval(x,.806+r*Math.sin(angle),z,r*Math.cos(angle),r*.94*Math.cos(angle));});
      for(let i=1;i<tiers.length;i++)strip(tiers[i-1],tiers[i]);poly(tiers.at(-1).slice(0,-1),false);
      // A single gently domed outline reads better than a stack of latitude rings.
      const arch=Array.from({length:21},(_,i)=>{const a=i*Math.PI/20;return [x+r*Math.cos(a),.808+r*Math.sin(a),z];});
      contour(arch);contour(tiers[0]);
    }
    const glassBase=oval(.333,.792,-.172,.064,.064),glassRim=oval(.333,1.012,-.172,.084,.084);
    contour(glassBase);contour(glassRim);contour(oval(.333,1.01,-.172,.079,.079));
    strip(glassBase,glassRim);
    for(const i of [0,24])line(glassBase[i],glassRim[i]);
    box(.273,.792,.12,.021,.011,.203);box(.273,.796,-.002,.048,.012,.042);
    for(let j=0;j<4;j++)box(.253+j*.013,.796,-.054,.006,.012,.07);
  });
}

function build(){
  // Orthogonal approximation traced from the upper wall rims in map.png.
  function chain(points){for(let i=1;i<points.length;i++)wall(...points[i-1],...points[i]);}
  height=CEIL;
  chain([[0,18],[0,0],[1.4,0],[1.4,2.4],[5.15,2.4],[5.15,-1.1],[10.55,-1.1],[10.55,-7.4],[14.85,-7.4],[14.85,-5.6],[17,-5.6],[17,-4.65],[22.55,-4.65],[22.55,-2.25],[26.9,-2.25],[26.9,4.85]]); chain([[26.9,6.25],[26.9,7.05],[27.45,7.05],[27.45,16.9],[21.4,16.9],[21.4,18.15],[12.45,18.15]]);
  wall(0,18,10.05,18);
  header(10.05,18.08,12.45,18.08);
  height=3.0;
  // Rear display bay, central bedroom and the smaller study in front of it.
  chain([[4.85,6.8],[4.85,5.1],[7.85,5.1]]);
  wall(11.5,.8,11.5,3.70);header(11.5,3.70,11.5,5.74);wall(11.5,5.74,11.5,7.25);
  wall(11.5,7.25,13.7,7.25);
  wall(13.7,6.25,14.35,6.25);
  chain([[16.8,6.25],[18.15,6.25],[18.15,3.65]]);
  header(13.7,3.94,13.7,5.98);chain([[13.7,3.94],[13.7,-.4],[17.9,-.4]]);
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
  height=CEIL;wall(21.4,15.25,21.4,18.15);height=3.0;
  // 앞쪽 통창 쪽 카페 테이블
  for(const x of [13.6,15.45,17.3,19.15,20.55]){
    place(table,x,16.42,.94,.64);place(chair,x,17.15);
  }
  // Open lounge on the left, with freestanding displays rather than a dividing wall.
  hero(fluffySofa,5.7,11.55,3.1);place(rug,5.7,12.2,4.1,2.5);
       place(table,3.97,12.45,.67,.63,.44);
       box(5.7,0,9.42,5.5,3.0,.098);
       if(MOCK==='hejB'){hejSign(5.7,1.45,9.55,0,.86,.12);}else if(MOCK==='hejF'){hejFlat(5.7,1.45,9.475,.86);}
       else if(MOCK==='hejX'){wallGraphic([2.95,.02,8.45,2.98],9.476,[{ox:3.18,oy:.35,size:2.25}]);}
       else if(MOCK==='hejP'){const it=[];for(let r=0;r<7;r++)for(let c=-1;c<5;c++)it.push({ox:2.95+c*1.45+(r%2)*.72,oy:.12+r*.42,size:.2});wallGraphic([2.95,.02,8.45,2.98],9.476,it);}
       else{for(const x of [3.67,4.92,6.18,7.43])box(x,.68,9.49,.032,2.01,.026);
       for(const y of [.68,2.67])box(5.55,y,9.49,3.79,.032,.026);}
       place(plant,7.76,10.01,.98);
  place(lamp,3.84,11.15,1.50);
  place(table,2.65,11.8,.95,1.8,.5);place(shelves,6.3,5.53,2.6,1.55);
  place(shelves,3.38,2.75,2.75);place(table,3.7,7.1,.96,1.66,.52);
  hero(plywoodChair); // IKEA PS 컬렉션 의자(원본 모델 그대로)
       box(7.32,0,-.78,3.4,.55,.43);
       for(const y of [1.06,1.83])box(7.32,y,-.88,3.2,.032,.27);
       place(plant,5.50,.30,.82);

  place(slidingDoor);hero(()=>pose(15.94,2.40,Math.PI/2,()=>bed(0,0)));place(shelves,15.7,.0,2.8,1.82);place(table,14.67,4.04,.56,.55,.49);
       place(emph(cylinder),14.67,.49,4.04,.13,.13,.027);
       place(emph(cylinder),14.67,.517,4.04,.015,.015,.36);
       place(emph(cylinder),14.67,.855,4.04,.225,.115,.20);
  place(table,15.8,9.77,1.85,.87);place(chair,15.8,10.56);place(shelves,15.85,7.57,2.64,1.92);
  // The reference shows a daybed and a tall reading light in the front-right room.
  {const h=typeof location!=='undefined'?location.hash:'',r2=(/rack(A[1-4])/.exec(h)||[])[1]||(/rack[A-D]/.test(h)?null:'A2'),rk=(/rack([A-D])(?![1-4])/.exec(h)||[])[1];if(r2)hero(()=>pose(23.38,11.57,.15,RACKS2[r2]));else if(rk)hero(()=>rackMock(rk));else hero(loungeRack);}
       place(fluffySofa,24.51,9.85,2.6);
       place(lamp,26.08,10.01,1.58);place(table,25.98,10.84,.63,.53,.48);place(plant,26.46,15.36,1.15);
place(table,21.66,2.53,2.68,1.17,.77);
  for(const dx of [-.89,.10,1.03])place(chair,21.66+dx,1.58,-1);hero(servingTray);
  place(emph(cylinder),21.66,2.36,2.53,.41,.14,.28);line([21.66,2.64,2.53],[21.66,CEIL-.86,2.53],.5);
  // Short wing walls at the open living and dining bays retain the open plan.
  wall(3.5,15.55,4.45,15.55);wall(6.95,15.55,8.32,15.55);
  wall(10.04,5.1,10.56,5.1);
  wall(18.18,7.15,18.60,7.15);
  doorways.forEach(caseOpening);
  height=CEIL;header(26.9,4.85,26.9,6.25);
  chain([[26.9,4.55],[29.45,4.55],[29.45,4.75]]);chain([[29.45,6.35],[29.45,16.9],[29.25,16.9]]);
  wall(27.45,16.9,27.65,16.9);height=3.0;
  furnish();
  pose(29.45,5.55,Math.PI/2,buildExit);
  revealLayer();
  if(MOCK==='hejS'){hejSculpture(5.9,3.6,8.3,0,1.1,.14);}
  if(MOCK==='hejW'){hejSign(.1,3.55,12.2,Math.PI/2,1.5,.2);}
  if(MOCK==='hejA'){hejSign(9.0,2.35,16.0,-.32,.82,.15);for(const u of [-1.0,1.0]){const c=Math.cos(-.32),sn=Math.sin(-.32);line([9.0+u*c,3.17,16.0-u*sn],[9.0+u*c,CEIL-.86,16.0-u*sn],.5);}}
}
const entryDoor={x:11.25,z:18.08,width:2.4}; const exitDoor={x:28.45,z:16.9,width:1.6};
function buildExit(){
  const x=0,z=0,width=1.6,left=-width/2,right=width/2;
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
// 조명은 대표 가구와 같은 위계로 선을 또렷하게(tone 2.8 → 대표 가구 밝기)
function emph(fn){return function(...args){const ei=edges.length,si=silEdges.length;fn(...args);for(let i=ei;i<edges.length;i++)edges[i][2]=2.8;for(let i=si;i<silEdges.length;i++)silEdges[i][6]=2.8;};}
lamp=emph(lamp);spot=emph(spot);fluffySofa=emph(fluffySofa);hejSculpture=emph(hejSculpture);tableLamp=emph(tableLamp);pendantDome=emph(pendantDome);pendantDrum=emph(pendantDrum);
build();
