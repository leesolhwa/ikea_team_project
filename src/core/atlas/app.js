const $=s=>document.getElementById(s);
const rooms=[
  {id:'about',name:'About',ko:'거실',text:'왼쪽 거실에서 탐색을 시작합니다. 소파와 낮은 테이블 너머로 안쪽 전시 공간이 이어집니다.',items:['소파와 플로어 램프가 놓인 휴식 공간','창가를 따라 이어지는 작은 좌석들']},
  {id:'ikea-ps',name:'IKEA PS',ko:'컬렉션 전시실',text:'거실 뒤편의 전시실입니다. 진열대 사이를 걸으며 가구의 높이와 간격을 살펴보고, 오른쪽 출입구로 중앙 통로에 들어갈 수 있습니다.',items:['벽면을 따라 놓인 오픈 선반','낮은 전시대 위의 의자와 조명']},
  {id:'3d-room',name:'3D room',ko:'침실',text:'중앙 통로에서 안쪽으로 들어온 침실입니다. 침대 발치에서 시선을 돌리면 헤드보드, 협탁, 수납장의 배치가 한눈에 들어옵니다.',items:['낮은 침대와 패브릭 침구','침대 옆 협탁과 조명']},
  {id:'store-family',name:'Store & Family',ko:'패밀리 라운지',text:'도면 오른쪽 앞에 자리한 라운지입니다. 데이베드와 독서등이 놓여 있고, 옆 출입구를 지나면 다이닝으로 이어지는 복도에 닿습니다.',items:['오른쪽 앞방에 놓인 데이베드','침대 옆 키 큰 독서등']},
  {id:'restaurant',name:'Restaurant',ko:'키친 & 다이닝',text:'오른쪽 뒤편의 식탁과 주방입니다. 의자 사이와 조리대 앞을 오가며 식탁 위 펜던트와 벽면 수납장을 다른 각도로 볼 수 있습니다.',items:['여섯 자리가 있는 긴 식탁','벽면 조리대와 상부 수납장']}
];
const world=$('world'),scene=document.querySelector('.scene'),caption=document.querySelector('.caption');
const dialog=$('detail'),render=makeRenderer(world),doors=$('doors'),opening=$('opening');
const guides=$('guides'),pick=makePicker();
function planRects(items){
  return items.map(({x,z,w,d})=>'M'+(x-w/2)+' '+(z-d/2)+'h'+w+'v'+d+'h-'+w+'Z').join('');
}
$('mapwalls').setAttribute('d',planRects(walls));
$('mapobjects').setAttribute('d',planRects(footprints));
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
      if(detailIndex<0)selected=pick(cam,x,y,rect.width,rect.height);
      guides.style.setProperty('--x',x+'px');guides.style.setProperty('--y',y+'px');
    }
  }
  guides.hidden=!show;scene.toggleAttribute('data-object-hover',selected>0);
  $('mapeye').setAttribute('transform','translate('+cam.x+' '+cam.z+') rotate('+cam.yaw*180/Math.PI+')');
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
  if(outside<.12||outside>4.6||Math.abs((d.x-c.x)*d.nz-(d.z-c.z)*d.nx)>1.5)return;
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
let index=0,detailIndex=-1,dark=true,frame=0,busy=false;
const cameras=doorways.map((d,i)=>{
  const range=[2.15,2.85,1.65,1.46,2.9][i];
  const side=[-.32,.16,.20,-.20,.18][i];
  return {x:d.x-range*d.nx+side*d.nz,z:d.z-range*d.nz-side*d.nx,
    yaw:Math.atan2(d.nx,-d.nz)+[.13,-.10,.12,-.1,.1][i],pitch:-.035};
});
cameras.push({x:exitDoor.x,z:exitDoor.z+1.26,yaw:Math.PI,pitch:-.026});
// Intermediate views follow the clear aisles between the room entrances.
const passages=[
  [[5.78,14.95,-12],[3.7,14.7,-50],[1.64,13.3,-20],[1.6,10.1,18],[3.9,8.7,68],[8.0,8.15,40]],
  [[8.96,5.6,0],[9.05,4.24,25],[10.87,3.8,15],[10.87,-.10,65],[12.62,-.05,135],[12.63,6.7,112],[15.53,6.76,83],[19.5,6.7,28],[19.7,4.1,-23]],
  [[19.7,3.85,3],[19.58,6.67,115],[19.66,9.84,155],[19.68,11.14,106]],
  [[21.94,11.55,76],[22.66,13.68,46],[23.42,14.42,12],[21.94,11.55,-58],[19.75,11.55,-40]],
  [[19.68,8.65,2],[19.82,7.0,-30],[19.9,6.26,-104],[19.72,9.2,-169],[19.54,13.78,-126],[15.22,14.2,-100],[12.03,14.43,-153],[exitDoor.x,15.65,-179],[exitDoor.x,17.7,-180]]
];
const turn=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
function blendView(a,b,t){
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,pitch:a.pitch+(b.pitch-a.pitch)*t,yaw:a.yaw+turn(a.yaw,b.yaw)*t};
}
const paths=passages.map((passage,i)=>{
  let views=[cameras[i],...passage.map(([x,z,yaw])=>({x,z,yaw:yaw*Math.PI/180,pitch:-.035})),cameras[i+1]];
  // Round each corner locally while keeping its two doorway views exact.
  for(let pass=0;pass<2;pass++){
    const rounded=[views[0]];
    for(let j=1;j<views.length;j++){
      const a=views[j-1],b=views[j],cut=Math.min(.25,.44/Math.max(.01,Math.hypot(b.x-a.x,b.z-a.z)));
      rounded.push(blendView(a,b,cut),blendView(a,b,1-cut));
    }
    rounded.push(views.at(-1));views=rounded;
  }
  const lengths=[0];
  for(let j=1;j<views.length;j++){
    const a=views[j-1],b=views[j];
    lengths.push(lengths.at(-1)+Math.hypot(b.x-a.x,b.z-a.z,1.1*turn(a.yaw,b.yaw)));
  }
  return {views,lengths,ms:Math.min(2250,1150+lengths.at(-1)*37)};
});
function travelView(position){
  if(Number.isInteger(position))return cameras[position];
  const leg=Math.floor(position),t=position-leg,{views,lengths}=paths[leg];
  const d=lengths.at(-1)*t*t*(3-2*t);
  const j=lengths.findIndex((v,k)=>k>0&&v>=d);
  return blendView(views[j-1],views[j],(d-lengths[j-1])/(lengths[j]-lengths[j-1]));
}
let position=0,destination=0,lastDraw=0;
function schedule(){if(!frame)frame=requestAnimationFrame(draw)}
function draw(now){
  frame=0;
  if(dialog.open)return;
  if(position!==destination){
    const forward=destination>position;
    const leg=forward?Math.floor(position):Math.ceil(position)-1;
    const boundary=forward?leg+1:leg;
    const advance=Math.min(Math.max(0,now-lastDraw)/paths[leg].ms,Math.abs(boundary-position));
    position=reduced.matches?destination:position+(forward?advance:-advance);
    if(Number.isInteger(position))index=position;
    lastDraw=now;
  }
  const cam=travelView(position);paintScene(cam);
  if(position!==destination){
    doors.style.visibility='hidden';caption.hidden=true;guides.hidden=true;
    scene.removeAttribute('data-object-hover');document.body.classList.remove('at-exit');schedule();return;
  }
  showDoor(index,cam);
  if(busy){guides.hidden=true;scene.removeAttribute('data-object-hover')}
  caption.hidden=index===rooms.length;
  document.body.classList.toggle('at-exit',caption.hidden);
  if(!caption.hidden){
    $('enter').textContent=rooms[index].name;$('enter').href='#'+rooms[index].id;
    $('enter').setAttribute('aria-label',rooms[index].name+' 방으로 입장');
  }
}
try{dark=localStorage.getItem('room-atlas-theme')!=='light';}catch{}
function theme(){
  document.documentElement.dataset.theme=dark?'dark':'light';$('theme').setAttribute('aria-pressed',String(dark));
  $('themeLabel').textContent=dark?'다크 모드':'라이트 모드';schedule();
}
$('theme').onclick=()=>{dark=!dark;try{localStorage.setItem('room-atlas-theme',dark?'dark':'light');}catch{}theme();};
function step(direction){
  if(busy||dialog.open)return;
  const next=Math.min(cameras.length-1,Math.max(0,destination+direction));
  if(next===destination)return;
  if(position===destination)lastDraw=performance.now();
  destination=next;schedule();
}
let lastWheel=-Infinity;
window.addEventListener('wheel',e=>{
  if(dialog.open || e.ctrlKey || !e.deltaY)return;
  e.preventDefault();const now=performance.now();
  if(now-lastWheel>180)step(Math.sign(e.deltaY));
  lastWheel=now;
},{passive:false});
let touchY=null;
document.addEventListener('touchstart',e=>{touchY=(!dialog.open&&!busy&&e.touches.length===1)?e.touches[0].clientY:null},{passive:true});
document.addEventListener('touchend',e=>{
  if(touchY!==null && Math.abs(touchY-e.changedTouches[0].clientY)>35)step(Math.sign(touchY-e.changedTouches[0].clientY));
  touchY=null;
},{passive:true});
document.addEventListener('touchcancel',()=>{touchY=null});
addEventListener('keydown',e=>{
  if(dialog.open||busy)return;
  if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(!e.repeat)step(e.key==='ArrowDown'?1:-1)}
});
// Browsers can still dispatch click after a drag ends on its starting element.
const entryLinks='#opening, #enter, #footerlinks a';
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
  if(activeMotion){
    activeMotion.onfinish=null;
    activeMotion.cancel();activeMotion=null;
  }
  busy=false;wipe.hidden=true;dialog.removeAttribute('data-preview');
  dialog.inert=false;
  const dest=rooms.findIndex(r=>location.hash==='#'+r.id);
  detailIndex=dest;
  if(dest<0){
    if(dialog.open)dialog.close();
  }else{
    const origin=history.state?.roomTour?.index;
    index=Number.isInteger(origin)&&origin>=0&&origin<=rooms.length?origin:dest;
    position=destination=index;
    preparePage(dest);if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
  }
  schedule();
}
function enter(e,dest){
  e.preventDefault();
  if(busy||position!==destination||dialog.open||dest>=rooms.length)return;
  const finish=()=>{
    history.pushState({roomTour:{index}},'','#'+rooms[dest].id);
    syncDetail();
  };
  if(reduced.matches){finish();return}
  busy=true;preparePage(dest);schedule();
  const rect=e.currentTarget.getBoundingClientRect();
  const x=e.detail?e.clientX:rect.left+rect.width/2;
  const y=e.detail?e.clientY:rect.top+rect.height/2;
  const radius=Math.ceil(Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y)))+2;
  const circle=r=>'circle('+r+'px at '+x+'px '+y+'px)';
  wipe.hidden=false;
  activeMotion=wipe.animate([{clipPath:circle(4),offset:0},{clipPath:circle(4),offset:.1},{clipPath:circle(radius),offset:1}],
    {duration:1100,easing:'cubic-bezier(.5,0,.28,1)',fill:'both'});
  activeMotion.onfinish=()=>{
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
  const a=document.createElement('a');a.href='#'+r.id;a.textContent=r.name;
  a.onclick=e=>enter(e,i);$('footerlinks').append(a);
}
function leave(){
  if(history.state?.roomTour)history.back();
  else{history.replaceState(null,'',location.pathname+location.search);syncDetail()}
}
$('back').onclick=leave;dialog.oncancel=e=>{e.preventDefault();leave()};
addEventListener('popstate',syncDetail);addEventListener('hashchange',syncDetail);
new ResizeObserver(schedule).observe(world);theme();syncDetail();
