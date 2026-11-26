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
const exit = () => { location.href = root.querySelector('.sf-page-exit').href; };

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
