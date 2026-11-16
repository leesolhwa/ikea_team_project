// 모든 섹션이 상속하는 공통 규약(계약)입니다.
// 팀원은 자기 섹션 폴더에서 아래 훅만 구현하면 되고, 전환·스크롤·렌더링은 공통 코어가 처리합니다.
//
//   static meta     : 창문 허브·미니맵에 쓰이는 정보
//   static css      : 섹션 전용 CSS 경로 (자동 로드)
//   static use3D    : true 면 this.scene / this.camera 가 만들어집니다
//   static pinned   : 화면이 고정된 채 진행되는 스크롤 길이 (단위: 화면 높이)
//   template()      : 섹션 HTML 문자열. `.sec-scroll` 요소가 있으면 pinned 구간 뒤에 자동으로 세로 스크롤됩니다
//   init()          : 최초 1회. DOM 참조, 3D 오브젝트 생성
//   enter()         : 섹션에 들어올 때마다
//   update(state)   : 활성 상태에서 매 프레임. state = { progress, pin, scroll, dt, time }
//   leave()         : 섹션에서 나갈 때마다
//   resize(w, h)    : 창 크기 변경 시
import * as THREE from 'three';
import { modelSlot } from './assets.js';
import { createCharacter3D } from './character.js';
import { clamp } from './tween.js';

const cssLoaded = new Map();
function loadCSS(href) {
  if (!cssLoaded.has(href)) {
    cssLoaded.set(href, new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = link.onerror = () => resolve();
      document.head.append(link);
    }));
  }
  return cssLoaded.get(href);
}

export class BaseSection {
  static meta = { id: 'base', title: '', subtitle: '', owner: '', color: '#888', windowImage: '' };
  static css = null;
  static use3D = false;
  static pinned = 2;
  static layer = 'section'; // 'section' | 'overlay'(인트로·아웃트로처럼 허브 위에 덮이는 것)

  /** @param ctx 공통 모듈 묶음: { stage, scroll, flow, hub, minimap, character, hud } */
  constructor(ctx) {
    this.ctx = ctx;
    this.meta = this.constructor.meta;
    this.id = this.meta.id;
    this.active = false;
    this.el = null;
    this.scrollEl = null;
    this.scene = null;
    this.camera = null;
    this._slots = [];
  }

  /* ----- 팀원이 구현하는 훅 ----- */
  template() { return ''; }
  init() {}
  enter() {}
  update(_state) {}
  leave() {}
  resize(_w, _h) {}

  /* ----- 섹션에서 쓰는 헬퍼 ----- */
  $(sel) { return this.el.querySelector(sel); }
  $$(sel) { return [...this.el.querySelectorAll(sel)]; }

  /** modelSlot 을 만들어 scene 에 추가하고, 애니메이션 믹서를 자동으로 돌려 줍니다. */
  addModel(options, parent = this.scene) {
    const slot = modelSlot(options);
    parent.add(slot);
    this._slots.push(slot);
    return slot;
  }

  /** 공통 3D 캐릭터(조케)를 씬에 추가합니다. */
  addCharacter(parent = this.scene) {
    const slot = createCharacter3D();
    parent.add(slot);
    this._slots.push(slot);
    return slot;
  }

  /** 이 섹션의 전체 스크롤 길이(px) = pinned 구간 + .sec-scroll 콘텐츠 길이 */
  getScrollLength() {
    const vh = window.innerHeight;
    this._pinPx = (this.constructor.pinned || 0) * vh;
    this._contentPx = this.scrollEl ? Math.max(0, this.scrollEl.scrollHeight - vh) : 0;
    return Math.max(1, this._pinPx + this._contentPx);
  }

  /* ----- 아래는 공통 코어(flow)가 호출합니다. 섹션에서 건드리지 마세요. ----- */
  async _mount(parent) {
    const C = this.constructor;
    if (C.css) await loadCSS(C.css);
    this.el = document.createElement('section');
    this.el.className = `sec sec-${this.id}`;
    this.el.dataset.section = this.id;
    this.el.innerHTML = this.template();
    parent.append(this.el);
    this.scrollEl = this.el.querySelector('.sec-scroll');
    if (C.use3D) {
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 200);
    }
    try {
      await this.init();
    } catch (err) {
      // 한 섹션의 오류가 전체 흐름을 막지 않게 합니다.
      console.error(`[${this.id}] init 오류`, err);
      this.el.insertAdjacentHTML('beforeend', `<p class="sec-error">⚠ ${this.id} 섹션 init 오류 — 콘솔을 확인하세요</p>`);
    }
  }

  _enter() {
    this.active = true;
    this.el.classList.add('is-active');
    this.enter();
  }

  _leave() {
    this.active = false;
    this.el.classList.remove('is-active');
    this.leave();
  }

  _tick(progress, dt, time) {
    const total = this._pinPx + this._contentPx || 1;
    const px = progress * total;
    const pin = this._pinPx ? clamp(px / this._pinPx) : 1;
    const scroll = this._contentPx ? clamp((px - this._pinPx) / this._contentPx) : 0;
    if (this.scrollEl) this.scrollEl.style.transform = `translate3d(0, ${-scroll * this._contentPx}px, 0)`;
    for (const s of this._slots) s.userData.mixer?.update(dt);
    this.update({ progress, pin, scroll, dt, time });
  }

  _resize(w, h) {
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    this.resize(w, h);
  }
}
