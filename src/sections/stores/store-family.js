// Store & Family 상세페이지 실행기.
// 메인(Room Atlas)의 store-family 방에서 이 페이지(store-family.html)로 들어옵니다.
// 섹션 코드(stores.js)는 예전 창문 뼈대와 같은 규약(BaseSection, update 진행도, this.ctx)으로 그대로 돌아갑니다.
// 렌더러·스크롤은 공통 모듈(Stage, ScrollController)을 그대로 씁니다.
import { Stage } from '../../core/stage.js';
import { ScrollController } from '../../core/scroll.js';
import { StoresSection } from './stores.js';

const root = document.querySelector('.sf-page');
const noop = () => {};
const resolved = () => Promise.resolve();
const exitHref = root.querySelector('.sf-page-exit').href;
const exit = () => { location.href = exitHref; };

const scroll = new ScrollController();
const stage = new Stage(root.querySelector('.sf-page-stage'));
const ctx = {
  stage,
  scroll,
  flow: { state: { name: 'section' }, goTo: noop, exitSection: exit, on: noop },
  hud: { hint: noop, edge: noop },
  minimap: { show: noop, hide: noop, setActive: noop, setLayout: noop, markVisited: noop, pointAt: noop, routeMarkup: () => '', on: noop },
  character: { show: noop, hide: noop, place: noop, moveTo: resolved, wave: resolved, say: resolved },
  hub: { on: noop },
};

const section = new StoresSection(ctx);
await section._mount(root.querySelector('.sf-page-layer'));
stage.resize();
section._resize(innerWidth, innerHeight);
scroll.setScrub(section.getScrollLength(), 0);
stage.setActive(section);
section._enter();
window.storeFamily = { section, scroll }; // 콘솔 확인용: storeFamily.scroll.scrollTo(0.56)

addEventListener('resize', () => {
  stage.resize();
  section._resize(innerWidth, innerHeight);
  scroll.setLength(section.getScrollLength());
});

let last = performance.now();
const loop = (now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  scroll.update(dt);
  section._tick(scroll.progress, dt, now / 1000);
  stage.render();
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

// 나가기 전환: 맨 끝에서 더 내리면 페이지가 원으로 작아지며 메인의 Store & Family 방으로 나감
// (메인에서 들어올 때 원이 커지던 것의 반대). 더 내리는 만큼 원이 조금씩 줄어 미리 알려 주고, 멈추면 다시 펴짐
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const fullR = () => Math.ceil(Math.hypot(innerWidth / 2, innerHeight / 2)) + 2;
const circle = (r) => `circle(${r.toFixed(1)}px at 50% 50%)`;
const easeOut = (t) => 1 - (1 - t) ** 3;
let leaving = false, nowR = 0;
// 원 바깥은 메인 방 배경색 (메인 테마가 밝은 모드면 흰색)
if (localStorage.getItem('room-atlas-theme') === 'light') document.documentElement.style.background = document.body.style.background = '#fff';
scroll.on('overscroll', ({ dir, ratio }) => {
  if (leaving || section.cityOn) return;
  if (dir > 0 && ratio >= 1) { leaveByCircle(); return; }
  nowR = dir > 0 && ratio > 0 ? fullR() * (1 - 0.3 * easeOut(ratio)) : 0;
  root.style.transition = 'clip-path .35s cubic-bezier(.3,0,.2,1)';
  root.style.clipPath = nowR ? circle(nowR) : '';
});
function leaveByCircle() {
  leaving = true;
  scroll.lock('stores-exit');
  if (reduced.matches) { exit(); return; }
  root.style.transition = '';
  const anim = root.animate([{ clipPath: circle(nowR || fullR()) }, { clipPath: circle(4) }],
    { duration: 1000, easing: 'cubic-bezier(.72,0,.5,1)', fill: 'forwards' });
  anim.onfinish = exit;
}
// 뒤로 가기로 다시 이 페이지에 돌아왔을 때 원이 남아 있지 않게
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  leaving = false; nowR = 0;
  root.getAnimations().forEach((a) => a.cancel());
  root.style.clipPath = '';
  scroll.unlock('stores-exit');
});
