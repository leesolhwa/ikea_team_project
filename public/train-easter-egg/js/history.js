/* IKEA's History — 기차 오브젝트 클릭 시 재생되는 역사 애니메이션
   구조
   - 오프닝(처음 한 번): 조케가 걸어와 기차에 탐 → 출발 → 레터박스 → 마을과 타이틀
   - 반복 구간(도돌이표): 마을 → 1948 가구 → 1953 의자 → 분해 → 부품 → 상자 → 세계지도 → 마을로 돌아옴 → 다시 처음
   - 오른쪽 위 X 또는 ESC: 레터박스가 가운데로 닫히며 3D 룸으로 복귀
   외부 연결: IkeaHistory.open() / IkeaHistory.close(), 닫히면 window에 'ikeahistory:close' 이벤트 */
(function(){
gsap.registerPlugin(DrawSVGPlugin);
const $ = id => document.getElementById(id);
const section = $('history'), stage = $('stage');

/* ---------- 무대 비율 맞춤 (1920x1080 기준, 레터박스 138px도 함께 비례) ---------- */
function fit(){
  const s = Math.min(innerWidth/1920, innerHeight/1080);
  stage.style.transform = `scale(${s}) translate(-50%,-50%)`;
  // 작은 화면(휴대폰 등)에서는 자막이 읽히도록 글자를 키움 (최대 44px, 두 줄까지)
  stage.style.setProperty('--sub-size', Math.min(44, Math.max(24, 11 / s)) + 'px');
  stage.style.setProperty('--foot-size', Math.min(28, Math.max(16, 8 / s)) + 'px');
}
addEventListener('resize', fit); fit();

/* ---------- 장면 오브젝트: 시안 PNG에서 뽑은 선(data/scenes.js)을 그룹으로 ---------- */
const scenesG = $('scenes'), SC = {};
const ORDER = ['village','furniture','chair','apart','parts','box','map'];
/* 배치: 오브젝트가 그려질 때는 기차가 작아지고(줌아웃), 오브젝트는 가운데에 크게
   cx,cy = 가운데 위치 / w 또는 h = 맞출 너비·높이 / sw = 화면에서 보일 선 굵기 */
const LINE_W = 1.7;           // 모든 장면 선 굵기 통일 (가구 원라인 그림 기준)
const PEN_SPEED = 520;        // 펜 속도(px/s): 모든 오브젝트를 같은 속도로 쭉 이어 그림
const LAYOUT = {
  village:   {maxDur:3.0},                               // 지평선 위 풍경 (시안 좌표 그대로)
  furniture: {cx:960, cy:445, w:820, maxDur:4.4},
  chair:     {cx:960, cy:450, h:300},
  apart:     {cx:960, cy:440, h:330},
  parts:     {cx:960, cy:445, h:330},
  box:       {cx:960, cy:455, w:540},
  map:       {cx:960, cy:440, w:640, maxDur:2.8},
};
// path 좌표로 범위 계산 (화면에 숨겨진 상태에서도 계산되도록)
function boundsOf(ds){ let x0=1e9, y0=1e9, x1=-1e9, y1=-1e9;
  ds.forEach(d => { const n = d.match(/-?\d+(\.\d+)?/g).map(Number);
    for (let i = 0; i < n.length; i += 2){ x0=Math.min(x0,n[i]); x1=Math.max(x1,n[i]); y0=Math.min(y0,n[i+1]); y1=Math.max(y1,n[i+1]); } });
  return {x0, y0, x1, y1, w:x1-x0, h:y1-y0}; }
ORDER.forEach(k => {
  const outer = el('g', {id:'sc-'+k}, scenesG);          // 바깥: 흐름(x 이동)용
  const g = el('g', {}, outer);                           // 안쪽: 배치(크기·위치)용
  SCENES[k].forEach(d => el('path', {d, class:'sl'}, g));
  const L = LAYOUT[k];
  let s = 1;
  if (L.cx){ const b = boundsOf(SCENES[k]); s = L.w ? L.w / b.w : L.h / b.h;
    g.setAttribute('transform', `translate(${L.cx - s*(b.x0 + b.w/2)} ${L.cy - s*(b.y0 + b.h/2)}) scale(${s})`); }
  g.style.setProperty('--sw', LINE_W / s);
  SC[k] = outer; SC[k].inner = g; SC[k].scale = s;
});
// 상자 로고 글자 (그림의 일부라 SVG 텍스트로, 고해상도 상자 이미지 좌표)
const logo = el('text', {x:224.5, y:294.5, 'text-anchor':'middle', 'font-family':'Arial Black, Arial, sans-serif', 'font-weight':900, 'font-size':27, 'letter-spacing':1.5, fill:'#2F2F2F', opacity:0}, SC.box.inner);
logo.textContent = 'IKEA';
// 세계지도: 출발 핀과 비행기 (시안 12번)
const pin = el('g', {opacity:0}, SC.map.inner);
el('path', {d:'M654 575 C650 567 645.5 561.5 645.5 556.5 C645.5 551.5 649.5 547.5 654 547.5 C658.5 547.5 662.5 551.5 662.5 556.5 C662.5 561.5 658 567 654 575 Z', fill:'#1A1A1A'}, pin);
el('circle', {cx:654, cy:556, r:2.6, fill:'var(--bg)'}, pin);
const plane = el('g', {opacity:0}, SC.map.inner);
el('path', {d:'M-15 0 L9 -2.2 C14 -2.4 17 -1.2 17 0 C17 1.2 14 2.4 9 2.2 Z M1 -2 L-5 -14 L-1 -14 L9 -2 Z M1 2 L-5 14 L-1 14 L9 2 Z M-11 -1 L-15 -6.5 L-12.5 -6.5 L-7 -1 Z M-11 1 L-15 6.5 L-12.5 6.5 L-7 1 Z', fill:'#1A1A1A', transform:'translate(1179 301) rotate(-38) scale(1.35)'}, plane);
const allScenePaths = scenesG.querySelectorAll('path.sl');

/* ---------- 조케 ---------- */
const WALK_S = 0.22;                         // 시안 속 조케 키(약 90px)
const walkerPoses = $('walkerPoses'), POSES = {};
['stand','pass','stride','contact','big','down'].forEach(n => { POSES[n] = makePose(n, WALK_S, 1.55, walkerPoses); });
const showPose = n => { for (const k in POSES) POSES[k].style.display = (k === n ? '' : 'none'); };
// 참고 영상 그대로: 초당 12장, 한 걸음 = 교차 → 착지 → 큰 보폭 → 내려앉기
const WALK_SEQ = ['pass','contact','big','down','pass','contact','big','stride'];
// 기관실 조케: 영상 속 트럭 운전석처럼 팔을 앞으로 뻗은 상반신
const RIDER_S = 0.15;
const riderPose = makePose('stride', RIDER_S, 1.5, $('rider'), 'draw');
riderPose.setAttribute('transform', `translate(347 32) scale(${RIDER_S}) translate(-150 -122)`);

/* 오프닝 조케 대본: 시간만 주면 위치·포즈가 정해짐 (되감기에도 안전) */
const WK = {start:0.3, x0:720, reachX:430, endX:370, step:9.5, reach:4};
const walkN1 = Math.round((WK.x0 - WK.reachX) / WK.step);
const walkN2 = Math.round((WK.reachX - WK.endX) / WK.step);
const walkerEl = $('walker'), flipEl = $('walkerFlip');
function walkerAt(t){
  const f = Math.floor((t - WK.start) * 12);
  let x, pose;
  if (f < 0 || f >= walkN1 + WK.reach + walkN2) { walkerEl.style.display = 'none'; return; }
  if (f < walkN1) { x = WK.x0 - f*WK.step; pose = WALK_SEQ[f % WALK_SEQ.length]; }
  else if (f < walkN1 + WK.reach) { x = WK.reachX; pose = 'down'; }                       // 기관차에 손 짚기
  else { const g = f - walkN1 - WK.reach; x = WK.reachX - g*WK.step; pose = WALK_SEQ[g % WALK_SEQ.length]; } // 기관차 뒤로 들어감
  walkerEl.style.display = '';
  walkerEl.setAttribute('transform', `translate(${x.toFixed(1)} 842)`);
  flipEl.setAttribute('transform', 'scale(-1 1)');
  showPose(pose);
}

/* ---------- 연기 ---------- */
const smoke = $('smoke');
const puffD = 'M0 0 C-6 -6 -4 -16 5 -16 C8 -24 20 -24 22 -16 C30 -18 34 -8 28 -3 C32 2 26 8 19 5 C16 10 7 9 6 4 C1 6 -3 3 0 0';

/* ---------- 자막·연도 ---------- */
const SUBS = [
  '- 모든 것은 1940년대 스웨덴의 한 작은 마을에서 시작되었습니다.',
  '- 1948년, 가구를 판매하기 시작하며 새로운 가능성을 발견했습니다.',
  '- 이어서 1953년, IKEA는 * 플랫팩을 도입했습니다.',
  '- 낮은 가격과 좋은 품질.',
  '- 두 가지를 모두 갖춘 제품을 제공하겠다는 약속은 IKEA의 정체성이 되었습니다.',
  '- 결국 스웨덴의 작은 마을에서 시작된 이야기는 국경을 넘어 이어졌습니다.',
  '- 오늘날의 IKEA는 더 많은 사람들을 위한 더 나은 일상을 향해 나아갑니다.',
];
const FOOT = '* 가구를 분해해 납작하게 포장하는 방식.';
const subEl = $('subtitle'), footEl = $('footnote'), yearEl = $('year');
function subtitle(tl, at, text, foot){
  tl.to([subEl, footEl], {opacity:0, duration:.25}, at)
    .call(() => { subEl.textContent = text || ''; footEl.textContent = foot || ''; }, null, at + .25)
    .to(subEl, {opacity: text ? 1 : 0, duration:.35}, at + .27)
    .to(footEl, {opacity: foot ? 1 : 0, duration:.35}, at + .27);
}
function year(tl, at, value){                 // 숫자가 위로 굴러 올라가며 교체
  tl.call(() => {
    const old = yearEl.querySelector('span');
    const nu = document.createElement('span'); nu.textContent = value || '';
    if (old) gsap.to(old, {yPercent:-100, opacity:0, duration:.4, ease:'power2.in', onComplete:() => old.remove()});
    yearEl.appendChild(nu);
    gsap.fromTo(nu, {yPercent:100, opacity:0}, {yPercent:0, opacity:1, duration:.45, ease:'power2.out', delay:.1});
  }, null, at);
}

/* ---------- 선 그리기 / 지우기 ---------- */
const P = k => [...SC[k].querySelectorAll('path.sl')];
const LEN = new Map();
const lenOf = p => { if (!LEN.has(p)) LEN.set(p, p.getTotalLength()); return LEN.get(p); };
/* 펜 그리기: 펜 하나가 획을 하나씩 차례로 긋는 방식
   - 획마다 길이에 비례한 시간 (전체 dur 안에서 나눔) → 일정한 펜 속도
   - 획 안에서는 살짝 빨라졌다 느려짐(sine) + 획 사이에 펜을 떼는 짧은 쉼
   - 그려지기 전엔 숨김 (둥근 선끝이 점으로 남지 않게) */
function pen(tl, paths, at, dur, oneLine){
  const total = paths.reduce((a, p) => a + lenOf(p), 0) || 1;
  // oneLine: 펜을 떼지 않고 같은 속도로 쭉 (원라인 드로잉) / 아니면 획 사이 짧은 쉼 + 획마다 완급
  const lift = oneLine ? 0 : Math.min(.06, dur * .12 / paths.length);
  const drawTime = dur - lift * paths.length;
  let t = at;
  paths.forEach(p => {
    const d = Math.max(oneLine ? .01 : .04, drawTime * lenOf(p) / total);
    tl.set(p, {opacity:1}, t + .001)
      .fromTo(p, {drawSVG:'0% 0%'}, {drawSVG:'0% 100%', duration:d, ease: oneLine ? 'none' : 'sine.inOut', immediateRender:false}, t);
    t += d + lift;
  });
  return t;                                                     // 다 그려진 시각
}
/* 장면 오브젝트: 모두 같은 펜 속도로 끊김 없이 이어 그림 (화면에 보이는 길이 기준, 너무 길면 maxDur로 제한) */
function drawIn(tl, k, at){
  const ps = P(k), shown = ps.reduce((a, p) => a + lenOf(p), 0) * SC[k].scale;
  const dur = Math.min(LAYOUT[k].maxDur || 4.0, Math.max(1.4, shown / PEN_SPEED));
  return pen(tl, ps, at, dur, true);
}
/* 지우기: 그린 순서대로 펜 끝을 따라 빠르게 사라짐 */
const drawOut = (tl, k, at, dur) => { const ps = P(k), st = Math.min(.03, dur * .5 / ps.length);
  tl.fromTo(ps, {drawSVG:'0% 100%'}, {drawSVG:'100% 100%', duration:dur - st*ps.length, stagger:st, ease:'power1.in', immediateRender:false}, at)
    .set(ps, {opacity:0, stagger:st}, at + dur - st*ps.length);
  return at + dur; };
/* 자막 읽는 시간: 글자 수 기준 (최소 3초) */
const readTime = s => Math.max(3, s.length / 8.5 + .7);

/* ---------- 타임라인 ---------- */
const TRAIN_START_X = -765;   // 시안 1번: 기관차가 왼쪽 끝
const DEP = 4.9;              // 출발 시각
const LOOP_AT = 9.2;          // 반복 구간 시작 (마을이 다 그려진 뒤)
const LOOP_SPEED = 1.15;      // 반복 구간 전체 속도 (1.15 → 한 바퀴 약 37초). 낮추면 느려지고 높이면 빨라짐
const SCENERY_SPEED = 120;    // 풍경이 흘러가는 속도(px/s): 기차가 달리는 만큼 오른쪽 → 왼쪽
const VILLAGE_OUT = -1750;    // 마을이 왼쪽 화면 밖으로 완전히 나가는 위치
const TRAIN_ZOOM = .73;       // 오브젝트 장면에서 기차 크기 (줌아웃)
const ZOOM_ORIGIN = '910 842';// 기차 줌 기준점: 기차 가운데 아래(지평선)
let master, loops = [];

function reset(){
  if (master) master.kill(); loops.forEach(l => l.kill()); loops = [];
  smoke.innerHTML = '';
  gsap.set('#train', {x:TRAIN_START_X});
  gsap.set('.lb.top', {y:-138}); gsap.set('.lb.bottom', {y:138});
  gsap.set('.lb', {height:138});
  gsap.set(['#title', subEl, footEl, '#close', '#speed'], {opacity:0});
  subEl.textContent = ''; footEl.textContent = '';
  yearEl.innerHTML = '<span></span>';
  gsap.set('#riderPop', {y:16, opacity:0});
  gsap.set(allScenePaths, {drawSVG:'0% 0%', opacity:0});
  gsap.set([logo, pin, plane], {opacity:0});
  gsap.set(SC.village, {x:3 * SCENERY_SPEED});
  gsap.set('#trainCam', {scale:1, svgOrigin:ZOOM_ORIGIN});
  walkerAt(0);
}

function build(){
  reset();
  // 출발 전에는 멈춰 있다가 출발하면서 천천히 빨라지는 반복 동작들
  const moving = [];
  document.querySelectorAll('.wheel').forEach(w => {      // 바퀴: 반지름에 맞는 속도
    const cx = +w.dataset.cx, cy = +w.dataset.cy, r = +w.dataset.r;
    moving.push(gsap.to(w, {rotation:360, svgOrigin:`${cx} ${cy}`, duration:(2*Math.PI*r)/140, ease:'none', repeat:-1}));
  });
  ['#loco','#car2','#car1'].forEach((sel,i) => {            // 차체 덜컹 (박자 어긋나게)
    const tl = gsap.timeline({repeat:-1, delay:i*.09});
    tl.to(sel, {y:-2.2, duration:.11, ease:'power1.out'}).to(sel, {y:0, duration:.13, ease:'bounce.out'})
      .to(sel, {y:-1, duration:.1, ease:'power1.out'}, '+=.08').to(sel, {y:0, duration:.12, ease:'power1.in'});
    moving.push(tl);
  });
  const rider = gsap.timeline({repeat:-1, delay:.05});      // 기관실 조케: 한 박자 늦게, 끊기는 리듬
  rider.to('#rider', {rotation:-3, svgOrigin:'344 66', y:-1.5, duration:.27, ease:'steps(2)'})
       .to('#rider', {rotation:1.5, svgOrigin:'344 66', y:0, duration:.27, ease:'steps(2)'})
       .to('#rider', {rotation:-1, svgOrigin:'344 66', y:-1, duration:.27, ease:'steps(2)'})
       .to('#rider', {rotation:0, svgOrigin:'344 66', y:0, duration:.27, ease:'steps(2)'});
  moving.push(rider);
  moving.forEach(l => l.timeScale(0));
  loops.push(...moving);

  for (let i = 0; i < 3; i++){                               // 연기: 선으로 그려졌다 지워짐
    const p = el('path', {d:puffD, class:'ink', style:'stroke-width:1.8;opacity:0'}, smoke);   // 차례가 오기 전엔 숨김
    const tl = gsap.timeline({repeat:-1, delay:i*.6});
    tl.set(p, {x:430, y:4, scale:.6, rotation:0, transformOrigin:'50% 50%', drawSVG:'0% 0%', opacity:0})
      .set(p, {opacity:1}, .02)
      .to(p, {drawSVG:'0% 100%', duration:.6, ease:'power1.inOut'}, 0)
      .to(p, {x:'-=70', y:'-=46', scale:1.25, rotation:-12, duration:1.8, ease:'sine.out'}, 0)
      .to(p, {drawSVG:'100% 100%', duration:.7, ease:'power1.in'}, 1.1)
      .set(p, {opacity:0}, 1.8);
    loops.push(tl);
  }
  const noise = $('boilNoise'); let seed = 0;                // 손그림 떨림 (기차만)
  loops.push(gsap.to({}, {duration:1/7, repeat:-1, onRepeat(){ seed = (seed+1) % 3; noise.setAttribute('seed', 2+seed); }}));

  /* 마스터: 오프닝 */
  const speedAt = t => { const u = Math.min(1, Math.max(0, (t - DEP) / 1.4)); return u*u; };   // 달그락 출발
  master = gsap.timeline({paused:true, onUpdate(){ const t = this.time(); walkerAt(t); const s = speedAt(t); moving.forEach(l => l.timeScale(s)); }});
  const trainLines = [...document.querySelectorAll('#train .draw')].filter(p => !p.closest('#rider'));
  master.set('#train .paper', {opacity:0})
        .set(trainLines, {drawSVG:'0% 0%', opacity:0});
  pen(master, trainLines, 0, 2.6);                                                                               // 기차가 한 획씩 그려짐
  master.to('#train .paper', {opacity:1, duration:.3}, 2.6)
        .to('#riderPop', {y:0, opacity:1, duration:.25, ease:'steps(3)'}, 4.4)                                 // 기관실에서 쏙
        .to('#train', {x:0, duration:3.8, ease:'power2.inOut'}, DEP)                                            // 출발
        .to('.lb.top', {y:0, duration:.9, ease:'power3.out'}, DEP + .7)
        .to('.lb.bottom', {y:0, duration:.9, ease:'power3.out'}, DEP + .7)
        .to(['#close', '#speed'], {opacity:.85, duration:.5}, DEP + 1.2)
        .fromTo(SC.village, {x:3 * SCENERY_SPEED}, {x:0, duration:3, ease:'none'}, LOOP_AT - 3);                  // 마을이 오른쪽에서 흘러 들어옴
  drawIn(master, 'village', LOOP_AT - 3, 2.6);
  master.to('#title', {opacity:1, duration:.6}, 6.6)
        .to('#title', {opacity:0, duration:.8}, 8.3);

  /* 반복 구간 (도돌이표): 자막 읽는 시간을 기준으로 장면이 이어지고,
     끝나면 마을이 다시 가운데 → 처음과 같은 상태로 이어짐 */
  const L = gsap.timeline({repeat:-1});
  let s = 0;                                   // 자막이 바뀌는 시각
  // 1) 마을: 멈추지 않고 기차가 달리는 만큼 계속 왼쪽으로 흘러감
  L.fromTo(SC.village, {x:0}, {x:VILLAGE_OUT, duration:-VILLAGE_OUT / SCENERY_SPEED, ease:'none', immediateRender:false}, 0);
  subtitle(L, s, SUBS[0]); year(L, s + .1, '1943');
  s += readTime(SUBS[0]);
  // 2) 1948: 기차가 작아지며(줌아웃) 위쪽에 소파·테이블·조명이 크게 그려짐, 마을은 흘러가며 지워짐
  L.to('#trainCam', {scale:TRAIN_ZOOM, svgOrigin:ZOOM_ORIGIN, duration:1.6, ease:'power2.inOut'}, s - .4);
  drawOut(L, 'village', s + .2, 1.4);
  let t = drawIn(L, 'furniture', s + .3, 4.2);
  subtitle(L, s, SUBS[1]); year(L, s + .1, '1948');
  s = Math.max(s + readTime(SUBS[1]), t + .6);
  drawOut(L, 'furniture', s, 1.0);
  // 3) 1953: 의자 → 분해 (자막 하나가 두 그림에 걸침)
  subtitle(L, s, SUBS[2], FOOT); year(L, s + .1, '1953');
  t = drawIn(L, 'chair', s + .6, 2.2);
  drawOut(L, 'chair', t + .7, .7);
  t = drawIn(L, 'apart', t + 1.1, 2.0);
  s = Math.max(s + readTime(SUBS[2]), t + .6);
  // 4) 부품
  drawOut(L, 'apart', s, .7);
  subtitle(L, s, SUBS[3]);
  t = drawIn(L, 'parts', s + .4, 2.0);
  s = Math.max(s + readTime(SUBS[3]), t + .6);
  // 5) 상자
  drawOut(L, 'parts', s, .7);
  subtitle(L, s, SUBS[4]);
  t = drawIn(L, 'box', s + .4, 1.8);
  L.to(logo, {opacity:1, duration:.3}, t - .2);
  s = Math.max(s + readTime(SUBS[4]), t + .6);
  drawOut(L, 'box', s - .9, .7); L.to(logo, {opacity:0, duration:.2}, s - .9);
  year(L, s - .5, '');
  // 6) 세계지도: 핀에서 시작한 한 줄이 대륙을 그리며 비행기까지
  L.to(pin, {opacity:1, duration:.2}, s - .3);
  t = drawIn(L, 'map', s - .3, 2.6);
  L.fromTo(plane, {opacity:0, x:-14, y:10}, {opacity:1, x:0, y:0, duration:.5, ease:'power2.out'}, t - .2);
  subtitle(L, s, SUBS[5]);
  s = Math.max(s + readTime(SUBS[5]), t + .8);
  drawOut(L, 'map', s - .6, .9);
  L.to([pin, plane], {opacity:0, duration:.3}, s - .2);
  // 7) 처음 마을로 돌아옴: 기차가 다시 커지고(줌인), 마을이 오른쪽에서 흘러 들어와 반복 시작 위치(0)에 도착
  const loopEnd = s + readTime(SUBS[6]) + .4;
  L.to('#trainCam', {scale:1, svgOrigin:ZOOM_ORIGIN, duration:1.6, ease:'power2.inOut'}, s);
  L.fromTo(SC.village, {x:(loopEnd - s) * SCENERY_SPEED}, {x:0, duration:loopEnd - s, ease:'none', immediateRender:false}, s);
  drawIn(L, 'village', s + .5, 2.8);
  subtitle(L, s, SUBS[6]);
  subtitle(L, loopEnd - .4, '');
  L.to({}, {duration:.01}, loopEnd - .01);      // 반복 길이 고정
  L.timeScale(LOOP_SPEED);
  master.add(L, LOOP_AT);
}

/* ---------- 배속: 1x → 1.5x → 2x → 1x (기차·선 그리기·자막 등 전체가 함께) ---------- */
const SPEEDS = [1, 1.5, 2];
let speedIdx = 0;
const speedBtn = $('speed');
function applySpeed(){
  const v = SPEEDS[speedIdx];
  gsap.globalTimeline.timeScale(v);
  speedBtn.textContent = v + 'x';
  speedBtn.setAttribute('aria-label', `재생 속도 ${v}배 (누르면 변경)`);
}
speedBtn.addEventListener('click', () => { speedIdx = (speedIdx + 1) % SPEEDS.length; applySpeed(); });

/* ---------- 열기 / 닫기 ---------- */
let opened = false, closing = false, returnFocus = null;
function open(){
  if (opened) return; opened = true; closing = false;
  returnFocus = document.activeElement;
  section.hidden = false; fit();
  applySpeed();                 // 마지막에 고른 배속 유지
  build();
  gsap.fromTo(section, {yPercent:100}, {yPercent:0, duration:.9, ease:'power3.out', onComplete:() => { master.play(0); $('close').focus({preventScroll:true}); }});
}
function close(){
  if (!opened || closing) return; closing = true;
  gsap.globalTimeline.timeScale(1);   // 닫히는 연출은 항상 기본 속도로
  // 레터박스가 가운데로 닫혀 가는 띠가 되고(시안 14번) → 띠가 접히며 3D 룸으로
  gsap.timeline({onComplete(){
      master && master.kill(); loops.forEach(l => l.kill()); loops = [];
      section.hidden = true; gsap.set(section, {clearProps:'all'}); gsap.set(stage, {opacity:1});
      opened = false; closing = false;
      if (returnFocus && returnFocus.focus) returnFocus.focus({preventScroll:true});
      window.dispatchEvent(new CustomEvent('ikeahistory:close'));
    }})
    .to([subEl, footEl, '#title', '#year', '#close', '#speed'], {opacity:0, duration:.2}, 0)
    .to('.lb.top', {y:0, height:497, duration:.7, ease:'power3.inOut'}, 0)
    .to('.lb.bottom', {y:0, height:527, duration:.7, ease:'power3.inOut'}, 0)
    .to('.lb.top', {height:540, duration:.35, ease:'power2.in'}, .8)
    .to('.lb.bottom', {height:540, duration:.35, ease:'power2.in'}, .8)
    .to(section, {opacity:0, duration:.45, ease:'power1.out'}, 1.2);
}
$('close').addEventListener('click', close);
addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
const trainBtn = $('trainObject');
if (trainBtn) trainBtn.addEventListener('click', open);

window.IkeaHistory = {open, close, get timeline(){ return master; }};   // timeline: 확인·디버깅용
if (location.hash === '#play') open();   // 확인용: index.html#play 로 열면 바로 재생
})();
