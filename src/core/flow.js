// 공통 흐름 관리(상태 머신). 스토리보드의 전체 이동 순서를 여기서만 결정합니다.
//
//   intro ──▶ hub(창문 0) ⇄ hub(창문 1) ⇄ … ⇄ hub(마지막) ──▶ outro
//                │  ▲            │  ▲
//          클릭  ▼  │ 끝/Esc      ▼  │
//             section 0       section 1 …
//
//  - intro / section / outro : 스크롤 진행도(0~1)로 연출 (scrub)
//  - hub                     : 스크롤 한 번에 창문 한 칸 (step), 클릭·Enter 로 진입
//  - 섹션 끝에서 더 스크롤   : "Bye!" → 창문으로 축소 → 다음 창문으로 이동
//  - 섹션 처음에서 위로 스크롤 / Esc : 같은 창문으로 복귀
import { Emitter } from './emitter.js';
import { START_AT } from '../config.js';

export class Flow extends Emitter {
  constructor(ctx, { intro, outro, sections }) {
    super();
    this.ctx = ctx;
    this.intro = intro;
    this.outro = outro;
    this.sections = sections;
    this.state = { name: 'boot', index: 0 };
    this.active = null; // 현재 update() 가 돌고 있는 섹션(인트로·아웃트로 포함)
    this.busy = false;
    this._bind();
  }

  get last() { return this.sections.length - 1; }

  _bind() {
    const { scroll, hub, minimap, hud } = this.ctx;

    scroll.on('edge', (dir) => {
      const { name, index } = this.state;
      if (name === 'intro' && dir > 0) this.toHub(0);
      else if (name === 'outro' && dir < 0) this.toHub(this.last);
      else if (name === 'section') this.exitSection(dir > 0 ? Math.min(index + 1, this.last) : index);
    });

    scroll.on('step', (dir) => {
      if (this.state.name !== 'hub' || this.busy) return;
      const next = this.state.index + dir;
      if (next < 0) this.toIntro(1);
      else if (next > this.last) this.toOutro();
      else this.toHub(next);
    });

    scroll.on('overscroll', ({ dir, ratio }) => {
      const { name } = this.state;
      let text = '';
      if (name === 'section') text = dir > 0 ? '계속 스크롤하면 창문으로 돌아갑니다' : '위로 계속 스크롤하면 창문으로 돌아갑니다';
      else if (name === 'intro') text = '계속 스크롤';
      else if (name === 'outro') text = '위로 스크롤하면 창문으로';
      hud.edge(name === 'intro' && dir < 0 ? 0 : ratio, text);
    });

    hub.on('pick', (i) => {
      if (this.state.name !== 'hub' || this.busy) return;
      if (i === this.state.index) this.enterSection(i);
      else this.toHub(i);
    });

    minimap.on('navigate', (id) => this.goTo(id));

    window.addEventListener('keydown', (e) => {
      if (this.busy) return;
      if (e.key === 'Escape' && this.state.name === 'section') this.exitSection(this.state.index);
      if (e.key === 'Enter' && this.state.name === 'hub') this.enterSection(this.state.index);
    });
  }

  /** 시작 지점 결정. ?section=rooms 처럼 주면 인트로를 건너뜁니다 (각자 자기 섹션 개발용). */
  start() {
    const idx = this.sections.findIndex((s) => s.id === START_AT);
    if (idx >= 0) return this.goTo(START_AT);
    if (START_AT === 'hub') return this.toHub(0);
    if (START_AT === 'outro') { this.toHub(this.last); return this.toOutro(); }
    return this.toIntro(0);
  }

  _setActive(section, progress = 0) {
    const { stage, scroll } = this.ctx;
    if (this.active && this.active !== section) this.active._leave();
    const changed = this.active !== section;
    this.active = section;
    stage.setActive(section);
    if (!section) return;
    if (changed) section._enter();
    scroll.setScrub(section.getScrollLength(), progress);
    section._resize(window.innerWidth, window.innerHeight);
    section._tick(progress, 0, performance.now() / 1000);
  }

  _setState(name, index = this.state.index) {
    this.state = { name, index };
    document.body.dataset.state = name;
    this.emit('change', this.state);
  }

  toIntro(progress = 0) {
    const { hub, character, minimap, hud } = this.ctx;
    this._setState('intro', 0);
    hub.show();
    hub.focus(0, { immediate: true });
    character.hide();
    minimap.show();
    minimap.setActive(null);
    hud.hint(progress < 0.05 ? '스크롤해서 시작' : '');
    this._setActive(this.intro, progress);
  }

  toHub(index) {
    const { hub, scroll, minimap, character, hud } = this.ctx;
    const from = this.state.name;
    this._setState('hub', index);
    this._setActive(null);
    scroll.setStep();
    hub.show();
    hub.setReveal(1);
    hub.focus(index, { immediate: from === 'boot' });
    minimap.show();
    minimap.setLayout(1);
    minimap.setActive(this.sections[index].id);
    hud.hint('스크롤: 창문 이동 · 클릭: 들어가기');

    // 캐릭터가 포커스된 창문 옆으로 따라옵니다
    const a = hub.getAnchor();
    const wasVisible = character.node.classList.contains('is-on');
    character.show().wave(true);
    if (wasVisible && from !== 'boot') character.moveTo(a.x, a.y, { duration: 650, jump: 40, scale: 1 });
    else character.place(a.x, a.y, { scale: 1 });
  }

  async enterSection(index) {
    if (this.busy) return;
    const { hub, scroll, character, minimap, hud } = this.ctx;
    const section = this.sections[index];
    this.busy = true;
    scroll.lock('flow');
    hud.hint('');
    character.say('Hej!', 900);
    await hub.expand(index, () => {
      hub.hide();
      character.hide();
      this._setState('section', index);
      minimap.setActive(section.id);
      minimap.markVisited(section.id);
      this._setActive(section, 0);
    });
    scroll.unlock('flow');
    this.busy = false;
  }

  async exitSection(nextIndex = this.state.index) {
    if (this.busy || this.state.name !== 'section') return;
    const { hub, scroll } = this.ctx;
    const index = this.state.index;
    this.busy = true;
    scroll.lock('flow');
    await hub.collapse(index, () => {
      this._setActive(null);
      hub.show();
      hub.setReveal(1);
    });
    this.toHub(index);
    if (nextIndex !== index) this.toHub(nextIndex); // 다음 창문으로 미끄러지듯 이동
    scroll.unlock('flow');
    this.busy = false;
  }

  toOutro() {
    const { character, hud, hub } = this.ctx;
    this._setState('outro', this.last);
    hub.show();
    character.hide();
    hud.hint('');
    this._setActive(this.outro, 0);
  }

  /** 섹션 id 로 바로 이동 (미니맵 클릭, ?section= 파라미터) */
  async goTo(id) {
    const index = this.sections.findIndex((s) => s.id === id);
    if (index < 0 || this.busy) return;
    if (this.state.name === 'section' && this.state.index === index) return;
    if (this.state.name === 'section') { await this.exitSection(index); }
    else this.toHub(index);
    await this.enterSection(index);
  }

  /** 매 프레임 (main.js 의 루프에서 호출) */
  tick(dt, time) {
    const { scroll, stage, hud } = this.ctx;
    scroll.update(dt);
    if (this.active) this.active._tick(scroll.progress, dt, time);
    stage.render();
    hud.debug({
      state: this.state.name,
      section: this.active?.id ?? `hub[${this.state.index}]`,
      progress: scroll.mode === 'scrub' ? scroll.progress.toFixed(3) : '-',
      busy: this.busy,
    });
  }

  resize() {
    const { stage, scroll, minimap, hub, character } = this.ctx;
    const w = window.innerWidth, h = window.innerHeight;
    stage.resize();
    [this.intro, ...this.sections, this.outro].forEach((s) => s._resize(w, h));
    if (this.active) scroll.setLength(this.active.getScrollLength());
    if (this.state.name !== 'intro') minimap.setLayout(1);
    if (this.state.name === 'hub') { const a = hub.getAnchor(); character.place(a.x, a.y); }
  }
}
