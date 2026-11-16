// OUTRO — 블라인드가 닫히고 → 로고 → 하단 띠에서 조케가 인사하며 지나온 동선이 그려집니다.
// 푸터는 이번 단계에서 생략 (.outro-strip 안에 자리만 표시).
import { BaseSection } from '../../core/BaseSection.js';
import { Blinds } from '../../components/blinds.js';
import { seg, ease } from '../../core/tween.js';

export class OutroSection extends BaseSection {
  static meta = { id: 'outro', title: 'Outro', owner: '팀원 A' };
  static css = new URL('./outro.css', import.meta.url).href;
  static layer = 'overlay';
  static pinned = 2.6;

  template() {
    return /* html */ `
      <div class="outro-blinds"></div>
      <div class="outro-logo"><img src="assets/images/common/logo.svg" alt="로고 자리(임시)" /></div>
      <div class="outro-strip">
        <div class="outro-route"></div>
        <p class="outro-bye">Bye!</p>
        <p class="ph-note">푸터 자리 (이번 단계에서는 생략)</p>
      </div>
    `;
  }

  init() {
    this.blinds = new Blinds(this.$('.outro-blinds'), { count: 10 });
    this.blinds.set(1);
    this.logo = this.$('.outro-logo');
    this.strip = this.$('.outro-strip');
    this.routeEl = this.$('.outro-route');
  }

  enter() {
    const { minimap } = this.ctx;
    minimap.hide();
    // 공통 미니맵에서 동선 그림을 받아옵니다 (방문한 섹션이 노란색으로 표시됨)
    this.routeEl.innerHTML = minimap.routeMarkup();
    this.trail = this.routeEl.querySelector('.mm-trail');
    this.trail.style.strokeDasharray = '1';
    this._said = false;
  }

  update({ progress: p }) {
    const { character } = this.ctx;

    // 1) 블라인드 닫힘 (0 ~ 0.45) + 로고
    this.blinds.set(1 - ease.inOut(seg(p, 0, 0.45)));
    this.logo.style.opacity = seg(p, 0.3, 0.5);

    // 2) 하단 띠가 올라오고 (0.5 ~ 0.72), 동선이 그려짐 (0.62 ~ 0.95)
    const up = ease.out(seg(p, 0.5, 0.72));
    this.strip.style.transform = `translateY(${(1 - up) * 100}%)`;
    this.trail.style.strokeDashoffset = 1 - seg(p, 0.62, 0.95);

    // 3) 조케 인사
    if (up > 0.2) {
      const r = this.strip.getBoundingClientRect();
      character.show().place(r.left + r.width * 0.1, r.bottom - 14, { scale: 1.2 }).wave(p > 0.8);
      if (p > 0.92 && !this._said) { character.say('Bye!', 0); this._said = true; }
      if (p < 0.9 && this._said) { character.say(''); this._said = false; }
    } else {
      character.hide();
    }
  }

  leave() {
    const { minimap, character } = this.ctx;
    minimap.show();
    character.say('');
  }
}
