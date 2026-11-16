// 블라인드: 인트로(열림)와 아웃트로(닫힘)가 함께 쓰는 컴포넌트.
// 스타일은 common.css 의 .blinds / .blind-slat. 3D 모델로 바꾸고 싶다면 set() 의 의미(0 닫힘 ~ 1 열림)만 유지하세요.
import { clamp } from '../core/tween.js';

export class Blinds {
  constructor(el, { count = 10 } = {}) {
    this.el = el;
    this.count = count;
    el.classList.add('blinds');
    el.style.setProperty('--n', count);
    el.innerHTML = Array.from({ length: count }, () => '<i class="blind-slat"></i>').join('');
    this.slats = [...el.children];
    this.set(0);
  }

  /** open: 0 = 완전히 닫힘(파란 면) → 1 = 완전히 열림. 위쪽 살부터 차례로 돌아갑니다. */
  set(open) {
    this.slats.forEach((slat, i) => {
      const local = clamp(open * 1.3 - (i / this.count) * 0.3);
      slat.style.transform = `rotateX(${local * 90}deg)`;
    });
    this.el.style.opacity = open >= 1 ? 0 : 1;
  }
}
