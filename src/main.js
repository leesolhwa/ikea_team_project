// 진입점: 공통 모듈을 만들고, 섹션을 등록하고, 루프를 돌립니다.
// 섹션 작업자는 이 파일을 수정할 필요가 없습니다.
import { Stage } from './core/stage.js';
import { ScrollController } from './core/scroll.js';
import { WindowHub } from './core/windows.js';
import { Minimap } from './core/minimap.js';
import { Character } from './core/character.js';
import { Hud } from './core/hud.js';
import { Flow } from './core/flow.js';
import { IntroSection, OutroSection, HUB_SECTIONS } from './sections/index.js';

const $ = (id) => document.getElementById(id);
const metas = HUB_SECTIONS.map((S) => S.meta);

// 모든 섹션이 공유하는 공통 모듈 묶음 (섹션 안에서는 this.ctx 로 접근)
const ctx = {};
ctx.hud = new Hud($('hud'));
ctx.stage = new Stage($('stage'));
ctx.scroll = new ScrollController();
ctx.minimap = new Minimap($('minimap'), metas);
ctx.character = new Character($('character'));
ctx.hub = new WindowHub($('hub'), $('portal'), metas);

const intro = new IntroSection(ctx);
const outro = new OutroSection(ctx);
const sections = HUB_SECTIONS.map((S) => new S(ctx));
ctx.flow = new Flow(ctx, { intro, outro, sections });

await Promise.all([
  ...sections.map((s) => s._mount($('sections'))),
  intro._mount($('overlays')),
  outro._mount($('overlays')),
]);
$('boot').remove();

let prev = performance.now();
function loop(now) {
  const dt = Math.min((now - prev) / 1000, 0.1);
  prev = now;
  ctx.flow.tick(dt, now / 1000);
  requestAnimationFrame(loop);
}
window.addEventListener('resize', () => ctx.flow.resize());

ctx.flow.start();
requestAnimationFrame(loop);

window.__app = ctx; // 콘솔 디버깅용: __app.flow.goTo('rooms')
