const $=s=>document.getElementById(s);
const rooms=[
  {id:'about',name:'About',ko:'거실',text:'왼쪽 거실에서 탐색을 시작합니다. 소파와 낮은 테이블 너머로 안쪽 전시 공간이 이어집니다.',items:['소파와 플로어 램프가 놓인 휴식 공간','창가를 따라 이어지는 작은 좌석들']},
  {id:'ikea-ps',name:'IKEA PS',ko:'컬렉션 전시실',page:'./src/sections/collection/collection.html',text:'거실 뒤편의 전시실입니다. 선반 앞에는 휜 합판으로 좌석과 등받이를 연결한 의자가 놓여 있습니다.',items:['벽면을 따라 놓인 오픈 선반','낮은 전시대 위의 의자와 조명']},
  {id:'3d-room',name:'3D room',ko:'침실',text:'중앙 통로에서 안쪽으로 들어온 침실입니다. 반쯤 열린 미닫이문 사이로 침대와 협탁이 보입니다.',items:['낮은 침대와 패브릭 침구','침대 옆 협탁과 조명']},
  {id:'store-family',name:'Store & Family',ko:'패밀리 라운지',text:'도면 오른쪽 앞에 자리한 라운지입니다. 좌석 옆 랙에는 이케아 매장을 그린 매거진이 꽂혀 있고, 옆 출입구를 지나면 다이닝으로 이어지는 복도에 닿습니다.',items:['매장 안내와 IKEA Family를 담은 매거진','라운지 좌석 옆의 독서등']},
  {id:'restaurant',name:'Restaurant',ko:'키친 & 다이닝',page:'./src/sections/food/restaurant.html',text:'오른쪽 뒤편의 식탁과 주방입니다. 의자 사이와 조리대 앞을 오가며 식탁 위 펜던트와 벽면 수납장을 다른 각도로 볼 수 있습니다.',items:['여섯 자리가 있는 긴 식탁','벽면 조리대와 상부 수납장']}
];
const world=$('world'),scene=document.querySelector('.scene'),caption=document.querySelector('.caption');
const dialog=$('detail'),render=makeRenderer(world),doors=$('doors'),opening=$('opening');
const guides=$('guides'),pick=makePicker();
let pointer=null;
function clearPointer(){pointer=null;guides.hidden=true;schedule();}
document.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch'){if(pointer)clearPointer();return;}
  pointer={x:e.clientX,y:e.clientY};schedule();
},{passive:true});
document.addEventListener('pointerout',e=>{if(!e.relatedTarget)clearPointer();});
document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')clearPointer();},{passive:true});
window.addEventListener('blur',clearPointer);
function paintScene(cam){
  let selected=0,show=false;
  if(pointer){
    const rect=world.getBoundingClientRect(),x=pointer.x-rect.left,y=pointer.y-rect.top;
    const target=document.elementFromPoint(pointer.x,pointer.y);
    show=x>=0&&x<rect.width&&y>=0&&y<rect.height&&target&&
      (target===world||target===opening||target===dialog||target===scene);
    if(show){
      if(detailIndex<0&&!approach&&!busy)selected=pick(cam,x,y,rect.width,rect.height);
      guides.style.setProperty('--x',x+'px');guides.style.setProperty('--y',y+'px');
    }
  }
  if(selected!==heroIds[index])selected=0;
  guides.hidden=!show;scene.toggleAttribute('data-object-hover',selected>0);

  render(cam,dark,selected);
}
function project(x,y,z,c){
  const dx=x-c.x,dz=z-c.z,depth=dx*Math.sin(c.yaw)-dz*Math.cos(c.yaw),up=y-1.57;
  const dist=depth*Math.cos(c.pitch)+up*Math.sin(c.pitch);
  if(dist<.12)return null;
  const w=world.clientWidth,h=world.clientHeight,k=h*(w/h<1?1.22:1.53)/2;
  return [(w/2+(dx*Math.cos(c.yaw)+dz*Math.sin(c.yaw))*k/dist),(h/2-(up*Math.cos(c.pitch)-depth*Math.sin(c.pitch))*k/dist)];
}
function showDoor(i,c){
  doors.style.visibility='hidden';if(i>=rooms.length||detailIndex>=0)return;
  const d=doorways[i],outside=(d.x-c.x)*d.nx+(d.z-c.z)*d.nz;
  if(Math.abs(outside)<.12||Math.abs(outside)>5.5||Math.abs((d.x-c.x)*d.nz-(d.z-c.z)*d.nx)>1.5)return;
  const points=[[-.5,0],[.5,0],[.5,2.82],[-.5,2.82]].map(([s,y])=>project(d.x-d.nz*s*d.width,y,d.z+d.nx*s*d.width,c));
  if(points.some(v=>!v))return;
  opening.setAttribute('points',points.map(v=>v.join(',')).join(' '));doors.style.visibility='visible';
}
const folios=[
  ['About','IKEA','Ingvar\nKamprad\nElmtaryd\nAgunnaryd'],
  ['IKEA','PS','컬렉션 전시실'],
  ['3D','room','침실'],
  ['Store','& Family','패밀리 라운지'],
  ['Restaurant','','키친 & 다이닝']
];
const aboutSpreads=[
  ['ONE BRAND\nMANY COMPANIES\nAND MANY, MANY PEOPLE','하나의 브랜드, 여러 회사, 그리고 수많은 사람들.'],
  ['TO CREATE A BETTER\nEVERYDAY LIFE\nFOR THE MANY PEOPLE','많은 사람들을 위한 더 나은 일상을 만듭니다.'],
  ['DEMOCRATIC\nDESIGN','형태, 기능, 품질, 지속가능성, 낮은 가격을 함께 생각합니다.'],
  ['SUSTAINABILITY','제품을 더 오래 사용할 수 있도록, 수명까지 고려해 설계합니다.'],
  ['FOR THE\nMANY PEOPLE','많은 사람이 집에서 좋은 디자인을 누릴 수 있도록 합니다.']
];
let prepared=-1,chapterTargets=[];
function preparePage(idx){
  if(prepared===idx)return;
  prepared=idx;
  const [lead,word,intro]=folios[idx],r=rooms[idx];
  $('dlead').textContent=lead;$('dword').textContent=word;$('dtext').textContent=intro;
  $('folio').toggleAttribute('data-long',idx>=3);
  $('folio').toggleAttribute('data-about',idx===0);
  const rows=idx===0?aboutSpreads:[[r.name.toUpperCase(),r.text],...r.items.map(item=>[item,r.ko])];
  const spreads=rows.map(([head,text])=>{
    const section=document.createElement('section'),h=document.createElement('h3'),p=document.createElement('p');
    section.className='spread';h.textContent=head;p.textContent=text;section.append(h,p);return section;
  });
  $('spreads').replaceChildren(...spreads);
  const nav=idx===0?[['Main',null],['Democratic Design',2],['Sustainability',3],['For Customer',4]]:[['Main',null],['공간',0],['가구',1]];
  chapterTargets=nav.map(([,n])=>n===null?null:spreads[n]);
  $('chapters').replaceChildren(...nav.map(([name],i)=>{
    const button=document.createElement('button');button.type='button';button.textContent=name;
    button.setAttribute('aria-current',i===0?'true':'false');
    button.onclick=()=>dialog.scrollTo({top:chapterTargets[i]?chapterTargets[i].offsetTop-document.querySelector('.folionav').offsetHeight:0,behavior:reduced.matches?'instant':'smooth'});
    return button;
  }));
}
dialog.addEventListener('scroll',()=>{
  const threshold=dialog.scrollTop+dialog.clientHeight*.4;
  let active=0;chapterTargets.forEach((node,i)=>{if(node&&node.offsetTop<=threshold)active=i;});
  [...$('chapters').children].forEach((b,i)=>b.setAttribute('aria-current',String(i===active)));
},{passive:true});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let index=new URLSearchParams(location.search).get('room')==='store-family'?3:0,detailIndex=-1,dark=true,frame=0,busy=false;
const cameras=[
 {name:'About',x:4.25,z:15,yaw:.62},
 {name:'IKEA PS',x:8.9,z:.40,yaw:-2.45},
 {name:'3D room',x:16.45,z:5.12,yaw:-.36},
 {name:'Store & Family',x:22.65,z:11.55,yaw:1.40},
 {name:'Restaurant',x:20.35,z:5.55,yaw:.42}
];
cameras.forEach(cam=>cam.pitch=-.055);
const points=cameras.map(r=>[r.x,r.z]);
const start=[entryDoor.x,entryDoor.z+1.45], end=[exitDoor.x,exitDoor.z+1.40];
const tour=[
  start,[entryDoor.x,16.5],[doorways[0].x,16.5],[doorways[0].x,cameras[0].z],points[0],
  [cameras[0].x,8.35],[cameras[1].x,8.35],points[1],
  [12.60,cameras[1].z],[12.60,6.74],[cameras[2].x,6.74],points[2],
  [17.63,cameras[2].z],[17.63,doorways[2].z],[19.20,doorways[2].z],[19.20,14.74],
  [cameras[3].x,14.74],points[3],[cameras[4].x,cameras[3].z],points[4],
  [exitDoor.x,cameras[4].z],end
];
const svg=$('minimap');
const path=pts=>'M'+pts.map(p=>p.join(' ')).join(' L');

svg.innerHTML='<defs><radialGradient id="checkpoint-glow"><stop offset="0" stop-opacity=".60"/><stop offset="38%" stop-opacity=".46"/><stop offset="58%" stop-opacity=".21"/><stop offset="80%" stop-opacity=".07"/><stop offset="100%" stop-opacity="0"/></radialGradient></defs><path class="wall" d="'+mapWalls.map(path).join(' ')+'"/><path class="route" d="'+path(tour)+'"/><path class="arrow" transform="translate('+end.join(' ')+')" d="M-.37 -.5 L0 0 L.37 -.5"><title>동선 끝</title></path>'+
'<circle class="start-symbol" cx="'+start[0]+'" cy="'+start[1]+'" r=".26"><title>동선 시작</title></circle>'+
cameras.map((r,i)=>'<g class="checkpoint" data-i="'+i+'" transform="translate('+r.x+' '+r.z+')"><circle fill="transparent" r="1.5"/><circle class="halo" r="1.12"/><circle class="pin" r=".30"/><text class="num" x="'+(i===1||i===2?-.78:.82)+'" y="-.9">'+(i+1)+'</text></g>').join('');
const stops=[
  [6.58,15.04,5.70,.90,11.70],[8.88,4.40,7.15,.75,2.85],
  [14.72,5.54,16.98,1.13,2.45],[24.12,13.57,23.53,1.05,11.25],
  [21.72,5.30,21.44,.87,2.72]
];
stops.forEach(([x,z,tx,ty,tz],i)=>Object.assign(cameras[i],{x,z,yaw:Math.atan2(tx-x,z-tz),pitch:Math.atan2(ty-1.57,Math.hypot(tx-x,tz-z))}));
cameras.push({x:29.85,z:5.55,yaw:Math.PI/2,pitch:-.04});

// The opening shot goes straight to About. Later walks follow the doorways.
const entrance={x:entryDoor.x,z:entryDoor.z+.95,yaw:-.32,pitch:-.07};
const stations=[entrance,...cameras];
const corridors=[
  [],
  [[8.78,12.85],[8.96,9.25],[8.96,5.10]],
  [[13.12,4.86]],
  [[15.48,6.56],[16.32,6.76],[19.40,6.76],[20.42,11.36],[21.43,11.60]],
  [[21.48,11.62],[20.40,11.36],[19.90,7.15]],
  [[25.6,5.55],[26.9,5.55]]
];
const arc=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const dist=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
function blend(a,b,k){
  return {x:a.x+(b.x-a.x)*k,z:a.z+(b.z-a.z)*k,
    yaw:a.yaw+arc(a.yaw,b.yaw)*k,pitch:a.pitch+(b.pitch-a.pitch)*k};
}
const anchors=[0],trail=[stations[0]],lengths=[0];
for(let leg=0;leg<corridors.length;leg++){
  let views=[stations[leg],...corridors[leg].map(([x,z])=>({x,z,yaw:0,pitch:0})),stations[leg+1]];
  for(let pass=0;pass<2;pass++){
    const rounded=[views[0]];
    for(let i=1;i<views.length;i++){
      const a=views[i-1],b=views[i],cut=Math.min(.25,.40/Math.max(.001,dist(a,b)));
      rounded.push(blend(a,b,cut),blend(a,b,1-cut));
    }
    rounded.push(views.at(-1));views=rounded;
  }
  for(const view of views.slice(1)){
    lengths.push(lengths.at(-1)+dist(trail.at(-1),view));trail.push(view);
  }
  anchors.push(lengths.at(-1));
}
let approach=null, travel=anchors[index+1],holdUntil=0,mapTween=null;
const eye={...cameras[index]};
function samplePath(d){
  let i=1;while(i<lengths.length-1&&lengths[i]<d)i++;
  const view=blend(trail[i-1],trail[i],Math.max(0,Math.min(1,(d-lengths[i-1])/(lengths[i]-lengths[i-1]))));
  // Round the walking corners independently of the gaze. One sustained look
  // along the passage avoids a head turn at every waypoint.
  let leg=0;while(leg<anchors.length-2&&d>anchors[leg+1])leg++;
  const phase=Math.max(0,Math.min(1,(d-anchors[leg])/(anchors[leg+1]-anchors[leg])));
  const start=stations[leg],end=stations[leg+1];
  const gaze=leg===rooms.length?smooth(Math.min(1,phase/.74)):smooth(phase);
  view.yaw=start.yaw+arc(start.yaw,end.yaw)*gaze;
  view.pitch=start.pitch+(end.pitch-start.pitch)*smooth(phase);
  return view;
}
function smooth(t){return t*t*(3-2*t);}
function snapTo(i){
  travel=anchors[i+1];approach=null;mapTween=null;Object.assign(eye,cameras[i]);
}
function tourView(now){
  if(approach){
    const a=approach,t=Math.min(1,Math.max(0,(now-a.start)/a.duration));
    const ramp=.18;
    const u=t<ramp?t*t/(2*ramp*(1-ramp)):t>1-ramp?1-(1-t)*(1-t)/(2*ramp*(1-ramp)):(t-ramp/2)/(1-ramp);
    travel=a.from+(a.to-a.from)*u;
    if(t===1||reduced.matches){
      snapTo(index);holdUntil=now+380;
    }
    else{Object.assign(eye,samplePath(travel));schedule();}
  }
  return eye;
}
function startWalk(direction,now){
  const to=anchors[index+1];
  const leg=direction>0?index:index+1;
  const length=anchors[leg+1]-anchors[leg];
  const standardWalkLength=8.876775; // Pacing reference for walks between rooms.
  const speed=3.15*Math.min(1.25,Math.max(1,length/standardWalkLength));
  const duration=Math.max(650,Math.abs(to-travel)/speed*1000+350);
  approach={from:travel,to,direction,start:now,duration};
  schedule();
}
function walkIn(){travel=0;Object.assign(eye,entrance);startWalk(1,performance.now());}
function goTo(next,direction=0){
  const now=performance.now();
  const enteringFooter=next===rooms.length;
  const leavingFooter=index===rooms.length;
  if(busy||dialog.open||next<0||next>=cameras.length||next===index)return;
  if(direction&&now<holdUntil&&!enteringFooter&&!leavingFooter)return;
  tourView(now);
  const fromMap=mapPosition(now);
  index=next;clearPointer();mapTween=null;
  if((leavingFooter&&!approach)||!direction||reduced.matches){
    snapTo(index);
    if(!reduced.matches)mapTween={from:fromMap,to:index+1,start:now};
  }else startWalk(direction,now);
  schedule();
}
reduced.addEventListener('change',schedule);

function activate(el,to,label){
  el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',label);
  el.addEventListener('click',()=>goTo(to));
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();goTo(to)}});
}
const markers=[...svg.querySelectorAll('.checkpoint')];
// X/Z footprints use the same world units as the plan walls and camera stops.
const footprintsByRoom=[
  [[0,7.3],[9.98,7.3],[9.98,15.55],[0,15.55]],
  [[0,0],[1.4,0],[1.4,2.4],[5.15,2.4],[5.15,-1.1],[10.55,-1.1],[10.55,5.1],[4.85,5.1],[4.85,7.3],[0,7.3]],
  [[13.7,-.4],[18.15,-.4],[18.15,6.25],[13.7,6.25]],
  [[21.1,7.15],[27.45,7.15],[27.45,16.9],[21.4,16.9],[21.4,15.25],[21.1,15.25]],
  [[18.5,-4.65],[22.55,-4.65],[22.55,-2.25],[26.9,-2.25],[26.9,7.15],[18.5,7.15]]
];
const floorLayer=document.createElementNS(svg.namespaceURI,'g');
svg.insertBefore(floorLayer,svg.querySelector('.wall'));
// Each wash extends to the built walls and tapers into the open aisle.
// The clickable footprint below still clips it to the selected room.
const floorWashes=[
  'M-.8 7.4 C2.6 6.8 4.5 8.7 7.1 8.6 C9.4 8.6 9 11.2 8.9 12.6 C8.8 14.2 7.8 15 6 15.1 C3.5 15.2 1.7 16.1 -.8 16 Z',
  'M-.5 -.6 L10.9 -1.7 C10.7 .6 10.5 2.4 9.3 3.6 C8.5 4.5 7.1 4.3 5.6 4.9 C3.9 5.4 3.2 7.1 -.5 7.4 Z',
  'M13.3 -.9 L18.5 -.7 C18.6 1 17.4 1.9 17.3 3.1 C17.2 4.5 17.9 4.7 17.9 6.4 L13.3 6.6 Z',
  'M21.6 6.8 L28 6.8 L28 17.3 L21.2 17.3 C20.8 15.1 21.3 13.9 22.1 12.5 C23 11.1 22 9.8 21.6 8.7 Z',
  'M18 -5 L27.4 -5 L27.4 7.4 C25.3 7.3 23.6 6.8 22.5 6 C21.1 5.2 19.5 6 18.9 4.3 C18.4 2.5 19.1 .8 18 -1 Z'
];
const defs=svg.querySelector('defs');
defs.insertAdjacentHTML('beforeend','<filter id="floor-feather" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation=".65"/></filter>');
const floorRegions=footprintsByRoom.map((vertices,i)=>{
  const door=doorways[i],dx=door.nx*.44,dy=door.nz*.44;
  defs.insertAdjacentHTML('beforeend',
    '<linearGradient id="wash-depth-'+i+'" x1="'+(.5-dx)+'" y1="'+(.5-dy)+'" x2="'+(.5+dx)+'" y2="'+(.5+dy)+'">'+
      '<stop stop-color="white" stop-opacity=".14"/><stop offset=".45" stop-color="white" stop-opacity=".72"/><stop offset="1" stop-color="white"/></linearGradient>'+
    '<mask id="floor-wash-'+i+'" maskUnits="userSpaceOnUse" x="-2" y="-9" width="34" height="32">'+
      '<path d="'+floorWashes[i]+'" fill="url(#wash-depth-'+i+')" filter="url(#floor-feather)"/></mask>');
  const region=document.createElementNS(svg.namespaceURI,'polygon');
  region.setAttribute('points',vertices.map(p=>p.join(',')).join(' '));
  region.setAttribute('mask','url(#floor-wash-'+i+')');
  region.setAttribute('class','room-floor');region.setAttribute('aria-hidden','true');
  region.addEventListener('click',()=>goTo(i));
  floorLayer.append(region);return region;
});
markers.forEach((el,i)=>activate(el,i,(i+1)+'번 '+rooms[i].name));
const exitLink=document.createElementNS(svg.namespaceURI,'g');
exitLink.innerHTML='<circle fill="transparent" cx="'+end[0]+'" cy="'+end[1]+'" r="1.55"/>';
svg.append(exitLink);activate(exitLink,rooms.length,'출구로 이동');
function schedule(){if(!frame)frame=requestAnimationFrame(draw)}
const tourFooter=document.querySelector('footer');
function draw(){
  frame=0;if(dialog.open)return;
  const cam=tourView(performance.now());paintScene(cam);doors.style.visibility="hidden";
  if(approach||busy){guides.hidden=true;scene.removeAttribute('data-object-hover')}
  caption.hidden=!!approach||index===rooms.length;const atExit=index===rooms.length&&!approach;
  const finishingWalk=index===rooms.length&&approach&&approach.start+approach.duration-performance.now()<=450;
  document.body.classList.toggle('at-exit',atExit);
  document.body.classList.toggle('show-footer',atExit||Boolean(finishingWalk));
  tourFooter.inert=!atExit;
  updateTourMap(performance.now());
  if(!caption.hidden){$('enter').textContent=rooms[index].name;$('enter').href=rooms[index].page||'#'+rooms[index].id;$('enter').setAttribute('aria-label',rooms[index].name+' 상세페이지')}
}
let touchY=null;
world.addEventListener('touchstart',e=>{touchY=e.touches.length===1?e.touches[0].clientY:null},{passive:true});
world.addEventListener('touchend',e=>{
  if(touchY!==null&&Math.abs(touchY-e.changedTouches[0].clientY)>42)step(Math.sign(touchY-e.changedTouches[0].clientY));
  touchY=null;
},{passive:true});
world.addEventListener('touchcancel',()=>{touchY=null});
try{dark=localStorage.getItem('room-atlas-theme')!=='light';}catch{}
function theme(){
  document.documentElement.dataset.theme=dark?'dark':'light';$('theme').setAttribute('aria-pressed',String(dark));
  $('themeLabel').textContent=dark?'다크 모드':'라이트 모드';schedule();
}
$('theme').onclick=()=>{dark=!dark;try{localStorage.setItem('room-atlas-theme',dark?'dark':'light');}catch{}theme();};
function step(direction){
  const next=Math.max(0,Math.min(cameras.length-1,index+direction));
  if(approach?.direction===direction)return;
  goTo(next,direction);
}
let lastWheel=-Infinity;
window.addEventListener('wheel',e=>{
  if(dialog.open || e.ctrlKey || !e.deltaY)return;
  e.preventDefault();const now=performance.now();
  if(now-lastWheel>180)step(Math.sign(e.deltaY));
  lastWheel=now;
},{passive:false});
addEventListener('keydown',e=>{
  if(dialog.open||busy)return;
  if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();if(!e.repeat)step(e.key==='ArrowRight'?1:-1)}
  if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(!e.repeat)step(e.key==='ArrowDown'?1:-1)}
});
// Browsers can still dispatch click after a drag ends on its starting element.
const entryLinks='#world, #enter, #footerlinks a';
let press=null;
document.addEventListener('pointerdown',e=>{
  if(!e.isPrimary)return;
  const link=e.target.closest(entryLinks);
  press=link?{id:e.pointerId,link,x:e.clientX,y:e.clientY,dragged:false}:null;
},true);
function trackPress(e){
  if(press?.id===e.pointerId && Math.hypot(e.clientX-press.x,e.clientY-press.y)>6)press.dragged=true;
}
document.addEventListener('pointermove',trackPress,true);
document.addEventListener('pointerup',trackPress,true);
document.addEventListener('pointercancel',e=>{if(press?.id===e.pointerId)press=null;},true);
document.addEventListener('dragstart',e=>{if(e.target.closest(entryLinks))e.preventDefault();});
document.addEventListener('click',e=>{
  const link=e.target.closest(entryLinks);
  if(link && e.detail>0 && (press?.link!==link || press.dragged)){
    e.preventDefault();e.stopImmediatePropagation();
  }
  press=null;
},true);
let activeMotion=null;
const wipe=$('wipe');
function syncDetail(){
  approach=null;
  if(activeMotion){
    activeMotion.onfinish=null;
    activeMotion.cancel();activeMotion=null;
  }
  busy=false;wipe.hidden=true;dialog.removeAttribute('data-preview');
  dialog.inert=false;
  const dest=rooms.findIndex(r=>location.hash==='#'+r.id);
  if(dest>=0&&rooms[dest].page){location.replace(rooms[dest].page);return}
  detailIndex=dest;
  if(dest<0){
    if(dialog.open)dialog.close();
    const saved=history.state?.atlasReturnRoom;
    if(Number.isInteger(saved)&&saved>=0&&saved<=rooms.length){
      index=saved;
      const state={...history.state};
      delete state.atlasReturnRoom;
      history.replaceState(state,'');
    }
  }else{
    const origin=history.state?.roomTour?.index;
    index=Number.isInteger(origin)&&origin>=0&&origin<=rooms.length?origin:dest;

    preparePage(dest);if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
  }
  snapTo(index);schedule();
}
function enter(e,dest){
  e.preventDefault();
  if(approach||busy||dialog.open||dest>=rooms.length)return;
  const page=rooms[dest].page;
  const finish=()=>{
    // 별도 상세페이지(page)가 있는 방은 그 페이지로 이동합니다.
    if(page){
      history.replaceState({...history.state,atlasReturnRoom:index},'');
      location.href=page;return;
    }
    history.pushState({roomTour:{index}},'','#'+rooms[dest].id);
    syncDetail();
  };
  if(reduced.matches){finish();return}
  busy=true;if(!page)preparePage(dest);schedule();
  const rect=e.currentTarget.getBoundingClientRect();
  const x=e.detail?e.clientX:rect.left+rect.width/2;
  const y=e.detail?e.clientY:rect.top+rect.height/2;
  const radius=Math.ceil(Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y)))+2;
  const circle=r=>'circle('+r+'px at '+x+'px '+y+'px)';
  wipe.hidden=false;
  activeMotion=wipe.animate([{clipPath:circle(4),offset:0},{clipPath:circle(4),offset:.1},{clipPath:circle(radius),offset:1}],
    {duration:1100,easing:'cubic-bezier(.5,0,.28,1)',fill:'both'});
  activeMotion.onfinish=()=>{
    // 별도 페이지가 있는 방은 예전 상세 화면을 띄우지 않고 원형 전환이 끝나면 바로 이동합니다.
    if(page){finish();return}
    // Removing the circular clip leaves the detail background beneath the page.
    activeMotion.cancel();
    dialog.inert=true;dialog.setAttribute('data-preview','');dialog.scrollTop=0;
    activeMotion=dialog.animate([{transform:'translateY(100%)'},{transform:'translateY(0%)'}],
      {duration:1150,easing:'cubic-bezier(.42,0,.2,1)',fill:'both'});
    activeMotion.onfinish=finish;
  };
}
$('enter').onclick=e=>enter(e,index);opening.onclick=e=>enter(e,index);
for(const [i,r] of rooms.entries()){
  const a=document.createElement('a');a.href=r.page||'#'+r.id;a.textContent=r.name;
  a.onclick=e=>enter(e,i);$('footerlinks').append(a);
}
function leave(){
  if(history.state?.roomTour)history.back();
  else{history.replaceState(null,'',location.pathname+location.search);syncDetail()}
}
$('back').onclick=leave;dialog.oncancel=e=>{e.preventDefault();leave()};
addEventListener('popstate',syncDetail);
// 상세페이지에서 뒤로 가기로 돌아왔을 때 전환 효과가 남아 있지 않도록 초기화합니다.
addEventListener('pageshow',e=>{if(e.persisted)syncDetail()});
addEventListener('hashchange',syncDetail);
const routeLine=svg.querySelector('.route');
const exitArrow=svg.querySelector('.arrow');
const mapStops=[0];
let routeDistance=0;
for(let i=1;i<tour.length;i++){
  const a=tour[i-1],b=tour[i];
  routeDistance+=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(points.includes(b)||b===end)mapStops.push(routeDistance);
}
function mapPosition(now){
  if(mapTween){
    const t=Math.min(1,(now-mapTween.start)/600);
    if(t<1&&!reduced.matches){
      schedule();return mapTween.from+(mapTween.to-mapTween.from)*smooth(t);
    }
    mapTween=null;
  }
  let leg=0;
  while(leg<anchors.length-2&&travel>anchors[leg+1])leg++;
  return leg+(travel-anchors[leg])/(anchors[leg+1]-anchors[leg]);
}
const floorLights=floorRegions.map((region,i)=>{
  defs.insertAdjacentHTML('beforeend','<radialGradient id="room-light-'+i+'" gradientUnits="userSpaceOnUse">'+
    '<stop stop-color="var(--map-accent)" stop-opacity=".9"/><stop offset=".46" stop-color="var(--map-accent)" stop-opacity=".58"/>'+
    '<stop offset="1" stop-color="var(--map-accent)" stop-opacity=".18"/></radialGradient>');
  region.style.fill='url(#room-light-'+i+')';
  return document.getElementById('room-light-'+i);
});
const beacon=document.createElementNS(svg.namespaceURI,'g');
beacon.setAttribute('pointer-events','none');
beacon.innerHTML='<circle r="1.15" fill="url(#checkpoint-glow)"/><circle r=".23" fill="var(--map-accent)"/>';
svg.append(beacon);
let lastMapPosition=-10;
function updateTourMap(now){
  const pos=mapPosition(now);
  if(pos===lastMapPosition)return;
  lastMapPosition=pos;
  const leg=Math.min(mapStops.length-2,Math.max(0,Math.floor(pos)));
  const k=pos-leg;
  const visibleLength=mapStops[leg]+(mapStops[leg+1]-mapStops[leg])*k;
  routeLine.setAttribute('stroke-dasharray',visibleLength+' '+routeDistance);
  exitArrow.style.opacity=pos>=mapStops.length-1?'1':'0';
  const p=routeLine.getPointAtLength(visibleLength);
  const moving=pos!==Math.round(pos);
  beacon.style.display=moving?'':'none';
  beacon.setAttribute('transform','translate('+p.x+' '+p.y+')');
  floorRegions.forEach((region,i)=>{
    const weight=smooth(Math.max(0,1-Math.abs(pos-i-1)));
    const light=floorLights[i],active=weight>=.5;
    light.setAttribute('cx',p.x);light.setAttribute('cy',p.y);
    light.setAttribute('r',3.6+8*weight);
    region.style.fillOpacity='calc(var(--floor-opacity) * '+weight+')';
    const marker=markers[i];
    marker.classList.toggle('active',active);
    marker.setAttribute('aria-pressed',String(i===index));
    marker.querySelector('.pin').setAttribute('r',.35+.1*weight);
    const halo=marker.querySelector('.halo');
    halo.style.visibility='visible';halo.style.opacity=weight;
  });
}

function hitsObject(x,y){
  if(approach||index>=rooms.length||busy||dialog.open)return false;
  const r=world.getBoundingClientRect();
  return pick(tourView(performance.now()),x-r.left,y-r.top,r.width,r.height)===heroIds[index];
}
world.addEventListener('click',e=>{
  if(e.detail&&hitsObject(e.clientX,e.clientY))enter(e,index);
});
new ResizeObserver(schedule).observe(world);theme();syncDetail();if(index===0&&!dialog.open&&!reduced.matches)walkIn();
