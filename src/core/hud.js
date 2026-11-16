// 공통 안내 UI: 하단 힌트 문구, 섹션 끝 오버스크롤 게이지, 디버그 패널(?debug)
import { DEBUG } from '../config.js';

export class Hud {
  constructor(el) {
    this.el = el;
    el.innerHTML = `
      <div class="hud-hint"><span class="hud-hint-text"></span><i class="hud-gauge"></i></div>
      ${DEBUG ? '<pre class="hud-debug"></pre>' : ''}`;
    this.hintEl = el.querySelector('.hud-hint');
    this.textEl = el.querySelector('.hud-hint-text');
    this.gaugeEl = el.querySelector('.hud-gauge');
    this.debugEl = el.querySelector('.hud-debug');
    this._base = '';
  }

  /** 상태별 기본 안내 문구. 빈 문자열이면 숨김 */
  hint(text = '') {
    this._base = text;
    this.textEl.textContent = text;
    this.hintEl.classList.toggle('is-on', !!text);
  }

  /** 섹션 끝에서 더 스크롤할 때 게이지 표시 */
  edge(ratio, text) {
    this.gaugeEl.style.transform = `scaleX(${ratio})`;
    if (ratio > 0) {
      this.textEl.textContent = text;
      this.hintEl.classList.add('is-on');
    } else {
      this.textEl.textContent = this._base;
      this.hintEl.classList.toggle('is-on', !!this._base);
    }
  }

  debug(obj) {
    if (!this.debugEl) return;
    this.debugEl.textContent = Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join('\n');
  }
}
