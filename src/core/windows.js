// 공통 창문 허브 + 창문 전환.
//  - 허브: 섹션마다 창문 하나. 스크롤로 창문 사이를 이동하고, 클릭하면 섹션으로 들어갑니다.
//  - expand():   창문이 화면 전체로 커지며 섹션 진입
//  - collapse(): 풀뷰가 다시 창문으로 작아지며 복귀 (스토리보드의 *공통 "Bye!" 연출)
// 창문 프레임 디자인은 common.css 의 .win-* 을, 창문 속 이미지는 각 섹션 meta.windowImage 를 바꾸면 됩니다.
import { Emitter } from './emitter.js';
import { tween, ease, lerp } from './tween.js';
import { FLOW } from '../config.js';

const CENTER_Y = 0.46; // 창문 중심의 세로 위치(화면 높이 비율) — common.css 의 .hub-track top 과 같아야 합니다

export class WindowHub extends Emitter {
  constructor(el, portalEl, metas) {
    super();
    this.el = el;
    this.portal = portalEl;
    this.metas = metas;
    this.index = 0;

    el.innerHTML = `
      <div class="hub-track">
        ${metas.map((m, i) => `
          <button class="win" type="button" data-index="${i}" style="--c:${m.color}" aria-label="${m.title} 섹션으로 이동">
            <span class="win-frame"><span class="win-glass"><img src="${m.windowImage}" alt="" draggable="false" /></span></span>
            <span class="win-cap">
              <b>${String(i + 1).padStart(2, '0')}</b>
              <strong>${m.title}</strong>
              <em>${m.subtitle}</em>
            </span>
          </button>`).join('')}
      </div>`;
    portalEl.innerHTML = '<img alt="" /><span class="portal-text"></span>';

    this.track = el.querySelector('.hub-track');
    this.wins = [...el.querySelectorAll('.win')];
    this.wins.forEach((w, i) => w.addEventListener('click', () => this.emit('pick', i)));
    this.focus(0, { immediate: true });
  }

  show() { this.el.classList.add('is-on'); }
  hide() { this.el.classList.remove('is-on'); }
  setReveal(alpha) { this.el.style.opacity = alpha; }

  focus(i, { immediate = false } = {}) {
    this.index = i;
    if (immediate) this.track.classList.add('no-anim');
    this.track.style.setProperty('--i', i);
    this.wins.forEach((w, k) => w.classList.toggle('is-focus', k === i));
    if (immediate) { void this.track.offsetWidth; this.track.classList.remove('no-anim'); }
  }

  /** 포커스된 창문 유리의 화면 좌표 (포커스 창문은 항상 화면 가운데) */
  glassRect() {
    const glass = this.wins[this.index].querySelector('.win-glass');
    const w = glass.offsetWidth, h = glass.offsetHeight;
    return {
      x: window.innerWidth / 2 - w / 2,
      y: window.innerHeight * CENTER_Y - h / 2,
      w, h,
      r: parseFloat(getComputedStyle(glass).borderTopLeftRadius) || 0,
    };
  }

  /** 캐릭터가 서 있을 자리: 포커스 창문의 왼쪽 아래 */
  getAnchor() {
    const r = this.glassRect();
    return { x: r.x - r.w * 0.18, y: r.y + r.h + 6 };
  }

  _setPortal(a, b, t) {
    const s = this.portal.style;
    s.left = `${lerp(a.x, b.x, t)}px`;
    s.top = `${lerp(a.y, b.y, t)}px`;
    s.width = `${lerp(a.w, b.w, t)}px`;
    s.height = `${lerp(a.h, b.h, t)}px`;
    s.borderRadius = `${lerp(a.r, b.r, t)}px`;
  }

  _prepPortal(i, text = '') {
    const m = this.metas[i];
    this.portal.style.background = m.color;
    this.portal.querySelector('img').src = m.windowImage;
    this.portal.querySelector('.portal-text').textContent = text;
    this.portal.classList.add('is-on');
  }

  /**
   * 창문 → 풀스크린. 화면이 완전히 덮였을 때 onCovered() 를 호출하므로
   * 그 안에서 허브를 숨기고 섹션을 켜면 됩니다.
   */
  async expand(i, onCovered) {
    this.focus(i, { immediate: true });
    const from = this.glassRect();
    const to = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight, r: 0 };
    this._prepPortal(i);
    this.portal.style.opacity = 1;
    await tween({ duration: FLOW.portalDuration, ease: ease.inOut, onUpdate: (t) => this._setPortal(from, to, t) });
    await onCovered?.();
    await tween({ duration: 380, ease: ease.out, onUpdate: (t) => { this.portal.style.opacity = 1 - t; } });
    this.portal.classList.remove('is-on');
  }

  /** 풀스크린 → 창문. 덮인 순간 onCovered() 에서 섹션을 끄고 허브를 켭니다. */
  async collapse(i, onCovered, text = 'Bye!') {
    const full = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight, r: 0 };
    this._prepPortal(i, text);
    this._setPortal(full, full, 0);
    await tween({ duration: 380, ease: ease.out, onUpdate: (t) => { this.portal.style.opacity = t; } });
    await onCovered?.();
    this.focus(i, { immediate: true });
    const to = this.glassRect();
    await tween({ duration: FLOW.portalDuration, ease: ease.inOut, onUpdate: (t) => this._setPortal(full, to, t) });
    this.portal.classList.remove('is-on');
  }
}
